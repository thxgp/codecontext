import { create } from 'zustand';
import { Repository, FileTreeNode, FileNode, ChatMessage, ChatSession } from '../types';
import { repoService, aiService } from '../services';

interface RepoState {
  repos: Repository[];
  currentRepo: Repository | null;
  fileTree: FileTreeNode | FileTreeNode[] | null;
  selectedFile: FileNode | null;
  chatMessages: ChatMessage[];
  chatSessions: ChatSession[];
  activeSessionId: string | null;
  isLoading: boolean;
  isChatLoading: boolean;
  abortController: AbortController | null;

  // Actions
  fetchRepos: () => Promise<void>;
  fetchRepo: (id: string) => Promise<void>;
  fetchFileTree: (repoId: string) => Promise<void>;
  fetchFile: (repoId: string, filePath: string) => Promise<void>;
  importRepo: (url: string) => Promise<Repository>;
  deleteRepo: (id: string) => Promise<void>;
  askQuestion: (repoId: string, question: string) => Promise<void>;
  abortGeneration: () => void;
  fetchSessions: (repoId: string) => Promise<void>;
  selectSession: (repoId: string, sessionId: string) => Promise<void>;
  newChat: () => void;
  deleteSession: (repoId: string, sessionId: string) => Promise<void>;
  clearCurrentRepo: () => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  currentRepo: null,
  fileTree: null,
  selectedFile: null,
  chatMessages: [],
  chatSessions: [],
  activeSessionId: null,
  isLoading: false,
  isChatLoading: false,
  abortController: null,

  fetchRepos: async () => {
    set({ isLoading: true });
    try {
      const repos = await repoService.getRepos();
      set({ repos });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchRepo: async (id: string) => {
    set({ isLoading: true });
    try {
      const repo = await repoService.getRepo(id);
      set({ currentRepo: repo });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchFileTree: async (repoId: string) => {
    try {
      const tree = await repoService.getStructure(repoId);
      set({ fileTree: tree });
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
    }
  },

  fetchFile: async (repoId: string, filePath: string) => {
    try {
      const file = await repoService.getFile(repoId, filePath);
      set({ selectedFile: file });
    } catch (error) {
      console.error('Failed to fetch file:', error);
    }
  },

  importRepo: async (url: string) => {
    const repo = await repoService.importRepo(url);
    set((state) => ({ repos: [repo, ...state.repos] }));
    return repo;
  },

  deleteRepo: async (id: string) => {
    await repoService.deleteRepo(id);
    set((state) => ({ repos: state.repos.filter(r => r.id !== id) }));
  },

  askQuestion: async (repoId: string, question: string) => {
    const controller = new AbortController();
    set({ isChatLoading: true, abortController: controller });
    
    const userMessage: ChatMessage = {
      role: 'user',
      content: question,
      referencedFiles: [],
      timestamp: new Date().toISOString()
    };
    
    set((state) => ({
      chatMessages: [...state.chatMessages, userMessage]
    }));

    try {
      const { activeSessionId } = get();
      const response = await aiService.ask(repoId, question, activeSessionId || undefined, controller.signal);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        referencedFiles: (response.referencedFiles || []).map((f: string | { path: string }) =>
          typeof f === 'string' ? f : f.path
        ),
        timestamp: new Date().toISOString()
      };
      
      // If this was a new session (no activeSessionId), store the returned sessionId
      if (!activeSessionId && response.sessionId) {
        set((state) => ({
          activeSessionId: response.sessionId,
          chatMessages: [...state.chatMessages, assistantMessage],
          chatSessions: [
            {
              sessionId: response.sessionId,
              title: question.length > 60 ? question.slice(0, 57) + '...' : question,
              updatedAt: new Date().toISOString(),
            },
            ...state.chatSessions,
          ],
        }));
      } else {
        set((state) => ({
          chatMessages: [...state.chatMessages, assistantMessage],
          chatSessions: state.chatSessions.map((s) =>
            s.sessionId === activeSessionId
              ? { ...s, updatedAt: new Date().toISOString() }
              : s
          ),
        }));
      }
    } catch (error: any) {
      if (error?.name === 'CanceledError' || error?.message?.includes('aborted')) {
        console.log('Chat generation aborted');
        // Do not remove the user's message so they can see what they asked and edit/retry
        return;
      }
      set((state) => ({
        chatMessages: state.chatMessages.slice(0, -1)
      }));
      throw error;
    } finally {
      set({ isChatLoading: false, abortController: null });
    }
  },

  abortGeneration: () => {
    const { abortController } = get();
    if (abortController) {
      abortController.abort();
      set({ abortController: null, isChatLoading: false });
    }
  },

  fetchSessions: async (repoId: string) => {
    try {
      const sessions = await aiService.getSessions(repoId);
      set({ chatSessions: sessions });
      
      // Auto-select the most recent session if none is active
      if (sessions.length > 0 && !get().activeSessionId) {
        const latest = sessions[0];
        set({ activeSessionId: latest.sessionId });
        // Load its messages
        const messages = await aiService.getChatHistory(repoId, latest.sessionId);
        const normalized = (messages || []).map((m: ChatMessage & { referenced_files?: string[] }) => ({
          role: m.role,
          content: m.content,
          referencedFiles: m.referencedFiles || m.referenced_files || [],
          timestamp: m.timestamp,
        }));
        set({ chatMessages: normalized });
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  },

  selectSession: async (repoId: string, sessionId: string) => {
    set({ activeSessionId: sessionId, chatMessages: [] });
    try {
      const messages = await aiService.getChatHistory(repoId, sessionId);
      const normalized = (messages || []).map((m: ChatMessage & { referenced_files?: string[] }) => ({
        role: m.role,
        content: m.content,
        referencedFiles: m.referencedFiles || m.referenced_files || [],
        timestamp: m.timestamp,
      }));
      set({ chatMessages: normalized });
    } catch (error) {
      console.error('Failed to load session messages:', error);
    }
  },

  newChat: () => {
    set({ activeSessionId: null, chatMessages: [] });
  },

  deleteSession: async (repoId: string, sessionId: string) => {
    try {
      await aiService.deleteSession(repoId, sessionId);
    } catch (error) {
      console.error('Failed to delete session on server:', error);
    }
    set((state) => {
      const remaining = state.chatSessions.filter((s) => s.sessionId !== sessionId);
      const wasActive = state.activeSessionId === sessionId;
      return {
        chatSessions: remaining,
        activeSessionId: wasActive ? (remaining[0]?.sessionId || null) : state.activeSessionId,
        chatMessages: wasActive ? [] : state.chatMessages,
      };
    });
    // If we deleted the active session and there's a replacement, load its messages
    const { activeSessionId } = get();
    if (activeSessionId) {
      try {
        const messages = await aiService.getChatHistory(repoId, activeSessionId);
        const normalized = (messages || []).map((m: ChatMessage & { referenced_files?: string[] }) => ({
          role: m.role,
          content: m.content,
          referencedFiles: m.referencedFiles || m.referenced_files || [],
          timestamp: m.timestamp,
        }));
        set({ chatMessages: normalized });
      } catch {
        // Ignore — messages will be empty
      }
    }
  },

  clearCurrentRepo: () => {
    set({ 
      currentRepo: null, 
      fileTree: null, 
      selectedFile: null,
      chatMessages: [],
      chatSessions: [],
      activeSessionId: null,
    });
  }
}));
