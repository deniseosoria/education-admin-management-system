const cron = require('node-cron');
const pool = require('../config/db');

/**
 * Scheduled job to clean up sessions based on their dates
 * Runs daily at 4:00 AM
 * 
 * Logic:
 * Sessions past their end date are:
 *    - Marked as 'completed'
 *    - Moved to historical_sessions
 *    - Enrollments moved to historical_enrollments
 * 
 * Note: Soft deletion of sessions past their start date is handled manually by admin
 */
const scheduleSessionCleanup = () => {
    // Schedule job to run at 4:00 AM every day
    // Cron format: minute hour day month day-of-week
    // '0 4 * * *' means: at minute 0 of hour 4, every day of month, every month, every day of week
    cron.schedule('0 4 * * *', async () => {
        console.log('🧹 Starting session cleanup job at', new Date().toISOString());

        try {
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Get current datetime
                const now = new Date();

                // Handle sessions past their end date/time
                // These should be marked as complete, archived to historical, and enrollments archived
                // A session is completed when: (end_date + end_time) < now OR (session_date + end_time) < now
                const sessionsPastEndDate = await client.query(
                    `SELECT * FROM class_sessions 
                     WHERE deleted_at IS NULL 
                     AND (
                       (end_date IS NOT NULL AND (end_date + end_time) < $1)
                       OR (end_date IS NULL AND (session_date + end_time) < $1)
                     )`,
                    [now]
                );

                let archivedCount = 0;
                let enrollmentsArchivedCount = 0;

                for (const session of sessionsPastEndDate.rows) {
                    // Check if session has enrollments
                    const enrollmentsCountResult = await client.query(
                        'SELECT COUNT(*) as count FROM enrollments WHERE session_id = $1',
                        [session.id]
                    );

                    const hasEnrollments = parseInt(enrollmentsCountResult.rows[0].count) > 0;

                    // Mark session as completed first
                    await client.query(
                        `UPDATE class_sessions 
                         SET status = 'completed', 
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = $1`,
                        [session.id]
                    );

                    let enrollmentCount = 0;
                    if (hasEnrollments) {
                        // Check if historical session already exists (to avoid duplicates)
                        const existingHistoricalSession = await client.query(
                            `SELECT id FROM historical_sessions WHERE original_session_id = $1`,
                            [session.id]
                        );

                        let historicalSessionId;
                        if (existingHistoricalSession.rows.length > 0) {
                            historicalSessionId = existingHistoricalSession.rows[0].id;
                            console.log(`  ℹ Historical session already exists for session ${session.id}, using existing ID: ${historicalSessionId}`);
                        } else {
                            // Archive the session to historical_sessions
                            const historicalSessionResult = await client.query(
                                `INSERT INTO historical_sessions (
                                  original_session_id, class_id, session_date, end_date, start_time, end_time,
                                  capacity, enrolled_count, instructor_id, status, archived_reason
                                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                                RETURNING id`,
                                [
                                    session.id,
                                    session.class_id,
                                    session.session_date,
                                    session.end_date,
                                    session.start_time,
                                    session.end_time,
                                    session.capacity,
                                    session.enrolled_count || 0,
                                    session.instructor_id,
                                    'completed',
                                    'Session ended - automatically archived by daily cleanup job'
                                ]
                            );
                            historicalSessionId = historicalSessionResult.rows[0].id;
                        }

                        // Get all enrollments for this session
                        const enrollmentsResult = await client.query(
                            `SELECT e.*, u.first_name, u.last_name 
                             FROM enrollments e 
                             JOIN users u ON e.user_id = u.id 
                             WHERE e.session_id = $1`,
                            [session.id]
                        );

                        enrollmentCount = enrollmentsResult.rows.length;

                        // Archive enrollments to historical_enrollments
                        for (const enrollment of enrollmentsResult.rows) {
                            // Check if enrollment already exists in historical table
                            const existingHistoricalEnrollment = await client.query(
                                `SELECT id FROM historical_enrollments WHERE original_enrollment_id = $1`,
                                [enrollment.id]
                            );

                            if (existingHistoricalEnrollment.rows.length === 0) {
                                await client.query(
                                    `INSERT INTO historical_enrollments (
                                      original_enrollment_id, user_id, class_id, session_id, historical_session_id,
                                      payment_status, payment_method, enrollment_status, admin_notes, reviewed_at, reviewed_by, enrolled_at, archived_reason
                                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
                                    [
                                        enrollment.id,
                                        enrollment.user_id,
                                        enrollment.class_id,
                                        enrollment.session_id,
                                        historicalSessionId,
                                        enrollment.payment_status || 'unknown',
                                        enrollment.payment_method || null,
                                        enrollment.enrollment_status,
                                        enrollment.admin_notes || `Enrollment archived when session ended - automatically archived by daily cleanup job`,
                                        enrollment.reviewed_at,
                                        enrollment.reviewed_by,
                                        enrollment.enrolled_at,
                                        'Session ended - automatically archived by daily cleanup job'
                                    ]
                                );
                                enrollmentsArchivedCount++;
                            }
                        }

                        // Remove enrollments from active table after archiving
                        await client.query('DELETE FROM enrollments WHERE session_id = $1', [session.id]);
                    }

                    // Soft delete the session (regardless of whether it had enrollments)
                    await client.query(
                        'UPDATE class_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
                        [session.id]
                    );

                    archivedCount++;
                    console.log(`  ✓ Archived session ${session.id} (end date: ${session.end_date || session.session_date}) - ${hasEnrollments ? `${enrollmentCount} enrollments archived` : 'no enrollments'}`);
                }

                await client.query('COMMIT');

                console.log(`✅ Session cleanup job completed successfully:`);
                console.log(`   - ${archivedCount} session(s) archived (past end date)`);
                console.log(`   - ${enrollmentsArchivedCount} enrollment(s) moved to historical`);

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            console.error('❌ Error in session cleanup job:', error);
            console.error('❌ Error stack:', error.stack);
        }
    }, {
        scheduled: true,
        timezone: "America/New_York" // Adjust timezone as needed
    });

    console.log('✅ Session cleanup job scheduled to run daily at 4:00 AM');
};

module.exports = {
    scheduleSessionCleanup
};
