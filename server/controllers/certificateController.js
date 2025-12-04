const Certificate = require('../models/certificateModel');
const path = require('path');
const fs = require('fs');

// @desc    Generate certificate for a student
// @route   POST /api/admin/certificates/generate
// @access  Private/Admin
const generateCertificate = async (req, res) => {
    try {
        const { user_id, class_id, certificate_name } = req.body;

        if (!user_id || !class_id || !certificate_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const certificate = await Certificate.createCertificate({
            user_id,
            class_id,
            certificate_name,
            certificate_url: null,
            metadata: { generated_by: req.user.id }
        });

        await Certificate.generateCertificate(certificate.id);

        res.json({
            message: 'Certificate generated successfully',
            certificate: {
                ...certificate,
                download_url: `/api/admin/certificates/${certificate.id}/download`
            }
        });
    } catch (error) {
        console.error('Generate certificate error:', error);
        res.status(500).json({ error: 'Failed to generate certificate' });
    }
};

// @desc    Generate certificates for all approved students in a class
// @route   POST /api/admin/certificates/generate-class/:classId
// @access  Private/Admin
const generateClassCertificates = async (req, res) => {
    try {
        const { classId } = req.params;
        const certificates = await Certificate.generateClassCertificates(classId);

        res.json({
            message: 'Certificates generated successfully',
            certificates: certificates.map(cert => ({
                ...cert,
                download_url: `/api/admin/certificates/${cert.id}/download`
            }))
        });
    } catch (error) {
        console.error('Generate class certificates error:', error);
        res.status(500).json({ error: 'Failed to generate class certificates' });
    }
};

// @desc    Download certificate
// @route   GET /api/certificates/:id/download
// @access  Private/Admin
const downloadCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        const downloadUrl = await Certificate.getDownloadUrl(id);
        res.redirect(downloadUrl);
    } catch (error) {
        console.error('Download certificate error:', error);
        if (error.message === 'Certificate not found or no file attached') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Failed to download certificate' });
        }
    }
};

// @desc    Verify certificate
// @route   GET /api/certificates/verify/:code
// @access  Public
const verifyCertificate = async (req, res) => {
    try {
        const { code } = req.params;
        const certificate = await Certificate.verifyCertificate(code);

        if (!certificate) {
            return res.status(404).json({ error: 'Invalid certificate code' });
        }

        res.json({
            valid: true,
            certificate: {
                name: `${certificate.first_name} ${certificate.last_name}`,
                class_title: certificate.class_title,
                issue_date: certificate.issue_date
            }
        });
    } catch (error) {
        console.error('Verify certificate error:', error);
        res.status(500).json({ error: 'Failed to verify certificate' });
    }
};

// @desc    Get user certificates
// @route   GET /api/admin/certificates/user/:userId
// @access  Private/Admin
const getUserCertificates = async (req, res) => {
    try {
        const { userId } = req.params;
        const certificates = await Certificate.getCertificatesByUserId(userId);

        res.json(certificates.map(cert => ({
            ...cert,
            download_url: `/api/admin/certificates/${cert.id}/download`
        })));
    } catch (error) {
        console.error('Get user certificates error:', error);
        res.status(500).json({ error: 'Failed to get user certificates' });
    }
};

// @desc    Delete certificate
// @route   DELETE /api/admin/certificates/:id
// @access  Private/Admin
const deleteCertificate = async (req, res) => {
    try {
        const { id } = req.params;
        console.log('Attempting to delete certificate with ID:', id);

        const certificate = await Certificate.getCertificateById(id);
        console.log('Found certificate:', certificate ? 'yes' : 'no');

        if (!certificate) {
            console.log('Certificate not found in database');
            return res.status(404).json({ error: 'Certificate not found' });
        }

        // The deleteCertificate function in the model handles Supabase storage deletion
        console.log('Attempting to delete certificate from Supabase storage and database');
        await Certificate.deleteCertificate(id);
        console.log('Successfully deleted from database');

        res.json({ message: 'Certificate deleted successfully' });
    } catch (error) {
        console.error('Delete certificate error:', error);
        res.status(500).json({ error: 'Failed to delete certificate' });
    }
};

/**
 * Upload a certificate for a student
 * @route POST /api/certificates/upload/:studentId
 * @access Private (Admin only)
 */
const uploadStudentCertificate = async (req, res) => {
    try {
        console.log('Starting certificate upload...');
        const { studentId } = req.params;
        const { classId } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Note: This route uses multer with Cloudinary storage, but certificates should be uploaded via Supabase
        // This route is kept for backward compatibility but should use Supabase upload flow instead
        console.log('File upload received:', {
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path
        });

        console.log('Upload request studentId:', studentId, 'classId:', classId);

        // For now, we'll use the file path as-is, but ideally this should be uploaded to Supabase first
        // The file.path should be a Supabase URL if using the Supabase upload flow
        const certificate = await Certificate.uploadCertificate({
            user_id: studentId,
            class_id: classId,
            certificate_name: file.originalname,
            file_path: file.path || file.secure_url || file.url,
            file_type: file.mimetype,
            file_size: file.size,
            uploaded_by: req.user.id,
            supabase_path: file.path // Use file path as supabase_path
        });

        console.log('Created certificate:', certificate);
        // Fetch the full certificate info with joins
        const fullCertificate = await Certificate.getCertificateById(certificate.id);
        console.log('Fetched full certificate from DB:', fullCertificate);

        // Map to include student_name and class_name for frontend compatibility
        const mappedCertificate = {
            ...fullCertificate,
            student_name: `${fullCertificate.first_name || ''} ${fullCertificate.last_name || ''}`.trim(),
            class_name: fullCertificate.class_title || ''
        };

        console.log('Certificate uploaded successfully (mapped):', mappedCertificate);
        res.status(201).json(mappedCertificate);
    } catch (error) {
        console.error('Error uploading certificate:', error);
        res.status(500).json({ message: 'Error uploading certificate', error: error.message });
    }
};

/**
 * Upload certificate metadata (after file uploaded to Supabase)
 * @route POST /api/certificates/upload-metadata
 * @access Private
 */
const uploadCertificateMetadata = async (req, res) => {
    try {
        const {
            user_id,
            class_id,
            session_id,
            certificate_name,
            certificate_url,
            file_path,
            file_type,
            file_size,
            expiration_date,
            supabase_path
        } = req.body;

        if (!user_id || !certificate_name || !certificate_url || !file_path) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const certificate = await Certificate.uploadCertificate({
            user_id,
            class_id,
            session_id,
            certificate_name,
            file_path: certificate_url, // Use the public URL as file_path
            file_type,
            file_size,
            expiration_date,
            uploaded_by: req.user.id,
            supabase_path: supabase_path // Store Supabase path
        });

        res.json({
            message: 'Certificate uploaded successfully',
            certificate
        });
    } catch (error) {
        console.error('Upload certificate metadata error:', error);
        res.status(500).json({ error: 'Failed to upload certificate metadata' });
    }
};

/**
 * View a student's certificate
 * @route GET /api/certificates/view/:studentId
 * @access Private
 */
const viewStudentCertificate = async (req, res) => {
    try {
        const { studentId } = req.params;
        const userId = req.user.id;

        // Check if the user has permission to view this certificate
        const isAdmin = req.user.role === 'admin';
        const isOwnCertificate = userId === studentId;

        if (!isAdmin && !isOwnCertificate) {
            return res.status(403).json({
                error: 'Not authorized',
                details: 'You do not have permission to view this certificate'
            });
        }

        // Fetch the certificate from database
        const certificate = await Certificate.findOne({
            where: {
                user_id: studentId,
                status: 'active'
            },
            order: [['upload_date', 'DESC']] // Get the most recent certificate
        });

        if (!certificate) {
            return res.status(404).json({
                error: 'Certificate not found',
                details: 'No active certificate found for this student'
            });
        }

        // Return the certificate data
        res.json({
            certificate: {
                id: certificate.id,
                name: certificate.certificate_name,
                url: certificate.certificate_url,
                type: certificate.file_type,
                size: certificate.file_size,
                uploadDate: certificate.upload_date,
                status: certificate.status,
                metadata: certificate.metadata
            }
        });
    } catch (error) {
        console.error('Error viewing certificate:', error);

        if (error.name === 'SequelizeDatabaseError') {
            return res.status(500).json({
                error: 'Database error',
                details: 'Error retrieving certificate information'
            });
        }

        res.status(500).json({
            error: 'Error retrieving certificate',
            details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
};

// Get all certificates
const getAllCertificates = async (req, res) => {
    try {
        console.log('Fetching all certificates...');
        const certs = await Certificate.getAllCertificates();
        console.log('Successfully fetched certificates:', certs.length);
        res.json(certs);
    } catch (error) {
        console.error('Error in getAllCertificates:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({
            error: 'Failed to fetch certificates',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// Get certificate by ID
const getCertificateById = async (req, res) => {
    try {
        const cert = await Certificate.getCertificateById(req.params.id);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });
        res.json(cert);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch certificate', details: error.message });
    }
};

// Get certificates by user ID
const getCertificatesByUserId = async (req, res) => {
    try {
        const certs = await Certificate.getCertificatesByUserId(req.params.userId);
        res.json(certs);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch user certificates', details: error.message });
    }
};

// Get completed sessions for a class
const getCompletedSessions = async (req, res) => {
    try {
        const { classId } = req.params;
        const sessions = await Certificate.getCompletedSessions(classId);
        res.json(sessions);
    } catch (error) {
        console.error('Get completed sessions error:', error);
        res.status(500).json({ error: 'Failed to fetch completed sessions', details: error.message });
    }
};

module.exports = {
    generateCertificate,
    generateClassCertificates,
    downloadCertificate,
    verifyCertificate,
    getUserCertificates,
    deleteCertificate,
    uploadStudentCertificate,
    uploadCertificateMetadata,
    viewStudentCertificate,
    getAllCertificates,
    getCertificateById,
    getCertificatesByUserId,
    getCompletedSessions
}; 