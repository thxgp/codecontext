export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
}

export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string;
  url: string;
  default_branch: string;
  languages: Record<string, number>;
  frameworks: string[];
  architecture: 'monolith' | 'microservices' | 'unknown';
  total_files: number;
  last_analyzed: string;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface FileNode {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  language: string;
  size: number;
  content: string;
  imports: string[];
  exports: string[];
  summary: string;
}

export interface FileTreeNode {
  name: string;
  path?: string;
  type: 'file' | 'directory';
  language?: string;
  size?: number;
  summary?: string;
  children?: FileTreeNode[];
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  referencedFiles: string[];
  timestamp: string;
}

export interface AskResponse {
  answer: string;
  referencedFiles: Array<{
    path: string;
    language: string;
    summary: string;
  }>;
  sessionId: string;
}

export interface ChatSession {
  sessionId: string;
  title: string;
  updatedAt: string;
}
