-- Create comments table for threaded comments functionality
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fine_id UUID NOT NULL REFERENCES fines(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Create indexes for efficient querying
CREATE INDEX idx_comments_fine_id ON comments(fine_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_comment_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);
CREATE INDEX idx_comments_author_id ON comments(author_id);

-- Enable Row Level Security
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all comments
CREATE POLICY "Comments are viewable by everyone" ON comments
  FOR SELECT USING (true);

-- Users can insert comments if authenticated
CREATE POLICY "Users can insert comments" ON comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

-- Users can update their own comments
CREATE POLICY "Users can update own comments" ON comments
  FOR UPDATE USING (auth.uid() = author_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete own comments" ON comments
  FOR DELETE USING (auth.uid() = author_id);

-- Enable real-time for comments table
ALTER PUBLICATION supabase_realtime ADD TABLE comments;