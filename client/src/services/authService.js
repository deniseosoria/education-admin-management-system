import api from './apiConfig';

const authService = {
    // Login user
    login: async (credentials) => {
        const response = await api.post('/users/login', credentials, { includeAuth: false });
        if (response.token) {
            localStorage.setItem('token', response.token);
        }
        return response;
    },

    // Register new user
    register: async (userData) => {
        const response = await api.post('/users/register', userData, { includeAuth: false });
        if (response.token) {
            localStorage.setItem('token', response.token);
        }
        return response;
    },

    // Logout user
    logout: () => {
        localStorage.removeItem('token');
        // You might want to call a logout endpoint here if you have one
        return api.post('/users/logout');
    },

    // Get current user profile
    getCurrentUser: async () => {
        return api.get('/users/profile');
    },

    // Update user profile
    updateProfile: async (userData) => {
        return api.put('/users/profile', userData);
    },

    // Change password
    changePassword: async (passwordData) => {
        return api.post('/users/change-password', passwordData);
    },

    // Request password reset
    requestPasswordReset: async (email) => {
        return api.post('/users/forgot-password', { email }, { includeAuth: false });
    },

    // Reset password with token
    resetPassword: async (token, newPassword) => {
        return api.post('/users/reset-password', { token, newPassword }, { includeAuth: false });
    },

    // Verify reset token
    verifyResetToken: async (token) => {
        return api.get(`/users/reset-password/${token}`, { includeAuth: false });
    },

    // Verify email
    verifyEmail: async (token) => {
        return api.post('/users/verify-email', { token }, { includeAuth: false });
    }
};

export default authService; 