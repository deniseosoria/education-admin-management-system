# Row Level Security (RLS) Implementation Guide

## Overview

This document explains the Row Level Security (RLS) implementation for the YJ Child Care Plus application. RLS has been enabled on all database tables to address the security warnings shown in the Supabase Security Advisor dashboard.

## What is Row Level Security?

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows can be accessed by users based on policies. It provides an additional layer of security beyond application-level access controls.

## Tables with RLS Enabled

The following tables now have RLS enabled with appropriate security policies:

1. **users** - User account information
2. **classes** - Class information and scheduling details
3. **class_sessions** - Individual sessions for recurring classes
4. **class_waitlist** - Waitlist entries for classes
5. **enrollments** - Student enrollments in classes
6. **payments** - Payment transactions for classes
7. **user_notifications** - User notifications and messages
8. **user_activity_log** - User actions and system events
9. **notification_templates** - Templates for different types of notifications
10. **certificates** - User certificates and verification details
11. **historical_sessions** - Archived session data
12. **historical_enrollments** - Archived enrollment data

## Security Policies by Table

### Users Table
- **Users can view own profile**: Users can only see their own profile information
- **Users can update own profile**: Users can update their own profile (except sensitive admin fields)
- **Admins can view all users**: Administrators can view all user profiles
- **Admins can update all users**: Administrators can update any user profile
- **Instructors can view their students**: Instructors can view profiles of students enrolled in their classes

### Classes Table
- **Anyone can view active classes**: Public access to view active class information
- **Admins can manage all classes**: Administrators can create, update, and delete classes
- **Instructors can view their classes**: Instructors can view classes they teach

### Class Sessions Table
- **Anyone can view active sessions**: Public access to view active session information
- **Admins can manage all sessions**: Administrators can create, update, and delete sessions
- **Instructors can manage their sessions**: Instructors can manage sessions they teach

### Class Waitlist Table
- **Users can view own waitlist entries**: Users can only see their own waitlist entries
- **Users can create own waitlist entries**: Users can join waitlists for classes
- **Users can update own waitlist entries**: Users can modify their own waitlist entries
- **Admins can manage all waitlist entries**: Administrators can manage all waitlist entries
- **Instructors can view their class waitlists**: Instructors can view waitlists for their classes

### Enrollments Table
- **Users can view own enrollments**: Users can only see their own enrollments
- **Users can create own enrollments**: Users can enroll in classes
- **Admins can manage all enrollments**: Administrators can manage all enrollments
- **Instructors can view their class enrollments**: Instructors can view enrollments for their classes

### Payments Table
- **Users can view own payments**: Users can only see their own payment history
- **Users can create own payments**: Users can create payment records
- **Admins can manage all payments**: Administrators can manage all payment records

### User Notifications Table
- **Users can view own notifications**: Users can only see their own notifications
- **Users can update own notifications**: Users can mark their notifications as read
- **Admins can manage all notifications**: Administrators can manage all notifications
- **Users can create notifications**: Users and instructors can send notifications

### User Activity Log Table
- **Users can view own activity log**: Users can only see their own activity history
- **System can create activity logs**: System can create activity log entries
- **Admins can view all activity logs**: Administrators can view all user activity

### Notification Templates Table
- **Admins can manage notification templates**: Administrators can manage notification templates
- **Instructors can view notification templates**: Instructors can view notification templates

### Certificates Table
- **Users can view own certificates**: Users can only see their own certificates
- **Users can create own certificates**: Users can upload their own certificates
- **Users can update own certificates**: Users can update their own certificates
- **Admins can manage all certificates**: Administrators can manage all certificates
- **Instructors can view their class certificates**: Instructors can view certificates for their classes

### Historical Tables
- **Admins can view historical sessions**: Administrators can view historical session data
- **System can create historical sessions**: System can archive sessions
- **Users can view own historical enrollments**: Users can view their own historical enrollments
- **Admins can view all historical enrollments**: Administrators can view all historical enrollment data
- **System can create historical enrollments**: System can archive enrollments

## User Roles and Permissions

### Admin Role
- Full access to all tables and data
- Can manage users, classes, sessions, enrollments, payments, and notifications
- Can view all activity logs and historical data

### Instructor Role
- Can view and manage classes and sessions they teach
- Can view students enrolled in their classes
- Can view waitlists for their classes
- Can view certificates for their classes
- Can send notifications to students

### User/Student Role
- Can view and manage their own profile
- Can view active classes and sessions
- Can enroll in classes and join waitlists
- Can view their own enrollments, payments, and certificates
- Can view and manage their own notifications
- Can view their own activity log

## Running the RLS Migration

To apply the RLS policies to your database, run:

```bash
cd server
node scripts/run-rls-migration.js
```

This script will:
1. Enable RLS on all tables
2. Create all security policies
3. Verify that RLS is working correctly
4. Test the policies

## Testing RLS Policies

After running the migration, you should:

1. **Check Supabase Security Advisor**: The dashboard should now show 0 errors for RLS issues
2. **Test Application Functionality**: Ensure all existing features work correctly
3. **Verify Access Controls**: Test that users can only access their own data
4. **Test Role-Based Access**: Verify that admins and instructors have appropriate access

## Important Considerations

### Authentication Context
RLS policies rely on the `auth.uid()` function, which requires proper authentication context. Make sure your application:

1. Uses Supabase authentication properly
2. Sets the correct user context when making database queries
3. Handles authentication errors gracefully

### Service Role vs User Context
- **Service Role**: Bypasses RLS policies (use for admin operations)
- **User Context**: Enforces RLS policies (use for user operations)

### Performance
RLS policies add overhead to queries. Monitor query performance and add indexes as needed:

```sql
-- Example: Add index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_enrollments_user_id ON enrollments(user_id);
```

## Troubleshooting

### Common Issues

1. **"permission denied" errors**: Check that the user has proper authentication context
2. **Policies not working**: Verify that RLS is enabled and policies are created correctly
3. **Performance issues**: Add appropriate indexes for policy conditions

### Debugging RLS Policies

To debug RLS policies, you can:

1. Check if RLS is enabled:
```sql
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'users';
```

2. View all policies:
```sql
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

3. Test policies with specific user context:
```sql
SET LOCAL role TO authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "user-id-here"}';
SELECT * FROM users;
```

## Future Development

When adding new tables or modifying existing ones:

1. **Always enable RLS** on new tables
2. **Create appropriate policies** based on the data access patterns
3. **Test policies thoroughly** before deploying
4. **Document policies** for future reference
5. **Consider performance implications** of complex policy conditions

## Security Best Practices

1. **Principle of Least Privilege**: Users should only have access to data they need
2. **Regular Audits**: Periodically review and test RLS policies
3. **Monitor Access**: Log and monitor database access patterns
4. **Keep Policies Simple**: Complex policies can impact performance and security
5. **Test Thoroughly**: Always test RLS policies in a development environment first

## Migration File

The RLS implementation is contained in:
- **Migration**: `server/migrations/011_enable_rls_and_policies.sql`
- **Script**: `server/scripts/run-rls-migration.js`

This migration can be run safely on existing databases and will not affect existing data.
