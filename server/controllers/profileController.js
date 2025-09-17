const { getProfileWithDetails: getUserProfileWithDetails, updateProfile: updateUserProfile, getUserById, updatePassword: updateUserPassword } = require('../models/userModel');
const { Certificate } = require('../models/certificateModel');
const { PaymentMethod } = require('../models/paymentMethodModel');
const { createActivityLog } = require('../models/activityLogModel');
const { Notification } = require('../models/notificationModel');
const { getHistoricalEnrollmentsByUserId } = require('../models/enrollmentModel');
const bcrypt = require('bcrypt');

// Get user profile with all details
const getProfileWithDetails = async (req, res) => {
    try {
        const profile = await getUserProfileWithDetails(req.user.id);
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json(profile);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching profile', error: error.message });
    }
};

// Update user profile
const updateProfile = async (req, res) => {
    try {
        const { first_name, last_name, phone_number, email_notifications } = req.body;
        await updateUserProfile(req.user.id, {
            first_name,
            last_name,
            phone_number,
            email_notifications
        });

        await createActivityLog(req.user.id, 'update_profile', {
            updated_fields: Object.keys(req.body)
        });

        // Fetch and return the full profile after update
        const fullProfile = await getUserProfileWithDetails(req.user.id);
        res.json(fullProfile);
    } catch (error) {
        res.status(500).json({ message: 'Error updating profile', error: error.message });
    }
};

// Update password
const updatePassword = async (req, res) => {
    console.log('DEBUG: updatePassword controller called');
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await updateUserPassword(req.user.id, hashedPassword);

        await createActivityLog(req.user.id, 'update_password', {
            timestamp: new Date()
        });

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error updating password', error: error.message });
    }
};

// Certificate management
const getCertificates = async (req, res) => {
    try {
        const certificates = await Certificate.getByUserId(req.user.id);
        res.json(certificates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching certificates', error: error.message });
    }
};

// Payment method management
const getPaymentMethods = async (req, res) => {
    try {
        const paymentMethods = await PaymentMethod.getByUserId(req.user.id);
        res.json(paymentMethods);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching payment methods', error: error.message });
    }
};

const addPaymentMethod = async (req, res) => {
    try {
        const { payment_type, last_four, expiry_date, is_default } = req.body;
        const paymentMethod = await PaymentMethod.create({
            user_id: req.user.id,
            payment_type,
            last_four,
            expiry_date,
            is_default
        });

        await createActivityLog(req.user.id, 'add_payment_method', { payment_type, last_four });

        res.status(201).json(paymentMethod);
    } catch (error) {
        res.status(500).json({ message: 'Error adding payment method', error: error.message });
    }
};

const setDefaultPaymentMethod = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.setDefault(req.params.id, req.user.id);
        if (!paymentMethod) {
            return res.status(404).json({ message: 'Payment method not found' });
        }

        await createActivityLog(req.user.id, 'set_default_payment_method', { payment_method_id: req.params.id });

        res.json(paymentMethod);
    } catch (error) {
        res.status(500).json({ message: 'Error setting default payment method', error: error.message });
    }
};

const deletePaymentMethod = async (req, res) => {
    try {
        const paymentMethod = await PaymentMethod.delete(req.params.id, req.user.id);
        if (!paymentMethod) {
            return res.status(404).json({ message: 'Payment method not found' });
        }

        await createActivityLog(req.user.id, 'delete_payment_method', { payment_method_id: req.params.id });

        res.json({ message: 'Payment method deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting payment method', error: error.message });
    }
};

// Activity log management
const getActivityLog = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const activities = await createActivityLog.getByUserId(req.user.id, parseInt(limit), parseInt(offset));
        res.json(activities);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching activity log', error: error.message });
    }
};

// Notification management
const getNotifications = async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        const notifications = await Notification.getByUserId(req.user.id, parseInt(limit), parseInt(offset));
        const unreadCount = await Notification.getUnreadCount(req.user.id);
        res.json({ notifications, unreadCount });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching notifications', error: error.message });
    }
};

const markNotificationAsRead = async (req, res) => {
    try {
        const notification = await Notification.markAsRead(req.params.id, req.user.id);
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        res.status(500).json({ message: 'Error marking notification as read', error: error.message });
    }
};

const markAllNotificationsAsRead = async (req, res) => {
    try {
        const notifications = await Notification.markAllAsRead(req.user.id);
        res.json({ message: 'All notifications marked as read', count: notifications.length });
    } catch (error) {
        res.status(500).json({ message: 'Error marking notifications as read', error: error.message });
    }
};

// Get historical enrollments for user profile
const getHistoricalEnrollments = async (req, res) => {
    try {
        const historicalEnrollments = await getHistoricalEnrollmentsByUserId(req.user.id);
        res.json(historicalEnrollments);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching historical enrollments', error: error.message });
    }
};

// Update email notification preferences
const updateEmailPreferences = async (req, res) => {
    try {
        const {
            email_notifications,
            class_reminders,
            payment_reminders,
            certificate_notifications,
            general_updates
        } = req.body;

        await updateUserProfile(req.user.id, {
            email_notifications,
            class_reminders,
            payment_reminders,
            certificate_notifications,
            general_updates
        });

        await createActivityLog(req.user.id, 'update_email_preferences', {
            preferences: req.body
        });

        // Fetch and return the full profile after update
        const fullProfile = await getUserProfileWithDetails(req.user.id);
        res.json(fullProfile);
    } catch (error) {
        res.status(500).json({ message: 'Error updating email preferences', error: error.message });
    }
};

module.exports = {
    getProfileWithDetails,
    updateProfile,
    updatePassword,
    getCertificates,
    getPaymentMethods,
    addPaymentMethod,
    setDefaultPaymentMethod,
    deletePaymentMethod,
    getActivityLog,
    getNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    getHistoricalEnrollments,
    updateEmailPreferences
}; 