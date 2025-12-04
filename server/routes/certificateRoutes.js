const express = require('express');
const router = express.Router();
const { requireAuth, requireAdmin } = require('../middleware/auth');
// Note: Cloudinary upload is deprecated - all certificate uploads should use Supabase
// Keeping this import for backward compatibility only
const { upload } = require('../config/cloudinary');
const {
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
    getCompletedSessions
} = require('../controllers/certificateController');

// Admin routes
router.get('/', requireAuth, requireAdmin, getAllCertificates);
router.post('/generate', requireAuth, requireAdmin, generateCertificate);
router.post('/generate-class/:classId', requireAuth, requireAdmin, generateClassCertificates);
router.get('/:id/download', requireAuth, requireAdmin, downloadCertificate);
router.get('/user/:userId', requireAuth, requireAdmin, getUserCertificates);
router.delete('/:id', requireAuth, requireAdmin, deleteCertificate);
router.get('/completed-sessions/:classId', requireAuth, requireAdmin, getCompletedSessions);

// Student certificate routes
// DEPRECATED: This route uses Cloudinary multer upload. Use /upload-metadata with Supabase instead.
router.post('/upload/:studentId',
    requireAuth,
    requireAdmin,
    upload.single('certificate'), // 'certificate' is the field name in the form
    uploadStudentCertificate
);

// Primary route for certificate uploads (uses Supabase storage)
router.post('/upload-metadata', requireAuth, uploadCertificateMetadata);

router.get('/view/:studentId', requireAuth, viewStudentCertificate);

// Public route for certificate verification
router.get('/verify/:code', verifyCertificate);

module.exports = router; 