import api from './apiConfig';
import { API_BASE_URL } from '../config/apiConfig.js';

const userService = {
    // Get user profile with all details
    getProfile: async () => {
        return api.get('/profile/profile');
    },

    // Update user profile
    updateProfile: async (profileData) => {
        return api.put('/profile/profile', profileData);
    },

    // Get notifications
    getNotifications: async () => {
        return api.get('/notifications');
    },

    // Get single notification
    getNotification: async (notificationId) => {
        return api.get(`/notifications/${notificationId}`);
    },

    // Mark notification as read
    markNotificationAsRead: async (notificationId) => {
        return api.put(`/notifications/${notificationId}/read`);
    },

    // Mark all notifications as read
    markAllNotificationsAsRead: async () => {
        return api.put('/notifications/read-all');
    },

    // Delete notification
    deleteNotification: async (notificationId) => {
        return api.delete(`/notifications/${notificationId}`);
    },

    // Update notifications (for bulk updates)
    updateNotifications: async (notifications) => {
        // Instead of a bulk update, we'll handle each notification individually
        const updates = notifications.map(async (notification) => {
            if (notification.is_read) {
                await api.put(`/notifications/${notification.id}/read`);
            }
        });
        await Promise.all(updates);
        return { success: true };
    },

    // Update user preferences
    updatePreferences: async (preferences) => {
        return api.put('/users/preferences', preferences);
    },

    // Get user certificates
    getCertificates: async () => {
        return api.get('/users/certificates');
    },

    // Get user activity history
    getActivityHistory: async () => {
        return api.get('/users/activity-history');
    },

    // Get user dashboard data
    getDashboardData: async () => {
        return api.get('/users/dashboard');
    },

    // Get user enrolled classes
    getEnrolledClasses: async () => {
        return api.get('/users/enrolled-classes');
    },

    // Get user historical enrollments
    getHistoricalEnrollments: async () => {
        return api.get('/profile/historical-enrollments');
    },

    // Get user waitlisted classes
    getWaitlistedClasses: async () => {
        return api.get('/users/waitlisted-classes');
    },

    // Get user payment history
    getPaymentHistory: async () => {
        return api.get('/users/payment-history');
    },

    // Update user password
    updatePassword: async (currentPassword, newPassword) => {
        return api.put('/profile/password', { currentPassword, newPassword });
    },

    // Update email notification preferences
    updateEmailPreferences: async (preferences) => {
        return api.put('/profile/email-preferences', preferences);
    }
};

// Helper function to handle fetch requests
const fetchWithAuth = async (url, options = {}) => {
    console.log('fetchWithAuth called with url:', url);
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    console.log('Request headers:', headers);

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const contentType = response.headers.get('content-type');

    if (response.status === 401) {
        window.location.href = '/login';
        throw new Error('Unauthorized');
    }

    if (!response.ok) {
        let errorData = {};
        if (contentType && contentType.includes('application/json')) {
            errorData = await response.json().catch(() => ({}));
        } else {
            const text = await response.text();
            errorData = { error: `Non-JSON error response: ${text}` };
        }
        console.error('API Error:', errorData);
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        console.log('API response data:', data);
        return data;
    } else {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text}`);
    }
};

// Get all users with a specific role
export const getUsersByRole = async (role) => {
    console.log('getUsersByRole called with role:', role);
    try {
        const result = await fetchWithAuth(`/admin/users/role/${role}`);
        console.log('getUsersByRole result:', result);
        return result;
    } catch (error) {
        console.error('getUsersByRole error:', error);
        throw error;
    }
};

// Get user by ID
export const getUserById = async (userId) => {
    return fetchWithAuth(`/admin/users/${userId}`);
};

// Update user
export const updateUser = async (userId, userData) => {
    return fetchWithAuth(`/admin/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(userData)
    });
};

// Delete user
export const deleteUser = async (userId) => {
    return fetchWithAuth(`/admin/users/${userId}`, {
        method: 'DELETE'
    });
};

export default userService; 