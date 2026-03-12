import axios from 'axios';
import { config } from '../config/index.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
  }>;
}

export class NvidiaService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = config.nvidia.apiKey;
    this.baseUrl = config.nvidia.baseUrl;
  }

  private get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json'
    };
  }

  async chat(messages: ChatMessage[], maxTokens = 1024): Promise<string> {
    try {
      const response = await axios.post<ChatResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: config.nvidia.chatModel,
          messages,
          max_tokens: maxTokens,
          temperature: 0.7
        },
        { headers: this.headers }
      );

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('NVIDIA chat error:', error);
      throw new Error('Failed to get AI response');
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    return this.getEmbedding(text);
  }

  async getEmbedding(text: string, inputType: 'query' | 'passage' = 'passage'): Promise<number[]> {
    try {
      const response = await axios.post<EmbeddingResponse>(
        `${this.baseUrl}/embeddings`,
        {
          model: config.nvidia.embeddingModel,
          input: text,
          input_type: inputType,
          encoding_format: 'float',
          truncate: 'END'
        },
        { headers: this.headers }
      );

      return response.data.data[0]?.embedding || [];
    } catch (error) {
      console.error('NVIDIA embedding error:', error);
      throw new Error('Failed to generate embedding');
    }
  }

  async getEmbeddings(texts: string[], inputType: 'query' | 'passage' = 'passage'): Promise<number[][]> {
    try {
      const response = await axios.post<EmbeddingResponse>(
        `${this.baseUrl}/embeddings`,
        {
          model: config.nvidia.embeddingModel,
          input: texts,
          input_type: inputType,
          encoding_format: 'float',
          truncate: 'END'
        },
        { headers: this.headers }
      );

      return response.data.data.map(d => d.embedding);
    } catch (error) {
      console.error('NVIDIA embeddings error:', error);
      throw new Error('Failed to generate embeddings');
    }
  }
}

export const nvidiaService = new NvidiaService();
