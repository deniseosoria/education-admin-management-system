-- Add location_type column to class_sessions table
ALTER TABLE class_sessions ADD COLUMN IF NOT EXISTS location_type VARCHAR(20) CHECK (location_type IN ('zoom', 'in-person'));

-- Add comment for documentation
COMMENT ON COLUMN class_sessions.location_type IS 'Location type for this specific session (zoom or in-person).';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_location_type ON class_sessions(location_type);

