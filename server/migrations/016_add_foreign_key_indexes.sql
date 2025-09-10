-- Migration: Add Missing Foreign Key Indexes
-- This migration adds indexes on foreign key columns to improve query performance
-- Addresses "Unindexed foreign keys" warnings from Supabase Security Advisor

-- ============================================================================
-- CERTIFICATES TABLE - Add missing foreign key indexes
-- ============================================================================

-- Add index for certificates.uploaded_by foreign key
CREATE INDEX IF NOT EXISTS idx_certificates_uploaded_by 
ON public.certificates (uploaded_by);

-- ============================================================================
-- CLASS_SESSIONS TABLE - Add missing foreign key indexes
-- ============================================================================

-- Add index for class_sessions.instructor_id foreign key
CREATE INDEX IF NOT EXISTS idx_class_sessions_instructor_id 
ON public.class_sessions (instructor_id);

-- ============================================================================
-- ENROLLMENTS TABLE - Add missing foreign key indexes
-- ============================================================================

-- Add index for enrollments.class_id foreign key
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id 
ON public.enrollments (class_id);

-- Add index for enrollments.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id 
ON public.enrollments (user_id);

-- Add index for enrollments.reviewed_by foreign key
CREATE INDEX IF NOT EXISTS idx_enrollments_reviewed_by 
ON public.enrollments (reviewed_by);

-- ============================================================================
-- HISTORICAL_ENROLLMENTS TABLE - Add missing foreign key indexes
-- ============================================================================

-- Add index for historical_enrollments.historical_session_id foreign key
CREATE INDEX IF NOT EXISTS idx_historical_enrollments_historical_session_id 
ON public.historical_enrollments (historical_session_id);

-- ============================================================================
-- PAYMENTS TABLE - Add missing foreign key indexes
-- ============================================================================

-- Add index for payments.class_id foreign key
CREATE INDEX IF NOT EXISTS idx_payments_class_id 
ON public.payments (class_id);

-- Add index for payments.user_id foreign key
CREATE INDEX IF NOT EXISTS idx_payments_user_id 
ON public.payments (user_id);

-- Add index for payments.refunded_by foreign key
CREATE INDEX IF NOT EXISTS idx_payments_refunded_by 
ON public.payments (refunded_by);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count foreign key indexes after creation
DO $$
DECLARE
    fk_index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_index_count
    FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND indexname LIKE 'idx_%_%_id' 
    AND indexname LIKE '%_fk%' OR indexname LIKE '%_by' OR indexname LIKE '%_id';
    
    RAISE NOTICE 'Foreign key indexes created: %', fk_index_count;
END $$;

-- List all foreign key indexes
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE 'Foreign key indexes:';
    FOR rec IN 
        SELECT indexname, tablename, indexdef
        FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND (indexname LIKE 'idx_%_%_id' OR indexname LIKE '%_fk%' OR indexname LIKE '%_by')
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE '  % on %', rec.indexname, rec.tablename;
    END LOOP;
END $$;
