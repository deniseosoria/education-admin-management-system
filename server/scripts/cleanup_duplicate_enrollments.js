/**
 * Script to clean up duplicate enrollments in the database
 * Run this script to remove duplicate enrollments and add unique constraint
 * 
 * Usage: node server/scripts/cleanup_duplicate_enrollments.js
 */

const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

async function cleanupDuplicates() {
    const client = await pool.connect();
    try {
        console.log('Starting duplicate enrollment cleanup...');
        await client.query('BEGIN');

        // Step 1: Find all duplicates
        const duplicates = await client.query(`
      SELECT user_id, session_id, COUNT(*) as count
      FROM enrollments
      WHERE user_id IS NOT NULL AND session_id IS NOT NULL
      GROUP BY user_id, session_id
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

        console.log(`Found ${duplicates.rows.length} user-session combinations with duplicates`);

        let totalDeleted = 0;

        for (const dup of duplicates.rows) {
            // For each duplicate group, find the enrollment to keep
            // Priority: approved > pending > rejected, then most recent
            const keepResult = await client.query(`
        SELECT id, enrollment_status, enrolled_at
        FROM enrollments
        WHERE user_id = $1 AND session_id = $2
        ORDER BY 
          CASE enrollment_status
            WHEN 'approved' THEN 3
            WHEN 'pending' THEN 2
            WHEN 'rejected' THEN 1
            ELSE 0
          END DESC,
          enrolled_at DESC,
          id DESC
        LIMIT 1
      `, [dup.user_id, dup.session_id]);

            if (keepResult.rows.length === 0) continue;

            const keepId = keepResult.rows[0].id;
            const keepStatus = keepResult.rows[0].enrollment_status;

            // Get all other enrollment IDs for this user-session
            const deleteResult = await client.query(`
        SELECT id, enrollment_status, session_id
        FROM enrollments
        WHERE user_id = $1 AND session_id = $2 AND id != $3
      `, [dup.user_id, dup.session_id, keepId]);

            if (deleteResult.rows.length === 0) continue;

            console.log(`\nProcessing user_id=${dup.user_id}, session_id=${dup.session_id}:`);
            console.log(`  Keeping enrollment_id=${keepId} (status: ${keepStatus})`);
            console.log(`  Deleting ${deleteResult.rows.length} duplicate(s)`);

            // Delete duplicate enrollments (don't archive to historical_enrollments)
            // These are data integrity issues, not legitimate records that need preservation
            // historical_enrollments is for preserving enrollments when sessions are deleted/completed
            for (const toDelete of deleteResult.rows) {
                // Update session enrollment count if needed
                // Only decrement if the deleted enrollment was approved or pending
                if (toDelete.enrollment_status === 'approved' || toDelete.enrollment_status === 'pending') {
                    await client.query(`
            UPDATE class_sessions 
            SET enrolled_count = GREATEST(enrolled_count - 1, 0) 
            WHERE id = $1
          `, [toDelete.session_id]);
                    console.log(`    Decremented enrollment count for session_id=${toDelete.session_id}`);
                }

                // Delete the duplicate (no archiving needed for data integrity issues)
                await client.query(`DELETE FROM enrollments WHERE id = $1`, [toDelete.id]);
                console.log(`    Deleted duplicate enrollment_id=${toDelete.id} (status: ${toDelete.enrollment_status})`);
                totalDeleted++;
            }
        }

        await client.query('COMMIT');
        console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} duplicate enrollments`);

        // Step 2: Add unique constraint if it doesn't exist
        console.log('\nAdding unique constraint...');
        try {
            await client.query(`
        ALTER TABLE enrollments
        ADD CONSTRAINT enrollments_user_session_unique 
        UNIQUE (user_id, session_id)
      `);
            console.log('✅ Unique constraint added successfully');
        } catch (error) {
            if (error.code === '23505' || error.message.includes('already exists')) {
                console.log('⚠️  Unique constraint already exists, skipping...');
            } else {
                throw error;
            }
        }

        // Step 3: Add index for performance
        console.log('\nAdding index...');
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_enrollments_user_session 
      ON enrollments(user_id, session_id)
    `);
        console.log('✅ Index created/verified');

        // Step 4: Verify no duplicates remain
        const verifyResult = await client.query(`
      SELECT user_id, session_id, COUNT(*) as count
      FROM enrollments
      WHERE user_id IS NOT NULL AND session_id IS NOT NULL
      GROUP BY user_id, session_id
      HAVING COUNT(*) > 1
    `);

        if (verifyResult.rows.length > 0) {
            console.log(`\n⚠️  Warning: ${verifyResult.rows.length} duplicate combinations still exist`);
            console.log('   This may indicate a data integrity issue');
        } else {
            console.log('\n✅ Verification passed: No duplicate enrollments found');
        }

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error during cleanup:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run the cleanup
if (require.main === module) {
    cleanupDuplicates()
        .then(() => {
            console.log('\n✨ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { cleanupDuplicates };

