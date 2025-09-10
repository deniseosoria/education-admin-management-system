-- Migration: Consolidate Multiple Permissive Policies
-- This migration consolidates multiple permissive policies into single, more efficient policies
-- to resolve "Multiple Permissive Policies" performance warnings

-- ============================================================================
-- CERTIFICATES TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for certificates table
DROP POLICY IF EXISTS "Admins can manage all certificates" ON public.certificates;
DROP POLICY IF EXISTS "Instructors can view their class certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can view own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can create own certificates" ON public.certificates;
DROP POLICY IF EXISTS "Users can update own certificates" ON public.certificates;

-- Create consolidated policies for certificates
CREATE POLICY "certificates_select_policy" ON public.certificates
    FOR SELECT
    USING (
        -- Admins can view all certificates
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can view certificates for their classes
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'instructor'
            AND EXISTS (
                SELECT 1 FROM public.class_sessions 
                WHERE instructor_id = (select auth.uid()) 
                AND class_id = certificates.class_id
            )
        )
        OR
        -- Users can view their own certificates
        user_id = (select auth.uid())
    );

CREATE POLICY "certificates_insert_policy" ON public.certificates
    FOR INSERT
    WITH CHECK (
        -- Admins can create any certificate
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can create their own certificates
        user_id = (select auth.uid())
    );

CREATE POLICY "certificates_update_policy" ON public.certificates
    FOR UPDATE
    USING (
        -- Admins can update any certificate
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can update their own certificates
        user_id = (select auth.uid())
    );

-- ============================================================================
-- CLASS_SESSIONS TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for class_sessions table
DROP POLICY IF EXISTS "Admins can manage all sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Anyone can view active sessions" ON public.class_sessions;
DROP POLICY IF EXISTS "Instructors can manage their sessions" ON public.class_sessions;

-- Create consolidated policies for class_sessions
CREATE POLICY "class_sessions_select_policy" ON public.class_sessions
    FOR SELECT
    USING (
        -- Admins can view all sessions
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Anyone can view active sessions (public access)
        deleted_at IS NULL
        OR
        -- Instructors can view their own sessions
        instructor_id = (select auth.uid())
    );

CREATE POLICY "class_sessions_insert_policy" ON public.class_sessions
    FOR INSERT
    WITH CHECK (
        -- Admins can create any session
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can create sessions for their classes
        instructor_id = (select auth.uid())
    );

CREATE POLICY "class_sessions_update_policy" ON public.class_sessions
    FOR UPDATE
    USING (
        -- Admins can update any session
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can update their own sessions
        instructor_id = (select auth.uid())
    );

CREATE POLICY "class_sessions_delete_policy" ON public.class_sessions
    FOR DELETE
    USING (
        -- Admins can delete any session
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can delete their own sessions
        instructor_id = (select auth.uid())
    );

-- ============================================================================
-- CLASS_WAITLIST TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for class_waitlist table
DROP POLICY IF EXISTS "Admins can manage all waitlist entries" ON public.class_waitlist;
DROP POLICY IF EXISTS "Instructors can view their class waitlists" ON public.class_waitlist;
DROP POLICY IF EXISTS "Users can view own waitlist entries" ON public.class_waitlist;
DROP POLICY IF EXISTS "Users can create own waitlist entries" ON public.class_waitlist;
DROP POLICY IF EXISTS "Users can update own waitlist entries" ON public.class_waitlist;

-- Create consolidated policies for class_waitlist
CREATE POLICY "class_waitlist_select_policy" ON public.class_waitlist
    FOR SELECT
    USING (
        -- Admins can view all waitlist entries
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can view waitlists for their classes
        EXISTS (
            SELECT 1 FROM public.class_sessions 
            WHERE class_id = class_waitlist.class_id 
            AND instructor_id = (select auth.uid())
        )
        OR
        -- Users can view their own waitlist entries
        user_id = (select auth.uid())
    );

CREATE POLICY "class_waitlist_insert_policy" ON public.class_waitlist
    FOR INSERT
    WITH CHECK (
        -- Admins can create any waitlist entry
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can create their own waitlist entries
        user_id = (select auth.uid())
    );

CREATE POLICY "class_waitlist_update_policy" ON public.class_waitlist
    FOR UPDATE
    USING (
        -- Admins can update any waitlist entry
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can update their own waitlist entries
        user_id = (select auth.uid())
    );

-- ============================================================================
-- CLASSES TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for classes table
DROP POLICY IF EXISTS "Admins can manage all classes" ON public.classes;
DROP POLICY IF EXISTS "Anyone can view active classes" ON public.classes;
DROP POLICY IF EXISTS "Instructors can view their classes" ON public.classes;

-- Create consolidated policies for classes
CREATE POLICY "classes_select_policy" ON public.classes
    FOR SELECT
    USING (
        -- Admins can view all classes
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Anyone can view active classes (public access)
        deleted_at IS NULL
        OR
        -- Instructors can view their own classes
        EXISTS (
            SELECT 1 FROM public.class_sessions 
            WHERE class_id = classes.id 
            AND instructor_id = (select auth.uid())
        )
    );

-- ============================================================================
-- ENROLLMENTS TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for enrollments table
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Instructors can view their class enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "Users can create own enrollments" ON public.enrollments;

-- Create consolidated policies for enrollments
CREATE POLICY "enrollments_select_policy" ON public.enrollments
    FOR SELECT
    USING (
        -- Admins can view all enrollments
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can view enrollments for their classes
        EXISTS (
            SELECT 1 FROM public.class_sessions 
            WHERE class_id = enrollments.class_id 
            AND instructor_id = (select auth.uid())
        )
        OR
        -- Users can view their own enrollments
        user_id = (select auth.uid())
    );

CREATE POLICY "enrollments_insert_policy" ON public.enrollments
    FOR INSERT
    WITH CHECK (
        -- Admins can create any enrollment
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can create their own enrollments
        user_id = (select auth.uid())
    );

-- ============================================================================
-- HISTORICAL_ENROLLMENTS TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for historical_enrollments table
DROP POLICY IF EXISTS "Admins can view all historical enrollments" ON public.historical_enrollments;
DROP POLICY IF EXISTS "Users can view own historical enrollments" ON public.historical_enrollments;

-- Create consolidated policies for historical_enrollments
CREATE POLICY "historical_enrollments_select_policy" ON public.historical_enrollments
    FOR SELECT
    USING (
        -- Admins can view all historical enrollments
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can view their own historical enrollments
        user_id = (select auth.uid())
    );

-- ============================================================================
-- NOTIFICATION_TEMPLATES TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for notification_templates table
DROP POLICY IF EXISTS "Admins can manage notification templates" ON public.notification_templates;
DROP POLICY IF EXISTS "Instructors can view notification templates" ON public.notification_templates;

-- Create consolidated policies for notification_templates
CREATE POLICY "notification_templates_select_policy" ON public.notification_templates
    FOR SELECT
    USING (
        -- Admins can view all notification templates
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can view notification templates
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'instructor'
        )
    );

-- ============================================================================
-- PAYMENTS TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for payments table
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can create own payments" ON public.payments;

-- Create consolidated policies for payments
CREATE POLICY "payments_select_policy" ON public.payments
    FOR SELECT
    USING (
        -- Admins can view all payments
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can view their own payments
        user_id = (select auth.uid())
    );

CREATE POLICY "payments_insert_policy" ON public.payments
    FOR INSERT
    WITH CHECK (
        -- Admins can create any payment
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can create their own payments
        user_id = (select auth.uid())
    );

-- ============================================================================
-- USER_ACTIVITY_LOG TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for user_activity_log table
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_log;
DROP POLICY IF EXISTS "Users can view own activity log" ON public.user_activity_log;

-- Create consolidated policies for user_activity_log
CREATE POLICY "user_activity_log_select_policy" ON public.user_activity_log
    FOR SELECT
    USING (
        -- Admins can view all activity logs
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can view their own activity logs
        user_id = (select auth.uid())
    );

-- ============================================================================
-- USER_NOTIFICATIONS TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for user_notifications table
DROP POLICY IF EXISTS "Admins can manage all notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.user_notifications;

-- Create consolidated policies for user_notifications
CREATE POLICY "user_notifications_select_policy" ON public.user_notifications
    FOR SELECT
    USING (
        -- Admins can view all notifications
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can view their own notifications
        user_id = (select auth.uid())
    );

CREATE POLICY "user_notifications_insert_policy" ON public.user_notifications
    FOR INSERT
    WITH CHECK (
        -- Admins can create any notification
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can create their own notifications
        user_id = (select auth.uid())
    );

CREATE POLICY "user_notifications_update_policy" ON public.user_notifications
    FOR UPDATE
    USING (
        -- Admins can update any notification
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can update their own notifications
        user_id = (select auth.uid())
    );

-- ============================================================================
-- USERS TABLE - Consolidate policies
-- ============================================================================

-- Drop existing policies for users table
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Instructors can view their students" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Create consolidated policies for users
CREATE POLICY "users_select_policy" ON public.users
    FOR SELECT
    USING (
        -- Admins can view all users
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Instructors can view their students
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'instructor'
            AND EXISTS (
                SELECT 1 FROM public.enrollments 
                WHERE user_id = users.id 
                AND EXISTS (
                    SELECT 1 FROM public.class_sessions 
                    WHERE class_id = enrollments.class_id 
                    AND instructor_id = (select auth.uid())
                )
            )
        )
        OR
        -- Users can view their own profile
        id = (select auth.uid())
    );

CREATE POLICY "users_update_policy" ON public.users
    FOR UPDATE
    USING (
        -- Admins can update any user
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = (select auth.uid()) 
            AND role = 'admin'
        )
        OR
        -- Users can update their own profile
        id = (select auth.uid())
    );

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count policies after consolidation
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    RAISE NOTICE 'Total policies after consolidation: %', policy_count;
END $$;
