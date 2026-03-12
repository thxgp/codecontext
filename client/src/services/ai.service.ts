import api from './api';
import { AskResponse, ChatMessage } from '../types';

export const aiService = {
  ask: async (repoId: string, question: string): Promise<AskResponse> => {
    const { data } = await api.post(`/ai/${repoId}/ask`, { question });
    return data;
  },

  search: async (repoId: string, query: string) => {
    const { data } = await api.get(`/ai/${repoId}/search`, { params: { q: query } });
    return data.results || [];
  },

  getChatHistory: async (repoId: string): Promise<ChatMessage[]> => {
    const { data } = await api.get(`/ai/${repoId}/chat`);
    return data.messages || [];
  },

  clearChatHistory: async (repoId: string): Promise<void> => {
    await api.delete(`/ai/${repoId}/chat`);
  },
};
