-- Add new status types for better error handling
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'Failed';
ALTER TYPE case_status ADD VALUE IF NOT EXISTS 'Timeout';

-- Create an index for real-time performance
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_updated_at ON cases(updated_at);