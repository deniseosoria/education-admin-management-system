import React from 'react';
import './CertificatesSection.css';

const CertificatesSection = ({ certificates }) => {
    // Debug: Log certificates data to see what's being received
    console.log('CertificatesSection received certificates:', certificates);
    console.log('Sample certificate data:', certificates?.[0]);

    // Format time to user-friendly format (e.g., "9:00 AM")
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        try {
            const [hour, minute] = timeStr.split(':');
            const date = new Date();
            date.setHours(Number(hour), Number(minute), 0, 0);
            return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch (error) {
            console.error('Error formatting time:', timeStr, error);
            return timeStr || '';
        }
    };

    // Check if a class is a CPR class
    const isCPRClass = (className) => {
        if (!className) return false;
        const classNameLower = className.toLowerCase();
        return classNameLower.includes('cpr') || classNameLower.includes('first aid');
    };

    // Ensure certificates is always an array
    const safeCertificates = certificates || [];

    return (
        <div className="certificates-section">
            <div className="section-header">
                <h2>Certificates</h2>
            </div>

            {safeCertificates.length > 0 ? (
                <div className="certificates-grid">
                    {safeCertificates.map(certificate => {
                        const isCPR = isCPRClass(certificate.class_name);
                        return (
                            <div key={certificate.id} className="certificate-card">
                                <div className="certificate-info">
                                    <h3>{certificate.class_name || certificate.certificate_name}</h3>
                                    {certificate.session_date && (
                                        <p className="session-info">
                                            <i className="fas fa-calendar-alt"></i>
                                            Session: {new Date(certificate.session_date).toLocaleDateString()}
                                            {certificate.start_time && certificate.end_time && (
                                                <span className="session-time">
                                                    {' '}({formatTime(certificate.start_time)} - {formatTime(certificate.end_time)})
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    {certificate.expiration_date && (
                                        <p className="expiration-info">
                                            <i className="fas fa-clock"></i>
                                            Expires: {new Date(certificate.expiration_date).toLocaleDateString()}
                                            {new Date(certificate.expiration_date) < new Date() && (
                                                <span className="expired-badge">Expired</span>
                                            )}
                                        </p>
                                    )}
                                    <p className="issue-date">
                                        <i className="fas fa-calendar-check"></i>
                                        Issued: {new Date(certificate.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                                {!isCPR && certificate.certificate_url && (
                                    <div className="certificate-actions">
                                        <a
                                            href={certificate.certificate_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="btn btn-primary"
                                        >
                                            <i className="fas fa-download"></i>
                                            Download
                                        </a>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="empty-state">
                    <i className="fas fa-certificate"></i>
                    <p>No certificates yet</p>
                    <p className="empty-state-subtext">
                        Complete classes to earn certificates
                    </p>
                </div>
            )}
        </div>
    );
};

export default CertificatesSection; 