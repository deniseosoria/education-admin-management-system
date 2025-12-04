const pool = require('../config/db');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { supabase, STORAGE_BUCKETS } = require('../config/supabase');

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

    if (certificate) {
        // Delete from Supabase storage if exists
        if (certificate.supabase_path) {
            try {
                const { error } = await supabase.storage
                    .from(STORAGE_BUCKETS.CERTIFICATES)
                    .remove([certificate.supabase_path]);

                if (error) {
                    console.error('Error deleting from Supabase:', error);
                    // Continue with deletion even if Supabase deletion fails
                } else {
                    console.log('Successfully deleted from Supabase:', certificate.supabase_path);
                }
            } catch (supabaseError) {
                console.error('Error deleting from Supabase:', supabaseError);
                // Continue with deletion even if Supabase deletion fails
            }
        }
    }

    // Delete from database
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

    // Read the PDF file
    const fileBuffer = fs.readFileSync(tempPath);
    const fileName = `certificate-${certificateId}-${Date.now()}.pdf`;
    const filePath = `certificates/${cert.user_id || 'system'}/${fileName}`;

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKETS.CERTIFICATES)
        .upload(filePath, fileBuffer, {
            contentType: 'application/pdf',
            upsert: false
        });

    if (uploadError) {
        fs.unlinkSync(tempPath);
        throw new Error(`Failed to upload certificate to Supabase: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
        .from(STORAGE_BUCKETS.CERTIFICATES)
        .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;

    // Update DB with Supabase URL and path
    await pool.query(
        'UPDATE certificates SET certificate_url = $1, supabase_path = $2 WHERE id = $3',
        [publicUrl, filePath, certificateId]
    );

    // Delete local temp file
    fs.unlinkSync(tempPath);

    return publicUrl;
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
const uploadCertificate = async ({ user_id, class_id, session_id, certificate_name, file_path, file_type, file_size, expiration_date, uploaded_by, supabase_path }) => {
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
            supabase_path
        });

        // Use the Supabase URL directly
        const certificateUrl = file_path;

        console.log('Using certificate URL:', certificateUrl);

        const result = await pool.query(
            `INSERT INTO certificates (
                user_id, class_id, session_id, certificate_name, certificate_url, 
                expiration_date, supabase_path, file_type, file_size, uploaded_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved') 
            RETURNING *`,
            [
                user_id,
                class_id,
                session_id,
                certificate_name,
                certificateUrl,
                expiration_date,
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

        // Always use the stored Supabase URL
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
    // Always use the stored Supabase URL
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

// Get certificates expiring in the next 2 months
// Note: All certificates uploaded through certificate management are automatically approved,
// so we don't need to filter by status
const getCertificatesExpiringSoon = async () => {
    const result = await pool.query(`
        SELECT 
            c.*,
            u.id as user_id,
            u.email as user_email,
            u.first_name,
            u.last_name,
            CONCAT(u.first_name, ' ', u.last_name) as student_name,
            cls.title as class_name,
            cs.session_date, cs.start_time, cs.end_time
        FROM certificates c
        LEFT JOIN users u ON c.user_id = u.id
        LEFT JOIN classes cls ON c.class_id = cls.id
        LEFT JOIN class_sessions cs ON c.session_id = cs.id
        WHERE c.expiration_date IS NOT NULL
        AND c.expiration_date >= CURRENT_DATE
        AND c.expiration_date <= CURRENT_DATE + INTERVAL '2 months'
        ORDER BY c.expiration_date ASC
    `);
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
    getCertificatesExpiringSoon,
    generateVerificationCode
}; 