import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import authService from '../services/authService';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [tokenValid, setTokenValid] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setError('Invalid reset link. Please request a new password reset.');
            return;
        }

        // Verify token on component mount
        const verifyToken = async () => {
            try {
                const response = await authService.verifyResetToken(token);
                setTokenValid(true);
                setUserInfo(response.user);
            } catch (err) {
                setError('Invalid or expired reset link. Please request a new password reset.');
            }
        };

        verifyToken();
    }, [token]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear errors when user starts typing
        if (error) setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.password || !formData.confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 8) {
            setError('Password must be at least 8 characters long');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await authService.resetPassword(token, formData.password);
            setMessage('Password has been reset successfully!');

            // Redirect to success page after a short delay
            setTimeout(() => {
                navigate('/password-reset-success');
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="bg-white min-h-screen font-montserrat">
                <section className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                    <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-800 z-0" />
                    <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Invalid Link</h1>
                        <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>This password reset link is invalid</p>
                    </div>
                </section>
                <div className="w-full border-t border-gray-200 my-0" />
                <section className="py-8 sm:py-12 lg:py-16 max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
                    <p className="text-gray-700 mb-6">Please request a new password reset link.</p>
                    <Link to="/forgot-password" className="text-black hover:underline" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Request New Reset Link
                    </Link>
                </section>
                <Footer />
            </div>
        );
    }

    return (
        <div className="bg-white min-h-screen font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reset Password</h1>
                    <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {userInfo ? `Hello ${userInfo.name}! Please enter your new password` : 'Enter your new password'}
                    </p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Reset Password Form */}
            <section className="py-8 sm:py-12 lg:py-16 max-w-md mx-auto px-4 sm:px-6 lg:px-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
                        {message}
                    </div>
                )}

                {!tokenValid ? (
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-700">Verifying reset link...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                        <div>
                            <label htmlFor="password" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                                New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-200 focus:outline-none focus:border-black transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
                                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                                    placeholder="Enter new password"
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
                            <label htmlFor="confirmPassword" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-12 border border-gray-200 focus:outline-none focus:border-black transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
                                    style={{ fontFamily: 'Montserrat, sans-serif' }}
                                    placeholder="Confirm new password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    disabled={loading}
                                >
                                    {showConfirmPassword ? (
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
                            >
                                {loading ? (
                                    <>
                                        <span className="opacity-0">RESET PASSWORD</span>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    </>
                                ) : (
                                    'RESET PASSWORD'
                                )}
                            </button>
                        </div>
                    </form>
                )}

                <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-gray-700 text-sm sm:text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Remember your password?{' '}
                        <Link to="/login" className="text-black hover:underline" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Back to login
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

export default ResetPassword;
