ALTER TABLE feedback ADD COLUMN status TEXT NOT NULL DEFAULT 'new';

CREATE INDEX IF NOT EXISTS idx_feedback_status_created
ON feedback (status, created_at DESC);
