/**
 * Script to restore incorrectly archived enrollments
 * 
 * This script finds enrollments in historical_enrollments that are for sessions
 * that haven't actually ended yet (based on datetime, not just date) and restores
 * them back to the enrollments table.
 * 
 * Usage: node server/scripts/restore-incorrectly-archived-enrollments.js [--dry-run]
 * 
 * Options:
 *   --dry-run: Show what would be restored without actually restoring
 */

const pool = require('../config/db');

async function restoreIncorrectlyArchivedEnrollments(dryRun = false) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const now = new Date();

        console.log('🔍 Searching for incorrectly archived enrollments...');
        console.log(`📅 Current time: ${now.toISOString()}`);
        console.log('');

        // Find historical enrollments where the session hasn't actually ended yet
        // Check both historical_sessions and active class_sessions
        const incorrectlyArchived = await client.query(
            `SELECT 
                he.id as historical_enrollment_id,
                he.original_enrollment_id,
                he.user_id,
                he.class_id,
                he.session_id,
                he.historical_session_id,
                he.enrollment_status,
                he.payment_status,
                he.enrolled_at,
                he.archived_at,
                he.archived_reason,
                -- Check if session still exists and hasn't ended
                CASE 
                    WHEN cs.id IS NOT NULL THEN
                        -- Active session exists - check if it hasn't ended
                        CASE 
                            WHEN (cs.end_date IS NOT NULL AND (cs.end_date + cs.end_time) > $1)
                                OR (cs.end_date IS NULL AND (cs.session_date + cs.end_time) > $1)
                            THEN 'active_session_exists'
                            ELSE 'session_ended'
                        END
                    WHEN hs.id IS NOT NULL THEN
                        -- Only historical session - check if it shouldn't have been archived
                        CASE 
                            WHEN (hs.end_date IS NOT NULL AND (hs.end_date + hs.end_time) > $1)
                                OR (hs.end_date IS NULL AND (hs.session_date + hs.end_time) > $1)
                            THEN 'should_restore'
                            ELSE 'session_ended'
                        END
                    ELSE 'no_session_found'
                END as restore_reason,
                cs.id as active_session_id,
                cs.session_date as active_session_date,
                cs.end_date as active_end_date,
                cs.start_time as active_start_time,
                cs.end_time as active_end_time,
                hs.session_date as historical_session_date,
                hs.end_date as historical_end_date,
                hs.start_time as historical_start_time,
                hs.end_time as historical_end_time
            FROM historical_enrollments he
            LEFT JOIN class_sessions cs ON cs.id = he.session_id AND cs.deleted_at IS NULL
            LEFT JOIN historical_sessions hs ON hs.id = he.historical_session_id
            WHERE he.enrollment_status IN ('pending', 'approved')
            ORDER BY he.archived_at DESC`,
            [now]
        );

        // Filter to only those that should be restored
        const toRestore = incorrectlyArchived.rows.filter(row =>
            row.restore_reason === 'active_session_exists' ||
            row.restore_reason === 'should_restore'
        );

        console.log(`📊 Found ${incorrectlyArchived.rows.length} total historical enrollments checked`);
        console.log(`✅ Found ${toRestore.length} enrollments that should be restored:`);
        console.log('');

        if (toRestore.length === 0) {
            console.log('✨ No incorrectly archived enrollments found!');
            await client.query('COMMIT');
            return { restored: 0, skipped: 0 };
        }

        let restoredCount = 0;
        let skippedCount = 0;
        const restoredEnrollments = [];

        for (const enrollment of toRestore) {
            console.log(`📝 Processing enrollment ${enrollment.historical_enrollment_id}:`);
            console.log(`   - Original enrollment ID: ${enrollment.original_enrollment_id || 'N/A'}`);
            console.log(`   - User ID: ${enrollment.user_id}`);
            console.log(`   - Class ID: ${enrollment.class_id}`);
            console.log(`   - Session ID: ${enrollment.session_id}`);
            console.log(`   - Status: ${enrollment.enrollment_status}`);
            console.log(`   - Archived at: ${enrollment.archived_at}`);
            console.log(`   - Reason: ${enrollment.restore_reason}`);

            if (enrollment.active_session_id) {
                console.log(`   - Active session exists: ${enrollment.active_session_date} ${enrollment.active_start_time} - ${enrollment.active_end_time}`);
            } else if (enrollment.historical_session_date) {
                console.log(`   - Historical session: ${enrollment.historical_session_date} ${enrollment.historical_start_time} - ${enrollment.historical_end_time}`);
            }
            console.log('');

            if (dryRun) {
                console.log('   [DRY RUN] Would restore this enrollment');
                skippedCount++;
                continue;
            }

            try {
                // Check if original enrollment still exists
                let enrollmentId = enrollment.original_enrollment_id;
                let needsInsert = true;

                if (enrollmentId) {
                    const existingCheck = await client.query(
                        'SELECT id FROM enrollments WHERE id = $1',
                        [enrollmentId]
                    );

                    if (existingCheck.rows.length > 0) {
                        console.log(`   ⚠️  Original enrollment ${enrollmentId} still exists, skipping restore`);
                        skippedCount++;
                        continue;
                    }
                } else {
                    // No original_enrollment_id, we'll need to create a new one
                    enrollmentId = null;
                }

                // Restore the enrollment to enrollments table
                if (needsInsert) {
                    let insertResult;

                    if (enrollmentId) {
                        // Use the original enrollment ID
                        insertResult = await client.query(
                            `INSERT INTO enrollments (
                                id, user_id, class_id, session_id, 
                                payment_status, payment_method, enrollment_status, 
                                admin_notes, reviewed_at, reviewed_by, enrolled_at
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
                            )
                            ON CONFLICT (id) DO NOTHING
                            RETURNING id`,
                            [
                                enrollmentId,
                                enrollment.user_id,
                                enrollment.class_id,
                                enrollment.session_id,
                                enrollment.payment_status || 'pending',
                                enrollment.payment_method || null,
                                enrollment.enrollment_status,
                                enrollment.admin_notes || `Restored from historical - was incorrectly archived`,
                                enrollment.reviewed_at,
                                enrollment.reviewed_by,
                                enrollment.enrolled_at
                            ]
                        );
                    } else {
                        // Let PostgreSQL generate a new ID
                        insertResult = await client.query(
                            `INSERT INTO enrollments (
                                user_id, class_id, session_id, 
                                payment_status, payment_method, enrollment_status, 
                                admin_notes, reviewed_at, reviewed_by, enrolled_at
                            ) VALUES (
                                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
                            )
                            RETURNING id`,
                            [
                                enrollment.user_id,
                                enrollment.class_id,
                                enrollment.session_id,
                                enrollment.payment_status || 'pending',
                                enrollment.payment_method || null,
                                enrollment.enrollment_status,
                                enrollment.admin_notes || `Restored from historical - was incorrectly archived`,
                                enrollment.reviewed_at,
                                enrollment.reviewed_by,
                                enrollment.enrolled_at
                            ]
                        );
                    }

                    if (insertResult.rows.length > 0) {
                        enrollmentId = insertResult.rows[0].id;
                        console.log(`   ✅ Restored enrollment with ID: ${enrollmentId}`);

                        // Update session enrollment count if needed
                        if (enrollment.session_id) {
                            await client.query(
                                `UPDATE class_sessions 
                                 SET enrolled_count = enrolled_count + 1 
                                 WHERE id = $1 AND deleted_at IS NULL`,
                                [enrollment.session_id]
                            );
                        }

                        // If session was soft-deleted but shouldn't have been, restore it
                        if (enrollment.active_session_id) {
                            // Session already exists and is active, nothing to do
                        } else if (enrollment.historical_session_id) {
                            // Check if we should restore the session too
                            const sessionCheck = await client.query(
                                `SELECT * FROM class_sessions 
                                 WHERE id = $1 AND deleted_at IS NOT NULL`,
                                [enrollment.session_id]
                            );

                            if (sessionCheck.rows.length > 0) {
                                // Session was soft-deleted, check if it should be restored
                                const session = sessionCheck.rows[0];
                                const sessionEndDateTime = session.end_date
                                    ? new Date(`${session.end_date}T${session.end_time}`)
                                    : new Date(`${session.session_date}T${session.end_time}`);

                                if (sessionEndDateTime > now) {
                                    // Restore the session
                                    await client.query(
                                        `UPDATE class_sessions 
                                         SET deleted_at = NULL, 
                                             updated_at = CURRENT_TIMESTAMP
                                         WHERE id = $1`,
                                        [enrollment.session_id]
                                    );
                                    console.log(`   ✅ Restored soft-deleted session ${enrollment.session_id}`);
                                }
                            }
                        }

                        // Remove from historical_enrollments
                        await client.query(
                            'DELETE FROM historical_enrollments WHERE id = $1',
                            [enrollment.historical_enrollment_id]
                        );
                        console.log(`   ✅ Removed from historical_enrollments`);

                        restoredCount++;
                        restoredEnrollments.push({
                            historical_id: enrollment.historical_enrollment_id,
                            restored_id: enrollmentId,
                            user_id: enrollment.user_id,
                            class_id: enrollment.class_id,
                            session_id: enrollment.session_id
                        });
                    } else {
                        console.log(`   ⚠️  Enrollment already exists, skipped`);
                        skippedCount++;
                    }
                }
            } catch (error) {
                console.error(`   ❌ Error restoring enrollment ${enrollment.historical_enrollment_id}:`, error.message);
                skippedCount++;
            }

            console.log('');
        }

        if (!dryRun) {
            await client.query('COMMIT');
        } else {
            await client.query('ROLLBACK');
        }

        console.log('✅ Restoration complete!');
        console.log(`   - Restored: ${restoredCount} enrollment(s)`);
        console.log(`   - Skipped: ${skippedCount} enrollment(s)`);

        if (restoredEnrollments.length > 0) {
            console.log('');
            console.log('📋 Restored enrollments:');
            restoredEnrollments.forEach(e => {
                console.log(`   - Historical ID ${e.historical_id} → Restored ID ${e.restored_id} (User: ${e.user_id}, Class: ${e.class_id}, Session: ${e.session_id})`);
            });
        }

        return {
            restored: restoredCount,
            skipped: skippedCount,
            enrollments: restoredEnrollments
        };

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error restoring enrollments:', error);
        console.error('❌ Error stack:', error.stack);
        throw error;
    } finally {
        client.release();
    }
}

// Run the script
if (require.main === module) {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    if (dryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    restoreIncorrectlyArchivedEnrollments(dryRun)
        .then((result) => {
            console.log('');
            console.log('✅ Script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Script failed:', error);
            process.exit(1);
        });
}

module.exports = { restoreIncorrectlyArchivedEnrollments };
