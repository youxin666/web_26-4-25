CREATE TABLE IF NOT EXISTS job_match_reports (
    id TEXT PRIMARY KEY,
    job_description TEXT NOT NULL,
    overall_score INTEGER NOT NULL DEFAULT 0 CHECK (overall_score BETWEEN 0 AND 100),
    match_level TEXT NOT NULL,
    dimension_scores TEXT NOT NULL,
    highlights TEXT NOT NULL,
    gaps TEXT NOT NULL,
    summary TEXT NOT NULL,
    is_ai_powered INTEGER NOT NULL DEFAULT 0 CHECK (is_ai_powered IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_match_reports_created
ON job_match_reports (created_at DESC);
