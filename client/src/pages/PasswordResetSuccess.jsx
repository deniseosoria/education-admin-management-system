import React from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';

const PasswordResetSuccess = () => {
    return (
        <div className="bg-white min-h-screen font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Success!</h1>
                    <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Your password has been successfully reset</p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Success Content */}
            <section className="py-8 sm:py-12 lg:py-16 max-w-md mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <div className="mb-8">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-normal mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Password Reset Complete</h2>
                    <p className="text-gray-700 text-base mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Your password has been successfully updated. You can now log in with your new password.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/login"
                        className="w-full bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-normal border-0 hover:bg-gray-900 transition-colors text-sm sm:text-base inline-block"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                    >
                        GO TO LOGIN
                    </Link>

                    <p className="text-gray-600 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        You will be redirected to the login page
                    </p>
                </div>

                <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded">
                    <h3 className="text-blue-800 font-medium mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Security Tips</h3>
                    <ul className="text-blue-700 text-sm text-left space-y-1" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        <li>• Use a strong, unique password</li>
                        <li>• Don't share your password with anyone</li>
                        <li>• Log out when using shared computers</li>
                        <li>• Consider enabling two-factor authentication</li>
                    </ul>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            <Footer />
        </div>
    );
};

export default PasswordResetSuccess;
