import React from 'react';
import { Box, List, ListItemButton, ListItemIcon, ListItemText, Badge, Paper } from '@mui/material';
import {
    Person as PersonIcon,
    School as SchoolIcon,
    CardMembership as CertificateIcon,
    CreditCard as PaymentIcon,
    History as HistoryIcon,
    Notifications as NotificationIcon,
    Lock as LockIcon,
    Payment as PaymentsDueIcon,
    AccessTime as WaitlistIcon,
    Email as EmailIcon
} from '@mui/icons-material';
import './ProfileNavigation.css';

const ProfileNavigation = ({ activeSection, onSectionChange, profile, isMobile = false }) => {
    const notifications = profile?.notifications || [];
    const payments = profile?.payments || [];
    const waitlistEntries = profile?.waitlist_entries || [];
    const unreadNotifications = notifications.filter(n => !n.is_read).length;
    const paymentsDue = payments.filter(p => p.status !== 'paid').length;
    // Only count pending waitlist entries - approved/rejected ones are now in enrollments
    const waitlistCount = waitlistEntries.filter(entry =>
        entry.status === 'waiting' || entry.status === 'pending' || entry.status === 'offered'
    ).length;

    const menuItems = [
        { value: 'overview', label: 'Overview', icon: <PersonIcon /> },
        { value: 'enrollments', label: 'Enrollments', icon: <SchoolIcon /> },
        {
            value: 'waitlist',
            label: 'My Waitlist',
            icon: <Badge badgeContent={waitlistCount} color="info">
                <WaitlistIcon />
            </Badge>
        },
        { value: 'certificates', label: 'Certificates', icon: <CertificateIcon /> },
        {
            value: 'payments',
            label: 'Payments Due',
            icon: <Badge badgeContent={paymentsDue} color="error">
                <PaymentsDueIcon />
            </Badge>
        },
        { value: 'payment-methods', label: 'Payment Methods', icon: <PaymentIcon /> },
        { value: 'password', label: 'Password', icon: <LockIcon /> },
        { value: 'activity', label: 'Activity', icon: <HistoryIcon /> },
        { value: 'email-settings', label: 'Email Settings', icon: <EmailIcon /> },
        {
            value: 'notifications',
            label: 'Notifications',
            icon: <Badge badgeContent={unreadNotifications} color="error">
                <NotificationIcon />
            </Badge>
        }
    ];

    if (isMobile) {
        return (
            <Paper className="profile-navigation mobile" elevation={1}>
                <List component="nav" className="mobile-nav-list">
                    {menuItems.map((item) => (
                        <ListItemButton
                            key={item.value}
                            selected={activeSection === item.value}
                            onClick={() => onSectionChange(item.value)}
                            className="nav-item mobile-nav-item"
                            data-value={item.value}
                        >
                            <ListItemIcon className="mobile-nav-icon">{item.icon}</ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                className="mobile-nav-text"
                            />
                        </ListItemButton>
                    ))}
                </List>
            </Paper>
        );
    }

    return (
        <Paper className="profile-navigation desktop" elevation={1}>
            <List component="nav">
                {menuItems.map((item) => (
                    <ListItemButton
                        key={item.value}
                        selected={activeSection === item.value}
                        onClick={() => onSectionChange(item.value)}
                        className="nav-item"
                    >
                        <ListItemIcon>{item.icon}</ListItemIcon>
                        <ListItemText primary={item.label} />
                    </ListItemButton>
                ))}
            </List>
        </Paper>
    );
};

export default ProfileNavigation; 