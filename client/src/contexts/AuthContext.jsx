import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { API_BASE_URL } from '../config/apiConfig.js';

const AuthContext = createContext(null);

// Helper function for fetch requests
const fetchWithAuth = async (url, options = {}) => {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
    });

    const contentType = response.headers.get('content-type');

    if (!response.ok) {
        let errorData = {};
        if (contentType && contentType.includes('application/json')) {
            errorData = await response.json().catch(() => ({ message: 'An error occurred' }));
        } else {
            const text = await response.text();
            errorData = { message: `Non-JSON error response: ${text}` };
        }
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    if (contentType && contentType.includes('application/json')) {
        return response.json();
    } else {
        const text = await response.text();
        throw new Error(`Expected JSON but got: ${text}`);
    }
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [initialized, setInitialized] = useState(false);

    // Add a ref to track if we're in the middle of a login
    const isLoggingIn = useRef(false);

    // Check auth status on mount
    const checkAuthStatus = useCallback(async () => {
        // Don't check auth status if we're in the middle of logging in
        if (isLoggingIn.current) {
            console.log('Skipping auth check during login'); // Debug log
            return;
        }

        const storedToken = localStorage.getItem('token');
        const storedUser = sessionStorage.getItem('user');

        console.log('Checking auth status:', {
            hasStoredToken: !!storedToken,
            hasStoredUser: !!storedUser,
            currentPath: window.location.pathname + window.location.search
        }); // Debug log

        if (!storedToken || !storedUser) {
            console.log('No stored auth data, clearing state'); // Debug log
            setUser(null);
            setToken(null);
            setInitialized(true);
            setLoading(false);
            return;
        }

        try {
            // Only verify the token if we have both token and user data
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: {
                    'Authorization': `Bearer ${storedToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                console.log('Auth check successful, setting user:', userData); // Debug log
                setUser(userData);
                setToken(storedToken);
            } else {
                console.log('Auth check failed, clearing state. Status:', response.status); // Debug log
                // Only clear if the token is invalid (401) or server error (500)
                if (response.status === 401 || response.status === 500) {
                    console.log('Clearing auth data due to status:', response.status); // Debug log
                    localStorage.removeItem('token');
                    sessionStorage.removeItem('user');
                    setUser(null);
                    setToken(null);
                } else {
                    console.log('Auth check failed but keeping state. Status:', response.status); // Debug log
                }
            }
        } catch (err) {
            console.error('Auth check error:', err); // Debug log
            console.log('Error type:', err.name, 'Error message:', err.message); // Debug log
            // Don't clear state on network errors
            if (err.name === 'TypeError') {
                console.log('Network error during auth check, keeping state'); // Debug log
            } else {
                console.log('Non-network error during auth check, clearing state'); // Debug log
                localStorage.removeItem('token');
                sessionStorage.removeItem('user');
                setUser(null);
                setToken(null);
            }
        } finally {
            setInitialized(true);
            setLoading(false);
        }
    }, []);

    // Run checkAuthStatus on mount
    useEffect(() => {
        checkAuthStatus();
    }, [checkAuthStatus]);

    const login = useCallback(async (email, password) => {
        try {
            isLoggingIn.current = true; // Set flag before login
            setLoading(true);
            setError(null);
            console.log('Starting login process...'); // Debug log

            const response = await fetch(`${API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const responseText = await response.text();
            console.log('Raw login response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse login response:', e);
                setError('Invalid server response');
                return { success: false, error: 'Invalid server response' };
            }

            console.log('Parsed login response:', data);

            if (!response.ok) {
                const errorMessage = data.error || data.message || 'Email or password is incorrect';
                console.log('Setting error state to:', errorMessage); // Debug log
                setError(errorMessage);
                return { success: false, error: errorMessage };
            }

            const { token: newToken, user: userData } = data;

            if (!newToken || !userData) {
                console.error('Invalid login response:', { newToken, userData });
                setError('Invalid login response');
                return { success: false, error: 'Invalid login response' };
            }

            console.log('Setting auth state with:', { newToken, userData });

            // Set token and user data
            setToken(newToken);
            localStorage.setItem('token', newToken);
            setUser(userData);
            sessionStorage.setItem('user', JSON.stringify(userData));

            // Verify the user data by fetching profile
            try {
                console.log('Fetching profile with token:', newToken);
                const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const profileText = await profileResponse.text();
                console.log('Raw profile response:', profileText);

                let profileData;
                try {
                    profileData = JSON.parse(profileText);
                } catch (e) {
                    console.error('Failed to parse profile response:', e);
                    // Don't fail the login if profile fetch fails
                }

                console.log('Parsed profile data:', profileData);

                if (profileData) {
                    const updatedUserData = profileData;
                    console.log('Setting updated user data:', updatedUserData);
                    setUser(updatedUserData);
                    sessionStorage.setItem('user', JSON.stringify(updatedUserData));
                }
            } catch (profileErr) {
                console.error('Profile fetch after login failed:', profileErr);
                // If profile fetch fails, we still want to keep the user logged in
                // with the initial user data from login
            }

            // Double check the state after all operations
            console.log('Final auth state:', {
                token: localStorage.getItem('token'),
                user: sessionStorage.getItem('user'),
                stateUser: user
            });

            return { success: true, user: userData };
        } catch (err) {
            console.error('Login error:', err);
            const message = err.message || 'Email or password is incorrect';
            console.log('Setting error state to:', message); // Debug log
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
            isLoggingIn.current = false; // Reset flag after login
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            setLoading(true);
            if (token) {
                try {
                    await fetchWithAuth('/users/logout', { method: 'POST' });
                } catch (err) {
                    console.warn('Logout request failed:', err);
                }
            }
        } finally {
            setToken(null);
            localStorage.removeItem('token');
            setUser(null);
            sessionStorage.removeItem('user');
            setLoading(false);
        }
    }, [token]);

    const register = useCallback(async (userData) => {
        try {
            setLoading(true);
            setError(null);
            console.log('Starting registration process...'); // Debug log

            const response = await fetch(`${API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const responseText = await response.text();
            console.log('Raw registration response:', responseText);

            let data;
            try {
                data = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse registration response:', e);
                setError('Invalid server response');
                return { success: false, error: 'Invalid server response' };
            }

            console.log('Parsed registration response:', data);

            if (!response.ok) {
                const errorMessage = data.error || data.message || 'Failed to create account. Please try again.';
                console.log('Setting error state to:', errorMessage); // Debug log
                setError(errorMessage);
                return { success: false, error: errorMessage };
            }

            const { token: newToken, user: newUser } = data;

            if (!newToken || !newUser) {
                console.error('Invalid registration response:', { newToken, newUser });
                setError('Invalid registration response');
                return { success: false, error: 'Invalid registration response' };
            }

            console.log('Setting auth state with:', { newToken, newUser });

            // Set token and user data
            setToken(newToken);
            localStorage.setItem('token', newToken);
            setUser(newUser);
            sessionStorage.setItem('user', JSON.stringify(newUser));

            // Verify the user data by fetching profile
            try {
                console.log('Fetching profile with token:', newToken);
                const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
                    headers: {
                        'Authorization': `Bearer ${newToken}`,
                        'Content-Type': 'application/json'
                    }
                });

                const profileText = await profileResponse.text();
                console.log('Raw profile response:', profileText);

                let profileData;
                try {
                    profileData = JSON.parse(profileText);
                } catch (e) {
                    console.error('Failed to parse profile response:', e);
                    // Don't fail the registration if profile fetch fails
                }

                console.log('Parsed profile data:', profileData);

                if (profileData) {
                    const updatedUserData = profileData;
                    console.log('Setting updated user data:', updatedUserData);
                    setUser(updatedUserData);
                    sessionStorage.setItem('user', JSON.stringify(updatedUserData));
                }
            } catch (profileErr) {
                console.error('Profile fetch after registration failed:', profileErr);
                // If profile fetch fails, we still want to keep the user logged in
                // with the initial user data from registration
            }

            console.log('Registration successful');
            return { success: true, user: newUser };
        } catch (err) {
            console.error('Registration error:', err);
            const message = err.message || 'Failed to create account. Please try again.';
            console.log('Setting error state to:', message); // Debug log
            setError(message);
            return { success: false, error: message };
        } finally {
            setLoading(false);
        }
    }, []);

    const updateProfile = useCallback(async (profileData) => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetchWithAuth('/users/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            if (response?.user) {
                setUser(response.user);
                return response.user;
            }
            throw new Error('Invalid profile update response');
        } catch (err) {
            const message = err.message || 'Profile update failed';
            setError(message);
            throw new Error(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const value = useMemo(() => ({
        user,
        loading,
        error,
        initialized,
        token,
        login,
        logout,
        register,
        updateProfile,
        checkAuthStatus,
        clearError: () => {
            setError(null);
        }
    }), [user, loading, error, initialized, token, login, logout, register, updateProfile, checkAuthStatus]);

    // Don't render children until auth is initialized
    if (!initialized) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};