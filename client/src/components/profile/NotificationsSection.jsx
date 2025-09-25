import React from 'react';
import { useNavigate } from 'react-router-dom';
import userService from '../../services/userService';
import './NotificationsSection.css';

const NotificationsSection = ({ notifications, onNotificationsUpdate }) => {
    const navigate = useNavigate();

    const handleMarkAsRead = async (notificationId) => {
        try {
            await userService.markNotificationAsRead(notificationId);
            const updatedNotifications = notifications.map(notification =>
                notification.id === notificationId
                    ? { ...notification, is_read: true }
                    : notification
            );
            onNotificationsUpdate(updatedNotifications);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await userService.markAllNotificationsAsRead();
            const updatedNotifications = (notifications || []).map(notification => ({
                ...notification,
                is_read: true
            }));
            onNotificationsUpdate(updatedNotifications);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    };

    const handleDelete = async (notificationId) => {
        try {
            await userService.deleteNotification(notificationId);
            const updatedNotifications = (notifications || []).filter(
                notification => notification.id !== notificationId
            );
            onNotificationsUpdate(updatedNotifications);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    };

    const getNotificationIcon = (type) => {
        const icons = {
            class_reminder: 'fa-calendar',
            certificate_ready: 'fa-certificate',
            payment_due: 'fa-credit-card',
            default: 'fa-bell'
        };
        return icons[type] || icons.default;
    };

    const unreadCount = (notifications || []).filter(n => !n.is_read).length;

    return (
        <div className="notifications-section">
            <div className="section-header">
                <h2>Notifications</h2>
                {unreadCount > 0 && (
                    <button
                        className="btn btn-secondary"
                        onClick={handleMarkAllAsRead}
                    >
                        <i className="fas fa-check-double"></i>
                        Mark All as Read
                    </button>
                )}
            </div>

            {(notifications || []).length > 0 ? (
                <div className="notifications-list">
                    {(notifications || []).map(notification => (
                        <div
                            key={notification.id}
                            className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                        >
                            <div className="notification-icon">
                                <i className={`fas ${getNotificationIcon(notification.type)}`}></i>
                            </div>
                            <div className="notification-content">
                                <div className="notification-header">
                                    <h3>{notification.title}</h3>
                                    <span className="notification-time">
                                        {new Date(notification.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="notification-message">{notification.message}</p>
                                <button
                                    onClick={() => navigate(`/notifications/${notification.id}`)}
                                    className="notification-action"
                                >
                                    View Details
                                    <i className="fas fa-arrow-right"></i>
                                </button>
                            </div>
                            <div className="notification-actions">
                                {!notification.is_read && (
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleMarkAsRead(notification.id)}
                                    >
                                        <i className="fas fa-check"></i>
                                    </button>
                                )}
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleDelete(notification.id)}
                                >
                                    <i className="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="empty-state">
                    <i className="fas fa-bell"></i>
                    <p>No notifications</p>
                    <p className="empty-state-subtext">
                        You're all caught up!
                    </p>
                </div>
            )}
        </div>
    );
};

export default NotificationsSection; 