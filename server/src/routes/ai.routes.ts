import { Router, Request, Response } from 'express';
import { supabase, Repository, FileNode, ChatHistory, ChatMessage, MatchFileNodeResult } from '../config/supabase';
import { authMiddleware } from '../middleware';
import { nvidiaService } from '../services';

const router = Router();

// Ask a question about a repository
router.post('/:repoId/ask', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { question } = req.body;
    const { repoId } = req.params;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Verify repo access
    const { data: repo } = await supabase
      .from('repositories')
      .select('id, full_name')
      .eq('id', repoId)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id' | 'full_name'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Generate embedding for the question
    const questionEmbedding = await nvidiaService.generateEmbedding(question);

    // Semantic search using pgvector
    const { data: relevantFilesData, error: searchError } = await supabase
      .rpc('match_file_nodes', {
        query_embedding: questionEmbedding,
        match_repo_id: repoId,
        match_threshold: 0.5,
        match_count: 10,
      });

    if (searchError) {
      console.error('Semantic search error:', searchError);
    }

    const relevantFiles = (relevantFilesData || []) as MatchFileNodeResult[];

    // Build context from relevant files
    let context = '';
    const referencedFiles: string[] = [];

    if (relevantFiles.length > 0) {
      for (const file of relevantFiles) {
        referencedFiles.push(file.path);
        context += `\n--- File: ${file.path} ---\n`;
        if (file.summary) {
          context += `Summary: ${file.summary}\n`;
        }
        if (file.content) {
          // Limit content to avoid token limits
          const truncatedContent = file.content.slice(0, 2000);
          context += `Content:\n${truncatedContent}\n`;
        }
      }
    }

    // If no files found via semantic search, fallback to basic search
    if (referencedFiles.length === 0) {
      const { data: fallbackFiles } = await supabase
        .from('file_nodes')
        .select('path, summary, content')
        .eq('repo_id', repoId)
        .eq('type', 'file')
        .not('summary', 'is', null)
        .limit(10)
        .returns<Pick<FileNode, 'path' | 'summary' | 'content'>[]>();

      if (fallbackFiles) {
        for (const file of fallbackFiles) {
          referencedFiles.push(file.path);
          context += `\n--- File: ${file.path} ---\n`;
          if (file.summary) {
            context += `Summary: ${file.summary}\n`;
          }
        }
      }
    }

    // Get chat history for context
    const { data: chatHistory } = await supabase
      .from('chat_histories')
      .select('messages')
      .eq('user_id', req.userId!)
      .eq('repo_id', repoId)
      .single<Pick<ChatHistory, 'messages'>>();

    const previousMessages = (chatHistory?.messages || []).slice(-6) as ChatMessage[];

    // Build messages for AI
    const systemPrompt = `You are an expert code assistant helping developers understand a codebase. 
You have access to the following files and their contents from the repository "${repo.full_name}":

${context || 'No files have been analyzed yet.'}

When answering questions:
1. Reference specific files and line numbers when relevant
2. Explain code patterns and architecture decisions
3. Provide code examples when helpful
4. Be concise but thorough
5. If you're unsure about something, say so`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...previousMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: question },
    ];

    // Get AI response
    const answer = await nvidiaService.chat(messages);

    // Save to chat history
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: question,
      timestamp: new Date().toISOString(),
    };

    const newAssistantMessage: ChatMessage = {
      role: 'assistant',
      content: answer,
      referenced_files: referencedFiles,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...previousMessages, newUserMessage, newAssistantMessage];

    // Upsert chat history
    await supabase
      .from('chat_histories')
      .upsert({
        user_id: req.userId!,
        repo_id: repoId,
        messages: updatedMessages,
      }, {
        onConflict: 'user_id,repo_id',
      });

    res.json({
      answer,
      referencedFiles,
    });
  } catch (error) {
    console.error('Ask question error:', error);
    res.status(500).json({ error: 'Failed to process question' });
  }
});

// Search files in repository
router.get('/:repoId/search', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { q } = req.query;
    const { repoId } = req.params;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Verify repo access
    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', repoId)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    // Search in file paths, content, and summaries
    const { data: files, error } = await supabase
      .from('file_nodes')
      .select('id, path, name, type, language, summary')
      .eq('repo_id', repoId)
      .or(`path.ilike.%${q}%,name.ilike.%${q}%,summary.ilike.%${q}%`)
      .limit(20)
      .returns<Pick<FileNode, 'id' | 'path' | 'name' | 'type' | 'language' | 'summary'>[]>();

    if (error) throw error;

    res.json({ results: files || [] });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get chat history
router.get('/:repoId/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', repoId)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    const { data: chatHistory } = await supabase
      .from('chat_histories')
      .select('messages')
      .eq('user_id', req.userId!)
      .eq('repo_id', repoId)
      .single<Pick<ChatHistory, 'messages'>>();

    res.json({ messages: chatHistory?.messages || [] });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Clear chat history
router.delete('/:repoId/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { repoId } = req.params;

    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', repoId)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    await supabase
      .from('chat_histories')
      .delete()
      .eq('user_id', req.userId!)
      .eq('repo_id', repoId);

    res.json({ message: 'Chat history cleared' });
  } catch (error) {
    console.error('Clear chat history error:', error);
    res.status(500).json({ error: 'Failed to clear chat history' });
  }
});

export default router;
