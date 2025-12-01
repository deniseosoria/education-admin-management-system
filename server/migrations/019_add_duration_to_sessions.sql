-- Add duration column to class_sessions table
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS duration VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN class_sessions.duration IS 'Duration of the session (e.g., "4 weeks", "3 months", "1 day"). Manually entered by admin.';

