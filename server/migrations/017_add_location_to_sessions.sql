-- Add location_details column to class_sessions table
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS location_details TEXT;

-- Add comment for documentation
COMMENT ON COLUMN class_sessions.location_details IS 'Location details for this specific session. If NULL, inherits from class location_details.';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_location_details ON class_sessions(location_details);
