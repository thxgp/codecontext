import { Router, Request, Response } from 'express';
import { supabase, Repository, FileNode, ChatHistory, ChatMessage, MatchFileNodeResult } from '../config/supabase';
import { authMiddleware } from '../middleware';
import { nvidiaService } from '../services';

const router = Router();

// Ask a question about a repository (session-scoped)
router.post('/:repoId/ask', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { question, sessionId } = req.body;
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

    // Detect slash commands for special handling
    const isSummarize = /^\/(summarize|summary)\b/i.test(question.trim());
    const isStructure = /^\/(structure|tree)\b/i.test(question.trim());
    const isSearch = /^\/search\b/i.test(question.trim());
    const isTrace = /^\/trace\b/i.test(question.trim());

    // Extract the argument after the command (e.g., "/search auth" → "auth")
    const commandArg = question.trim().replace(/^\/\w+\s*/i, '').trim();

    let context = '';
    const referencedFiles: string[] = [];

    if (isSummarize || isStructure) {
      // Fetch all file summaries for whole-repo commands
      const { data: allFiles } = await supabase
        .from('file_nodes')
        .select('path, summary, type, language')
        .eq('repo_id', repoId)
        .eq('type', 'file')
        .not('summary', 'is', null)
        .order('path')
        .returns<Pick<FileNode, 'path' | 'summary' | 'type' | 'language'>[]>();

      if (allFiles) {
        for (const file of allFiles) {
          referencedFiles.push(file.path);
          context += `\n--- ${file.path}${file.language ? ` (${file.language})` : ''} ---\n`;
          context += `${file.summary}\n`;
        }
      }
    } else if (isSearch) {
      // Search with the term after /search — use semantic search with more results
      const searchTerm = commandArg || 'overview';
      const searchEmbedding = await nvidiaService.generateEmbedding(searchTerm);

      const { data: searchResults } = await supabase
        .rpc('match_file_nodes', {
          query_embedding: searchEmbedding,
          match_repo_id: repoId,
          match_threshold: 0.3,
          match_count: 20,
        });

      const matchedFiles = (searchResults || []) as MatchFileNodeResult[];

      for (const file of matchedFiles) {
        referencedFiles.push(file.path);
        context += `\n--- ${file.path} (similarity: ${file.similarity?.toFixed(2) || 'N/A'}) ---\n`;
        if (file.summary) context += `Summary: ${file.summary}\n`;
        if (file.content) {
          const truncatedContent = file.content.slice(0, 1500);
          context += `Content:\n${truncatedContent}\n`;
        }
      }
    } else if (isTrace) {
      // Trace needs all files to follow the execution flow
      const { data: allFiles } = await supabase
        .from('file_nodes')
        .select('path, summary, content, type, language')
        .eq('repo_id', repoId)
        .eq('type', 'file')
        .not('summary', 'is', null)
        .order('path')
        .returns<Pick<FileNode, 'path' | 'summary' | 'content' | 'type' | 'language'>[]>();

      if (allFiles) {
        for (const file of allFiles) {
          referencedFiles.push(file.path);
          context += `\n--- ${file.path}${file.language ? ` (${file.language})` : ''} ---\n`;
          if (file.summary) context += `Summary: ${file.summary}\n`;
          if (file.content) {
            const truncatedContent = file.content.slice(0, 1000);
            context += `Content:\n${truncatedContent}\n`;
          }
        }
      }
    } else {
      // Normal question — semantic search
      const questionEmbedding = await nvidiaService.generateEmbedding(question);

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

      if (relevantFiles.length > 0) {
        for (const file of relevantFiles) {
          referencedFiles.push(file.path);
          context += `\n--- File: ${file.path} ---\n`;
          if (file.summary) {
            context += `Summary: ${file.summary}\n`;
          }
          if (file.content) {
            const truncatedContent = file.content.slice(0, 2000);
            context += `Content:\n${truncatedContent}\n`;
          }
        }
      }

      // Fallback to basic search if no semantic results
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
    }

    // Get or create chat session
    let activeSessionId = sessionId;
    let previousMessages: ChatMessage[] = [];

    if (activeSessionId) {
      // Load existing session
      const { data: chatHistory } = await supabase
        .from('chat_histories')
        .select('messages, session_id')
        .eq('session_id', activeSessionId)
        .eq('user_id', req.userId!)
        .single<Pick<ChatHistory, 'messages' | 'session_id'>>();

      previousMessages = (chatHistory?.messages || []).slice(-6);
    } else {
      // Create a new session — generate title from question
      const title = question.length > 60 ? question.slice(0, 57) + '...' : question;
      activeSessionId = crypto.randomUUID();

      await supabase.from('chat_histories').insert({
        user_id: req.userId!,
        repo_id: repoId,
        session_id: activeSessionId,
        title,
        messages: [],
      });
    }

    // Build messages for AI
    let systemPrompt: string;

    if (isSummarize) {
      systemPrompt = `You are an expert code assistant. The user wants a comprehensive summary of the entire repository "${repo.full_name}".
Below are ALL the analyzed files and their summaries:

${context || 'No files have been analyzed yet.'}

Provide a well-structured overview covering:
1. What the project does (purpose and main functionality)
2. Tech stack and key dependencies
3. Architecture and project structure
4. Key components/modules and how they interact
5. Notable patterns or design decisions

Be thorough but organized. Use markdown headings and bullet points.`;
    } else if (isStructure) {
      systemPrompt = `You are an expert code assistant. The user wants to understand the structure of the repository "${repo.full_name}".
Below are ALL the analyzed files:

${context || 'No files have been analyzed yet.'}

Provide a clear overview of:
1. Directory structure and organization
2. What each major directory/module contains
3. How the codebase is organized (by feature, by layer, etc.)
4. Entry points and key files

Present the structure in a clear, visual way using markdown.`;
    } else if (isSearch) {
      systemPrompt = `You are an expert code assistant. The user is searching the repository "${repo.full_name}" for: "${commandArg || 'everything'}".
Below are the most relevant files found by semantic search:

${context || 'No matching files found.'}

Present the search results clearly:
1. List each relevant file with a brief explanation of why it matches
2. Highlight the most important/relevant matches first
3. Show key code snippets or patterns that relate to the search term
4. Explain how the matching files relate to each other if applicable

Be concise but informative. Use markdown formatting.`;
    } else if (isTrace) {
      systemPrompt = `You are an expert code assistant. The user wants to trace the execution flow of "${commandArg || 'the main application'}" in the repository "${repo.full_name}".
Below are ALL the analyzed files with their summaries and content:

${context || 'No files have been analyzed yet.'}

Trace the execution flow step by step:
1. Start from the entry point or the specified starting point
2. Follow the call chain through each file/function
3. Show the data flow — what gets passed between functions/components
4. Highlight important side effects, API calls, or state changes
5. Use a numbered sequence with file paths and function names

Format as a clear step-by-step trace using markdown. Include relevant code references.`;
    } else {
      systemPrompt = `You are an expert code assistant helping developers understand a codebase. 
You have access to the following files and their contents from the repository "${repo.full_name}":

${context || 'No files have been analyzed yet.'}

When answering questions:
1. Reference specific files and line numbers when relevant
2. Explain code patterns and architecture decisions
3. Provide code examples when helpful
4. Be concise but thorough
5. If you're unsure about something, say so`;
    }

    // Append formatting rules to all prompts
    systemPrompt += `\n\nIMPORTANT FORMATTING RULES:
- Use proper markdown: ## for headings, ### for subheadings. NEVER use === or --- underline-style headings.
- Use backticks for inline code and triple backticks for code blocks.
- Use bullet points and numbered lists for clarity.`;

    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...previousMessages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user' as const, content: question },
    ];

    // Get AI response
    let answer = await nvidiaService.chat(messages);

    // Clean up underline-style headings (===, ---) that some models produce
    answer = answer.replace(/^(.+)\n={3,}\s*$/gm, '## $1');
    answer = answer.replace(/^(.+)\n-{3,}\s*$/gm, '### $1');
    // Also clean inline === patterns like "Heading ============="
    answer = answer.replace(/\s*={3,}\s*/g, '\n\n');

    // Save messages to session
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

    await supabase
      .from('chat_histories')
      .update({ messages: updatedMessages })
      .eq('session_id', activeSessionId);

    res.json({
      answer,
      referencedFiles,
      sessionId: activeSessionId,
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

    const { data: repo } = await supabase
      .from('repositories')
      .select('id')
      .eq('id', repoId)
      .eq('user_id', req.userId!)
      .single<Pick<Repository, 'id'>>();

    if (!repo) {
      return res.status(404).json({ error: 'Repository not found' });
    }

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

// List chat sessions for a repo
router.get('/:repoId/sessions', authMiddleware, async (req: Request, res: Response) => {
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

    const { data: sessions, error } = await supabase
      .from('chat_histories')
      .select('session_id, title, updated_at')
      .eq('user_id', req.userId!)
      .eq('repo_id', repoId)
      .order('updated_at', { ascending: false })
      .returns<Pick<ChatHistory, 'session_id' | 'title' | 'updated_at'>[]>();

    if (error) throw error;

    res.json({ sessions: sessions || [] });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// Get chat history for a specific session
router.get('/:repoId/chat/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { repoId, sessionId } = req.params;

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
      .eq('session_id', sessionId)
      .eq('user_id', req.userId!)
      .single<Pick<ChatHistory, 'messages'>>();

    res.json({ messages: chatHistory?.messages || [] });
  } catch (error) {
    console.error('Get chat history error:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Delete a specific chat session
router.delete('/:repoId/chat/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { repoId, sessionId } = req.params;

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
      .eq('session_id', sessionId)
      .eq('user_id', req.userId!);

    res.json({ message: 'Chat session deleted' });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

export default router;
