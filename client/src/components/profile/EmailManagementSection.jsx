import React, { useState, useEffect } from 'react';
import { Box, Typography, Switch, FormControlLabel, Card, CardContent, Alert, CircularProgress } from '@mui/material';
import userService from '../../services/userService';
import './EmailManagementSection.css';

const EmailManagementSection = ({ userProfile, onProfileUpdate }) => {
    const [emailPreferences, setEmailPreferences] = useState({
        email_notifications: true,
        class_reminders: true,
        payment_reminders: true,
        certificate_notifications: true,
        general_updates: true
    });
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (userProfile) {
            console.log('EmailManagementSection received userProfile:', userProfile);
            console.log('Email preferences from userProfile:', {
                email_notifications: userProfile.email_notifications,
                class_reminders: userProfile.class_reminders,
                payment_reminders: userProfile.payment_reminders,
                certificate_notifications: userProfile.certificate_notifications,
                general_updates: userProfile.general_updates
            });
            setEmailPreferences({
                email_notifications: userProfile.email_notifications ?? true,
                class_reminders: userProfile.class_reminders ?? true,
                payment_reminders: userProfile.payment_reminders ?? true,
                certificate_notifications: userProfile.certificate_notifications ?? true,
                general_updates: userProfile.general_updates ?? true
            });
        }
    }, [userProfile]);

    const handlePreferenceChange = async (preference, value) => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            // Update the specific preference
            const updatedPreferences = {
                ...emailPreferences,
                [preference]: value
            };

            // If enabling email notifications entirely, enable all other preferences
            if (preference === 'email_notifications' && value) {
                updatedPreferences.class_reminders = true;
                updatedPreferences.payment_reminders = true;
                updatedPreferences.certificate_notifications = true;
                updatedPreferences.general_updates = true;
            }

            // If disabling any specific preference, disable email notifications
            if (preference !== 'email_notifications' && !value) {
                updatedPreferences.email_notifications = false;
            }

            setEmailPreferences(updatedPreferences);

            // Save to backend
            await userService.updateEmailPreferences(updatedPreferences);

            // Update parent component
            if (onProfileUpdate) {
                onProfileUpdate({ ...userProfile, ...updatedPreferences });
            }

            setSuccess('Email preferences updated successfully!');
            setTimeout(() => setSuccess(null), 3000);

        } catch (err) {
            console.error('Error updating email preferences:', err);
            setError(err.message || 'Failed to update email preferences');
            // Revert the change on error
            setEmailPreferences(emailPreferences);
        } finally {
            setSaving(false);
        }
    };

    const emailPreferenceOptions = [
        {
            key: 'email_notifications',
            label: 'Email Notifications',
            description: 'Master toggle for all email notifications',
            isMaster: true
        },
        {
            key: 'class_reminders',
            label: 'Class Reminders',
            description: 'Receive reminders about upcoming classes and schedule changes',
            disabled: emailPreferences.email_notifications
        },
        {
            key: 'payment_reminders',
            label: 'Payment Reminders',
            description: 'Get notified about payment due dates and payment confirmations',
            disabled: emailPreferences.email_notifications
        },
        {
            key: 'certificate_notifications',
            label: 'Certificate Notifications',
            description: 'Receive notifications when certificates are ready for download',
            disabled: emailPreferences.email_notifications
        },
        {
            key: 'general_updates',
            label: 'General Updates',
            description: 'Receive important announcements and system updates',
            disabled: emailPreferences.email_notifications
        }
    ];

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    console.log('EmailManagementSection rendering with emailPreferences:', emailPreferences);

    return (
        <div className="email-management-section">
            <div className="section-header">
                <h2>Email Management</h2>
                <p className="section-description">
                    Manage your email notification preferences. When Email Notifications is OFF, you can selectively enable specific types. When ON, all notifications are enabled.
                </p>
            </div>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mb: 2 }}>
                    {success}
                </Alert>
            )}

            <Card className="preferences-card">
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Notification Preferences
                    </Typography>

                    {emailPreferenceOptions.map((option) => {
                        // Hide individual options when master is ON
                        if (option.isMaster || !emailPreferences.email_notifications) {
                            return (
                                <Box key={option.key} className="preference-item">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={emailPreferences[option.key]}
                                                onChange={(e) => handlePreferenceChange(option.key, e.target.checked)}
                                                disabled={saving}
                                                color="primary"
                                            />
                                        }
                                        label={
                                            <Box>
                                                <Typography variant="body1" className="preference-label">
                                                    {option.label}
                                                    {option.isMaster && <span className="master-badge">Master</span>}
                                                </Typography>
                                                <Typography variant="body2" className="preference-description">
                                                    {option.description}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>
                            );
                        }
                        return null;
                    })}
                </CardContent>
            </Card>

            <Card className="info-card">
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Important Information
                    </Typography>
                    <ul className="info-list">
                        <li>When Email Notifications is ON, all notification types are enabled automatically.</li>
                        <li>When Email Notifications is OFF, you can selectively enable specific notification types.</li>
                        <li>Disabling any individual notification type will turn off the master Email Notifications toggle.</li>
                        <li>You can still view all notifications in the Notifications tab of your dashboard.</li>
                        <li>Administrative communications may still be sent regardless of your preferences.</li>
                        <li>Changes to your preferences take effect immediately.</li>
                    </ul>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmailManagementSection;
