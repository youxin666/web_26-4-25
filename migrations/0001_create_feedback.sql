CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    comment TEXT NOT NULL,
    contact TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0, 1))
);

CREATE INDEX IF NOT EXISTS idx_feedback_public_created
ON feedback (is_public, created_at DESC);
