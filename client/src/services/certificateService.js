import supabaseStorageService from './supabaseStorageService'
import { API_BASE_URL } from '../config/apiConfig.js'

// Helper function to handle fetch requests
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    // Use the full URL with the proxy path
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

    // For blob responses (like downloads)
    if (options.responseType === 'blob') {
        return response.blob();
    }

    // For JSON responses
    if (contentType && contentType.includes('application/json')) {
        return response.json();
    } else {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text}`);
    }
};

// Get all certificates
export const getAllCertificates = async () => {
    return fetchWithAuth('/certificates');
};

// Get certificates by user ID
export const getCertificatesByUserId = async (userId) => {
    return fetchWithAuth(`/certificates/user/${userId}`);
};

// Upload certificate using Supabase storage
export const uploadCertificate = async (studentId, file, classId, sessionId, expirationDate) => {
    try {
        // First upload file to Supabase storage
        const uploadResult = await supabaseStorageService.uploadCertificate(file, studentId, classId);

        // Then save certificate metadata to backend
        const certificateData = {
            user_id: studentId,
            class_id: classId,
            session_id: sessionId,
            certificate_name: file.name,
            certificate_url: uploadResult.publicUrl,
            file_path: uploadResult.filePath,
            file_type: file.type,
            file_size: file.size,
            expiration_date: expirationDate,
            supabase_path: uploadResult.filePath
        };

        return fetchWithAuth('/certificates/upload-metadata', {
            method: 'POST',
            body: JSON.stringify(certificateData)
        });
    } catch (error) {
        console.error('Certificate upload error:', error);
        throw error;
    }
};

// Upload user file (for user profile uploads)
export const uploadUserFile = async (file, userId, folder = 'general') => {
    try {
        return await supabaseStorageService.uploadUserFile(file, userId, folder);
    } catch (error) {
        console.error('User file upload error:', error);
        throw error;
    }
};

// Download certificate
export const downloadCertificate = async (certificateId) => {
    return fetchWithAuth(`/certificates/${certificateId}/download`, {
        responseType: 'blob'
    });
};

// Delete certificate
export const deleteCertificate = async (certificateId) => {
    return fetchWithAuth(`/certificates/${certificateId}`, {
        method: 'DELETE'
    });
};

// Verify certificate
export const verifyCertificate = async (verificationCode) => {
    return fetchWithAuth(`/certificates/verify/${verificationCode}`);
};

// Generate certificate
export const generateCertificate = async (userId, classId, certificateName) => {
    return fetchWithAuth('/certificates/generate', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, class_id: classId, certificate_name: certificateName })
    });
};

// Generate certificates for a class
export const generateClassCertificates = async (classId) => {
    return fetchWithAuth(`/certificates/generate-class/${classId}`, {
        method: 'POST'
    });
};

// Get completed sessions for a class
export const getCompletedSessions = async (classId) => {
    return fetchWithAuth(`/certificates/completed-sessions/${classId}`);
}; 