-- Migration: Optimize RLS Policies for Performance
-- This migration addresses the Supabase Security Advisor performance warnings

-- =============================================================================
-- OPTIMIZE AUTH RLS INITIALIZATION PLAN
-- Replace auth.uid() with (select auth.uid()) for better performance
-- =============================================================================

-- Drop and recreate all policies with optimized auth calls

-- USERS TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Instructors can view their students" ON users;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING ((select auth.uid())::text = id::text);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING ((select auth.uid())::text = id::text)
    WITH CHECK ((select auth.uid())::text = id::text);

CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can view their students" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.instructor_id = u.id
            JOIN enrollments e ON e.session_id = cs.id
            WHERE u.id::text = (select auth.uid())::text 
            AND u.role = 'instructor'
            AND e.user_id = users.id
        )
    );

-- CLASSES TABLE - Optimized policies
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Instructors can view their classes" ON classes;

CREATE POLICY "Admins can manage all classes" ON classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can view their classes" ON classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.class_id = classes.id
            WHERE u.id::text = (select auth.uid())::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- CLASS_SESSIONS TABLE - Optimized policies
DROP POLICY IF EXISTS "Admins can manage all sessions" ON class_sessions;
DROP POLICY IF EXISTS "Instructors can manage their sessions" ON class_sessions;

CREATE POLICY "Admins can manage all sessions" ON class_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can manage their sessions" ON class_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'instructor'
            AND instructor_id::text = (select auth.uid())::text
        )
    );

-- CLASS_WAITLIST TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own waitlist entries" ON class_waitlist;
DROP POLICY IF EXISTS "Users can create own waitlist entries" ON class_waitlist;
DROP POLICY IF EXISTS "Users can update own waitlist entries" ON class_waitlist;
DROP POLICY IF EXISTS "Admins can manage all waitlist entries" ON class_waitlist;
DROP POLICY IF EXISTS "Instructors can view their class waitlists" ON class_waitlist;

CREATE POLICY "Users can view own waitlist entries" ON class_waitlist
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can create own waitlist entries" ON class_waitlist
    FOR INSERT WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can update own waitlist entries" ON class_waitlist
    FOR UPDATE USING ((select auth.uid())::text = user_id::text)
    WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Admins can manage all waitlist entries" ON class_waitlist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can view their class waitlists" ON class_waitlist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.class_id = class_waitlist.class_id
            WHERE u.id::text = (select auth.uid())::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- ENROLLMENTS TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Users can create own enrollments" ON enrollments;
DROP POLICY IF EXISTS "Admins can manage all enrollments" ON enrollments;
DROP POLICY IF EXISTS "Instructors can view their class enrollments" ON enrollments;

CREATE POLICY "Users can view own enrollments" ON enrollments
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can create own enrollments" ON enrollments
    FOR INSERT WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Admins can manage all enrollments" ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can view their class enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.id = enrollments.session_id
            WHERE u.id::text = (select auth.uid())::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- PAYMENTS TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own payments" ON payments;
DROP POLICY IF EXISTS "Users can create own payments" ON payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON payments;

CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can create own payments" ON payments
    FOR INSERT WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Admins can manage all payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

-- USER_NOTIFICATIONS TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON user_notifications;
DROP POLICY IF EXISTS "Admins can manage all notifications" ON user_notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON user_notifications;

CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING ((select auth.uid())::text = user_id::text)
    WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Admins can manage all notifications" ON user_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can create notifications" ON user_notifications
    FOR INSERT WITH CHECK (
        (select auth.uid())::text = sender_id::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role IN ('admin', 'instructor')
        )
    );

-- USER_ACTIVITY_LOG TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own activity log" ON user_activity_log;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON user_activity_log;

CREATE POLICY "Users can view own activity log" ON user_activity_log
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Admins can view all activity logs" ON user_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

-- NOTIFICATION_TEMPLATES TABLE - Optimized policies
DROP POLICY IF EXISTS "Admins can manage notification templates" ON notification_templates;
DROP POLICY IF EXISTS "Instructors can view notification templates" ON notification_templates;

CREATE POLICY "Admins can manage notification templates" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can view notification templates" ON notification_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role IN ('admin', 'instructor')
        )
    );

-- CERTIFICATES TABLE - Optimized policies
DROP POLICY IF EXISTS "Users can view own certificates" ON certificates;
DROP POLICY IF EXISTS "Users can create own certificates" ON certificates;
DROP POLICY IF EXISTS "Users can update own certificates" ON certificates;
DROP POLICY IF EXISTS "Admins can manage all certificates" ON certificates;
DROP POLICY IF EXISTS "Instructors can view their class certificates" ON certificates;

CREATE POLICY "Users can view own certificates" ON certificates
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can create own certificates" ON certificates
    FOR INSERT WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Users can update own certificates" ON certificates
    FOR UPDATE USING ((select auth.uid())::text = user_id::text)
    WITH CHECK ((select auth.uid())::text = user_id::text);

CREATE POLICY "Admins can manage all certificates" ON certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Instructors can view their class certificates" ON certificates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.class_id = certificates.class_id
            WHERE u.id::text = (select auth.uid())::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- HISTORICAL TABLES - Optimized policies
DROP POLICY IF EXISTS "Admins can view historical sessions" ON historical_sessions;
DROP POLICY IF EXISTS "Admins can view all historical enrollments" ON historical_enrollments;
DROP POLICY IF EXISTS "Users can view own historical enrollments" ON historical_enrollments;

CREATE POLICY "Admins can view historical sessions" ON historical_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Admins can view all historical enrollments" ON historical_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = (select auth.uid())::text 
            AND role = 'admin'
        )
    );

CREATE POLICY "Users can view own historical enrollments" ON historical_enrollments
    FOR SELECT USING ((select auth.uid())::text = user_id::text);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "Users can view own profile" ON users IS 'Optimized: Uses (select auth.uid()) for better performance';
COMMENT ON POLICY "Users can update own profile" ON users IS 'Optimized: Uses (select auth.uid()) for better performance';
COMMENT ON POLICY "Admins can view all users" ON users IS 'Optimized: Uses (select auth.uid()) for better performance';
COMMENT ON POLICY "Admins can update all users" ON users IS 'Optimized: Uses (select auth.uid()) for better performance';
COMMENT ON POLICY "Instructors can view their students" ON users IS 'Optimized: Uses (select auth.uid()) for better performance';

-- Verify policies are optimized
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
