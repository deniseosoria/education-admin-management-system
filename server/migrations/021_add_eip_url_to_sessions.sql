-- Add EIP_url column to class_sessions table
ALTER TABLE class_sessions 
ADD COLUMN IF NOT EXISTS EIP_url VARCHAR(255);

-- Add comment to document the column
COMMENT ON COLUMN class_sessions.EIP_url IS 'EIP (Educational Incentive Program) URL for this session. Used in enrollment pending emails when payment method is EIP.';

