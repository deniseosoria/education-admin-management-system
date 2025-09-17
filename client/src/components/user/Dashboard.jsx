import React, { useState, useEffect } from 'react';
import { Box, Typography, Tab, Tabs, CircularProgress, Alert } from '@mui/material';
import MyEnrollments from './MyEnrollments';
import MyWaitlist from './MyWaitlist';
import ProfileOverview from '../profile/ProfileOverview';
import CertificatesSection from '../profile/CertificatesSection';
import PaymentMethodsSection from '../profile/PaymentMethodsSection';
import ActivityLogSection from '../profile/ActivityLogSection';
import NotificationsSection from '../profile/NotificationsSection';
import PaymentsDueSection from '../profile/PaymentsDueSection';
import PasswordSection from '../profile/PasswordSection';
import EmailManagementSection from '../profile/EmailManagementSection';
import userService from '../../services/userService';

function Dashboard() {
    const [activeTab, setActiveTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [profileData, setProfileData] = useState(null);

    // Fetch profile data on component mount
    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            setLoading(true);
            const data = await userService.getProfile();
            console.log('Profile data received:', data);
            console.log('Email preferences:', {
                email_notifications: data?.email_notifications,
                class_reminders: data?.class_reminders,
                payment_reminders: data?.payment_reminders,
                certificate_notifications: data?.certificate_notifications,
                general_updates: data?.general_updates
            });
            setProfileData(data);
        } catch (err) {
            console.error('Error fetching profile data:', err);
            setError(err.message || 'Failed to load profile data');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (event, newValue) => {
        console.log('Tab changed from', activeTab, 'to', newValue);
        setActiveTab(newValue);
    };

    const handleProfileUpdate = (updatedProfile) => {
        setProfileData(updatedProfile);
    };

    const renderTabContent = () => {
        console.log('Rendering tab content for activeTab:', activeTab);
        switch (activeTab) {
            case 0:
                return <ProfileOverview profile={profileData} onSectionChange={handleTabChange} />;
            case 1:
                return <MyEnrollments />;
            case 2:
                return <MyWaitlist />;
            case 3:
                return <CertificatesSection certificates={profileData?.certificates || []} />;
            case 4:
                return <PaymentsDueSection payments={profileData?.payments || []} />;
            case 5:
                return <PaymentMethodsSection paymentMethods={profileData?.payment_methods || []} />;
            case 6:
                return <PasswordSection />;
            case 7:
                return <ActivityLogSection activities={profileData?.recent_activity || []} />;
            case 8:
                return <NotificationsSection notifications={profileData?.notifications || []} />;
            case 9:
                console.log('Rendering EmailManagementSection with profileData:', profileData);
                return <EmailManagementSection userProfile={profileData} onProfileUpdate={handleProfileUpdate} />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    if (error && !profileData) {
        return (
            <Box display="flex" flexDirection="column" alignItems="center" minHeight="200px" gap={2}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <button onClick={fetchProfileData} className="btn btn-primary">
                    Retry
                </button>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                My Dashboard
            </Typography>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                    allowScrollButtonsMobile
                    sx={{
                        minHeight: '48px',
                        '& .MuiTab-root': {
                            minWidth: '100px',
                            fontSize: '0.8rem',
                            padding: '6px 12px'
                        },
                        '& .MuiTabs-scrollButtons': {
                            width: '40px'
                        }
                    }}
                >
                    <Tab label="Overview" />
                    <Tab label="Enrollments" />
                    <Tab label="Waitlist" />
                    <Tab label="Certificates" />
                    <Tab label="Payments" />
                    <Tab label="Payment Methods" />
                    <Tab label="Password" />
                    <Tab label="Activity" />
                    <Tab label="Notifications" />
                    <Tab label="Email Settings" />
                </Tabs>
            </Box>
            {renderTabContent()}
        </Box>
    );
}

export default Dashboard; 