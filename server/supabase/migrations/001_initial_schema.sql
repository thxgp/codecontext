-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  email TEXT,
  avatar TEXT,
  access_token TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Repositories table
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  github_repo_id TEXT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  languages JSONB DEFAULT '{}',
  frameworks TEXT[] DEFAULT '{}',
  architecture TEXT CHECK (architecture IN ('monolith', 'microservices', 'serverless', 'modular', 'mvc', 'unknown')),
  total_files INTEGER DEFAULT 0,
  last_analyzed TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_repositories_user_id ON repositories(user_id);
CREATE INDEX idx_repositories_full_name ON repositories(full_name);

-- File nodes table
CREATE TABLE file_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('file', 'directory')),
  language TEXT,
  size INTEGER DEFAULT 0,
  content TEXT,
  imports TEXT[] DEFAULT '{}',
  exports TEXT[] DEFAULT '{}',
  summary TEXT,
  embedding VECTOR(1024),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(repo_id, path)
);

CREATE INDEX idx_file_nodes_repo_id ON file_nodes(repo_id);
CREATE INDEX idx_file_nodes_repo_type ON file_nodes(repo_id, type);
CREATE INDEX idx_file_nodes_embedding ON file_nodes USING hnsw (embedding vector_cosine_ops);

-- File annotations table
CREATE TABLE file_annotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_node_id UUID NOT NULL REFERENCES file_nodes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  line_start INTEGER,
  line_end INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_file_annotations_file_node_id ON file_annotations(file_node_id);

-- Chat histories table
CREATE TABLE chat_histories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  repo_id UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, repo_id)
);

CREATE INDEX idx_chat_histories_user_repo ON chat_histories(user_id, repo_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_repositories_updated_at BEFORE UPDATE ON repositories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_nodes_updated_at BEFORE UPDATE ON file_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chat_histories_updated_at BEFORE UPDATE ON chat_histories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Helper function for semantic search
CREATE OR REPLACE FUNCTION match_file_nodes(
  query_embedding VECTOR(1024),
  match_repo_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  path TEXT,
  name TEXT,
  summary TEXT,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fn.id,
    fn.path,
    fn.name,
    fn.summary,
    fn.content,
    1 - (fn.embedding <=> query_embedding) AS similarity
  FROM file_nodes fn
  WHERE fn.repo_id = match_repo_id
    AND fn.embedding IS NOT NULL
    AND 1 - (fn.embedding <=> query_embedding) > match_threshold
  ORDER BY fn.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
