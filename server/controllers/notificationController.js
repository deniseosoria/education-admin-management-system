const { getUsersByIds, getUsersByStatus } = require('../models/userModel');
const Notification = require('../models/notificationModel');
const emailService = require('../utils/emailService');
const emailConfig = require('../config/emailConfig');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
const getUserNotifications = async (req, res) => {
    try {
        const result = await Notification.getUserNotifications(req.user.id);
        res.json(result);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread-count
// @access  Private
const getUnreadCount = async (req, res) => {
    try {
        const count = await Notification.getUnreadCount(req.user.id);
        res.json({ count });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ error: 'Failed to get unread count' });
    }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.markNotificationRead(req.params.id, req.user.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found or unauthorized' });
        }
        res.json(notification);
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
    try {
        const notifications = await Notification.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read', count: notifications.length });
    } catch (error) {
        console.error('Mark all as read error:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
    try {
        const notification = await Notification.deleteNotification(req.params.id, req.user.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found or unauthorized' });
        }
        res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
};

// @desc    Create notification template
// @route   POST /api/admin/notifications/templates
// @access  Private/Admin
const createTemplate = async (req, res) => {
    try {
        const { name, type, title_template, message_template, metadata } = req.body;

        if (!name || !type || !title_template || !message_template) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const template = await Notification.createTemplate({
            name,
            type,
            title_template,
            message_template,
            metadata
        });

        res.status(201).json(template);
    } catch (error) {
        console.error('Create template error:', error);
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Template name already exists' });
        } else {
            res.status(500).json({ error: 'Failed to create template' });
        }
    }
};

// @desc    Get all notification templates
// @route   GET /api/admin/notifications/templates
// @access  Private/Admin
const getTemplates = async (req, res) => {
    try {
        const templates = await Notification.getAllTemplates();
        res.json(templates);
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({ error: 'Failed to get templates' });
    }
};

// @desc    Delete notification template
// @route   DELETE /api/notifications/admin/templates/:id
// @access  Private/Admin
const deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Notification.deleteTemplate(id);

        if (!result) {
            return res.status(404).json({ error: 'Template not found' });
        }

        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Delete template error:', error);
        res.status(500).json({ error: 'Failed to delete template' });
    }
};

// @desc    Send bulk notification using template
// @route   POST /api/admin/notifications/bulk
// @access  Private/Admin
const sendBulkNotification = async (req, res) => {
    try {
        const { template_name, user_ids, variables, action_url, metadata } = req.body;

        if (!template_name || !user_ids || !Array.isArray(user_ids)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validate that all user IDs exist
        const users = await getUsersByIds(user_ids);
        if (users.length !== user_ids.length) {
            return res.status(400).json({ error: 'One or more user IDs are invalid' });
        }

        const result = await Notification.createBulkFromTemplate(
            template_name,
            user_ids,
            variables,
            action_url,
            req.user.id,
            metadata // Pass metadata (includes links and attachments)
        );

        // Send email alerts to all recipients
        try {
            const users = await getUsersByIds(user_ids);
            const notificationTitle = variables.title || 'New Notification';

            for (const user of users) {
                try {
                    await emailService.sendNotificationAlertEmail(
                        user.email,
                        user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
                        'notification',
                        notificationTitle
                    );
                    console.log(`Notification alert email sent to: ${user.email}`);
                } catch (emailError) {
                    console.error(`Failed to send notification alert email to ${user.email}:`, emailError);
                    // Continue with other users even if one email fails
                }
            }
        } catch (emailError) {
            console.error('Failed to send notification alert emails:', emailError);
            // Don't fail the notification creation if emails fail
        }

        res.status(201).json({
            success: true,
            sent_count: result.sent_count,
            failed_count: result.failed_count || 0,
            message: 'Bulk notification sent successfully'
        });
    } catch (error) {
        console.error('Send bulk notification error:', error);
        if (error.message === 'Notification template not found') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to send bulk notification' });
        }
    }
};

// @desc    Send notification to all users
// @route   POST /api/admin/notifications/broadcast
// @access  Private/Admin
const broadcastNotification = async (req, res) => {
    try {
        const { title, message, type } = req.body;

        if (!title || !message) {
            return res.status(400).json({ error: 'Title and message are required' });
        }

        // Get all active users
        const users = await getUsersByStatus('active');
        const user_ids = users.map(user => user.id);

        // Create a direct broadcast notification using batch operation
        const result = await Notification.createDirectBroadcast(
            title,
            message,
            user_ids,
            req.user.id
        );

        // Send response immediately after database operations
        res.status(201).json({
            success: true,
            sent_count: result.sent_count,
            failed_count: result.failed_count || 0,
            message: 'Broadcast notification sent successfully',
            total_users: user_ids.length
        });

        // Process emails asynchronously after response is sent
        setImmediate(async () => {
            try {
                console.log(`Starting async email processing for ${users.length} users...`);

                // Process emails in batches to avoid overwhelming the email service
                const batchSize = emailConfig.batchProcessing.batchSize || 10;
                const batches = [];

                for (let i = 0; i < users.length; i += batchSize) {
                    batches.push(users.slice(i, i + batchSize));
                }

                let processedCount = 0;
                for (const batch of batches) {
                    // Process each batch concurrently
                    const emailPromises = batch.map(async (user) => {
                        try {
                            await emailService.sendNotificationAlertEmail(
                                user.email,
                                user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email,
                                'broadcast',
                                title
                            );
                            console.log(`Broadcast alert email sent to: ${user.email}`);
                            return { success: true, email: user.email };
                        } catch (emailError) {
                            console.error(`Failed to send broadcast alert email to ${user.email}:`, emailError);
                            return { success: false, email: user.email, error: emailError.message };
                        }
                    });

                    // Wait for batch to complete before processing next batch
                    const batchResults = await Promise.allSettled(emailPromises);
                    processedCount += batch.length;

                    console.log(`Processed batch: ${processedCount}/${users.length} users`);

                    // Small delay between batches to avoid overwhelming email service
                    if (batches.indexOf(batch) < batches.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, emailConfig.batchProcessing.batchDelay || 100));
                    }
                }

                console.log(`Async email processing completed for ${users.length} users`);
            } catch (emailError) {
                console.error('Failed to process broadcast alert emails:', emailError);
                // Don't fail the broadcast creation if emails fail
            }
        });

    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({ error: 'Failed to send broadcast notification' });
    }
};

// @desc    Send notification to individual user (admin)
// @route   POST /api/notifications/admin/send
// @access  Private/Admin
const sendNotification = async (req, res) => {
    try {
        const { recipient, title, message, recipientType = 'user' } = req.body;

        if (!recipient || !title || !message) {
            return res.status(400).json({ error: 'Missing required fields: recipient, title, message' });
        }

        let userIds = [];

        if (recipientType === 'user') {
            // Single user notification
            userIds = [recipient];
        } else if (recipientType === 'class') {
            // Get all students in the class
            const { getClassStudents } = require('../models/classModel');
            const students = await getClassStudents(recipient);
            userIds = students.map(student => student.user_id);
        }

        if (userIds.length === 0) {
            return res.status(400).json({ error: 'No recipients found' });
        }

        // Create notifications for all recipients
        const notifications = [];
        // Get metadata from request body (includes links and attachments)
        const requestMetadata = req.body.metadata || {};

        for (const userId of userIds) {
            const notification = await Notification.createNotification({
                user_id: userId,
                sender_id: req.user.id,
                type: 'admin_notification',
                title,
                message,
                metadata: {
                    ...requestMetadata, // Include links and attachments from request
                    sent_by: req.user.id,
                    sent_at: new Date().toISOString()
                }
            });
            notifications.push(notification);

            // Send email notification if user has email notifications enabled
            try {
                const { getUserById } = require('../models/userModel');
                const user = await getUserById(userId);
                if (user && user.email_notifications) {
                    await emailService.sendNotificationAlertEmail(
                        user.email,
                        `${user.first_name} ${user.last_name}`,
                        'admin_notification',
                        title
                    );
                }
            } catch (emailError) {
                console.error('Failed to send email notification:', emailError);
                // Don't fail the entire request if email fails
            }
        }

        res.status(201).json({
            message: `Notification sent to ${notifications.length} recipient(s)`,
            notifications
        });
    } catch (error) {
        console.error('Send notification error:', error);
        res.status(500).json({ error: 'Failed to send notification' });
    }
};

// @desc    Get notifications sent by admin
// @route   GET /api/admin/notifications/sent
// @access  Private/Admin
const getSentNotifications = async (req, res) => {
    try {
        const notifications = await Notification.getNotificationsSentByAdmin(req.user.id);
        console.log('Sent notifications returned:', notifications)
        res.json(notifications);
    } catch (error) {
        console.error('Get sent notifications error:', error);
        res.status(500).json({ error: 'Failed to get sent notifications' });
    }
};

// @desc    Get single notification by ID
// @route   GET /api/notifications/:id
// @access  Private
const getNotification = async (req, res) => {
    try {
        const notification = await Notification.getNotificationById(req.params.id, req.user.id);
        if (!notification) {
            return res.status(404).json({ error: 'Notification not found or unauthorized' });
        }
        res.json(notification);
    } catch (error) {
        console.error('Get notification error:', error);
        res.status(500).json({ error: 'Failed to get notification' });
    }
};

// @desc    Send detailed notification with links
// @route   POST /api/notifications/admin/detailed
// @access  Private/Admin
const sendDetailedNotification = async (req, res) => {
    try {
        const { originalNotificationId, message, links = [] } = req.body;

        if (!originalNotificationId || !message) {
            return res.status(400).json({ error: 'Missing required fields: originalNotificationId, message' });
        }

        // Get the original notification to find the recipient
        const originalNotification = await Notification.getNotificationById(originalNotificationId, req.user.id);
        if (!originalNotification) {
            return res.status(404).json({ error: 'Original notification not found' });
        }

        // Create a new detailed notification
        const detailedNotification = await Notification.createNotification({
            user_id: originalNotification.user_id,
            sender_id: req.user.id,
            type: 'detailed_notification',
            title: 'Detailed Message',
            message: message,
            metadata: {
                original_notification_id: originalNotificationId,
                links: links,
                sent_by: req.user.id,
                sent_at: new Date().toISOString()
            }
        });

        // Send email notification if user has email notifications enabled
        try {
            const { getUserById } = require('../models/userModel');
            const user = await getUserById(originalNotification.user_id);
            if (user && user.email_notifications) {
                await emailService.sendNotificationAlertEmail(
                    user.email,
                    `${user.first_name} ${user.last_name}`,
                    'detailed_notification',
                    'Detailed Message'
                );
            }
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
            // Don't fail the entire request if email fails
        }

        res.status(201).json({
            message: 'Detailed notification sent successfully',
            notification: detailedNotification
        });
    } catch (error) {
        console.error('Send detailed notification error:', error);
        res.status(500).json({ error: 'Failed to send detailed notification' });
    }
};

module.exports = {
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    createTemplate,
    getTemplates,
    deleteTemplate,
    sendBulkNotification,
    broadcastNotification,
    getSentNotifications,
    sendNotification,
    getNotification,
    sendDetailedNotification
}; 