import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import authService from '../services/authService';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');
        setMessage('');

        try {
            await authService.requestPasswordReset(email);
            setMessage('If an account with that email exists, a password reset link has been sent.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send password reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white min-h-screen font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Reset Password</h1>
                    <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Enter your email to receive a password reset link</p>
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

                <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                            Email address
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 focus:outline-none focus:border-black transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                            placeholder="Enter your email address"
                        />
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
                                    <span className="opacity-0">SEND RESET LINK</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </>
                            ) : (
                                'SEND RESET LINK'
                            )}
                        </button>
                    </div>
                </form>

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

export default ForgotPassword;
