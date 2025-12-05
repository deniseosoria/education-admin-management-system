const pool = require('../config/db');

// Get all sessions with their students for a specific class (including deleted sessions)
async function getClassSessionsWithStudents(req, res) {
  const { classId } = req.params;

  console.log(`=== getClassSessionsWithStudents called for class ${classId} ===`);

  try {
    const query = `
      WITH active_enrollments_deduped AS (
        SELECT DISTINCT ON (e.session_id, e.user_id)
          e.session_id,
          e.user_id,
          e.enrollment_status,
          e.payment_status,
          e.enrolled_at
        FROM enrollments e
        JOIN class_sessions cs ON cs.id = e.session_id
        WHERE cs.class_id = $1 AND cs.deleted_at IS NULL
        ORDER BY e.session_id, e.user_id, e.enrolled_at DESC
      ),
      active_sessions AS (
        SELECT 
          cs.id as session_id,
          cs.session_date,
          cs.start_time,
          cs.end_time,
          cs.status,
          'active' as session_type,
          json_agg(
            json_build_object(
              'id', u.id,
              'name', CONCAT(u.first_name, ' ', u.last_name),
              'email', u.email,
              'enrollment_status', e.enrollment_status,
              'payment_status', e.payment_status,
              'enrollment_type', 'active'
            )
          ) FILTER (WHERE u.id IS NOT NULL) as students
        FROM class_sessions cs
        LEFT JOIN active_enrollments_deduped e ON e.session_id = cs.id
        LEFT JOIN users u ON u.id = e.user_id
        WHERE cs.class_id = $1 AND cs.deleted_at IS NULL
        GROUP BY cs.id, cs.session_date, cs.start_time, cs.end_time, cs.status
      ),
      historical_enrollments_deduped AS (
        SELECT DISTINCT ON (he.historical_session_id, he.user_id)
          he.historical_session_id,
          he.user_id,
          he.enrollment_status,
          he.payment_status,
          he.archived_at,
          he.archived_reason
        FROM historical_enrollments he
        JOIN historical_sessions hs ON hs.id = he.historical_session_id
        WHERE hs.class_id = $1
        ORDER BY he.historical_session_id, he.user_id, he.archived_at DESC NULLS LAST, he.enrolled_at DESC
      ),
      historical_sessions AS (
        SELECT 
          hs.original_session_id as session_id,
          hs.session_date,
          hs.start_time,
          hs.end_time,
          hs.status,
          'historical' as session_type,
          json_agg(
            json_build_object(
              'id', u.id,
              'name', CONCAT(u.first_name, ' ', u.last_name),
              'email', u.email,
              'enrollment_status', he.enrollment_status,
              'payment_status', he.payment_status,
              'enrollment_type', 'historical',
              'archived_at', he.archived_at,
              'archived_reason', he.archived_reason
            )
          ) FILTER (WHERE u.id IS NOT NULL) as students
        FROM historical_sessions hs
        LEFT JOIN historical_enrollments_deduped he ON he.historical_session_id = hs.id
        LEFT JOIN users u ON u.id = he.user_id
        WHERE hs.class_id = $1
        GROUP BY hs.original_session_id, hs.session_date, hs.start_time, hs.end_time, hs.status
      )
      SELECT 
        session_id,
        session_date,
        start_time,
        end_time,
        status,
        session_type,
        COALESCE(students, '[]'::json) as students
      FROM (
        SELECT * FROM active_sessions
        UNION ALL
        SELECT * FROM historical_sessions
        WHERE session_id NOT IN (SELECT session_id FROM active_sessions)
      ) combined_sessions
      ORDER BY session_date ASC, start_time ASC;
    `;

    const { rows } = await pool.query(query, [classId]);
    console.log(`Sessions with students data for class ${classId}:`, JSON.stringify(rows, null, 2));

    // Debug: Check enrollments directly
    const enrollmentCheck = await pool.query(
      `SELECT e.*, u.first_name, u.last_name, u.email, cs.session_date, cs.id as session_id
       FROM enrollments e
       JOIN users u ON e.user_id = u.id
       JOIN class_sessions cs ON e.session_id = cs.id
       WHERE cs.class_id = $1 AND e.enrollment_status = 'approved'
       ORDER BY cs.session_date, cs.start_time`,
      [classId]
    );
    console.log(`Direct enrollment check for class ${classId}:`, enrollmentCheck.rows);

    // Debug: Check waitlist entries
    const waitlistCheck = await pool.query(
      `SELECT w.*, u.first_name, u.last_name, u.email
       FROM class_waitlist w
       JOIN users u ON w.user_id = u.id
       WHERE w.class_id = $1 AND w.status = 'approved'
       ORDER BY w.created_at`,
      [classId]
    );
    console.log(`Waitlist entries for class ${classId}:`, waitlistCheck.rows);

    // Debug: Try to manually enroll John Smith if he's not enrolled
    const johnSmithUserId = '24522e83-fe39-486a-8ebf-46e743b930f2';
    const johnEnrollmentCheck = await pool.query(
      `SELECT * FROM enrollments WHERE user_id = $1 AND class_id = $2`,
      [johnSmithUserId, classId]
    );
    console.log(`John Smith enrollment check:`, johnEnrollmentCheck.rows);

    if (johnEnrollmentCheck.rows.length === 0) {
      console.log(`John Smith is not enrolled. Attempting to enroll him in the first session...`);
      try {
        const firstSession = await pool.query(
          `SELECT id FROM class_sessions WHERE class_id = $1 AND deleted_at IS NULL ORDER BY session_date, start_time LIMIT 1`,
          [classId]
        );
        if (firstSession.rows[0]) {
          const enrollmentResult = await pool.query(
            `INSERT INTO enrollments (user_id, class_id, session_id, enrollment_status, payment_status, enrolled_at)
             VALUES ($1, $2, $3, 'approved', 'pending', CURRENT_TIMESTAMP)
             RETURNING id`,
            [johnSmithUserId, classId, firstSession.rows[0].id]
          );
          console.log(`Successfully enrolled John Smith with enrollment ID: ${enrollmentResult.rows[0].id}`);
        }
      } catch (error) {
        console.error(`Error enrolling John Smith:`, error);
      }
    } else {
      // Update existing enrollments to have a payment status if they don't have one
      console.log(`John Smith has ${johnEnrollmentCheck.rows.length} existing enrollments. Checking payment status...`);
      for (const enrollment of johnEnrollmentCheck.rows) {
        if (!enrollment.payment_status) {
          console.log(`Updating enrollment ${enrollment.id} to have payment_status = 'pending'`);
          await pool.query(
            `UPDATE enrollments SET payment_status = 'pending' WHERE id = $1`,
            [enrollment.id]
          );
        }
      }
    }

    res.json(rows);
  } catch (error) {
    console.error('Error fetching sessions with students:', error);
    res.status(500).json({ error: 'Failed to fetch sessions and students' });
  }
}

// Update session status
async function updateSessionStatus(req, res) {
  const { sessionId } = req.params;
  const { status } = req.body;

  if (!['scheduled', 'cancelled', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    // Start a transaction
    await pool.query('BEGIN');

    // Update the session status (allow updates even for soft-deleted sessions)
    const updateQuery = `
      UPDATE class_sessions
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, session_date, start_time, end_time, status;
    `;

    const { rows } = await pool.query(updateQuery, [status, sessionId]);

    if (rows.length === 0) {
      await pool.query('ROLLBACK');
      return res.status(404).json({ error: 'Session not found' });
    }

    // Also update the historical_sessions record if it exists (for removed sessions)
    await pool.query(
      `UPDATE historical_sessions
       SET status = $1
       WHERE original_session_id = $2`,
      [status, sessionId]
    );

    let historicalData = null;

    // If status is being changed to 'completed', move enrollments to historical tables
    if (status === 'completed') {
      try {
        historicalData = await moveEnrollmentsToHistorical(sessionId, {
          removeOriginalEnrollments: false, // Keep original enrollments for reference
          archiveReason: 'Session completed - automatically archived'
        });
      } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Failed to move enrollments to historical tables:', error);
        return res.status(500).json({
          error: 'Session status updated but failed to archive enrollments',
          details: error.message
        });
      }
    }

    // Commit the transaction
    await pool.query('COMMIT');

    // Return the updated session with historical data if applicable
    const response = {
      ...rows[0],
      message: `Session status updated to ${status} successfully`
    };

    if (historicalData) {
      response.historicalData = historicalData;
      response.message += ` - ${historicalData.enrollmentsMoved} enrollments archived to historical tables`;
    }

    res.json(response);
  } catch (error) {
    // Rollback on any error
    await pool.query('ROLLBACK');
    console.error('Error updating session status:', error);
    res.status(500).json({ error: 'Failed to update session status' });
  }
}

// Get a single session
async function getSessionById(req, res) {
  const { sessionId } = req.params;
  try {
    const result = await pool.query(
      `SELECT * FROM class_sessions WHERE id = $1`,
      [sessionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
}

// Create a session
async function createSession(req, res) {
  const {
    class_id,
    session_date,
    end_date,
    start_time,
    end_time,
    capacity,
    min_enrollment,
    waitlist_enabled,
    waitlist_capacity,
    instructor_id,
    status
  } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO class_sessions (
        class_id, session_date, end_date, start_time, end_time, capacity, min_enrollment, waitlist_enabled, waitlist_capacity, instructor_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [class_id, session_date, end_date, start_time, end_time, capacity, min_enrollment, waitlist_enabled, waitlist_capacity, instructor_id, status || 'scheduled']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

// Update a session
async function updateSession(req, res) {
  const { sessionId } = req.params;
  const {
    session_date,
    end_date,
    start_time,
    end_time,
    capacity,
    min_enrollment,
    waitlist_enabled,
    waitlist_capacity,
    instructor_id,
    status
  } = req.body;
  try {
    const result = await pool.query(
      `UPDATE class_sessions SET
        session_date = COALESCE($1, session_date),
        end_date = COALESCE($2, end_date),
        start_time = COALESCE($3, start_time),
        end_time = COALESCE($4, end_time),
        capacity = COALESCE($5, capacity),
        min_enrollment = COALESCE($6, min_enrollment),
        waitlist_enabled = COALESCE($7, waitlist_enabled),
        waitlist_capacity = COALESCE($8, waitlist_capacity),
        instructor_id = COALESCE($9, instructor_id),
        status = COALESCE($10, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *`,
      [session_date, end_date, start_time, end_time, capacity, min_enrollment, waitlist_enabled, waitlist_capacity, instructor_id, status, sessionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
}

// Delete a session
async function deleteSession(req, res) {
  const { sessionId } = req.params;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if session exists and get its details
    const sessionResult = await client.query(
      'SELECT * FROM class_sessions WHERE id = $1 AND deleted_at IS NULL',
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessionResult.rows[0];

    // Check if session has enrollments
    const enrollmentsResult = await client.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE session_id = $1',
      [sessionId]
    );

    const hasEnrollments = parseInt(enrollmentsResult.rows[0].count) > 0;

    if (hasEnrollments) {
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
          session.enrolled_count,
          session.instructor_id,
          'completed',
          'Session deleted by admin'
        ]
      );

      const historicalSessionId = historicalSessionResult.rows[0].id;

      // Archive enrollments for this session
      await client.query(
        `INSERT INTO historical_enrollments (
          original_enrollment_id, user_id, class_id, session_id, historical_session_id,
          payment_status, enrollment_status, admin_notes, reviewed_at, reviewed_by, enrolled_at, archived_reason
        )
        SELECT id, user_id, class_id, session_id, $1, payment_status, enrollment_status,
               admin_notes, reviewed_at, reviewed_by, enrolled_at, 'Session deleted by admin'
        FROM enrollments WHERE session_id = $2`,
        [historicalSessionId, sessionId]
      );

      // Remove enrollments from active table
      await client.query('DELETE FROM enrollments WHERE session_id = $1', [sessionId]);
    }

    // Update session status to 'completed' before soft deleting
    await client.query(
      'UPDATE class_sessions SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['completed', sessionId]
    );

    // Soft delete the session (mark as deleted instead of actually deleting)
    await client.query(
      'UPDATE class_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [sessionId]
    );

    await client.query('COMMIT');
    res.json({ message: 'Session deleted successfully and archived to historical tables' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  } finally {
    client.release();
  }
}

// Utility function to manually archive enrollments for existing completed sessions
async function archiveCompletedSessionEnrollments(req, res) {
  const { sessionId } = req.params;
  const { removeOriginalEnrollments = false } = req.body;

  try {
    // Check if session exists and is completed
    const sessionResult = await pool.query(
      `SELECT cs.*, c.title as class_title 
       FROM class_sessions cs 
       JOIN classes c ON cs.class_id = c.id 
       WHERE cs.id = $1 AND cs.status = 'completed'`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Session not found or not completed',
        message: 'Only completed sessions can have their enrollments archived'
      });
    }

    // Archive the enrollments
    const historicalData = await moveEnrollmentsToHistorical(sessionId, {
      removeOriginalEnrollments,
      archiveReason: 'Manually archived by administrator'
    });

    res.json({
      message: `Successfully archived enrollments for completed session`,
      sessionId,
      historicalData
    });

  } catch (error) {
    console.error('Error archiving completed session enrollments:', error);
    res.status(500).json({
      error: 'Failed to archive session enrollments',
      details: error.message
    });
  }
}

// Move enrollments to historical tables when session is completed
async function moveEnrollmentsToHistorical(sessionId, options = {}) {
  const {
    removeOriginalEnrollments = false, // Whether to remove original enrollments after archiving
    archiveReason = 'Session completed - automatically archived'
  } = options;

  try {
    // First, get the session details
    const sessionResult = await pool.query(
      `SELECT cs.*, c.title as class_title 
       FROM class_sessions cs 
       JOIN classes c ON cs.class_id = c.id 
       WHERE cs.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];

    // Get all enrollments for this session first
    const enrollmentsResult = await pool.query(
      `SELECT e.*, u.first_name, u.last_name 
       FROM enrollments e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.session_id = $1`,
      [sessionId]
    );

    // Only create historical session if there are enrollments
    if (enrollmentsResult.rows.length === 0) {
      console.log(`Session ${sessionId} has no enrollments, skipping historical session creation`);
      return {
        historicalSessionId: null,
        enrollmentsMoved: 0,
        totalEnrollments: 0,
        originalEnrollmentsRemoved: false
      };
    }

    // Check if historical session already exists (to avoid duplicates)
    const existingHistoricalSession = await pool.query(
      `SELECT id FROM historical_sessions WHERE original_session_id = $1`,
      [sessionId]
    );

    let historicalSessionId;
    if (existingHistoricalSession.rows.length > 0) {
      historicalSessionId = existingHistoricalSession.rows[0].id;
      console.log(`Historical session already exists for session ${sessionId}, using existing ID: ${historicalSessionId}`);
    } else {
      // Create historical session record
      const historicalSessionResult = await pool.query(
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
          archiveReason
        ]
      );
      historicalSessionId = historicalSessionResult.rows[0].id;
    }

    let enrollmentsMoved = 0;

    // Move each enrollment to historical table
    for (const enrollment of enrollmentsResult.rows) {
      // Check if enrollment already exists in historical table
      const existingHistoricalEnrollment = await pool.query(
        `SELECT id FROM historical_enrollments WHERE original_enrollment_id = $1`,
        [enrollment.id]
      );

      if (existingHistoricalEnrollment.rows.length === 0) {
        await pool.query(
          `INSERT INTO historical_enrollments (
            original_enrollment_id, user_id, class_id, session_id, historical_session_id,
            payment_status, enrollment_status, admin_notes, enrolled_at, archived_reason
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            enrollment.id,
            enrollment.user_id,
            enrollment.class_id,
            enrollment.session_id,
            historicalSessionId,
            enrollment.payment_status || 'unknown',
            enrollment.enrollment_status,
            `Enrollment archived when session "${session.class_title}" was completed`,
            enrollment.enrolled_at || enrollment.created_at,
            archiveReason
          ]
        );
        enrollmentsMoved++;
      } else {
        console.log(`Enrollment ${enrollment.id} already exists in historical table`);
      }
    }

    // Optionally remove original enrollments
    if (removeOriginalEnrollments && enrollmentsMoved > 0) {
      await pool.query(
        `DELETE FROM enrollments WHERE session_id = $1`,
        [sessionId]
      );
      console.log(`Removed ${enrollmentsMoved} original enrollments for session ${sessionId}`);
    }

    console.log(`Successfully moved ${enrollmentsMoved} enrollments to historical tables for session ${sessionId}`);
    return {
      historicalSessionId,
      enrollmentsMoved,
      totalEnrollments: enrollmentsResult.rows.length,
      originalEnrollmentsRemoved: removeOriginalEnrollments
    };
  } catch (error) {
    console.error('Error moving enrollments to historical tables:', error);
    throw error;
  }
}

module.exports = {
  getClassSessionsWithStudents,
  updateSessionStatus,
  getSessionById,
  createSession,
  updateSession,
  deleteSession,
  archiveCompletedSessionEnrollments
};