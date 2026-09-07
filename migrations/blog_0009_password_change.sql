-- Invalidate older signed-in sessions after a reader changes their password.
ALTER TABLE blog_users ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;
