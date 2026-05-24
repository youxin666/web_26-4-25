CREATE TABLE IF NOT EXISTS interview_requests (
    id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    position TEXT NOT NULL,
    recruiter TEXT NOT NULL,
    contact TEXT NOT NULL,
    interview_time TEXT,
    channel TEXT NOT NULL DEFAULT '电话沟通',
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_interview_requests_created
ON interview_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_interview_requests_status_created
ON interview_requests (status, created_at DESC);
