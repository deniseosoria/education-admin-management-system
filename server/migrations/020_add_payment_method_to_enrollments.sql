-- Add payment_method column to enrollments table
ALTER TABLE enrollments 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- Add payment_method column to historical_enrollments table
ALTER TABLE historical_enrollments 
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20);

-- Add comment to document the column
COMMENT ON COLUMN enrollments.payment_method IS 'Payment method: Self (personal payment) or EIP (scholarship application)';
COMMENT ON COLUMN historical_enrollments.payment_method IS 'Payment method: Self (personal payment) or EIP (scholarship application)';

