-- Migration: Fix Function Search Path Security Issues
-- This migration addresses the Supabase Security Advisor warnings about mutable search_path

-- Drop any orphaned functions that might exist
DROP FUNCTION IF EXISTS public.update_enrollments_updated_at() CASCADE;

-- Fix the search_path for existing functions to prevent security issues
-- This ensures functions use a fixed search_path and can't be manipulated

-- Fix update_users_updated_at function
CREATE OR REPLACE FUNCTION public.update_users_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    SET search_path = public;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    SET search_path = public;
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION public.update_users_updated_at() IS 'Updates the updated_at timestamp for users table with fixed search_path for security';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Generic function to update updated_at timestamp with fixed search_path for security';

-- Verify functions are properly secured
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proconfig as search_path_config
FROM pg_proc 
WHERE proname IN ('update_users_updated_at', 'update_updated_at_column')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
