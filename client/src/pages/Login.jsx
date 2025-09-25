import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../utils/notificationUtils';
import Footer from '../components/layout/Footer';

const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, error, clearError, loading } = useAuth();
    const { showError } = useNotifications();
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    const [showPassword, setShowPassword] = useState(false);

    // Get the redirect path from location state or default to home
    const from = location.state?.from || '/';

    console.log('Login component rendered with state:', { from, error, loading, locationState: location.state }); // Debug log

    const handleChange = useCallback((e) => {
        const { name, value } = e.target;
        console.log('Form field changed:', { name, value }); // Debug log
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Don't clear error automatically - let user see the error until they fix it
    }, []);

    const handleSubmit = useCallback(async (e) => {
        console.log('handleSubmit called'); // Debug log
        console.log('Form data:', formData); // Debug log
        console.log('Current error state:', error); // Debug log

        // Client-side validation
        if (!formData.email || !formData.password) {
            console.log('Form validation failed - missing fields'); // Debug log
            return;
        }

        try {
            console.log('Calling login function...'); // Debug log
            const result = await login(formData.email, formData.password);
            console.log('Login result:', result); // Debug log

            if (result.success) {
                console.log('Login successful, user data:', result.user); // Debug log
                console.log('Navigating to:', from); // Debug log
                clearError(); // Clear any previous errors on successful login
                navigate(from, { replace: true });
            } else {
                console.log('Login failed:', result.error); // Debug log
                // Error is already handled by AuthContext
            }
        } catch (err) {
            console.error('Login error in component:', err); // Debug log
            console.log('Error state after catch:', error); // Debug log
            // Error is already handled by AuthContext, no need to call showError here
        }
    }, [formData, login, navigate, from, clearError]);

    // Add effect to monitor auth state
    useEffect(() => {
        console.log('Login component auth state changed:', { error, loading }); // Debug log
    }, [error, loading]);

    // Add effect to specifically monitor error changes
    useEffect(() => {
        if (error) {
            console.log('Error state changed to:', error);
        } else {
            console.log('Error state cleared');
        }
    }, [error]);

    // Add effect to monitor page refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            console.log('Page is about to unload/refresh!'); // Debug log
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return (
        <div className="bg-white min-h-screen font-montserrat">

            {/* Hero Section */}
            <section className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Login</h1>
                    <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Access your account to manage your classes and profile</p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Login Form */}
            <section className="py-8 sm:py-12 lg:py-16 max-w-md mx-auto px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                        {error}
                    </div>
                )}

                <form
                    className="space-y-4 sm:space-y-6"
                    onSubmit={(e) => {
                        console.log('Form onSubmit triggered'); // Debug log
                        e.preventDefault();
                        e.stopPropagation();
                        handleSubmit(e);
                        return false; // Explicitly return false to prevent submission
                    }}
                    noValidate // Add this to prevent browser validation
                >
                    <div>
                        <label htmlFor="email" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 focus:outline-none focus:border-black transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                            onInvalid={(e) => {
                                console.log('Email validation failed'); // Debug log
                                e.preventDefault();
                            }}
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                            Password
                        </label>
                        <div className="relative">
                            <input
                                id="password"
                                name="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-200 focus:outline-none focus:border-black transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                                onInvalid={(e) => {
                                    console.log('Password validation failed'); // Debug log
                                    e.preventDefault();
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                                    </svg>
                                ) : (
                                    <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-normal border-0 hover:bg-gray-900 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed relative text-sm sm:text-base"
                            style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                            onClick={(e) => {
                                console.log('Submit button clicked'); // Debug log
                                // Don't prevent default here, let the form onSubmit handle it
                            }}
                        >
                            {loading ? (
                                <>
                                    <span className="opacity-0">LOGIN</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </>
                            ) : (
                                'LOGIN'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 sm:mt-8 text-center space-y-3">
                    <p className="text-gray-700 text-sm sm:text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Don't have an account?{' '}
                        <Link to="/signup" className="text-black hover:underline" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Sign up
                        </Link>
                    </p>
                    <p className="text-gray-700 text-sm sm:text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Forgot your password?{' '}
                        <Link to="/forgot-password" className="text-black hover:underline" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Reset password
                        </Link>
                    </p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            <Footer />
        </div>
    );
};

export default Login; 