ALTER TABLE blog_users ADD COLUMN avatar_key TEXT;
ALTER TABLE blog_users ADD COLUMN avatar_mime_type TEXT;
ALTER TABLE blog_users ADD COLUMN bio TEXT NOT NULL DEFAULT '';
ALTER TABLE blog_users ADD COLUMN updated_at TEXT;

CREATE INDEX IF NOT EXISTS idx_blog_users_public_profile
  ON blog_users(id, display_name);
