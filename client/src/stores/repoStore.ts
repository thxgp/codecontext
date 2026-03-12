import { create } from 'zustand';
import { Repository, FileTreeNode, FileNode, ChatMessage } from '../types';
import { repoService, aiService } from '../services';

interface RepoState {
  repos: Repository[];
  currentRepo: Repository | null;
  fileTree: FileTreeNode | FileTreeNode[] | null;
  selectedFile: FileNode | null;
  chatMessages: ChatMessage[];
  isLoading: boolean;
  isChatLoading: boolean;

  // Actions
  fetchRepos: () => Promise<void>;
  fetchRepo: (id: string) => Promise<void>;
  fetchFileTree: (repoId: string) => Promise<void>;
  fetchFile: (repoId: string, filePath: string) => Promise<void>;
  importRepo: (url: string) => Promise<Repository>;
  deleteRepo: (id: string) => Promise<void>;
  askQuestion: (repoId: string, question: string) => Promise<void>;
  fetchChatHistory: (repoId: string) => Promise<void>;
  clearChat: (repoId: string) => Promise<void>;
  clearCurrentRepo: () => void;
}

export const useRepoStore = create<RepoState>((set, _get) => ({
  repos: [],
  currentRepo: null,
  fileTree: null,
  selectedFile: null,
  chatMessages: [],
  isLoading: false,
  isChatLoading: false,

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
    set({ isChatLoading: true });
    
    // Add user message immediately
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
      const response = await aiService.ask(repoId, question);
      
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.answer,
        referencedFiles: (response.referencedFiles || []).map((f: any) =>
          typeof f === 'string' ? f : f.path
        ),
        timestamp: new Date().toISOString()
      };
      
      set((state) => ({
        chatMessages: [...state.chatMessages, assistantMessage]
      }));
    } catch (error) {
      // Remove user message on error
      set((state) => ({
        chatMessages: state.chatMessages.slice(0, -1)
      }));
      throw error;
    } finally {
      set({ isChatLoading: false });
    }
  },

  fetchChatHistory: async (repoId: string) => {
    try {
      const messages = await aiService.getChatHistory(repoId);
      // Normalize snake_case from DB to camelCase
      const normalized = (messages || []).map((m: any) => ({
        role: m.role,
        content: m.content,
        referencedFiles: m.referencedFiles || m.referenced_files || [],
        timestamp: m.timestamp,
      }));
      set({ chatMessages: normalized });
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  },

  clearChat: async (repoId: string) => {
    await aiService.clearChatHistory(repoId);
    set({ chatMessages: [] });
  },

  clearCurrentRepo: () => {
    set({ 
      currentRepo: null, 
      fileTree: null, 
      selectedFile: null,
      chatMessages: [] 
    });
  }
}));
