import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import adminService from '../services/adminService';
import userService from '../services/userService';
import { useNotifications } from '../utils/notificationUtils';

const NotificationDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showSuccess, showError } = useNotifications();
    const [notification, setNotification] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);



    useEffect(() => {
        const fetchNotification = async () => {
            try {
                setLoading(true);
                setError(null); // Clear any previous errors
                let notificationData;

                // Check user role directly instead of relying on isAdmin state
                const userIsAdmin = user && (user.role === 'admin' || user.role === 'instructor');

                if (userIsAdmin) {
                    // Admin can fetch any notification
                    notificationData = await adminService.getNotification(id);
                } else {
                    // Regular users can only fetch their own notifications
                    notificationData = await userService.getNotification(id);
                }

                console.log('NotificationDetail: Fetched notification data:', notificationData);

                // Handle different response structures
                if (notificationData) {
                    // Ensure the notification has required fields
                    const processedNotification = {
                        ...notificationData,
                        // Handle both is_read and read field names
                        is_read: notificationData.is_read !== undefined ? notificationData.is_read : notificationData.read
                    };
                    setNotification(processedNotification);
                    setError(null); // Clear any previous errors
                } else {
                    setError('Notification data is empty');
                    setNotification(null);
                }
            } catch (error) {
                console.error('Error fetching notification:', error);
                setError(error.message || 'Failed to load notification details');
                setNotification(null);
                // Don't call showError here to avoid infinite re-renders
            } finally {
                setLoading(false);
            }
        };

        if (id && user) {
            fetchNotification();
        } else if (!user) {
            // If user is not loaded yet, wait
            setLoading(true);
        }
    }, [id, user]); // Depend on user instead of isAdmin

    const handleMarkAsRead = async () => {
        if (!notification || notification.is_read) return;

        try {
            // Check user role directly instead of relying on isAdmin state
            const userIsAdmin = user && (user.role === 'admin' || user.role === 'instructor');

            if (userIsAdmin) {
                await adminService.markNotificationAsRead(id);
            } else {
                await userService.markNotificationAsRead(id);
            }

            setNotification(prev => ({ ...prev, is_read: true }));
            showSuccess('Notification marked as read');
        } catch (error) {
            console.error('Error marking notification as read:', error);
            showError('Failed to mark notification as read');
        }
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    // Only show error if we're not loading and there's actually an error
    // Don't show error if notification is null but we're still waiting for user to load
    if (error && !loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={() => {
                            // Navigate back based on user role
                            if (user && (user.role === 'admin' || user.role === 'instructor')) {
                                navigate('/admin/notifications');
                            } else {
                                navigate('/profile?section=notifications');
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    // Show error if notification is null after loading completes
    if (!notification && !loading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
                    <p className="text-red-600">Notification not found</p>
                    <button
                        onClick={() => {
                            // Navigate back based on user role
                            if (user && (user.role === 'admin' || user.role === 'instructor')) {
                                navigate('/admin/notifications');
                            } else {
                                navigate('/profile?section=notifications');
                            }
                        }}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="mb-6">
                <button
                    onClick={() => {
                        // Navigate back based on user role
                        if (user && (user.role === 'admin' || user.role === 'instructor')) {
                            navigate('/admin/notifications');
                        } else {
                            navigate('/profile?section=notifications');
                        }
                    }}
                    className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
                >
                    <i className="fas fa-arrow-left mr-2"></i>
                    Back to Notifications
                </button>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 mb-2">
                                {notification.title}
                            </h1>
                            <p className="text-gray-600">
                                {new Date(notification.created_at || notification.timestamp).toLocaleString()}
                            </p>
                        </div>
                        <div className="flex items-center space-x-2">
                            {!notification.is_read && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    New
                                </span>
                            )}
                            {notification.type && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                    {notification.type}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="prose max-w-none mb-6">
                        <p className="text-gray-700 text-lg leading-relaxed">
                            {notification.message}
                        </p>

                        {/* Display links if they exist in metadata */}
                        {notification.metadata?.links && notification.metadata.links.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-md font-semibold text-gray-900 mb-2">Related Links:</h4>
                                <div className="space-y-2">
                                    {notification.metadata.links.map((link, index) => (
                                        <a
                                            key={index}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block text-blue-600 hover:text-blue-800 underline"
                                        >
                                            {link.label || link.url}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Display attachments if they exist in metadata */}
                        {notification.metadata?.attachments && notification.metadata.attachments.length > 0 && (
                            <div className="mt-4">
                                <h4 className="text-md font-semibold text-gray-900 mb-2">Attachments:</h4>
                                <div className="space-y-2">
                                    {notification.metadata.attachments.map((attachment, index) => (
                                        <a
                                            key={index}
                                            href={attachment.fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={attachment.fileName}
                                            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 underline"
                                        >
                                            <i className={`fas ${attachment.fileType === 'application/pdf' ? 'fa-file-pdf text-red-600' : 'fa-file-image text-blue-600'}`}></i>
                                            <span>{attachment.fileName}</span>
                                            <span className="text-xs text-gray-500">
                                                ({attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(2)} KB` : ''})
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Actions */}
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-600">
                                {notification.is_read ? 'Read' : 'Unread'}
                            </div>
                            <div className="flex space-x-3">
                                {!notification.is_read && (
                                    <button
                                        onClick={handleMarkAsRead}
                                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                                    >
                                        Mark as Read
                                    </button>
                                )}
                                <button
                                    onClick={() => {
                                        // Navigate back based on user role
                                        if (user && (user.role === 'admin' || user.role === 'instructor')) {
                                            navigate('/admin/notifications');
                                        } else {
                                            navigate('/profile?section=notifications');
                                        }
                                    }}
                                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationDetail;
