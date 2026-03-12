-- Add session support to chat_histories
-- Each repo can have multiple chat sessions per user

-- Add session_id column (UUID, not null, with default)
ALTER TABLE chat_histories ADD COLUMN session_id UUID NOT NULL DEFAULT gen_random_uuid();

-- Add a title for each session (auto-generated from first message)
ALTER TABLE chat_histories ADD COLUMN title TEXT NOT NULL DEFAULT 'New Chat';

-- Drop old unique constraint (one chat per user per repo)
ALTER TABLE chat_histories DROP CONSTRAINT IF EXISTS chat_histories_user_id_repo_id_key;

-- Add new unique constraint (one chat per session)
ALTER TABLE chat_histories ADD CONSTRAINT chat_histories_session_unique UNIQUE (session_id);

-- Index for listing sessions by repo
CREATE INDEX IF NOT EXISTS idx_chat_histories_user_repo ON chat_histories (user_id, repo_id, updated_at DESC);
