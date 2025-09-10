-- Migration: Enable Row Level Security (RLS) and create security policies
-- This migration addresses the Supabase Security Advisor warnings about RLS being disabled

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_enrollments ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- USERS TABLE POLICIES
-- =============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid()::text = id::text);

-- Users can update their own profile (except sensitive fields)
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Admins can view all users
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Admins can update all users
CREATE POLICY "Admins can update all users" ON users
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can view students in their classes
CREATE POLICY "Instructors can view their students" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.instructor_id = u.id
            JOIN enrollments e ON e.session_id = cs.id
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'instructor'
            AND e.user_id = users.id
        )
    );

-- =============================================================================
-- CLASSES TABLE POLICIES
-- =============================================================================

-- Everyone can view active classes (public information)
CREATE POLICY "Anyone can view active classes" ON classes
    FOR SELECT USING (deleted_at IS NULL);

-- Admins can manage all classes
CREATE POLICY "Admins can manage all classes" ON classes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can view classes they teach
CREATE POLICY "Instructors can view their classes" ON classes
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.class_id = classes.id
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- =============================================================================
-- CLASS_SESSIONS TABLE POLICIES
-- =============================================================================

-- Everyone can view active sessions
CREATE POLICY "Anyone can view active sessions" ON class_sessions
    FOR SELECT USING (deleted_at IS NULL);

-- Admins can manage all sessions
CREATE POLICY "Admins can manage all sessions" ON class_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can manage their own sessions
CREATE POLICY "Instructors can manage their sessions" ON class_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'instructor'
            AND instructor_id::text = auth.uid()::text
        )
    );

-- =============================================================================
-- CLASS_WAITLIST TABLE POLICIES
-- =============================================================================

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist entries" ON class_waitlist
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create their own waitlist entries
CREATE POLICY "Users can create own waitlist entries" ON class_waitlist
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own waitlist entries
CREATE POLICY "Users can update own waitlist entries" ON class_waitlist
    FOR UPDATE USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can manage all waitlist entries
CREATE POLICY "Admins can manage all waitlist entries" ON class_waitlist
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can view waitlist for their classes
CREATE POLICY "Instructors can view their class waitlists" ON class_waitlist
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.class_id = class_waitlist.class_id
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- =============================================================================
-- ENROLLMENTS TABLE POLICIES
-- =============================================================================

-- Users can view their own enrollments
CREATE POLICY "Users can view own enrollments" ON enrollments
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create their own enrollments
CREATE POLICY "Users can create own enrollments" ON enrollments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can manage all enrollments
CREATE POLICY "Admins can manage all enrollments" ON enrollments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can view enrollments for their classes
CREATE POLICY "Instructors can view their class enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.id = enrollments.session_id
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- =============================================================================
-- PAYMENTS TABLE POLICIES
-- =============================================================================

-- Users can view their own payments
CREATE POLICY "Users can view own payments" ON payments
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create their own payments
CREATE POLICY "Users can create own payments" ON payments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can manage all payments
CREATE POLICY "Admins can manage all payments" ON payments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- =============================================================================
-- USER_NOTIFICATIONS TABLE POLICIES
-- =============================================================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON user_notifications
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON user_notifications
    FOR UPDATE USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can manage all notifications
CREATE POLICY "Admins can manage all notifications" ON user_notifications
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Users can create notifications (for sending to others)
CREATE POLICY "Users can create notifications" ON user_notifications
    FOR INSERT WITH CHECK (
        auth.uid()::text = sender_id::text OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role IN ('admin', 'instructor')
        )
    );

-- =============================================================================
-- USER_ACTIVITY_LOG TABLE POLICIES
-- =============================================================================

-- Users can view their own activity log
CREATE POLICY "Users can view own activity log" ON user_activity_log
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- System can create activity log entries
CREATE POLICY "System can create activity logs" ON user_activity_log
    FOR INSERT WITH CHECK (true);

-- Admins can view all activity logs
CREATE POLICY "Admins can view all activity logs" ON user_activity_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- =============================================================================
-- NOTIFICATION_TEMPLATES TABLE POLICIES
-- =============================================================================

-- Admins can manage notification templates
CREATE POLICY "Admins can manage notification templates" ON notification_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can view notification templates
CREATE POLICY "Instructors can view notification templates" ON notification_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role IN ('admin', 'instructor')
        )
    );

-- =============================================================================
-- CERTIFICATES TABLE POLICIES
-- =============================================================================

-- Users can view their own certificates
CREATE POLICY "Users can view own certificates" ON certificates
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create their own certificates
CREATE POLICY "Users can create own certificates" ON certificates
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own certificates
CREATE POLICY "Users can update own certificates" ON certificates
    FOR UPDATE USING (auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid()::text = user_id::text);

-- Admins can manage all certificates
CREATE POLICY "Admins can manage all certificates" ON certificates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- Instructors can view certificates for their classes
CREATE POLICY "Instructors can view their class certificates" ON certificates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users u
            JOIN class_sessions cs ON cs.class_id = certificates.class_id
            WHERE u.id::text = auth.uid()::text 
            AND u.role = 'instructor'
            AND cs.instructor_id = u.id
        )
    );

-- =============================================================================
-- HISTORICAL_SESSIONS TABLE POLICIES
-- =============================================================================

-- Admins can view all historical sessions
CREATE POLICY "Admins can view historical sessions" ON historical_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- System can create historical sessions
CREATE POLICY "System can create historical sessions" ON historical_sessions
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- HISTORICAL_ENROLLMENTS TABLE POLICIES
-- =============================================================================

-- Users can view their own historical enrollments
CREATE POLICY "Users can view own historical enrollments" ON historical_enrollments
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Admins can view all historical enrollments
CREATE POLICY "Admins can view all historical enrollments" ON historical_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE id::text = auth.uid()::text 
            AND role = 'admin'
        )
    );

-- System can create historical enrollments
CREATE POLICY "System can create historical enrollments" ON historical_enrollments
    FOR INSERT WITH CHECK (true);

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON POLICY "Users can view own profile" ON users IS 'Allows users to view their own profile information';
COMMENT ON POLICY "Users can update own profile" ON users IS 'Allows users to update their own profile (except sensitive admin fields)';
COMMENT ON POLICY "Admins can view all users" ON users IS 'Allows administrators to view all user profiles';
COMMENT ON POLICY "Admins can update all users" ON users IS 'Allows administrators to update any user profile';
COMMENT ON POLICY "Instructors can view their students" ON users IS 'Allows instructors to view profiles of students enrolled in their classes';

COMMENT ON POLICY "Anyone can view active classes" ON classes IS 'Allows public access to view active class information';
COMMENT ON POLICY "Admins can manage all classes" ON classes IS 'Allows administrators to create, update, and delete classes';
COMMENT ON POLICY "Instructors can view their classes" ON classes IS 'Allows instructors to view classes they teach';

COMMENT ON POLICY "Anyone can view active sessions" ON class_sessions IS 'Allows public access to view active session information';
COMMENT ON POLICY "Admins can manage all sessions" ON class_sessions IS 'Allows administrators to create, update, and delete sessions';
COMMENT ON POLICY "Instructors can manage their sessions" ON class_sessions IS 'Allows instructors to manage sessions they teach';

COMMENT ON POLICY "Users can view own waitlist entries" ON class_waitlist IS 'Allows users to view their own waitlist entries';
COMMENT ON POLICY "Users can create own waitlist entries" ON class_waitlist IS 'Allows users to join waitlists for classes';
COMMENT ON POLICY "Users can update own waitlist entries" ON class_waitlist IS 'Allows users to modify their own waitlist entries';
COMMENT ON POLICY "Admins can manage all waitlist entries" ON class_waitlist IS 'Allows administrators to manage all waitlist entries';
COMMENT ON POLICY "Instructors can view their class waitlists" ON class_waitlist IS 'Allows instructors to view waitlists for their classes';

COMMENT ON POLICY "Users can view own enrollments" ON enrollments IS 'Allows users to view their own enrollments';
COMMENT ON POLICY "Users can create own enrollments" ON enrollments IS 'Allows users to enroll in classes';
COMMENT ON POLICY "Admins can manage all enrollments" ON enrollments IS 'Allows administrators to manage all enrollments';
COMMENT ON POLICY "Instructors can view their class enrollments" ON enrollments IS 'Allows instructors to view enrollments for their classes';

COMMENT ON POLICY "Users can view own payments" ON payments IS 'Allows users to view their own payment history';
COMMENT ON POLICY "Users can create own payments" ON payments IS 'Allows users to create payment records';
COMMENT ON POLICY "Admins can manage all payments" ON payments IS 'Allows administrators to manage all payment records';

COMMENT ON POLICY "Users can view own notifications" ON user_notifications IS 'Allows users to view their own notifications';
COMMENT ON POLICY "Users can update own notifications" ON user_notifications IS 'Allows users to mark their notifications as read';
COMMENT ON POLICY "Admins can manage all notifications" ON user_notifications IS 'Allows administrators to manage all notifications';
COMMENT ON POLICY "Users can create notifications" ON user_notifications IS 'Allows users and instructors to send notifications';

COMMENT ON POLICY "Users can view own activity log" ON user_activity_log IS 'Allows users to view their own activity history';
COMMENT ON POLICY "System can create activity logs" ON user_activity_log IS 'Allows system to create activity log entries';
COMMENT ON POLICY "Admins can view all activity logs" ON user_activity_log IS 'Allows administrators to view all user activity';

COMMENT ON POLICY "Admins can manage notification templates" ON notification_templates IS 'Allows administrators to manage notification templates';
COMMENT ON POLICY "Instructors can view notification templates" ON notification_templates IS 'Allows instructors to view notification templates';

COMMENT ON POLICY "Users can view own certificates" ON certificates IS 'Allows users to view their own certificates';
COMMENT ON POLICY "Users can create own certificates" ON certificates IS 'Allows users to upload their own certificates';
COMMENT ON POLICY "Users can update own certificates" ON certificates IS 'Allows users to update their own certificates';
COMMENT ON POLICY "Admins can manage all certificates" ON certificates IS 'Allows administrators to manage all certificates';
COMMENT ON POLICY "Instructors can view their class certificates" ON certificates IS 'Allows instructors to view certificates for their classes';

COMMENT ON POLICY "Admins can view historical sessions" ON historical_sessions IS 'Allows administrators to view historical session data';
COMMENT ON POLICY "System can create historical sessions" ON historical_sessions IS 'Allows system to archive sessions';

COMMENT ON POLICY "Users can view own historical enrollments" ON historical_enrollments IS 'Allows users to view their own historical enrollments';
COMMENT ON POLICY "Admins can view all historical enrollments" ON historical_enrollments IS 'Allows administrators to view all historical enrollment data';
COMMENT ON POLICY "System can create historical enrollments" ON historical_enrollments IS 'Allows system to archive enrollments';
