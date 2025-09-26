const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { cloudinary } = require('../config/cloudinary');

// Helper function to generate verification code
const generateVerificationCode = () => {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
};

// Get certificate by ID
const getCertificateById = async (id) => {
    const result = await pool.query(`
        SELECT c.*, 
               u.first_name, u.last_name,
               cls.title as class_title,
               cs.session_date, cs.start_time, cs.end_time,
               up.first_name as uploaded_by_first_name,
               up.last_name as uploaded_by_last_name
        FROM certificates c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN classes cls ON c.class_id = cls.id
        LEFT JOIN class_sessions cs ON c.session_id = cs.id
        LEFT JOIN users up ON c.uploaded_by = up.id
        WHERE c.id = $1
    `, [id]);
    return result.rows[0];
};

// Get certificates by user ID
const getCertificatesByUserId = async (userId) => {
    const result = await pool.query(`
        SELECT c.*, 
               cls.title as class_title,
               cs.session_date, cs.start_time, cs.end_time,
               up.first_name as uploaded_by_first_name,
               up.last_name as uploaded_by_last_name
        FROM certificates c
        LEFT JOIN classes cls ON c.class_id = cls.id
        LEFT JOIN class_sessions cs ON c.session_id = cs.id
        LEFT JOIN users up ON c.uploaded_by = up.id
        WHERE c.user_id = $1 
        ORDER BY c.created_at DESC
    `, [userId]);
    return result.rows;
};

// Create new certificate
const createCertificate = async ({ user_id, class_id, session_id, certificate_name, certificate_url, expiration_date, metadata = {} }) => {
    const verificationCode = generateVerificationCode();
    const result = await pool.query(
        `INSERT INTO certificates (
            user_id, class_id, session_id, certificate_name, certificate_url, 
            expiration_date, metadata, verification_code, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active') 
        RETURNING *`,
        [user_id, class_id, session_id, certificate_name, certificate_url, expiration_date, metadata, verificationCode]
    );
    return result.rows[0];
};

// Delete certificate
const deleteCertificate = async (id) => {
    const certificate = await getCertificateById(id);
    if (certificate && certificate.cloudinary_id) {
        // Delete from Cloudinary if exists
        await cloudinary.uploader.destroy(certificate.cloudinary_id);
    }
    await pool.query('DELETE FROM certificates WHERE id = $1', [id]);
};

// Verify certificate
const verifyCertificate = async (verificationCode) => {
    const result = await pool.query(`
        SELECT c.*, 
               u.first_name, u.last_name,
               cls.title as class_title
        FROM certificates c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN classes cls ON c.class_id = cls.id
        WHERE c.verification_code = $1
    `, [verificationCode]);
    return result.rows[0];
};

// Generate certificate PDF
const generateCertificate = async (certificateId) => {
    // Fetch certificate data
    const cert = await getCertificateById(certificateId);
    if (!cert) throw new Error('Certificate not found');

    // Generate PDF
    const doc = new PDFDocument();
    const tempPath = path.join(__dirname, `../../tmp/certificate-${certificateId}.pdf`);
    doc.pipe(fs.createWriteStream(tempPath));
    doc.fontSize(25).text('Certificate of Completion', 100, 100);
    doc.fontSize(18).text(`Awarded to: ${cert.certificate_name}`, 100, 150);
    doc.end();

    // Wait for PDF to finish writing
    await new Promise(resolve => doc.on('end', resolve));

    // Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(tempPath, {
        resource_type: 'raw', // for PDFs
        folder: 'certificates'
    });

    // Update DB with Cloudinary URL
    await pool.query(
        'UPDATE certificates SET certificate_url = $1, cloudinary_id = $2 WHERE id = $3',
        [uploadResult.secure_url, uploadResult.public_id, certificateId]
    );

    // Delete local temp file
    fs.unlinkSync(tempPath);

    return uploadResult.secure_url;
};

// Update certificate URL
const updateCertificateUrl = async (certificateId, url) => {
    const result = await pool.query(
        'UPDATE certificates SET certificate_url = $1 WHERE id = $2 RETURNING *',
        [url, certificateId]
    );
    return result.rows[0];
};

// Generate certificates for a class
const generateClassCertificates = async (classId) => {
    // Get all approved enrollments for the class
    const result = await pool.query(`
        SELECT 
            u.id as user_id,
            u.first_name,
            u.last_name,
            c.title as class_title
        FROM enrollments e
        JOIN users u ON e.user_id = u.id
        JOIN classes c ON e.class_id = c.id
        WHERE e.class_id = $1 
        AND e.enrollment_status = 'approved'
        AND NOT EXISTS (
            SELECT 1 FROM certificates 
            WHERE user_id = u.id AND class_id = $1
        )
    `, [classId]);

    const generatedCertificates = [];
    for (const enrollment of result.rows) {
        const certificate = await createCertificate({
            user_id: enrollment.user_id,
            class_id: classId,
            certificate_name: `${enrollment.class_title} Certificate`,
            certificate_url: null,
            metadata: { generated_by: 'system' }
        });

        await generateCertificate(certificate.id);
        generatedCertificates.push(certificate);
    }

    return generatedCertificates;
};

// Upload certificate
const uploadCertificate = async ({ user_id, class_id, session_id, certificate_name, file_path, file_type, file_size, expiration_date, uploaded_by, cloudinary_id, supabase_path }) => {
    try {
        console.log('Starting certificate upload to database...', {
            user_id,
            class_id,
            session_id,
            certificate_name,
            file_path,
            file_type,
            file_size,
            expiration_date,
            cloudinary_id,
            supabase_path
        });

        // Use the secure_url directly from Cloudinary or Supabase
        const certificateUrl = file_path;

        console.log('Using certificate URL:', certificateUrl);

        const result = await pool.query(
            `INSERT INTO certificates (
                user_id, class_id, session_id, certificate_name, certificate_url, 
                expiration_date, cloudinary_id, supabase_path, file_type, file_size, uploaded_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'approved') 
            RETURNING *`,
            [
                user_id,
                class_id,
                session_id,
                certificate_name,
                certificateUrl,
                expiration_date,
                cloudinary_id,
                supabase_path,
                file_type,
                file_size,
                uploaded_by
            ]
        );

        console.log('Certificate record created successfully:', result.rows[0]);
        console.log('Session ID saved:', result.rows[0].session_id);
        console.log('Expiration date saved:', result.rows[0].expiration_date);
        return result.rows[0];
    } catch (error) {
        console.error('Error creating certificate record:', error);
        throw error;
    }
};

// Get all certificates
const getAllCertificates = async () => {
    try {
        console.log('Executing getAllCertificates query...');
        const result = await pool.query(`
            SELECT 
                c.*,
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                cls.title as class_name,
                cs.session_date, cs.start_time, cs.end_time,
                c.created_at as upload_date,
                c.file_size,
                c.file_type,
                c.cloudinary_id,
                c.status,
                CONCAT(up.first_name, ' ', up.last_name) as uploaded_by_name
            FROM certificates c
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN classes cls ON c.class_id = cls.id
            LEFT JOIN class_sessions cs ON c.session_id = cs.id
            LEFT JOIN users up ON c.uploaded_by = up.id
            ORDER BY c.created_at DESC
        `);

        // Always use the stored Cloudinary URL
        const transformedRows = result.rows.map(cert => {
            if (cert.certificate_url) {
                return {
                    ...cert,
                    certificate_url: cert.certificate_url
                };
            }
            // If for some reason the URL is missing, return null
            return {
                ...cert,
                certificate_url: null
            };
        });

        console.log('Query executed successfully, found', transformedRows.length, 'certificates');
        console.log('Sample certificate with session data:', transformedRows[0]);
        return transformedRows;
    } catch (error) {
        console.error('Database error in getAllCertificates:', error);
        console.error('SQL State:', error.code);
        console.error('Error stack:', error.stack);
        throw error;
    }
};

// Get authenticated download URL for a certificate
const getDownloadUrl = async (certificateId) => {
    const certificate = await getCertificateById(certificateId);
    if (!certificate || !certificate.certificate_url) {
        throw new Error('Certificate not found or no file attached');
    }
    // Always use the stored Cloudinary URL
    return certificate.certificate_url;
};

// Get completed sessions for a class
const getCompletedSessions = async (classId) => {
    const result = await pool.query(`
        SELECT
            cs.id,
            cs.session_date,
            cs.start_time,
            cs.end_time,
            cs.capacity,
            cs.enrolled_count,
            cs.status
        FROM class_sessions cs
        WHERE cs.class_id = $1
        AND cs.status = 'completed'
        AND cs.session_date <= CURRENT_DATE
        ORDER BY cs.session_date DESC, cs.start_time DESC
    `, [classId]);
    return result.rows;
};

module.exports = {
    getCertificateById,
    getCertificatesByUserId,
    createCertificate,
    deleteCertificate,
    verifyCertificate,
    generateCertificate,
    updateCertificateUrl,
    generateClassCertificates,
    uploadCertificate,
    getAllCertificates,
    getDownloadUrl,
    getCompletedSessions,
    generateVerificationCode
}; 