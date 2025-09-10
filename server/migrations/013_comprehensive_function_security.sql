-- Migration: Comprehensive Function Search Path Security Fix
-- This migration addresses the specific Supabase Security Advisor warnings about mutable search_path

-- Drop and recreate functions with proper search_path configuration
-- Supabase requires the search_path to be set at the function level, not inside the function body

-- Drop existing functions
DROP FUNCTION IF EXISTS public.update_users_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

-- Recreate update_users_updated_at function with proper search_path configuration
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Recreate update_updated_at_column function with proper search_path configuration
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Recreate triggers to use the new functions
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_users_updated_at();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at
    BEFORE UPDATE ON classes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_class_waitlist_updated_at ON class_waitlist;
CREATE TRIGGER update_class_waitlist_updated_at
    BEFORE UPDATE ON class_waitlist
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_notifications_updated_at ON user_notifications;
CREATE TRIGGER update_user_notifications_updated_at
    BEFORE UPDATE ON user_notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER update_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_certificates_updated_at ON certificates;
CREATE TRIGGER update_certificates_updated_at
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments for documentation
COMMENT ON FUNCTION public.update_users_updated_at() IS 'Updates the updated_at timestamp for users table with empty search_path for security';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Generic function to update updated_at timestamp with empty search_path for security';

-- Verify functions are properly secured
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proconfig as search_path_config
FROM pg_proc 
WHERE proname IN ('update_users_updated_at', 'update_updated_at_column')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
