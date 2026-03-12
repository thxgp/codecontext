import api from './api';
import { AskResponse, ChatMessage, ChatSession } from '../types';

export const aiService = {
  ask: async (repoId: string, question: string, sessionId?: string, signal?: AbortSignal): Promise<AskResponse> => {
    const { data } = await api.post(`/ai/${repoId}/ask`, { question, sessionId }, { signal });
    return data;
  },

  search: async (repoId: string, query: string) => {
    const { data } = await api.get(`/ai/${repoId}/search`, { params: { q: query } });
    return data.results || [];
  },

  getSessions: async (repoId: string): Promise<ChatSession[]> => {
    const { data } = await api.get(`/ai/${repoId}/sessions`);
    return (data.sessions || []).map((s: { session_id: string; title: string; updated_at: string }) => ({
      sessionId: s.session_id,
      title: s.title,
      updatedAt: s.updated_at,
    }));
  },

  getChatHistory: async (repoId: string, sessionId: string): Promise<ChatMessage[]> => {
    const { data } = await api.get(`/ai/${repoId}/chat/${sessionId}`);
    return data.messages || [];
  },

  deleteSession: async (repoId: string, sessionId: string): Promise<void> => {
    await api.delete(`/ai/${repoId}/chat/${sessionId}`);
  },
};
