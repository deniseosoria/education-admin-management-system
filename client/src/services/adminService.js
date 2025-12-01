import api from './apiConfig';
import { API_BASE_URL } from '../config/apiConfig.js';
import { fetchWithAuth } from '../utils/fetchUtils';

const adminService = {
    // Get dashboard statistics
    getDashboardStats: async () => {
        return api.get('/admin/dashboard/stats');
    },

    // Get all users
    getAllUsers: async (params = {}) => {
        try {
            let url = '/admin/users/search'; // Use the search endpoint for proper pagination
            const queryParams = new URLSearchParams();
            if (params.page) queryParams.append('page', params.page);
            if (params.limit) queryParams.append('limit', params.limit);
            if (params.search) queryParams.append('searchTerm', params.search);
            if (params.role && params.role !== 'all') queryParams.append('role', params.role);
            if ([...queryParams].length > 0) url += `?${queryParams.toString()}`;
            console.log('Fetching users from', url); // Add logging
            const response = await api.get(url);
            console.log('getAllUsers response:', response); // Add logging

            // The search endpoint always returns paginated response
            if (response && response.users && response.pagination) {
                return response;
            }

            console.error('Invalid response format:', response);
            throw new Error('Invalid response format from server');
        } catch (error) {
            console.error('Error in getAllUsers:', error);
            throw error;
        }
    },

    // Get user details
    getUserDetails: async (userId) => {
        return api.get(`/admin/users/${userId}`);
    },

    // Update user role
    updateUserRole: async (userId, role) => {
        return api.patch(`/admin/users/${userId}/role`, { role });
    },

    // Get system settings
    getSystemSettings: async () => {
        return api.get('/admin/settings');
    },

    // Update system settings
    updateSystemSettings: async (settings) => {
        return api.put('/admin/settings', settings);
    },

    // Get audit logs
    getAuditLogs: async (filters = {}) => {
        const queryParams = new URLSearchParams(filters).toString();
        return api.get(`/admin/audit-logs?${queryParams}`);
    },

    // Get analytics data - updated to use fetch API and handle all analytics endpoints
    getAnalytics: async (type, filters = {}) => {
        // Default date range: Jan 1 of current year to today
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), 0, 1);
        const defaultEnd = now;

        // Use local date formatting to avoid timezone issues
        const formatLocalDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startDate = filters.startDate || formatLocalDate(defaultStart);
        const endDate = filters.endDate || formatLocalDate(defaultEnd);

        console.log(`getAnalytics(${type}) - Date calculations:`, {
            now: now.toISOString(),
            defaultStart: defaultStart.toISOString(),
            defaultEnd: defaultEnd.toISOString(),
            startDate,
            endDate,
            filters
        });

        const queryParams = new URLSearchParams({ ...filters, startDate, endDate }).toString();
        const endpoint = type === 'summary' ? 'summary' :
            type === 'revenue' ? 'revenue' :
                type === 'revenue-by-class' ? 'revenue/classes' :
                    type === 'enrollments' ? 'enrollments/trends' :
                        type === 'class-enrollments' ? 'enrollments/classes' :
                            type === 'user-engagement' ? 'users/engagement' :
                                type === 'user-activity' ? 'users/activity' : 'summary';

        const response = await fetch(`${API_BASE_URL}/admin/analytics/${endpoint}?${queryParams}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.json();
    },

    // Fetch all analytics data in parallel
    fetchAllAnalytics: async (filters = {}) => {
        // Always ensure startDate and endDate are present
        const now = new Date();
        const defaultStart = new Date(now.getFullYear(), 0, 1);
        const defaultEnd = now;

        // Use local date formatting to avoid timezone issues
        const formatLocalDate = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const startDate = filters.startDate || formatLocalDate(defaultStart);
        const endDate = filters.endDate || formatLocalDate(defaultEnd);

        // Ensure we don't send future dates
        const today = formatLocalDate(new Date());
        const finalEndDate = endDate > today ? today : endDate;

        console.log('fetchAllAnalytics - Date calculations:', {
            now: now.toISOString(),
            defaultStart: defaultStart.toISOString(),
            defaultEnd: defaultEnd.toISOString(),
            startDate,
            endDate: finalEndDate,
            today,
            filters
        });

        const dateFilters = { ...filters, startDate, endDate: finalEndDate };
        const [
            summary,
            revenue,
            revenueByClass,
            enrollmentTrends,
            classEnrollments,
            userEngagement,
            userActivity
        ] = await Promise.all([
            adminService.getAnalytics('summary', dateFilters),
            adminService.getAnalytics('revenue', dateFilters),
            adminService.getAnalytics('revenue-by-class', dateFilters),
            adminService.getAnalytics('enrollments', dateFilters),
            adminService.getAnalytics('class-enrollments', dateFilters),
            adminService.getAnalytics('user-engagement', dateFilters),
            adminService.getAnalytics('user-activity', dateFilters)
        ]);

        return {
            summary,
            revenue,
            revenueByClass,
            enrollmentTrends,
            classEnrollments,
            userEngagement,
            userActivity
        };
    },

    // Export analytics report - updated to use fetch API
    exportAnalyticsReport: async (type, filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_BASE_URL}/admin/analytics/export/${type}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return response.blob();
    },

    // Manage class schedules
    manageClassSchedules: async (action, data) => {
        return api.post('/admin/class-schedules', { action, ...data });
    },

    // Get system health status
    getSystemHealth: async () => {
        return api.get('/admin/system-health');
    },

    // Manage notifications
    manageNotifications: async (action, data) => {
        return api.post('/admin/notifications', { action, ...data });
    },

    // Get user activity logs
    getUserActivityLogs: async (userId) => {
        return api.get(`/admin/users/${userId}/activity-logs`);
    },

    // Manage certificates
    manageCertificates: async (action, data) => {
        return api.post('/admin/certificates', { action, ...data });
    },

    // Update transaction status
    updateTransactionStatus: async (transactionId, status) => {
        const response = await api.patch(`/admin/financial/transactions/${transactionId}`, { status });
        return response.data;
    },

    // Export transactions to CSV
    exportTransactions: async (filters = {}) => {
        const params = new URLSearchParams(filters).toString();
        const response = await api.get(`/admin/financial/transactions/export?${params}`, {
            responseType: 'blob' // Important for file downloads
        });
        return response.data;
    },

    // Get user profile with details
    getUserProfile: async (userId) => {
        return api.get(`/admin/users/${userId}/profile`);
    },

    // Get user activity
    getUserActivity: async (userId, page = 1) => {
        return api.get(`/admin/users/${userId}/activity?page=${page}`);
    },

    // Get user enrollments
    getUserEnrollments: async (userId) => {
        return api.get(`/admin/users/${userId}/enrollments`);
    },

    // Notification management
    getNotifications: async () => {
        try {
            const response = await api.get('/notifications');
            // Return the notifications array from the response
            return response.notifications || response.data || [];
        } catch (error) {
            console.error('Error fetching notifications:', error);
            throw error;
        }
    },

    getSentNotifications: async () => {
        try {
            const notifications = await api.get('/notifications/admin/sent');
            console.log('Sent notifications response:', notifications);
            return notifications;
        } catch (error) {
            console.error('Error fetching sent notifications:', error);
            throw error;
        }
    },

    markNotificationAsRead: async (notificationId) => {
        const response = await api.put(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllNotificationsAsRead: async () => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },

    deleteNotification: async (notificationId) => {
        const response = await api.delete(`/notifications/${notificationId}`);
        return response.data;
    },

    sendNotification: async (notificationData) => {
        const { recipientType, recipient, title, message, templateId, template, user, metadata } = notificationData;

        if (!recipient) {
            throw new Error('No recipient specified');
        }

        // Process template variables if template data is provided
        let processedTitle = title;
        let processedMessage = message;
        let variables = {};
        let userIds = [];

        // If sending to a class, fetch all students in that class first
        if (recipientType === 'class') {
            try {
                const students = await api.get(`/admin/classes/${recipient}/students`);
                console.log('Students fetched in sendNotification:', students);

                // The response is already the array of students
                if (!Array.isArray(students) || students.length === 0) {
                    throw new Error('No students found in this class');
                }

                // Get unique student IDs
                userIds = [...new Set(students.map(student => student.id))];
                console.log('Unique student IDs:', userIds);

                // Get class details for template variables
                const classDetails = await api.get(`/admin/classes/${recipient}`);
                console.log('Class details:', classDetails);

                variables = {
                    class_name: classDetails?.title || '',
                    start_date: classDetails?.start_date || '',
                    student_count: userIds.length
                };
            } catch (error) {
                console.error('Error in sendNotification:', error);
                throw new Error(error.message || 'Failed to fetch students in the class');
            }
        } else {
            // For individual user notifications
            userIds = [Number(recipient)];

            if (template) {
                variables = {
                    student_name: user ? `${user.first_name} ${user.last_name}` : '',
                    ...variables
                };
            }
        }

        if (template) {
            // Replace variables in title and message using {variable} syntax
            processedTitle = template.title_template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
            processedMessage = template.message_template.replace(/\{(\w+)\}/g, (match, key) => variables[key] || match);
        }

        // Prepare the payload according to server requirements
        const payload = {
            template_name: template ? template.name : 'custom_notification',
            user_ids: userIds,
            variables: {
                title: processedTitle,
                message: processedMessage,
                ...variables
            },
            type: recipientType === 'class' ? 'class_notification' : 'user_notification',
            metadata: {
                ...metadata, // Include links and attachments from notificationData
                recipient_type: recipientType,
                ...(recipientType === 'class' ? { class_id: recipient } : { user_id: recipient }),
                ...(user ? { user_name: `${user.first_name} ${user.last_name}` } : {})
            }
        };

        console.log('Sending notification payload:', payload);

        // Use different endpoints based on recipient type
        if (recipientType === 'class') {
            // Use bulk endpoint for class notifications (multiple recipients)
            const response = await api.post('/notifications/admin/bulk', payload);
            return response;
        } else {
            // Use individual endpoint for single user notifications
            const individualPayload = {
                recipient: recipient,
                title: processedTitle,
                message: processedMessage,
                recipientType: 'user',
                templateId: templateId,
                template: template,
                user: user,
                metadata: metadata // Include metadata with links and attachments
            };
            const response = await api.post('/notifications/admin/send', individualPayload);
            return response;
        }
    },

    sendBroadcast: async (broadcastData) => {
        try {
            const response = await api.post('/notifications/admin/broadcast', {
                title: broadcastData.title,
                message: broadcastData.message,
                type: 'broadcast'
            });
            // Return the response data directly
            return response;
        } catch (error) {
            console.error('Error sending broadcast:', error);
            throw error;
        }
    },

    // Send payment reminder email
    sendPaymentReminderEmail: async (paymentId) => {
        const response = await api.post('/admin/financial/payments/reminder', {
            payment_id: paymentId
        });
        return response.data;
    },

    // Send payment notification to user's profile
    sendPaymentNotification: async (paymentId, notificationData) => {
        const response = await api.post('/admin/financial/payments/notify', {
            payment_id: paymentId,
            title: notificationData.title,
            message: notificationData.message,
            user_id: notificationData.userId
        });
        return response.data;
    },

    // Get outstanding payments
    getOutstandingPayments: async (dateRange) => {
        const params = new URLSearchParams();
        if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
        return api.get(`/admin/financial/payments/outstanding?${params.toString()}`);
    },

    updateUserStatus: async (userId, status) => {
        return api.patch(`/admin/users/${userId}/status`, { status });
    },

    resetUserPassword: async (userId, newPassword) => {
        return api.put(`/admin/users/${userId}/password`, { newPassword });
    },

    deleteUser: async (userId) => {
        return api.delete(`/admin/users/${userId}`);
    },

    // Get class sessions
    getClassSessions: async (classId) => {
        return api.get(`/classes/${classId}/sessions`);
    },

    // Get class waitlist
    async getClassWaitlist(classId) {
        return api.get(`/admin/classes/${classId}/waitlist`);
    },

    // Get all waitlist entries across all classes
    async getAllWaitlistEntries() {
        return api.get('/admin/waitlist');
    },

    // Get all classes
    async getAllClasses() {
        return api.get('/admin/classes');
    },

    // Update waitlist entry status (admin only)
    async updateWaitlistStatus(classId, waitlistId, status) {
        return api.put(`/admin/classes/${classId}/waitlist/${waitlistId}`, { status });
    },

    // Get all enrollments (active and historical) for a class
    async getAllEnrollments(classId) {
        return api.get(`/admin/classes/${classId}/enrollments`);
    },

    // Get historical enrollments for a class
    async getHistoricalEnrollments(classId) {
        return api.get(`/admin/classes/${classId}/enrollments/historical`);
    },

    // Get all instructors
    getInstructors: async () => {
        return api.get('/admin/instructors');
    },

    // Get class details with sessions
    getClassDetails: async (classId) => {
        return api.get(`/admin/classes/${classId}`);
    },

    // Get transactions
    getTransactions: async (dateRange) => {
        const params = new URLSearchParams();
        if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
        const response = await api.get(`/admin/financial/transactions?${params.toString()}`);
        return response.data || [];
    },

    // Get financial summary
    getFinancialSummary: async (dateRange) => {
        const params = new URLSearchParams();
        if (dateRange?.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange?.endDate) params.append('endDate', dateRange.endDate);
        const response = await api.get(`/admin/financial/summary?${params.toString()}`);
        return response.data || {
            totalRevenue: 0,
            pendingPayments: 0,
            monthlyRevenue: 0,
            outstandingBalance: 0
        };
    },

    getTemplates: async () => {
        try {
            const response = await api.get('/notifications/admin/templates');
            console.log('Raw templates response:', response);
            // Handle both direct array responses and responses with a data property
            return Array.isArray(response) ? response : (response.data || []);
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    },

    createTemplate: async (templateData) => {
        try {
            const response = await api.post('/notifications/admin/templates', templateData);
            return response.data;
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    },

    updateTemplate: async (templateId, templateData) => {
        try {
            // Since there's no update endpoint, we'll delete the old template and create a new one
            await api.delete(`/notifications/admin/templates/${templateId}`);
            const response = await api.post('/notifications/admin/templates', templateData);
            return response.data;
        } catch (error) {
            console.error('Error updating template:', error);
            throw error;
        }
    },

    deleteTemplate: async (templateId) => {
        try {
            const response = await api.delete(`/notifications/admin/templates/${templateId}`);
            return response.data;
        } catch (error) {
            console.error('Error deleting template:', error);
            throw error;
        }
    },

    getAllClasses: async () => {
        try {
            const response = await api.get('/admin/classes');
            // Handle both direct array responses and responses with a data property
            return Array.isArray(response) ? response : (response.data || []);
        } catch (error) {
            console.error('Error fetching classes:', error);
            throw error;
        }
    },

    getClassStudents: async (classId) => {
        try {
            const response = await api.get(`/admin/classes/${classId}/students`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                },
                params: {
                    _t: new Date().getTime() // Add timestamp to prevent caching
                }
            });
            console.log('Raw response in getClassStudents:', response);
            // The response is already the data array from apiConfig.js
            if (!Array.isArray(response)) {
                console.error('Invalid response format:', response);
                return [];
            }
            return response;
        } catch (error) {
            console.error('Error fetching class students:', error);
            throw new Error('Failed to fetch students in the class');
        }
    },

    // Get all sessions with students for a class
    async getClassSessionsWithStudents(classId) {
        console.log(`=== adminService: Calling getClassSessionsWithStudents for class ${classId} ===`);
        const response = await fetchWithAuth(`/sessions/class/${classId}/sessions`);
        console.log(`=== adminService: Response status: ${response.status} ===`);
        if (!response.ok) {
            throw new Error('Failed to fetch sessions and students');
        }
        const data = await response.json();
        console.log(`=== adminService: Response data:`, data);
        return data;
    },

    // Update session status
    async updateSessionStatus(sessionId, status) {
        const response = await fetchWithAuth(`/sessions/sessions/${sessionId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });

        if (!response.ok) {
            throw new Error('Failed to update session status');
        }
        return response.json();
    },

    // Get single notification (admin can view any notification)
    getNotification: async (notificationId) => {
        try {
            const notification = await api.get(`/notifications/admin/${notificationId}`);
            console.log('getNotification response:', notification);
            // The api.get() returns the data directly, not a response object
            return notification;
        } catch (error) {
            console.error('Error fetching notification:', error);
            throw error;
        }
    },

    // Send detailed notification with links
    sendDetailedNotification: async (detailedMessage) => {
        try {
            const response = await api.post('/admin/notifications/detailed', detailedMessage);
            return response.data;
        } catch (error) {
            console.error('Error sending detailed notification:', error);
            throw error;
        }
    }
};

export default adminService; 