import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';

function Landing() {
    return (
        <div className="bg-white min-h-screen font-montserrat">
            {/* Hero Section */}
            <section className="relative w-full h-[500px] sm:h-[400px] md:h-[500px] lg:h-[620px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8">
                <img src="/images/hero-img.jpg" alt="Hero" className="absolute inset-0 w-full h-full object-cover object-center z-0" />
                <div className="absolute inset-0 bg-black opacity-30 z-10" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full px-4">
                    <h1 className="hero-title font-normal mb-3 sm:mb-4 text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-[64px]" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Training Classes for Child Care Providers
                    </h1>
                    <h3 className="hero-txt mb-6 sm:mb-8 max-w-xs sm:max-w-md md:max-w-lg lg:max-w-2xl mx-auto text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                        Expert-led classes, CDA certification, and professional development programs.
                    </h3>
                    <Link
                        to="/classes"
                        className="hero-button bg-white text-black px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4 font-normal border-0 hover:bg-gray-100 transition-colors text-sm sm:text-base inline-block"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                    >
                        VIEW OUR CLASSES
                    </Link>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Belief Statement */}
            <section id="statement-container" className="text-center px-4 sm:px-6 lg:px-8" style={{ margin: '80px auto', maxWidth: '1200px' }}>
                <p id="statement-title" className="uppercase tracking-widest mb-2" style={{ color: '#979797', fontSize: '11px', fontFamily: 'Montserrat, sans-serif' }}>WHAT WE BELIEVE IN</p>
                <p id="statement-text" className="mb-2 text-xl sm:text-2xl md:text-3xl lg:text-[34px] px-4" style={{ color: 'black', fontFamily: 'Montserrat, sans-serif' }}>
                    Empower providers with quality training, advance careers, and put children first.
                </p>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Who we are */}
            <section id="who-we-are" className="py-8 sm:py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Content Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-10 border border-gray-100">
                        <div className="mb-6">
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                About Us
                            </span>
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Who we are</h3>
                        </div>
                        <p className="text-gray-600 mb-8 text-base lg:text-lg leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            YJ Child Care Plus is a dedicated training organization committed to empowering childcare professionals with the knowledge, skills, and certifications needed to provide exceptional care for children. We believe that well-trained providers create safer, more nurturing environments where children can thrive and grow.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/classes" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 font-semibold rounded-lg transition-colors text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                View Our Classes
                            </Link>
                            <Link to="/contact" className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white px-8 py-4 font-semibold rounded-lg transition-colors text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Get Started
                            </Link>
                        </div>
                    </div>

                    {/* Visual Card */}
                    <div className="relative">
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 lg:p-10">
                            <div className="relative">
                                <img src="/images/whoImg.jpeg" alt="Who we are" className="w-full h-[300px] sm:h-[400px] lg:h-[450px] object-cover rounded-xl shadow-lg" />
                                <div className="absolute -bottom-6 -right-6 bg-white rounded-xl shadow-lg p-6 max-w-xs">
                                    <div className="flex items-center mb-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Expert Training</p>
                                            <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Certified Instructors</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        "Professional development that makes a real difference in childcare quality."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* What we do */}
            <section className="py-8 sm:py-12 lg:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
                    {/* Visual Card */}
                    <div className="relative order-2 lg:order-1">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-8 lg:p-10">
                            <div className="relative">
                                <img src="/images/whatImg.jpeg" alt="What we do" className="w-full h-[300px] sm:h-[400px] lg:h-[450px] object-cover rounded-xl shadow-lg" />
                                <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-lg p-6 max-w-xs">
                                    <div className="flex items-center mb-3">
                                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>CDA Certification</p>
                                            <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>Professional Development</p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                        "Comprehensive training programs that advance your childcare career."
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Content Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-8 lg:p-10 border border-gray-100 order-1 lg:order-2">
                        <div className="mb-6">
                            <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wide mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Our Services
                            </span>
                            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>What we do</h3>
                        </div>
                        <p className="text-gray-600 mb-8 text-base lg:text-lg leading-relaxed" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                            We offer comprehensive professional development courses including Child Development Associate (CDA) certification, CPR and First Aid training, and specialized childcare programs. Our expert instructors provide hands-on learning experiences that prepare you for real-world childcare scenarios and help advance your career in early childhood education.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <Link to="/classes" className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 font-semibold rounded-lg transition-colors text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Explore Programs
                            </Link>
                            <Link to="/contact" className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white px-8 py-4 font-semibold rounded-lg transition-colors text-center" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                Contact Us
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Call to Action */}
            <section className="bg-gray-100 py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold mb-3 sm:mb-4 text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Grow your business.</h2>
                    <p className="mb-6 sm:mb-8 text-gray-700 text-sm sm:text-base lg:text-lg px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        Today is the day to build the business of your dreams. Share your mission with the world — and blow your customers away.
                    </p>
                    <Link to="/contact" className="bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-normal border-0 hover:bg-gray-900 transition-colors text-sm sm:text-base inline-block" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}>
                        START NOW
                    </Link>
                </div>
            </section>
            <Footer />
        </div>
    );
}

export default Landing; 