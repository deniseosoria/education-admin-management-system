const pool = require('../config/db');

// Get all classes
const getAllClassesFromDB = async (filters = {}) => {
  const { status, instructor_id, start_date, end_date } = filters;
  let query = `
    SELECT 
      c.id, c.title, c.description, c.price, c.location_type, c.location_details, 
      c.recurrence_pattern, c.prerequisites, c.materials_needed, c.image_url,
      c.created_at, c.updated_at
    FROM classes c
    WHERE c.deleted_at IS NULL
  `;
  const queryParams = [];
  let paramCount = 1;

  // If filtering by instructor_id, join class_sessions
  if (instructor_id) {
    query += ' JOIN class_sessions cs ON cs.class_id = c.id AND cs.deleted_at IS NULL';
  }
  query += ' AND 1=1';

  if (status) {
    query += ` AND c.status = $${paramCount}`;
    queryParams.push(status);
    paramCount++;
  }
  if (instructor_id) {
    query += ` AND cs.instructor_id = $${paramCount}`;
    queryParams.push(instructor_id);
    paramCount++;
  }
  if (start_date) {
    query += ` AND c.created_at >= $${paramCount}`;
    queryParams.push(start_date);
    paramCount++;
  }
  if (end_date) {
    query += ` AND c.created_at <= $${paramCount}`;
    queryParams.push(end_date);
    paramCount++;
  }

  query += ' ORDER BY c.created_at DESC';

  const result = await pool.query(query, queryParams);
  return result.rows;
};

// Get a single class by ID
const getClassById = async (id) => {
  const result = await pool.query(
    'SELECT id, title, description, price, location_type, location_details, recurrence_pattern, prerequisites, materials_needed, image_url, created_at, updated_at FROM classes WHERE id = $1',
    [id]
  );
  return result.rows[0];
};

// Create a new class (general info only)
const createClass = async ({
  title,
  description,
  price,
  location_type,
  location_details,
  recurrence_pattern = null,
  prerequisites = null,
  materials_needed = null,
  image_url = null
}) => {
  const result = await pool.query(
    `INSERT INTO classes (
      title, description, price, location_type, location_details, recurrence_pattern, prerequisites, materials_needed, image_url
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`,
    [title, description, price, location_type, location_details, recurrence_pattern, prerequisites, materials_needed, image_url]
  );
  return result.rows[0];
};

// Get class sessions
const getClassSessions = async (classId) => {
  const result = await pool.query(
    `SELECT 
      cs.*,
      CONCAT(u.first_name, ' ', u.last_name) as instructor_name,
      (cs.capacity - cs.enrolled_count) as available_spots,
      COALESCE(cs.location_details, c.location_details) as session_location
     FROM class_sessions cs
     LEFT JOIN users u ON u.id = cs.instructor_id
     LEFT JOIN classes c ON c.id = cs.class_id
     WHERE cs.class_id = $1 AND cs.deleted_at IS NULL
     ORDER BY cs.session_date, cs.start_time`,
    [classId]
  );
  return result.rows;
};

// Add user to waitlist
const addToWaitlist = async (classId, userId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user is already on waitlist for this class
    const existingEntry = await client.query(
      'SELECT id FROM class_waitlist WHERE class_id = $1 AND user_id = $2',
      [classId, userId]
    );

    if (existingEntry.rows.length > 0) {
      throw new Error('User is already on the waitlist for this class');
    }

    // Get class session details including waitlist settings
    const sessionResult = await client.query(
      `SELECT cs.*, 
              COUNT(DISTINCT e.id) as current_enrollments,
              (SELECT COUNT(*) FROM class_waitlist WHERE class_id = $1 AND status = 'waiting') as waitlist_count,
              AVG(DATE_PART('day', e.enrolled_at - w.created_at)) as avg_wait_time
       FROM class_sessions cs
       LEFT JOIN enrollments e ON e.session_id = cs.id AND e.enrollment_status = 'approved'
       LEFT JOIN class_waitlist w ON w.class_id = cs.class_id AND w.status = 'waiting'
       WHERE cs.class_id = $1
       GROUP BY cs.id`,
      [classId]
    );

    if (!sessionResult.rows[0] || !sessionResult.rows[0].waitlist_enabled) {
      throw new Error('Waitlist is not enabled for this class');
    }

    if (sessionResult.rows[0].waitlist_count >= sessionResult.rows[0].waitlist_capacity) {
      throw new Error('Waitlist is full');
    }

    // Calculate position and estimated wait time
    const position = parseInt(sessionResult.rows[0].waitlist_count) + 1;
    const avgWaitTime = sessionResult.rows[0].avg_wait_time || 7; // Default to 7 days if no historical data
    const estimatedWaitTime = Math.ceil(avgWaitTime * (position / sessionResult.rows[0].capacity));

    // Add to waitlist
    const result = await client.query(
      `INSERT INTO class_waitlist (
        class_id, 
        user_id, 
        position, 
        status,
        created_at
      )
      VALUES ($1, $2, $3, 'waiting', CURRENT_TIMESTAMP)
      RETURNING *`,
      [classId, userId, position]
    );

    // Update positions for all waitlist entries
    await client.query(
      `UPDATE class_waitlist 
       SET position = subquery.new_position
       FROM (
         SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_position
         FROM class_waitlist
         WHERE class_id = $1 AND status = 'waiting'
       ) as subquery
       WHERE class_waitlist.id = subquery.id`,
      [classId]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Get user's waitlist entries
const getUserWaitlistEntries = async (userId) => {
  const result = await pool.query(
    `SELECT 
       w.*,
       c.title as class_title,
       c.location_details,
       cs.capacity,
       cs.session_date as start_date,
       COALESCE(cs.end_date, cs.session_date) as end_date,
       cs.instructor_id,
       u.name as instructor_name,
       w.position
     FROM class_waitlist w
     JOIN classes c ON c.id = w.class_id
     LEFT JOIN (
       SELECT DISTINCT ON (class_id) 
         class_id, 
         capacity, 
         session_date, 
         end_date, 
         instructor_id
       FROM class_sessions 
       WHERE deleted_at IS NULL 
       ORDER BY class_id, session_date ASC
     ) cs ON cs.class_id = c.id
     LEFT JOIN users u ON u.id = cs.instructor_id
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return result.rows;
};

// Update waitlist status
const updateWaitlistStatus = async (waitlistId, status) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get the waitlist entry and class details
    const waitlistResult = await client.query(
      `SELECT w.*, c.title as class_title, u.email as user_email
       FROM class_waitlist w
       JOIN classes c ON c.id = w.class_id
       JOIN users u ON u.id = w.user_id
       WHERE w.id = $1`,
      [waitlistId]
    );

    if (!waitlistResult.rows[0]) {
      throw new Error('Waitlist entry not found');
    }

    const waitlistEntry = waitlistResult.rows[0];

    // Update the status
    const result = await client.query(
      `UPDATE class_waitlist 
       SET status = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [status, waitlistId]
    );

    // If status is 'approved' or 'rejected', automatically create an enrollment record
    if (status === 'approved' || status === 'rejected') {
      console.log(`${status === 'approved' ? 'Approving' : 'Rejecting'} waitlist entry ${waitlistId} for user ${waitlistEntry.user_id} in class ${waitlistEntry.class_id}`);

      // Get all available sessions for this class, ordered by date
      const sessionResult = await client.query(
        `SELECT id, session_date, start_time, end_time FROM class_sessions 
         WHERE class_id = $1 AND deleted_at IS NULL 
         ORDER BY session_date, start_time`,
        [waitlistEntry.class_id]
      );

      if (sessionResult.rows.length > 0) {
        // Try to find the best session to enroll in
        let targetSessionId = null;

        // First, check if there's a session with available capacity (only for approved enrollments)
        if (status === 'approved') {
          for (const session of sessionResult.rows) {
            const capacityCheck = await client.query(
              `SELECT 
                 cs.capacity,
                 COUNT(e.id) as enrolled_count
               FROM class_sessions cs
               LEFT JOIN enrollments e ON e.session_id = cs.id AND e.enrollment_status = 'approved'
               WHERE cs.id = $1
               GROUP BY cs.capacity`,
              [session.id]
            );

            if (capacityCheck.rows[0]) {
              const { capacity, enrolled_count } = capacityCheck.rows[0];
              const availableSpots = capacity - enrolled_count;

              if (availableSpots > 0) {
                targetSessionId = session.id;
                console.log(`Found session ${session.id} with ${availableSpots} available spots`);
                break;
              }
            }
          }
        }

        // If no session with capacity found, use the first session
        if (!targetSessionId) {
          targetSessionId = sessionResult.rows[0].id;
          console.log(`No sessions with capacity found, using first session ${targetSessionId}`);
        }

        // Check if student is already enrolled in any session for this class
        const existingEnrollment = await client.query(
          `SELECT id, session_id FROM enrollments 
           WHERE user_id = $1 AND class_id = $2 AND enrollment_status IN ('approved', 'rejected')`,
          [waitlistEntry.user_id, waitlistEntry.class_id]
        );

        console.log(`Existing enrollments for user ${waitlistEntry.user_id}:`, existingEnrollment.rows);

        if (existingEnrollment.rows.length === 0) {
          // Student not enrolled in any session, create enrollment
          console.log(`Creating ${status} enrollment for user ${waitlistEntry.user_id} in session ${targetSessionId}`);
          try {
            const enrollmentResult = await client.query(
              `INSERT INTO enrollments (user_id, class_id, session_id, enrollment_status, payment_status, enrolled_at, admin_notes)
               VALUES ($1, $2, $3, $4, 'pending', CURRENT_TIMESTAMP, $5)
               RETURNING id`,
              [waitlistEntry.user_id, waitlistEntry.class_id, targetSessionId, status, `Converted from waitlist - ${status}`]
            );
            console.log(`Created ${status} enrollment with ID: ${enrollmentResult.rows[0].id}`);

            // Only increment session enrollment count for approved enrollments
            if (status === 'approved') {
              await client.query(
                `UPDATE class_sessions SET enrolled_count = enrolled_count + 1 WHERE id = $1`,
                [targetSessionId]
              );
            }
          } catch (enrollmentError) {
            console.error(`Error creating ${status} enrollment:`, enrollmentError);
            throw enrollmentError;
          }
        } else {
          console.log(`User ${waitlistEntry.user_id} already has ${existingEnrollment.rows[0].enrollment_status} enrollment in session ${existingEnrollment.rows[0].session_id}`);

          // Update existing enrollment status if it's different
          if (existingEnrollment.rows[0].enrollment_status !== status) {
            await client.query(
              `UPDATE enrollments 
               SET enrollment_status = $1, 
                   updated_at = CURRENT_TIMESTAMP,
                   admin_notes = $2
               WHERE id = $3`,
              [status, `Status updated from waitlist - ${status}`, existingEnrollment.rows[0].id]
            );
            console.log(`Updated existing enrollment ${existingEnrollment.rows[0].id} to ${status}`);
          }
        }
      } else {
        console.log(`No sessions found for class ${waitlistEntry.class_id}`);
      }
    }

    await client.query('COMMIT');
    return { ...result.rows[0], class_title: waitlistEntry.class_title, user_email: waitlistEntry.user_email };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Get class waitlist with enhanced details
const getClassWaitlist = async (classId) => {
  console.log(`=== getClassWaitlist called for class ${classId} ===`);
  const result = await pool.query(
    `SELECT w.*,
            u.name as user_name,
            u.email as user_email,
            u.phone_number as user_phone,
            DATE_PART('day', CURRENT_TIMESTAMP - w.created_at) as days_on_waitlist,
            (SELECT MIN(session_date) FROM class_sessions WHERE class_id = w.class_id AND deleted_at IS NULL) as next_session_date,
            (SELECT MIN(start_time) FROM class_sessions WHERE class_id = w.class_id AND deleted_at IS NULL) as next_session_start_time,
            (SELECT MIN(end_time) FROM class_sessions WHERE class_id = w.class_id AND deleted_at IS NULL) as next_session_end_time
     FROM class_waitlist w
     JOIN users u ON u.id = w.user_id
     JOIN classes c ON c.id = w.class_id
     WHERE w.class_id = $1
     ORDER BY 
       CASE WHEN w.status = 'waiting' THEN 0 ELSE 1 END,
       w.position`,
    [classId]
  );
  console.log(`Waitlist data for class ${classId}:`, result.rows);
  return result.rows;
};

// Update class status
const updateClassStatus = async (classId, status) => {
  // First check if the class exists
  const classExists = await pool.query(
    'SELECT id FROM classes WHERE id = $1',
    [classId]
  );

  if (!classExists.rows[0]) {
    return null;
  }

  const result = await pool.query(
    `UPDATE classes 
     SET status = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2
     RETURNING *`,
    [status, classId]
  );
  return result.rows[0];
};

// Get class with enhanced details
const getClassWithDetails = async (classId) => {
  // First get the class details
  const classResult = await pool.query(
    `SELECT c.id, c.title, c.description, c.price, c.location_type, c.location_details,
            c.recurrence_pattern, c.prerequisites, c.materials_needed, c.image_url,
            c.created_at, c.updated_at
     FROM classes c
     WHERE c.id = $1`,
    [classId]
  );

  if (!classResult.rows[0]) {
    return null;
  }

  // Then get the sessions with instructor information
  const sessionsResult = await pool.query(
    `SELECT cs.*, u.name as instructor_name,
            COALESCE(cs.location_details, c.location_details) as session_location
     FROM class_sessions cs
     LEFT JOIN users u ON cs.instructor_id = u.id
     LEFT JOIN classes c ON c.id = cs.class_id
     WHERE cs.class_id = $1 AND cs.deleted_at IS NULL
     ORDER BY cs.session_date, cs.start_time`,
    [classId]
  );

  // Get total enrollments for the class
  const enrollmentsResult = await pool.query(
    `SELECT COUNT(*) as total_enrollments
     FROM enrollments e
     JOIN class_sessions cs ON e.session_id = cs.id
     WHERE cs.class_id = $1 
     AND e.enrollment_status = 'approved'
     AND cs.deleted_at IS NULL
     AND cs.status = 'scheduled'
     AND (
       (cs.end_date IS NOT NULL AND cs.end_date > CURRENT_DATE) OR
       (cs.end_date IS NULL AND cs.session_date > CURRENT_DATE)
     )`,
    [classId]
  );

  // Combine the results
  const classDetails = classResult.rows[0];
  classDetails.sessions = sessionsResult.rows;
  classDetails.total_enrollments = parseInt(enrollmentsResult.rows[0].total_enrollments) || 0;

  // If there are sessions, use the first session's instructor_id and capacity for the form
  if (sessionsResult.rows.length > 0) {
    const firstSession = sessionsResult.rows[0];
    classDetails.instructor_id = firstSession.instructor_id;
    classDetails.capacity = firstSession.capacity;
  }

  return classDetails;
};

// Update a class (general info only)
const updateClass = async (id, updates) => {
  const {
    title,
    description,
    price,
    location_type,
    location_details,
    recurrence_pattern,
    prerequisites,
    materials_needed,
    image_url
  } = updates;

  const result = await pool.query(
    `UPDATE classes 
     SET title = $1, 
         description = $2, 
         price = $3, 
         location_type = $4, 
         location_details = $5, 
         recurrence_pattern = $6, 
         prerequisites = $7, 
         materials_needed = $8, 
         image_url = $9, 
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $10
     RETURNING *`,
    [title, description, price, location_type, location_details, recurrence_pattern, prerequisites, materials_needed, image_url, id]
  );
  return result.rows[0];
};

// Delete a class (admin use) - Soft delete with historical preservation
const deleteClass = async (id) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if class has enrollments
    const enrollmentsResult = await client.query(
      'SELECT COUNT(*) as count FROM enrollments WHERE class_id = $1',
      [id]
    );

    const hasEnrollments = parseInt(enrollmentsResult.rows[0].count) > 0;

    if (hasEnrollments) {
      // Archive all sessions and enrollments before soft deleting
      const sessionsResult = await client.query(
        'SELECT * FROM class_sessions WHERE class_id = $1 AND deleted_at IS NULL',
        [id]
      );

      for (const session of sessionsResult.rows) {
        // Archive the session
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
            session.status,
            'Class deleted by admin'
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
                 admin_notes, reviewed_at, reviewed_by, enrolled_at, 'Class deleted by admin'
          FROM enrollments WHERE session_id = $2`,
          [historicalSessionId, session.id]
        );
      }

      // Remove enrollments from active table
      await client.query('DELETE FROM enrollments WHERE class_id = $1', [id]);
    }

    // Soft delete all sessions for this class
    await client.query(
      'UPDATE class_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE class_id = $1',
      [id]
    );

    // Soft delete the class
    const result = await client.query(
      'UPDATE classes SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get class participants with enrollment details
const getClassParticipants = async (classId) => {
  const client = await pool.connect();
  try {
    // Get active enrollments
    const activeResult = await client.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrollment_status,
        e.payment_status,
        e.enrolled_at,
        e.admin_notes,
        e.reviewed_at,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.status as session_status,
        'active' as enrollment_type,
        NULL as archived_at,
        NULL as archived_reason
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN class_sessions cs ON cs.id = e.session_id AND cs.deleted_at IS NULL
      WHERE e.class_id = $1
      ORDER BY e.enrolled_at DESC`,
      [classId]
    );

    // Get historical enrollments
    const historicalResult = await client.query(
      `SELECT 
        he.id as enrollment_id,
        he.enrollment_status,
        he.payment_status,
        he.enrolled_at,
        he.admin_notes,
        he.reviewed_at,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        hs.session_date,
        hs.start_time,
        hs.end_time,
        hs.status as session_status,
        'historical' as enrollment_type,
        he.archived_at,
        he.archived_reason
      FROM historical_enrollments he
      JOIN users u ON u.id = he.user_id
      JOIN historical_sessions hs ON hs.id = he.historical_session_id
      WHERE he.class_id = $1
      ORDER BY he.archived_at DESC`,
      [classId]
    );

    // Combine and sort all enrollments
    const allEnrollments = [...activeResult.rows, ...historicalResult.rows];
    allEnrollments.sort((a, b) => {
      const dateA = a.enrolled_at ? new Date(a.enrolled_at) : new Date(0);
      const dateB = b.enrolled_at ? new Date(b.enrolled_at) : new Date(0);
      return dateB - dateA; // Sort by most recent first
    });

    return allEnrollments;
  } finally {
    client.release();
  }
};

// Create a new class with sessions
const createClassWithSessions = async (classData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Create the class first
    const classResult = await client.query(
      `INSERT INTO classes (
        title, description, price, location_type, location_details, 
        recurrence_pattern, prerequisites, materials_needed, image_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        classData.title,
        classData.description,
        classData.price,
        classData.location_type || 'in-person',
        classData.location_details,
        classData.recurrence_pattern,
        classData.prerequisites,
        classData.materials_needed,
        classData.image_url
      ]
    );

    const newClass = classResult.rows[0];

    // Create sessions for the class
    if (classData.dates && Array.isArray(classData.dates)) {
      for (const dateData of classData.dates) {
        await client.query(
          `INSERT INTO class_sessions (
            class_id, session_date, end_date, start_time, end_time, 
            capacity, instructor_id, status, location_details
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            newClass.id,
            dateData.date,
            dateData.end_date || dateData.date, // Use start date as end date if not provided
            dateData.start_time,
            dateData.end_time,
            dateData.capacity,
            classData.instructor_id,
            'scheduled',
            dateData.location
          ]
        );
      }
    }

    await client.query('COMMIT');
    return newClass;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Update a class with sessions
const updateClassWithSessions = async (classId, classData) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Update the class
    const classResult = await client.query(
      `UPDATE classes 
       SET title = $1, description = $2, price = $3, location_type = $4, 
           location_details = $5, recurrence_pattern = $6, prerequisites = $7, 
           materials_needed = $8, image_url = $9, updated_at = CURRENT_TIMESTAMP
       WHERE id = $10
       RETURNING *`,
      [
        classData.title,
        classData.description,
        classData.price,
        classData.location_type || 'in-person',
        classData.location_details,
        classData.recurrence_pattern,
        classData.prerequisites,
        classData.materials_needed,
        classData.image_url,
        classId
      ]
    );

    if (classResult.rows.length === 0) {
      throw new Error('Class not found');
    }

    // Handle session deletions with historical preservation
    if (classData.deletedSessionIds && classData.deletedSessionIds.length > 0) {
      for (const sessionId of classData.deletedSessionIds) {
        // Check if session has enrollments
        const enrollmentsResult = await client.query(
          `SELECT COUNT(*) as count 
           FROM enrollments e
           JOIN class_sessions cs ON e.session_id = cs.id
           WHERE e.session_id = $1 
           AND e.enrollment_status IN ('approved', 'active')
           AND cs.deleted_at IS NULL
           AND cs.status = 'scheduled'
           AND (
             (cs.end_date IS NOT NULL AND cs.end_date > CURRENT_DATE) OR
             (cs.end_date IS NULL AND cs.session_date > CURRENT_DATE)
           )`,
          [sessionId]
        );

        const hasEnrollments = parseInt(enrollmentsResult.rows[0].count) > 0;

        if (hasEnrollments) {
          // Archive session and enrollments to historical tables
          const sessionResult = await client.query(
            'SELECT * FROM class_sessions WHERE id = $1',
            [sessionId]
          );

          if (sessionResult.rows[0]) {
            const session = sessionResult.rows[0];

            // Archive the session
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
                session.status,
                'Session removed by admin'
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
                     admin_notes, reviewed_at, reviewed_by, enrolled_at, 'Session removed by admin'
              FROM enrollments WHERE session_id = $2`,
              [historicalSessionId, sessionId]
            );

            // Remove enrollments from active table
            await client.query('DELETE FROM enrollments WHERE session_id = $1', [sessionId]);
          }
        }

        // Soft delete the session (mark as deleted instead of actually deleting)
        await client.query(
          'UPDATE class_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
          [sessionId]
        );
      }
    }

    // Update or create sessions
    if (classData.dates && Array.isArray(classData.dates)) {
      for (const dateData of classData.dates) {
        if (dateData.id) {
          // Update existing session
          await client.query(
            `UPDATE class_sessions 
             SET session_date = $1, end_date = $2, start_time = $3, end_time = $4, 
                 capacity = $5, instructor_id = $6, location_details = $7, updated_at = CURRENT_TIMESTAMP
             WHERE id = $8 AND class_id = $9 AND deleted_at IS NULL`,
            [
              dateData.date,
              dateData.end_date || dateData.date,
              dateData.start_time,
              dateData.end_time,
              dateData.capacity,
              classData.instructor_id,
              dateData.location,
              dateData.id,
              classId
            ]
          );
        } else {
          // Create new session
          await client.query(
            `INSERT INTO class_sessions (
              class_id, session_date, end_date, start_time, end_time, 
              capacity, instructor_id, status, location_details
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
              classId,
              dateData.date,
              dateData.end_date || dateData.date,
              dateData.start_time,
              dateData.end_time,
              dateData.capacity,
              classData.instructor_id,
              'scheduled',
              dateData.location
            ]
          );
        }
      }
    }

    await client.query('COMMIT');
    return classResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get historical enrollments for a class
const getHistoricalEnrollments = async (classId) => {
  const result = await pool.query(
    `SELECT 
      he.id as historical_enrollment_id,
      he.original_enrollment_id,
      he.enrollment_status,
      he.payment_status,
      he.enrolled_at,
      he.admin_notes,
      he.reviewed_at,
      he.archived_at,
      he.archived_reason,
      u.id as user_id,
      u.name,
      u.email,
      u.phone_number,
      hs.session_date,
      hs.start_time,
      hs.end_time,
      hs.status as session_status,
      hs.archived_reason as session_archived_reason
    FROM historical_enrollments he
    JOIN users u ON u.id = he.user_id
    JOIN historical_sessions hs ON hs.id = he.historical_session_id
    WHERE he.class_id = $1
    ORDER BY he.archived_at DESC`,
    [classId]
  );
  return result.rows;
};

// Get all enrollments (active and historical) for a class
const getAllEnrollmentsForClass = async (classId) => {
  const client = await pool.connect();
  try {
    // Get active enrollments - only those with sessions that haven't ended
    const activeResult = await client.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrollment_status,
        e.payment_status,
        e.enrolled_at,
        e.admin_notes,
        e.reviewed_at,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.status as session_status,
        'active' as data_type
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN class_sessions cs ON cs.id = e.session_id AND cs.deleted_at IS NULL
      WHERE e.class_id = $1
        AND (
          (cs.end_date IS NOT NULL AND cs.end_date > NOW())
          OR (cs.end_date IS NULL AND cs.session_date > NOW())
        )
      ORDER BY e.enrolled_at DESC`,
      [classId]
    );

    // Get completed enrollments from active enrollments table (sessions that have ended)
    const completedActiveResult = await client.query(
      `SELECT 
        e.id as enrollment_id,
        e.enrollment_status,
        e.payment_status,
        e.enrolled_at,
        e.admin_notes,
        e.reviewed_at,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.status as session_status,
        'completed' as data_type,
        cs.end_date as completed_at,
        'Session ended' as completion_reason
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      LEFT JOIN class_sessions cs ON cs.id = e.session_id AND cs.deleted_at IS NULL
      WHERE e.class_id = $1
        AND (
          (cs.end_date IS NOT NULL AND cs.end_date <= NOW())
          OR (cs.end_date IS NULL AND cs.session_date <= NOW())
        )
      ORDER BY e.enrolled_at DESC`,
      [classId]
    );

    // Get historical enrollments - deduplicated by original session
    const historicalResult = await client.query(
      `SELECT 
        he.id as enrollment_id,
        he.enrollment_status,
        he.payment_status,
        he.enrolled_at,
        he.admin_notes,
        he.reviewed_at,
        u.id as user_id,
        u.name,
        u.email,
        u.phone_number,
        hs.session_date,
        hs.start_time,
        hs.end_time,
        hs.status as session_status,
        'historical' as data_type,
        he.archived_at,
        he.archived_reason
      FROM (
        SELECT DISTINCT ON (he.user_id, hs.original_session_id) 
          he.id,
          he.user_id,
          he.enrollment_status,
          he.payment_status,
          he.enrolled_at,
          he.admin_notes,
          he.reviewed_by,
          he.reviewed_at,
          he.historical_session_id,
          he.archived_at,
          he.archived_reason
        FROM historical_enrollments he
        JOIN historical_sessions hs ON hs.id = he.historical_session_id
        WHERE he.class_id = $1
        ORDER BY he.user_id, hs.original_session_id, COALESCE(he.archived_at, '1900-01-01'::timestamp) DESC
      ) he
      JOIN users u ON u.id = he.user_id
      JOIN historical_sessions hs ON hs.id = he.historical_session_id
      ORDER BY he.archived_at DESC`,
      [classId]
    );

    // Combine completed active enrollments with historical enrollments
    const allHistorical = [...completedActiveResult.rows, ...historicalResult.rows];
    allHistorical.sort((a, b) => {
      const dateA = a.completed_at || a.archived_at ? new Date(a.completed_at || a.archived_at) : new Date(0);
      const dateB = b.completed_at || b.archived_at ? new Date(b.completed_at || b.archived_at) : new Date(0);
      return dateB - dateA; // Sort by most recent first
    });

    return {
      active: activeResult.rows,
      historical: allHistorical,
      total: activeResult.rows.length + allHistorical.length
    };
  } finally {
    client.release();
  }
};

// Archive ended sessions and their enrollments
const archiveEndedSessionsAndEnrollments = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Find sessions whose end_date is in the past and not deleted
    const now = new Date();
    const sessionsResult = await client.query(
      `SELECT * FROM class_sessions WHERE end_date <= $1 AND deleted_at IS NULL`,
      [now]
    );
    for (const session of sessionsResult.rows) {
      // Archive the session
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
          session.status,
          'Session ended (auto-archived)'
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
               admin_notes, reviewed_at, reviewed_by, enrolled_at, 'Session ended (auto-archived)'
        FROM enrollments WHERE session_id = $2`,
        [historicalSessionId, session.id]
      );
      // Remove enrollments from active table
      await client.query('DELETE FROM enrollments WHERE session_id = $1', [session.id]);
      // Soft delete the session
      await client.query(
        'UPDATE class_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
        [session.id]
      );
    }
    await client.query('COMMIT');
    return { archivedSessions: sessionsResult.rows.length };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Get students enrolled in a class
const getClassStudents = async (classId) => {
  const result = await pool.query(
    `SELECT DISTINCT
      u.id as user_id,
      u.first_name,
      u.last_name,
      u.email,
      u.role,
      u.status
    FROM users u
    JOIN enrollments e ON u.id = e.user_id
    JOIN class_sessions cs ON e.session_id = cs.id
    WHERE cs.class_id = $1 
      AND e.enrollment_status = 'approved'
      AND cs.deleted_at IS NULL
    ORDER BY u.first_name, u.last_name`,
    [classId]
  );
  return result.rows;
};

// Archive a specific session and its enrollments
const archiveSessionAndEnrollments = async (sessionId) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Get the session
    const sessionResult = await client.query(
      'SELECT * FROM class_sessions WHERE id = $1 AND deleted_at IS NULL',
      [sessionId]
    );
    if (sessionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return { archived: false, reason: 'Session not found or already deleted' };
    }
    const session = sessionResult.rows[0];
    // Archive the session
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
        session.status,
        'Session completed by admin'
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
             admin_notes, reviewed_at, reviewed_by, enrolled_at, 'Session completed by admin'
      FROM enrollments WHERE session_id = $2`,
      [historicalSessionId, session.id]
    );
    // Remove enrollments from active table
    await client.query('DELETE FROM enrollments WHERE session_id = $1', [session.id]);
    // Soft delete the session
    await client.query(
      'UPDATE class_sessions SET deleted_at = CURRENT_TIMESTAMP WHERE id = $1',
      [session.id]
    );
    await client.query('COMMIT');
    return { archived: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getAllClassesFromDB,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
  getClassSessions,
  getUserWaitlistEntries,
  updateWaitlistStatus,
  getClassWaitlist,
  updateClassStatus,
  getClassWithDetails,
  getClassParticipants,
  addToWaitlist,
  createClassWithSessions,
  updateClassWithSessions,
  getHistoricalEnrollments,
  getAllEnrollmentsForClass,
  archiveEndedSessionsAndEnrollments,
  archiveSessionAndEnrollments,
  getClassStudents
};
