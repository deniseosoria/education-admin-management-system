-- Migration: Clean up duplicate enrollments and add unique constraint
-- This ensures only one enrollment per user per session

-- Step 1: Identify and clean up duplicate enrollments
-- For each user-session combination, keep only the most recent enrollment with highest priority status
-- Priority: approved (3) > pending (2) > rejected (1)

DO $$
DECLARE
    duplicate_record RECORD;
    enrollment_to_keep_id INTEGER;
    enrollment_to_delete_ids INTEGER[];
BEGIN
    -- Find all user-session combinations with multiple enrollments
    FOR duplicate_record IN
        SELECT user_id, session_id, COUNT(*) as count
        FROM enrollments
        WHERE user_id IS NOT NULL AND session_id IS NOT NULL
        GROUP BY user_id, session_id
        HAVING COUNT(*) > 1
    LOOP
        -- For each duplicate group, find the enrollment to keep
        -- Priority: approved > pending > rejected, then most recent
        SELECT id INTO enrollment_to_keep_id
        FROM enrollments
        WHERE user_id = duplicate_record.user_id
          AND session_id = duplicate_record.session_id
        ORDER BY 
            CASE enrollment_status
                WHEN 'approved' THEN 3
                WHEN 'pending' THEN 2
                WHEN 'rejected' THEN 1
                ELSE 0
            END DESC,
            enrolled_at DESC,
            id DESC
        LIMIT 1;

        -- Get all other enrollment IDs for this user-session combination
        SELECT ARRAY_AGG(id) INTO enrollment_to_delete_ids
        FROM enrollments
        WHERE user_id = duplicate_record.user_id
          AND session_id = duplicate_record.session_id
          AND id != enrollment_to_keep_id;

        -- Delete duplicate enrollments (don't archive to historical_enrollments)
        -- These are data integrity issues, not legitimate records that need preservation
        IF enrollment_to_delete_ids IS NOT NULL AND array_length(enrollment_to_delete_ids, 1) > 0 THEN
            -- Update session enrollment counts (decrement for deleted enrollments)
            -- Only decrement if the deleted enrollment was approved or pending
            UPDATE class_sessions cs
            SET enrolled_count = GREATEST(enrolled_count - (
                SELECT COUNT(*)
                FROM enrollments e
                WHERE e.id = ANY(enrollment_to_delete_ids)
                  AND e.session_id = cs.id
                  AND e.enrollment_status IN ('approved', 'pending')
            ), 0)
            WHERE cs.id IN (
                SELECT DISTINCT session_id
                FROM enrollments
                WHERE id = ANY(enrollment_to_delete_ids)
            );

            -- Delete duplicate enrollments (no need to archive data integrity issues)
            DELETE FROM enrollments
            WHERE id = ANY(enrollment_to_delete_ids);

            RAISE NOTICE 'Cleaned up % duplicate enrollments for user_id=%, session_id=%, kept enrollment_id=%', 
                array_length(enrollment_to_delete_ids, 1),
                duplicate_record.user_id,
                duplicate_record.session_id,
                enrollment_to_keep_id;
        END IF;
    END LOOP;
END $$;

-- Step 2: Add unique constraint to prevent future duplicates
-- This ensures only one enrollment per user per session
DO $$
BEGIN
    -- Check if constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'enrollments_user_session_unique'
    ) THEN
        ALTER TABLE enrollments
        ADD CONSTRAINT enrollments_user_session_unique 
        UNIQUE (user_id, session_id);
        
        RAISE NOTICE 'Added unique constraint on (user_id, session_id)';
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'Unique constraint already exists';
END $$;

-- Step 3: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_enrollments_user_session 
ON enrollments(user_id, session_id);

-- Step 4: Verify cleanup
DO $$
DECLARE
    remaining_duplicates INTEGER;
BEGIN
    SELECT COUNT(*) INTO remaining_duplicates
    FROM (
        SELECT user_id, session_id, COUNT(*) as count
        FROM enrollments
        WHERE user_id IS NOT NULL AND session_id IS NOT NULL
        GROUP BY user_id, session_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF remaining_duplicates > 0 THEN
        RAISE WARNING 'Warning: % duplicate user-session combinations still exist', remaining_duplicates;
    ELSE
        RAISE NOTICE 'Success: No duplicate enrollments found';
    END IF;
END $$;

