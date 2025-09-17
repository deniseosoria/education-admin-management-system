import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ProfileHeader from './ProfileHeader';
import ProfileNavigation from './ProfileNavigation';
import ProfileOverview from './ProfileOverview';
import CertificatesSection from './CertificatesSection';
import PaymentMethodsSection from './PaymentMethodsSection';
import ActivityLogSection from './ActivityLogSection';
import NotificationsSection from './NotificationsSection';
import EnrollmentsSection from './EnrollmentsSection';
import PasswordSection from './PasswordSection';
import PaymentsDueSection from './PaymentsDueSection';
import MyWaitlist from '../user/MyWaitlist';
import EmailManagementSection from './EmailManagementSection';
import userService from '../../services/userService';
import './ProfilePage.css';

const ProfilePage = () => {
    const [activeSection, setActiveSection] = useState('overview');
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        fetchProfile();
    }, []);

    // Handle section query parameter
    useEffect(() => {
        const urlParams = new URLSearchParams(location.search);
        const sectionParam = urlParams.get('section');
        if (sectionParam) {
            setActiveSection(sectionParam);
        }
    }, [location.search]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            console.log('Fetching profile...'); // Debug log
            const response = await userService.getProfile();
            console.log('Raw API Response:', response); // Debug log
            if (!response) {
                console.error('Invalid API response:', response);
                throw new Error('Invalid response from server');
            }
            console.log('Setting profile data:', response); // Debug log
            setProfile(response);
            console.log('Enrollments from API:', response.enrollments);
            setError(null);
        } catch (err) {
            console.error('Profile fetch error details:', {
                message: err.message,
                response: err.response,
                stack: err.stack
            });
            setError(err.message || 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleSectionChange = (section) => {
        console.log('Changing section to:', section); // Debug log
        setActiveSection(section);
        // Close mobile menu when a section is selected
        setIsMobileMenuOpen(false);
    };

    const handleProfileUpdate = async (updatedData) => {
        try {
            setLoading(true);
            const response = await userService.updateProfile(updatedData);
            console.log('Profile update response:', response); // Debug log
            setProfile(response);
            setError(null);
        } catch (err) {
            console.error('Profile update error:', err);
            setError(err.message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentComplete = async (paymentId) => {
        try {
            await userService.updatePaymentStatus(paymentId, 'paid');
            await fetchProfile();
        } catch (err) {
            console.error('Payment update error:', err);
            setError(err.message || 'Failed to update payment status');
        }
    };

    const handleNotificationsUpdate = async (updatedNotifications) => {
        try {
            // Update the profile state with the new notifications
            setProfile(prevProfile => ({
                ...prevProfile,
                notifications: updatedNotifications
            }));

            // Call the API to update notifications on the server
            await userService.updateNotifications(updatedNotifications);
        } catch (error) {
            console.error('Failed to update notifications:', error);
            setError('Failed to update notifications. Please try again.');
        }
    };

    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    if (loading) {
        return (
            <div className="profile-page loading">
                <div className="loading-spinner"></div>
                <p>Loading profile data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="profile-page error">
                <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i>
                    <p>{error}</p>
                    <button className="retry-button" onClick={fetchProfile}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!profile || typeof profile !== 'object') {
        return (
            <div className="profile-page error">
                <div className="error-message">
                    <i className="fas fa-user-slash"></i>
                    <p>No profile data available</p>
                    <button className="retry-button" onClick={fetchProfile}>
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    // Filter enrollments after profile is loaded and valid
    let currentEnrollments = [];
    let pastEnrollments = [];
    if (profile && Array.isArray(profile.enrollments)) {
        // The updated getUserEnrollments function now returns both active and historical enrollments
        // with an enrollment_type field to distinguish them
        currentEnrollments = profile.enrollments.filter((enrollment) =>
            enrollment.enrollment_type === 'active'
        );
        pastEnrollments = profile.enrollments.filter((enrollment) =>
            enrollment.enrollment_type === 'historical'
        );

        console.log('Filtered enrollments:', {
            total: profile.enrollments.length,
            current: currentEnrollments.length,
            past: pastEnrollments.length,
            currentEnrollments,
            pastEnrollments
        });
    } else {
        console.log('No enrollments found in profile:', {
            profile: profile,
            enrollments: profile?.enrollments,
            isArray: Array.isArray(profile?.enrollments)
        });
    }

    console.log('Rendering profile page with data:', profile); // Debug log

    return (
        <div className="profile-page">
            <ProfileHeader profile={profile} onUpdate={handleProfileUpdate} />

            <div className="profile-content">
                {/* Desktop Navigation - Hidden on mobile */}
                <div className="desktop-navigation">
                    <ProfileNavigation
                        activeSection={activeSection}
                        onSectionChange={handleSectionChange}
                        profile={profile}
                    />
                </div>

                {/* Mobile Navigation Toggle and Menu */}
                <div className="mobile-navigation-container">
                    {/* Mobile Menu Toggle Button */}
                    <div className="mobile-menu-toggle">
                        <button
                            className="mobile-menu-button"
                            onClick={toggleMobileMenu}
                            aria-label="Toggle navigation menu"
                        >
                            <span className="mobile-menu-icon">
                                {isMobileMenuOpen ? (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </span>
                            <span className="mobile-menu-text">Navigation</span>
                        </button>
                    </div>

                    {/* Mobile Navigation - Toggleable */}
                    <div className={`mobile-navigation ${isMobileMenuOpen ? 'open' : ''}`}>
                        <ProfileNavigation
                            activeSection={activeSection}
                            onSectionChange={handleSectionChange}
                            profile={profile}
                            isMobile={true}
                        />
                    </div>
                </div>

                <div className="profile-section">

                    {activeSection === 'overview' && (
                        <ProfileOverview
                            profile={profile}
                            onSectionChange={handleSectionChange}
                        />
                    )}
                    {activeSection === 'certificates' && (
                        <CertificatesSection certificates={profile.certificates} />
                    )}
                    {activeSection === 'payment-methods' && (
                        <PaymentMethodsSection paymentMethods={profile.payment_methods} />
                    )}
                    {activeSection === 'activity' && (
                        <ActivityLogSection activities={profile.recent_activity} />
                    )}
                    {activeSection === 'notifications' && (
                        <NotificationsSection
                            notifications={profile.notifications}
                            onNotificationsUpdate={handleNotificationsUpdate}
                        />
                    )}
                    {activeSection === 'enrollments' && (
                        <EnrollmentsSection
                            enrollments={currentEnrollments}
                            historicalEnrollments={pastEnrollments}
                            loading={loading}
                            error={error}
                            onRefresh={fetchProfile}
                        />
                    )}
                    {activeSection === 'password' && (
                        <PasswordSection onUpdate={handleProfileUpdate} />
                    )}
                    {activeSection === 'payments' && (
                        <PaymentsDueSection
                            payments={profile.payments}
                            onPaymentComplete={handlePaymentComplete}
                        />
                    )}
                    {activeSection === 'waitlist' && (
                        <MyWaitlist />
                    )}
                    {activeSection === 'email-settings' && (
                        <EmailManagementSection
                            userProfile={profile}
                            onProfileUpdate={handleProfileUpdate}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage; 