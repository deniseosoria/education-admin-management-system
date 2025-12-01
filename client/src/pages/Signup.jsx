import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Footer from '../components/layout/Footer';

const Signup = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { register, error: authError, clearError } = useAuth();
    
    // Get the redirect path from location state or default to home
    const from = location.state?.from || '/';
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Add effect to monitor error changes
    useEffect(() => {
        if (error || authError) {
            console.log('Error state changed to:', error || authError);
        } else {
            console.log('Error state cleared');
        }
    }, [error, authError]);

    // Add effect to monitor page refresh
    useEffect(() => {
        const handleBeforeUnload = (e) => {
            console.log('Page is about to unload/refresh!'); // Debug log
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const validateForm = () => {
        const errors = {};
        if (formData.password.length < 8) {
            errors.password = 'Password must be at least 8 characters long';
        }
        if (formData.password !== formData.confirmPassword) {
            errors.confirmPassword = 'Passwords do not match';
        }
        if (!formData.email.includes('@')) {
            errors.email = 'Please enter a valid email address';
        }
        if (formData.firstName.trim().length < 2) {
            errors.firstName = 'First name must be at least 2 characters';
        }
        if (formData.lastName.trim().length < 2) {
            errors.lastName = 'Last name must be at least 2 characters';
        }
        // Phone number validation (optional but if provided, must be valid)
        if (formData.phoneNumber.trim() && !/^\+?1?\d{10}$/.test(formData.phoneNumber.replace(/[^0-9+]/g, ''))) {
            errors.phoneNumber = 'Please enter a valid phone number (10 digits)';
        }
        return errors;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
        // Clear validation errors when user types
        if (validationErrors[name]) {
            setValidationErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        // Don't clear auth errors automatically - let user see the error until they fix it
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log('Signup form submitted'); // Debug log
        setLoading(true);
        setError('');
        setValidationErrors({});

        const errors = validateForm();
        if (Object.keys(errors).length > 0) {
            setValidationErrors(errors);
            setLoading(false);
            return;
        }

        try {
            const { confirmPassword, ...formFields } = formData;
            // Transform the data to match backend expectations
            const signupData = {
                name: `${formFields.firstName} ${formFields.lastName}`,
                email: formFields.email,
                password: formFields.password,
                role: 'student', // Default role for new registrations
                status: 'active',
                first_name: formFields.firstName,
                last_name: formFields.lastName,
                phone_number: formFields.phoneNumber.trim() || null,
                email_notifications: true,
            };

            console.log('Calling register function...'); // Debug log
            const result = await register(signupData);
            console.log('Registration result:', result); // Debug log

            if (result.success) {
                console.log('Registration successful, navigating to:', from); // Debug log
                clearError(); // Clear any previous errors on successful registration
                navigate(from, { replace: true });
            } else {
                console.log('Registration failed:', result.error); // Debug log
                // Error is already handled by AuthContext
            }
        } catch (err) {
            console.error('Registration error in component:', err); // Debug log
            setError(err.message || 'Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const getInputClassName = (fieldName) => {
        const baseClasses = "w-full px-3 sm:px-4 py-2 sm:py-3 border focus:outline-none transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed text-sm sm:text-base";
        const errorClasses = validationErrors[fieldName] ? "border-red-300" : "border-gray-200 focus:border-black";
        return `${baseClasses} ${errorClasses}`;
    };

    return (
        <div className="bg-white min-h-screen font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[200px] sm:h-[250px] md:h-[300px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Create Account</h1>
                    <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Join our community of childcare professionals</p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Signup Form */}
            <section className="py-8 sm:py-12 lg:py-16 max-w-md mx-auto px-4 sm:px-6 lg:px-8">
                {(error || authError) && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
                        {error || authError}
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
                    <div className="grid grid-cols-1 gap-4 sm:gap-6">
                        <div>
                            <label htmlFor="firstName" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                                First name
                            </label>
                            <input
                                id="firstName"
                                name="firstName"
                                type="text"
                                value={formData.firstName}
                                onChange={handleChange}
                                disabled={loading}
                                className={getInputClassName('firstName')}
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                            />
                            {validationErrors.firstName && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.firstName}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="lastName" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                                Last name
                            </label>
                            <input
                                id="lastName"
                                name="lastName"
                                type="text"
                                value={formData.lastName}
                                onChange={handleChange}
                                disabled={loading}
                                className={getInputClassName('lastName')}
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
                            />
                            {validationErrors.lastName && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.lastName}</p>
                            )}
                        </div>
                    </div>

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
                            className={getInputClassName('email')}
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                        {validationErrors.email && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.email}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="phoneNumber" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                            Phone number (optional)
                        </label>
                        <input
                            id="phoneNumber"
                            name="phoneNumber"
                            type="tel"
                            autoComplete="tel"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            disabled={loading}
                            className={getInputClassName('phoneNumber')}
                            placeholder="Enter your phone number"
                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                        />
                        {validationErrors.phoneNumber && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.phoneNumber}</p>
                        )}
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
                                value={formData.password}
                                onChange={handleChange}
                                disabled={loading}
                                className={getInputClassName('password') + " pr-12"}
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
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
                        {validationErrors.password && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.password}</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="confirmPassword" className="block text-sm uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '13px', fontFamily: 'Montserrat, sans-serif' }}>
                            Confirm password
                        </label>
                        <div className="relative">
                            <input
                                id="confirmPassword"
                                name="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                disabled={loading}
                                className={getInputClassName('confirmPassword') + " pr-12"}
                                style={{ fontFamily: 'Montserrat, sans-serif' }}
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
                        {validationErrors.confirmPassword && (
                            <p className="mt-1 text-sm text-red-600">{validationErrors.confirmPassword}</p>
                        )}
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
                                    <span className="opacity-0">CREATE ACCOUNT</span>
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                </>
                            ) : (
                                'CREATE ACCOUNT'
                            )}
                        </button>
                    </div>
                </form>

                <div className="mt-6 sm:mt-8 text-center">
                    <p className="text-gray-700 text-sm sm:text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Already have an account?{' '}
                        <Link to="/login" className="text-black hover:underline" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Login
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

export default Signup; 