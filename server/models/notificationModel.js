const pool = require('../config/db');

// Get all notifications for a user
async function getUserNotifications(userId) {
  const result = await pool.query('SELECT * FROM user_notifications WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return result.rows;
}

// Mark a notification as read
async function markNotificationRead(notificationId, userId) {
  const result = await pool.query(
    'UPDATE user_notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
    [notificationId, userId]
  );
  return result.rows[0];
}

// Create a notification
async function createNotification(data) {
  const { user_id, type, title, message, action_url, metadata, sender_id } = data;
  const result = await pool.query(
    'INSERT INTO user_notifications (user_id, type, title, message, action_url, metadata, sender_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
    [user_id, type, title, message, action_url, metadata, sender_id]
  );
  return result.rows[0];
}

// Delete a notification
async function deleteNotification(id, userId) {
  const result = await pool.query(
    'DELETE FROM user_notifications WHERE id = $1 AND (user_id = $2 OR sender_id = $2) RETURNING *',
    [id, userId]
  );
  return result.rows[0];
}

// Get notification template by name
async function getTemplateByName(name) {
  const result = await pool.query('SELECT * FROM notification_templates WHERE name = $1', [name]);
  return result.rows[0];
}

// Create bulk notifications from template or custom message
async function createBulkFromTemplate(templateName, userIds, variables = {}, actionUrl = null, senderId = null, requestMetadata = null) {
  let template;
  let title;
  let message;
  let type;

  // Check if this is a custom notification (no template)
  if (templateName === 'custom_notification') {
    title = variables.title || 'Notification';
    message = variables.message;
    type = 'custom';
  } else {
    // Get the template
    template = await getTemplateByName(templateName);
    if (!template) {
      throw new Error('Notification template not found');
    }

    // Process template variables
    title = template.title_template;
    message = template.message_template;
    type = template.type;

    // Replace variables in templates
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      title = title.replace(regex, value);
      message = message.replace(regex, value);
    });
  }

  // Get recipient information for metadata
  const recipientInfo = await pool.query(
    'SELECT id, first_name, last_name, email FROM users WHERE id = ANY($1)',
    [userIds]
  );

  // Create notifications for each user
  const notifications = [];
  const failedUsers = [];

  for (const userId of userIds) {
    try {
      const recipient = recipientInfo.rows.find(r => r.id === userId);
      const notification = await createNotification({
        user_id: userId,
        type: type,
        title: title,
        message: message,
        action_url: actionUrl,
        metadata: {
          ...(requestMetadata || {}), // Include links and attachments from request
          ...(template?.metadata || { isCustom: true }),
          recipient: recipient ? {
            id: recipient.id,
            name: `${recipient.first_name} ${recipient.last_name}`.trim(),
            email: recipient.email
          } : null,
          sent_at: new Date().toISOString()
        },
        sender_id: senderId
      });
      notifications.push(notification);
    } catch (error) {
      console.error(`Failed to create notification for user ${userId}:`, error);
      failedUsers.push(userId);
    }
  }

  return {
    sent_count: notifications.length,
    failed_count: failedUsers.length,
    failed_users: failedUsers
  };
}

// Get notifications sent by an admin
async function getNotificationsSentByAdmin(adminId) {
  const result = await pool.query(`
    WITH notification_data AS (
      SELECT 
        n.*,
        u.first_name,
        u.last_name,
        u.email,
        n.metadata->>'recipient' as recipient_metadata,
        (n.metadata->>'sent_at')::timestamp with time zone as sent_at_metadata
      FROM user_notifications n
      LEFT JOIN users u ON n.user_id = u.id
      WHERE n.sender_id = $1
    )
    SELECT 
      n.id,
      n.user_id,
      n.type,
      n.title,
      n.message,
      n.action_url,
      n.metadata,
      n.sender_id,
      n.created_at,
      n.updated_at,
      CASE 
        WHEN n.recipient_metadata IS NOT NULL 
        THEN (n.recipient_metadata::jsonb->>'name')::text
        ELSE COALESCE(n.first_name || ' ' || n.last_name, n.email)
      END as recipient_name,
      CASE 
        WHEN n.recipient_metadata IS NOT NULL 
        THEN (n.recipient_metadata::jsonb->>'email')::text
        ELSE n.email
      END as recipient_email,
      COALESCE(n.sent_at_metadata, n.created_at) as sent_at
    FROM notification_data n
    ORDER BY n.created_at DESC
  `, [adminId]);

  return result.rows;
}

// Get all notification templates
async function getAllTemplates() {
  const result = await pool.query('SELECT * FROM notification_templates ORDER BY created_at DESC');
  return result.rows;
}

// Create a notification template
async function createTemplate(data) {
  const { name, type, title_template, message_template, metadata } = data;
  const result = await pool.query(
    'INSERT INTO notification_templates (name, type, title_template, message_template, metadata) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, type, title_template, message_template, metadata]
  );
  return result.rows[0];
}

// Delete a notification template
async function deleteTemplate(id) {
  const result = await pool.query(
    'DELETE FROM notification_templates WHERE id = $1 RETURNING *',
    [id]
  );
  return result.rows[0];
}

// Create a direct broadcast notification
async function createDirectBroadcast(title, message, userIds, senderId, requestMetadata = {}) {
  try {
    // Merge request metadata with broadcast flag
    const metadata = {
      isBroadcast: true,
      ...requestMetadata
    };

    // Use batch insert for better performance
    const values = [];
    const placeholders = [];
    let paramCount = 1;

    for (const userId of userIds) {
      placeholders.push(`($${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++}, $${paramCount++})`);
      values.push(
        userId,
        'broadcast',
        title,
        message,
        null, // action_url
        JSON.stringify(metadata), // metadata
        senderId
      );
    }

    const query = `
      INSERT INTO user_notifications (user_id, type, title, message, action_url, metadata, sender_id)
      VALUES ${placeholders.join(', ')}
      RETURNING id, user_id
    `;

    const result = await pool.query(query, values);

    return {
      sent_count: result.rows.length,
      failed_count: 0,
      failed_users: [],
      notifications: result.rows
    };
  } catch (error) {
    console.error('Batch broadcast creation failed, falling back to individual creation:', error);

    // Fallback to individual creation if batch fails
    const notifications = [];
    const failedUsers = [];

    // Merge request metadata with broadcast flag
    const metadata = {
      isBroadcast: true,
      ...requestMetadata
    };

    for (const userId of userIds) {
      try {
        const notification = await createNotification({
          user_id: userId,
          type: 'broadcast',
          title: title,
          message: message,
          action_url: null,
          metadata: metadata,
          sender_id: senderId
        });
        notifications.push(notification);
      } catch (error) {
        console.error(`Failed to create broadcast notification for user ${userId}:`, error);
        failedUsers.push(userId);
      }
    }

    return {
      sent_count: notifications.length,
      failed_count: failedUsers.length,
      failed_users: failedUsers
    };
  }
}

// Get notification by ID (with user authorization)
async function getNotificationById(notificationId, userId) {
  const result = await pool.query(
    'SELECT * FROM user_notifications WHERE id = $1 AND (user_id = $2 OR sender_id = $2) ORDER BY created_at DESC',
    [notificationId, userId]
  );
  return result.rows[0];
}

// Mark all notifications as read for a user
async function markAllAsRead(userId) {
  const result = await pool.query(
    'UPDATE user_notifications SET is_read = true WHERE user_id = $1 AND is_read = false RETURNING *',
    [userId]
  );
  return result.rows;
}

// Get unread count for a user
async function getUnreadCount(userId) {
  const result = await pool.query(
    'SELECT COUNT(*) as count FROM user_notifications WHERE user_id = $1 AND is_read = false',
    [userId]
  );
  return parseInt(result.rows[0].count);
}

module.exports = {
  getUserNotifications,
  markNotificationRead,
  createNotification,
  deleteNotification,
  getTemplateByName,
  createBulkFromTemplate,
  getNotificationsSentByAdmin,
  getAllTemplates,
  createTemplate,
  deleteTemplate,
  createDirectBroadcast,
  getNotificationById,
  markAllAsRead,
  getUnreadCount
}; 