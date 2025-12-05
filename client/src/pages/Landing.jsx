import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import classService from '../services/classService';

function Landing() {
    const [classes, setClasses] = useState([]);
    const [selectedClassIndex, setSelectedClassIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const [openAccordions, setOpenAccordions] = useState({});

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const data = await classService.getAllClasses();
                // Get first 3 classes and move CPR to the end
                const firstThree = data.slice(0, 3);
                const cprIndex = firstThree.findIndex(c =>
                    c.title.toLowerCase().includes('cpr') ||
                    c.title.toLowerCase().includes('first aid')
                );

                if (cprIndex !== -1) {
                    // Remove CPR from its current position and add it to the end
                    const cprClass = firstThree.splice(cprIndex, 1)[0];
                    firstThree.push(cprClass);
                }

                setClasses(firstThree);
            } catch (error) {
                console.error('Error fetching classes:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchClasses();
    }, []);

    const selectedClass = classes[selectedClassIndex] || null;

    // Helper function to get image source
    const getImageSource = (classItem) => {
        if (classItem?.image_url) {
            return classItem.image_url;
        }
        return '/images/default-class.jpg';
    };

    // Toggle accordion
    const toggleAccordion = (index) => {
        setOpenAccordions(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    return (
        <div className="bg-white min-h-screen font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[85vh] sm:h-[400px] md:h-[500px] lg:h-[620px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8">
                <img src="/images/jackie-hope-ruk6_jaflts-unsplash.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
                <div className="absolute inset-0 bg-black opacity-30 z-10" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full px-4">
                    <h1 className="hero-title font-normal mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[64px]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Quality child care for growing minds
                    </h1>
                    <h3 className="hero-txt mb-6 sm:mb-8 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                        Expert-led classes with trained professionals who understand what matters most.
                    </h3>
                    <Link
                        to="/classes"
                        className="hero-button bg-white text-black px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-normal border-0 hover:bg-gray-100 transition-colors text-sm sm:text-base inline-block rounded-lg"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                    >
                        ENROLL NOW
                    </Link>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Classes Showcase Section */}
            {!loading && classes.length > 0 && (
                <section className="w-full bg-gray-100 pt-12 sm:pt-16 lg:pt-20 pb-8 sm:pb-12 lg:pb-16">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        {/* Main Title */}
                        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-8 sm:mb-12 text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            Training Classes Available For Certification
                        </h2>

                        {/* Desktop - Tabbed Interface */}
                        <div className="hidden lg:block">
                            {/* Navigation Tabs */}
                            <div className="flex flex-wrap justify-center border-b border-gray-300 mb-8 sm:mb-12">
                                {classes.map((classItem, index) => (
                                    <div key={classItem.id} className="flex items-center">
                                        <button
                                            onClick={() => setSelectedClassIndex(index)}
                                            className={`px-4 sm:px-6 py-3 sm:py-4 text-sm sm:text-base font-medium transition-colors ${selectedClassIndex === index
                                                ? 'text-green-600 border-b-2 border-green-600'
                                                : 'text-gray-600 hover:text-gray-900'
                                                }`}
                                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                                        >
                                            {classItem.title}
                                        </button>
                                        {index < classes.length - 1 && (
                                            <div className="w-px h-6 bg-gray-300 mx-2"></div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Content Section */}
                            {selectedClass && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                                    {/* Left Column - Text Content */}
                                    <div className="bg-gray-100 p-8 lg:p-10">
                                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            {selectedClass.title}
                                        </h3>
                                        <p className="text-gray-600 mb-6 text-base lg:text-lg leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            {selectedClass.description}
                                        </p>
                                        {selectedClass.price && (
                                            <p className="text-gray-700 mb-6 text-base lg:text-lg font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                                Price: ${selectedClass.price}
                                            </p>
                                        )}
                                        <Link
                                            to={`/classes/${selectedClass.id}`}
                                            className="inline-block bg-white border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-6 sm:px-8 py-3 sm:py-4 font-semibold rounded-lg transition-colors text-center text-sm sm:text-base"
                                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                                        >
                                            View Class Details
                                        </Link>
                                    </div>

                                    {/* Right Column - Image */}
                                    <div className="relative">
                                        <img
                                            src={getImageSource(selectedClass)}
                                            alt={selectedClass.title}
                                            className="w-full h-[300px] sm:h-[400px] lg:h-[450px] object-cover rounded-lg shadow-lg"
                                            onError={(e) => {
                                                e.target.onerror = null;
                                                e.target.src = '/images/default-class.jpg';
                                            }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mobile - Accordion */}
                        <div className="lg:hidden space-y-2">
                            {classes.map((classItem, index) => {
                                const isOpen = openAccordions[index] || false;
                                return (
                                    <div key={classItem.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
                                        {/* Accordion Header */}
                                        <button
                                            onClick={() => toggleAccordion(index)}
                                            className="w-full flex items-center justify-between p-4 sm:p-6 text-left hover:bg-gray-50 transition-colors"
                                        >
                                            <div className="flex items-center flex-1">
                                                {/* Green vertical line */}
                                                <div className="w-1 h-8 sm:h-10 bg-green-600 mr-4 flex-shrink-0"></div>
                                                <h3 className="text-base sm:text-lg font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                                    {classItem.title}
                                                </h3>
                                            </div>
                                            {/* Chevron Icon */}
                                            <svg
                                                className={`w-5 h-5 text-gray-600 transition-transform duration-200 flex-shrink-0 ml-4 ${isOpen ? 'rotate-180' : ''}`}
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {/* Accordion Content */}
                                        <div
                                            className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                                                }`}
                                        >
                                            <div className="p-4 sm:p-6 pt-0">
                                                <div className="grid grid-cols-1 gap-6 items-center">
                                                    {/* Text Content */}
                                                    <div>
                                                        <p className="text-gray-600 mb-4 text-sm sm:text-base leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                                            {classItem.description}
                                                        </p>
                                                        {classItem.price && (
                                                            <p className="text-gray-700 mb-4 text-sm sm:text-base font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                                                Price: ${classItem.price}
                                                            </p>
                                                        )}
                                                        <Link
                                                            to={`/classes/${classItem.id}`}
                                                            className="inline-block bg-white border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-4 sm:px-6 py-2 sm:py-3 font-semibold rounded-lg transition-colors text-center text-xs sm:text-sm"
                                                            style={{ fontFamily: 'Montserrat, sans-serif' }}
                                                        >
                                                            View Class Details
                                                        </Link>
                                                    </div>

                                                    {/* Image */}
                                                    <div className="relative">
                                                        <img
                                                            src={getImageSource(classItem)}
                                                            alt={classItem.title}
                                                            className="w-full h-[200px] sm:h-[250px] object-cover rounded-lg shadow-md"
                                                            onError={(e) => {
                                                                e.target.onerror = null;
                                                                e.target.src = '/images/default-class.jpg';
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Four simple steps */}
            <section className="py-8 sm:py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Content Card */}
                    <div className="bg-white p-8 lg:p-10 order-1 lg:order-1">
                        <div className="mb-6">
                            <span className="text-xs uppercase tracking-widest mb-4 block" style={{ color: '#979797', fontFamily: 'Montserrat, sans-serif' }}>
                                Begin
                            </span>
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Four simple steps.</h3>
                        </div>
                        <Link to="/classes" className="hidden lg:inline-flex items-center text-gray-900 hover:text-gray-700 transition-colors font-normal" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                            Explore
                            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </Link>
                    </div>

                    {/* Steps List */}
                    <div className="relative order-2 lg:order-2">
                        <div className="relative pl-8">
                            {/* Vertical line */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                            {/* Step 1 */}
                            <div className="relative mb-8">
                                <div className="absolute left-0 top-0 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center z-10">
                                    <span className="text-gray-700 font-semibold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>1</span>
                                </div>
                                <div className="ml-12">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Learn the craft</h4>
                                    <p className="text-gray-600 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>Enroll in training designed for aspiring child care providers</p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative mb-8">
                                <div className="absolute left-0 top-0 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center z-10">
                                    <span className="text-gray-700 font-semibold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>2</span>
                                </div>
                                <div className="ml-12">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Pay what you can</h4>
                                    <p className="text-gray-600 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>Access scholarships and financial aid to make education affordable</p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative mb-8">
                                <div className="absolute left-0 top-0 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center z-10">
                                    <span className="text-gray-700 font-semibold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>3</span>
                                </div>
                                <div className="ml-12">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Get certified</h4>
                                    <p className="text-gray-600 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>Build skills and credentials to launch your own family group home</p>
                                </div>
                            </div>

                            {/* Step 4 */}
                            <div className="relative">
                                <div className="absolute left-0 top-0 w-8 h-8 bg-white rounded-full border-2 border-gray-300 flex items-center justify-center z-10">
                                    <span className="text-gray-700 font-semibold text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>4</span>
                                </div>
                                <div className="ml-12">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-2" style={{ fontFamily: 'Montserrat, sans-serif' }}>Start your business</h4>
                                    <p className="text-gray-600 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>Open your family group home day care and serve your community</p>
                                </div>
                            </div>
                        </div>
                        {/* Explore Button - Mobile Only */}
                        <div className="mt-8 lg:hidden">
                            <Link to="/classes" className="inline-flex items-center text-gray-900 hover:text-gray-700 transition-colors font-normal" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                                Explore
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Trained professionals */}
            <section id="who-we-are" className="w-full">
                <div className="grid grid-cols-1 lg:grid-cols-2">
                    {/* Content Card - Royal Blue */}
                    <div className="bg-[#1E3A8A] p-8 lg:p-10 lg:py-12 lg:px-16 flex items-center">
                        <div>
                            <div className="mb-6">
                                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Trained professionals who care deeply.</h3>
                            </div>
                            <p className="text-white/90 mb-6 text-base lg:text-lg leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Our team brings years of experience and genuine passion for child development. Each caregiver is certified and committed to creating an environment where children thrive.
                            </p>
                            <ul className="text-white/90 mb-8 space-y-3 text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Certified trainers</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Experienced in child development</span>
                                </li>
                                <li className="flex items-start">
                                    <span className="mr-2">•</span>
                                    <span>Available when you need us</span>
                                </li>
                            </ul>
                            <Link to="/contact" className="inline-flex items-center text-white hover:text-white/80 transition-colors font-normal" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                                Contact us
                                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </Link>
                        </div>
                    </div>

                    {/* Image */}
                    <div className="relative">
                        <img src="/images/whatImg.jpeg" alt="Trained professionals" className="w-full h-[300px] sm:h-[400px] lg:h-full object-cover" />
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Call to Action */}
            <section className="bg-gray-100 py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold mb-3 sm:mb-4 text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Ready to get started?</h2>
                    <p className="mb-6 sm:mb-8 text-gray-700 text-sm sm:text-base lg:text-lg px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Transform your passion for child care into a professional career with our expert training programs.
                    </p>
                    <Link to="/contact" className="bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-normal border-0 hover:bg-gray-900 transition-colors text-sm sm:text-base inline-block rounded-lg" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                        START NOW
                    </Link>
                </div>
            </section>
            <Footer />
        </div>
    );
}

export default Landing; 