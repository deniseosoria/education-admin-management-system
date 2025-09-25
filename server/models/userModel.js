const pool = require('../config/db');

// Get all users
const getAllUsers = async () => {
  try {
    console.log('Executing getAllUsers query...');
    const query = `
      SELECT 
        id,
        email,
        first_name,
        last_name,
        phone_number,
        role,
        status,
        created_at,
        updated_at,
        CONCAT(first_name, ' ', last_name) as display_name
      FROM users
      ORDER BY first_name, last_name
    `;

    console.log('SQL Query:', query);
    const result = await pool.query(query);
    console.log('Raw database result:', {
      rowCount: result.rowCount,
      rows: result.rows.map(row => ({
        id: row.id,
        email: row.email,
        name: `${row.first_name} ${row.last_name}`,
        role: row.role,
        status: row.status
      }))
    });

    if (!result.rows || result.rows.length === 0) {
      console.log('No users found in database');
      return [];
    }

    return result.rows;
  } catch (error) {
    console.error('Error in getAllUsers:', error);
    throw error;
  }
};

// Get user by ID
async function getUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

// Create user
async function createUser(data) {
  const { name, email, password, role, status, first_name, last_name, phone_number, email_notifications } = data;
  const result = await pool.query(
    'INSERT INTO users (name, email, password, role, status, first_name, last_name, phone_number, email_notifications) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',
    [name, email, password, role, status, first_name, last_name, phone_number, email_notifications]
  );
  return result.rows[0];
}

// Delete user
async function deleteUser(id) {
  await pool.query('DELETE FROM users WHERE id = $1', [id]);
}

// Search users
async function searchUsers({ searchTerm = '', role = null, sortBy = 'id', sortOrder = 'ASC', limit = 50, offset = 0, includeInactive = false }) {
  let query = `
    SELECT 
      u.*,
      COALESCE(u.first_name || ' ' || u.last_name, u.email) as display_name
    FROM users u 
    WHERE 1=1
  `;
  const params = [];
  let idx = 1;

  if (searchTerm) {
    query += ` AND (
      u.email ILIKE $${idx} 
      OR u.first_name ILIKE $${idx} 
      OR u.last_name ILIKE $${idx} 
      OR u.phone_number ILIKE $${idx}
      OR COALESCE(u.first_name || ' ' || u.last_name, u.email) ILIKE $${idx}
    )`;
    params.push(`%${searchTerm}%`);
    idx++;
  }

  if (role) {
    query += ` AND u.role = $${idx}`;
    params.push(role);
    idx++;
  }

  if (!includeInactive) {
    query += ` AND u.status = 'active'`;
  }

  // Always sort by id first to maintain consistent order
  query += ` ORDER BY u.id ASC, ${sortBy} ${sortOrder} LIMIT $${idx} OFFSET $${idx + 1}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);

  // Get total count for pagination
  const countQuery = `
    SELECT COUNT(*) 
    FROM users u 
    WHERE 1=1
    ${searchTerm ? `AND (u.email ILIKE $1 OR u.first_name ILIKE $1 OR u.last_name ILIKE $1 OR u.phone_number ILIKE $1 OR COALESCE(u.first_name || ' ' || u.last_name, u.email) ILIKE $1)` : ''}
    ${role ? `AND u.role = $${searchTerm ? '2' : '1'}` : ''}
    ${!includeInactive ? 'AND u.status = \'active\'' : ''}
  `;
  const countParams = searchTerm ? [`%${searchTerm}%`] : [];
  if (role) countParams.push(role);

  const countResult = await pool.query(countQuery, countParams);

  return {
    users: result.rows,
    total: parseInt(countResult.rows[0].count)
  };
}

// Update user role
async function updateUserRole(userId, newRole, updatedBy) {
  const result = await pool.query('UPDATE users SET role = $1 WHERE id = $2 RETURNING *', [newRole, userId]);
  if (result.rows[0]) {
    await logUserActivity(userId, 'role_update', {
      old_role: result.rows[0].role,
      new_role: newRole,
      updated_by: updatedBy
    });
  }
  return result.rows[0];
}

// Update user status
async function updateUserStatus(userId, status, updatedBy) {
  const result = await pool.query('UPDATE users SET status = $1 WHERE id = $2 RETURNING *', [status, userId]);
  if (result.rows[0]) {
    await logUserActivity(userId, 'status_update', {
      old_status: result.rows[0].status,
      new_status: status,
      updated_by: updatedBy
    });
  }
  return result.rows[0];
}

// Get users by role
async function getUsersByRole(role) {
  const result = await pool.query('SELECT * FROM users WHERE role = $1 ORDER BY created_at DESC', [role]);
  return result.rows;
}

// Log user activity
async function logUserActivity(userId, action, details = {}) {
  const result = await pool.query('INSERT INTO user_activity_log (user_id, action, details) VALUES ($1, $2, $3) RETURNING *', [userId, action, details]);
  return result.rows[0];
}

// Get user activity
async function getUserActivity(userId, { action, startDate, endDate, limit = 50, offset = 0 } = {}) {
  try {
    let query = 'SELECT * FROM user_activity_log WHERE user_id = $1';
    const params = [userId];
    let paramIndex = 2;

    if (action) {
      query += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error in getUserActivity:', error);
    throw error;
  }
}

// Update user profile
async function updateProfile(id, updates) {
  // Fetch current values
  const current = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  const user = current.rows[0];

  const {
    first_name = user.first_name,
    last_name = user.last_name,
    phone_number = user.phone_number,
    email_notifications = user.email_notifications ?? true,
    class_reminders = user.class_reminders ?? true,
    payment_reminders = user.payment_reminders ?? true,
    certificate_notifications = user.certificate_notifications ?? true,
    general_updates = user.general_updates ?? true
  } = updates;

  const result = await pool.query(
    `UPDATE users SET first_name = $1, last_name = $2, phone_number = $3, email_notifications = $4, class_reminders = $5, payment_reminders = $6, certificate_notifications = $7, general_updates = $8 WHERE id = $9 RETURNING *`,
    [first_name, last_name, phone_number, email_notifications, class_reminders, payment_reminders, certificate_notifications, general_updates, id]
  );
  return result.rows[0];
}

// Get users by IDs
async function getUsersByIds(ids) {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Invalid user IDs provided');
  }

  // Convert all IDs to integers and filter out any invalid values
  const numericIds = ids
    .map(id => {
      const num = parseInt(id, 10);
      return isNaN(num) ? null : num;
    })
    .filter(id => id !== null);

  if (numericIds.length === 0) {
    throw new Error('No valid user IDs provided');
  }

  const result = await pool.query('SELECT * FROM users WHERE id = ANY($1)', [numericIds]);
  return result.rows;
}

// Get users by status
async function getUsersByStatus(status) {
  const result = await pool.query('SELECT * FROM users WHERE status = $1', [status]);
  return result.rows;
}

// Get user by email
async function getUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}

// Get user profile with all details
async function getProfileWithDetails(userId) {
  try {
    // Get user details
    const userResult = await pool.query(`
      SELECT 
        u.*,
        u.last_login,
        COUNT(DISTINCT e.id) as total_enrollments,
        COUNT(DISTINCT CASE WHEN e.enrollment_status = 'approved' THEN e.id END) as active_enrollments,
        COUNT(DISTINCT p.id) as total_payments,
        COUNT(DISTINCT CASE WHEN p.status = 'pending' THEN p.id END) as pending_payments
      FROM users u
      LEFT JOIN enrollments e ON u.id = e.user_id
      LEFT JOIN payments p ON u.id = p.user_id
      WHERE u.id = $1
      GROUP BY u.id
    `, [userId]);

    if (!userResult.rows[0]) {
      return null;
    }

    const user = userResult.rows[0];

    // Initialize empty arrays for optional data
    const profile = {
      ...user,
      certificates: [],
      payment_methods: [],
      recent_activity: [],
      notifications: [],
      enrollments: [],
      waitlist_entries: []
    };

    // Try to get user's enrollments if the table exists
    try {
      const { getUserEnrollments } = require('./enrollmentModel');
      profile.enrollments = await getUserEnrollments(userId);
      console.log('Profile enrollments fetched for user', userId, ':', {
        count: profile.enrollments.length,
        enrollments: profile.enrollments
      });
    } catch (err) {
      console.error('Error fetching enrollments for user', userId, ':', err);
      console.log('Enrollments table not available:', err.message);
      profile.enrollments = [];
    }

    // Try to get user's payment methods if the table exists
    try {
      const paymentMethodsResult = await pool.query(`
        SELECT * FROM user_payment_methods
        WHERE user_id = $1
        ORDER BY is_default DESC, created_at DESC
      `, [userId]);
      profile.payment_methods = paymentMethodsResult.rows;
    } catch (err) {
      console.log('Payment methods table not available:', err.message);
      profile.payment_methods = []; // Set empty array instead of undefined
    }

    // Try to get user's recent activity if the table exists
    try {
      const activityResult = await pool.query(`
        SELECT * FROM user_activity_log
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);
      profile.recent_activity = activityResult.rows;
    } catch (err) {
      console.log('Activity log table not available:', err.message);
    }

    // Try to get user's recent notifications if the table exists
    try {
      const notificationsResult = await pool.query(`
        SELECT * FROM user_notifications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId]);
      profile.notifications = notificationsResult.rows;
      console.log('Profile notifications fetched for user', userId, ':', {
        count: profile.notifications.length,
        notifications: profile.notifications
      });
    } catch (err) {
      console.error('Error fetching notifications for user', userId, ':', err);
      console.log('Notifications table not available:', err.message);
      profile.notifications = []; // Set empty array instead of undefined
    }

    // Try to get user's waitlist entries if the table exists
    try {
      const waitlistResult = await pool.query(`
        SELECT 
          cw.id,
          cw.class_id,
          cw.user_id,
          cw.position,
          cw.status,
          cw.created_at,
          cw.updated_at,
          c.title as class_title,
          c.description as class_description,
          c.location_details,
          cs.session_date as start_date,
          COALESCE(cs.end_date, cs.session_date) as end_date,
          cs.start_time,
          cs.end_time,
          cs.capacity,
          u.name as instructor_name
        FROM class_waitlist cw
        JOIN classes c ON c.id = cw.class_id
        LEFT JOIN (
          SELECT DISTINCT ON (class_id) 
            class_id, 
            session_date, 
            end_date, 
            start_time, 
            end_time, 
            capacity, 
            instructor_id
          FROM class_sessions 
          WHERE deleted_at IS NULL 
          ORDER BY class_id, session_date ASC
        ) cs ON cs.class_id = c.id
        LEFT JOIN users u ON u.id = cs.instructor_id
        WHERE cw.user_id = $1
        ORDER BY cw.created_at DESC
      `, [userId]);
      profile.waitlist_entries = waitlistResult.rows;
    } catch (err) {
      console.log('Waitlist table not available:', err.message);
    }

    // Try to get user's certificates if the table exists
    try {
      const certificatesResult = await pool.query(`
        SELECT c.*, 
               cls.title as class_name,
               cs.session_date, cs.start_time, cs.end_time,
               up.first_name as uploaded_by_first_name,
               up.last_name as uploaded_by_last_name
        FROM certificates c
        LEFT JOIN classes cls ON c.class_id = cls.id
        LEFT JOIN class_sessions cs ON c.session_id = cs.id
        LEFT JOIN users up ON c.uploaded_by = up.id
        WHERE c.user_id = $1 
        ORDER BY c.created_at DESC
      `, [userId]);
      profile.certificates = certificatesResult.rows;
    } catch (err) {
      console.log('Certificates table not available:', err.message);
    }

    return profile;
  } catch (error) {
    console.error('Error in getProfileWithDetails:', error);
    throw error;
  }
}

// Update user password
async function updatePassword(userId, hashedPassword) {
  const result = await pool.query(
    'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, role',
    [hashedPassword, userId]
  );
  return result.rows[0];
}

// Generate password reset token
async function generatePasswordResetToken(email) {
  const resetToken = require('crypto').randomBytes(32).toString('hex');
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

  const result = await pool.query(
    'UPDATE users SET reset_token = $1, reset_token_expires = $2, updated_at = NOW() WHERE email = $3 RETURNING id, email, first_name, last_name',
    [resetToken, resetTokenExpires, email]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  return {
    user: result.rows[0],
    resetToken,
    resetTokenExpires
  };
}

// Verify password reset token
async function verifyPasswordResetToken(token) {
  const result = await pool.query(
    'SELECT id, email, first_name, last_name FROM users WHERE reset_token = $1 AND reset_token_expires > NOW()',
    [token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired reset token');
  }

  return result.rows[0];
}

// Reset password with token
async function resetPasswordWithToken(token, newPassword) {
  const hashedPassword = await require('bcrypt').hash(newPassword, 10);

  const result = await pool.query(
    'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE reset_token = $2 AND reset_token_expires > NOW() RETURNING id, email, first_name, last_name',
    [hashedPassword, token]
  );

  if (result.rows.length === 0) {
    throw new Error('Invalid or expired reset token');
  }

  return result.rows[0];
}

// Clear password reset token
async function clearPasswordResetToken(email) {
  await pool.query(
    'UPDATE users SET reset_token = NULL, reset_token_expires = NULL, updated_at = NOW() WHERE email = $1',
    [email]
  );
}

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  deleteUser,
  searchUsers,
  updateUserRole,
  updateUserStatus,
  getUsersByRole,
  logUserActivity,
  getUserActivity,
  updateProfile,
  getUsersByIds,
  getUsersByStatus,
  getUserByEmail,
  getProfileWithDetails,
  updatePassword,
  generatePasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken,
  clearPasswordResetToken
};
