import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './index';

// Simple table types without the complex Database generic
export interface User {
  id: string;
  github_id: string;
  username: string;
  email: string | null;
  avatar: string | null;
  access_token: string;
  created_at: string;
  updated_at: string;
}

export interface Repository {
  id: string;
  user_id: string;
  github_repo_id: string;
  name: string;
  full_name: string;
  description: string | null;
  url: string;
  default_branch: string;
  languages: Record<string, number>;
  frameworks: string[];
  architecture: 'monolith' | 'microservices' | 'serverless' | 'modular' | 'mvc' | 'unknown' | null;
  total_files: number;
  last_analyzed: string | null;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  created_at: string;
  updated_at: string;
}

export interface FileNode {
  id: string;
  repo_id: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  language: string | null;
  size: number;
  content: string | null;
  imports: string[];
  exports: string[];
  summary: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  referenced_files?: string[];
  timestamp: string;
}

export interface ChatHistory {
  id: string;
  user_id: string;
  repo_id: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface MatchFileNodeResult {
  id: string;
  path: string;
  name: string;
  summary: string | null;
  content: string | null;
  similarity: number;
}

// Create untyped client for flexibility
export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.anonKey
);
