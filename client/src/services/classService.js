import api from './apiConfig';
import { API_BASE_URL } from '../config/apiConfig.js';

const classService = {
    // Helper function to handle fetch requests
    fetchWithAuth: async (url, options = {}) => {
        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        const response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers
        });

        const contentType = response.headers.get('content-type');

        if (response.status === 401) {
            // Don't redirect here - let React Router handle authentication
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
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        if (contentType && contentType.includes('application/json')) {
            return response.json();
        } else {
            const text = await response.text();
            throw new Error(`Expected JSON but got: ${text}`);
        }
    },

    // Get all classes
    getAllClasses: async () => {
        return classService.fetchWithAuth('/classes');
    },

    // Get a single class by ID
    getClassById: async (classId) => {
        return classService.fetchWithAuth(`/classes/${classId}`);
    },

    // Create a new class (admin only)
    createClass: async (classData) => {
        return classService.fetchWithAuth('/admin/classes', {
            method: 'POST',
            body: JSON.stringify(classData)
        });
    },

    // Update a class (admin only)
    updateClass: async (classId, classData) => {
        return classService.fetchWithAuth(`/admin/classes/${classId}`, {
            method: 'PUT',
            body: JSON.stringify(classData)
        });
    },

    // Delete a class (admin only)
    deleteClass: async (classId) => {
        return classService.fetchWithAuth(`/admin/classes/${classId}`, {
            method: 'DELETE'
        });
    },

    // Get class schedule
    getClassSchedule: async (classId) => {
        return api.get(`/classes/${classId}/schedule`);
    },

    // Update class schedule (admin only)
    updateClassSchedule: async (classId, scheduleData) => {
        return api.put(`/classes/${classId}/schedule`, scheduleData);
    },

    // Get class materials
    getClassMaterials: async (classId) => {
        return api.get(`/classes/${classId}/materials`);
    },

    // Add class material (admin only)
    addClassMaterial: async (classId, materialData) => {
        return api.post(`/classes/${classId}/materials`, materialData);
    },

    // Remove class material (admin only)
    removeClassMaterial: async (classId, materialId) => {
        return api.delete(`/classes/${classId}/materials/${materialId}`);
    },

    // Get class participants
    getClassParticipants: async (classId) => {
        return api.get(`/classes/${classId}/participants`);
    },

    // Get class statistics (admin only)
    getClassStats: async (classId) => {
        return api.get(`/classes/${classId}/stats`);
    },

    // Update class status (admin only)
    updateClassStatus: async (classId, status) => {
        return api.put(`/classes/${classId}/status`, { status });
    },

    // Get sessions for a class
    getClassSessions: async (classId) => {
        return classService.fetchWithAuth(`/classes/${classId}/sessions`);
    },

    // Get a single session (admin/instructor)
    getSessionById: async (sessionId) => {
        return classService.fetchWithAuth(`/sessions/${sessionId}`);
    },

    // Create a session (admin/instructor)
    createSession: async (sessionData) => {
        return classService.fetchWithAuth('/sessions', {
            method: 'POST',
            body: JSON.stringify(sessionData)
        });
    },

    // Update a session (admin/instructor)
    updateSession: async (sessionId, sessionData) => {
        return classService.fetchWithAuth(`/sessions/${sessionId}`, {
            method: 'PUT',
            body: JSON.stringify(sessionData)
        });
    },

    // Delete a session (admin/instructor)
    deleteSession: async (sessionId) => {
        return classService.fetchWithAuth(`/sessions/${sessionId}`, {
            method: 'DELETE'
        });
    }
};

export default classService; 