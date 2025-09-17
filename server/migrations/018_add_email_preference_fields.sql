-- Migration: Add additional email notification preference fields to users table
-- This migration adds granular email notification preferences

-- Add new email preference columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS class_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS payment_reminders BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS certificate_notifications BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS general_updates BOOLEAN DEFAULT true;

-- Add comments for documentation
COMMENT ON COLUMN users.class_reminders IS 'User preference for class reminder emails';
COMMENT ON COLUMN users.payment_reminders IS 'User preference for payment reminder emails';
COMMENT ON COLUMN users.certificate_notifications IS 'User preference for certificate notification emails';
COMMENT ON COLUMN users.general_updates IS 'User preference for general update emails';

-- Create indexes for better query performance on email preferences
CREATE INDEX IF NOT EXISTS idx_users_email_notifications ON users(email_notifications);
CREATE INDEX IF NOT EXISTS idx_users_class_reminders ON users(class_reminders);
CREATE INDEX IF NOT EXISTS idx_users_payment_reminders ON users(payment_reminders);
CREATE INDEX IF NOT EXISTS idx_users_certificate_notifications ON users(certificate_notifications);
CREATE INDEX IF NOT EXISTS idx_users_general_updates ON users(general_updates);
