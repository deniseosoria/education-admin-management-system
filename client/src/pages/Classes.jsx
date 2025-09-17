import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/layout/Footer';
import classService from '../services/classService';

// Default image for fallback
const defaultClassImage = 'https://res.cloudinary.com/your-cloud-name/image/upload/v1/yj-childcare-classes/default-class';

// Helper to convert string to Title Case
function toTitleCase(str) {
    if (!str) return '';
    return str
        .replace(/-/g, ' ') // Replace dashes with spaces
        .replace(/\b\w/g, char => char.toUpperCase()) // Capitalize first letter of each word
        .replace(/\s+/g, ' '); // Remove extra spaces
}

function Classes() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState({
        location: '',
        duration: '',
        priceRange: ''
    });
    const [filteredClasses, setFilteredClasses] = useState([]);

    useEffect(() => {
        // Scroll to top when component mounts
        window.scrollTo(0, 0);
        fetchClasses();
    }, []);

    useEffect(() => {
        filterClasses();
    }, [classes, filters]);

    const fetchClasses = async () => {
        try {
            setLoading(true);
            setError('');
            const data = await classService.getAllClasses();
            setClasses(data);
        } catch (err) {
            setError(err.message || 'Failed to load classes. Please try again later.');
        } finally {
            setLoading(false);
        }
    };

    const filterClasses = () => {
        let result = [...classes];

        if (filters.location) {
            result = result.filter(c => c.location.toLowerCase() === filters.location.toLowerCase());
        }
        if (filters.duration) {
            result = result.filter(c => c.duration.toLowerCase().includes(filters.duration.toLowerCase()));
        }
        if (filters.priceRange) {
            const [min, max] = filters.priceRange.split('-').map(Number);
            result = result.filter(c => c.price >= min && c.price <= max);
        }

        setFilteredClasses(result);
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Helper function to get image source
    const getImageSource = (classItem) => {
        // If the class has a Cloudinary image URL, use it
        if (classItem.image_url) {
            // Add Cloudinary transformations for optimal display
            return classItem.image_url.replace('/upload/', '/upload/c_fill,w_500,h_350,q_auto,f_auto/');
        }
        // Use default image if no image is set
        return defaultClassImage;
    };

    // Helper function to get duration string based on class title
    const getDurationString = (classItem) => {
        if (classItem.title === "Development and Operations") return "4 weeks";
        if (classItem.title === "Child Development Associate (CDA)") return "3 months";
        if (classItem.title === "CPR and First Aid Certification") return "1 day";
        // fallback if needed
        return "";
    };

    const renderLoadingState = () => (
        <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );

    const renderErrorState = () => (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
                <p>{error}</p>
                <button
                    onClick={fetchClasses}
                    className="mt-4 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200 transition-colors"
                >
                    Try Again
                </button>
            </div>
        </div>
    );

    const renderFilters = () => (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 bg-gray-50 mb-6 sm:mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <select
                    name="location"
                    value={filters.location}
                    onChange={handleFilterChange}
                    className="px-3 sm:px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-black text-sm sm:text-base"
                >
                    <option value="">All Locations</option>
                    <option value="Online">Online</option>
                    <option value="In-Person">In-Person</option>
                    <option value="Hybrid">Hybrid</option>
                </select>

                <select
                    name="duration"
                    value={filters.duration}
                    onChange={handleFilterChange}
                    className="px-3 sm:px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-black text-sm sm:text-base"
                >
                    <option value="">All Durations</option>
                    <option value="2 days">2 Days</option>
                    <option value="8 weeks">8 Weeks</option>
                    <option value="12 weeks">12 Weeks</option>
                </select>

                <select
                    name="priceRange"
                    value={filters.priceRange}
                    onChange={handleFilterChange}
                    className="px-3 sm:px-4 py-2 border border-gray-200 rounded focus:outline-none focus:border-black text-sm sm:text-base sm:col-span-2 lg:col-span-1"
                >
                    <option value="">All Prices</option>
                    <option value="0-200">Under $200</option>
                    <option value="200-300">$200 - $300</option>
                    <option value="300-400">$300 - $400</option>
                    <option value="400-1000">Over $400</option>
                </select>
            </div>
        </div>
    );

    return (
        <div className="bg-white min-h-screen font-montserrat">

            {/* Hero Section */}
            <section className="relative w-full h-[250px] sm:h-[300px] md:h-[400px] flex items-center justify-center text-white text-center overflow-hidden mb-0 px-4 sm:px-6 lg:px-8" style={{ margin: '10px auto' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 z-0" />
                <div className="relative z-20 flex flex-col items-center justify-center w-full h-full">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-normal mb-3 sm:mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Our Classes</h1>
                    <p className="text-base sm:text-lg md:text-xl max-w-2xl mx-auto opacity-90 px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Professional development courses for childcare providers</p>
                </div>
            </section>

            {/* Divider */}
            <div className="w-full border-t border-gray-200 my-0" />

            {/* Filters */}
            {!loading && !error && renderFilters()}

            {/* Error State */}
            {error && renderErrorState()}

            {/* Loading State */}
            {loading && renderLoadingState()}

            {/* Classes List */}
            {!loading && !error && (
                <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16 lg:space-y-20 mb-12 sm:mb-16 lg:mb-20 px-4 sm:px-6 lg:px-8">
                    {filteredClasses.length === 0 ? (
                        <div className="text-center py-8 sm:py-12">
                            <p className="text-gray-600 text-base sm:text-lg">No classes found matching your criteria.</p>
                            <button
                                onClick={() => setFilters({ location: '', duration: '', priceRange: '' })}
                                className="mt-4 text-blue-600 hover:underline"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        filteredClasses.map((classItem, index) => (
                            <div key={classItem.id} className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} items-center gap-6 sm:gap-8 lg:gap-12`}>
                                <div className="flex-1 text-center lg:text-left order-2 lg:order-1">
                                    <h2 className="text-xl sm:text-2xl lg:text-[28px] font-semibold mb-3 sm:mb-4 text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>{classItem.title}</h2>
                                    <p className="text-gray-700 mb-3 sm:mb-4 text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>{classItem.description}</p>
                                    <div className="mb-6 sm:mb-8 space-y-2">
                                        <p className="text-gray-700 text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            <span className="font-medium">Duration:</span> {getDurationString(classItem)}
                                        </p>
                                        <p className="text-gray-700 text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            <span className="font-medium">Location:</span> {toTitleCase(classItem.location_type)}{classItem.location_details && ` - ${classItem.location_details}`}
                                        </p>
                                        <p className="text-gray-700 text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            <span className="font-medium">Sessions:</span> Multiple sessions available with different locations and capacities
                                        </p>
                                        <p className="text-gray-700 text-sm sm:text-base lg:text-lg" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                                            <span className="font-medium">Price:</span> ${classItem.price}
                                        </p>
                                    </div>
                                    <Link
                                        to={`/classes/${classItem.id}`}
                                        className="inline-block bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-normal border-0 hover:bg-gray-900 transition-colors text-sm sm:text-base"
                                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                                    >
                                        VIEW DETAILS
                                    </Link>
                                </div>
                                <img
                                    src={getImageSource(classItem)}
                                    alt={classItem.title}
                                    className="flex-1 w-full max-w-[500px] h-[250px] sm:h-[300px] lg:h-[350px] object-cover rounded-lg shadow-md order-1 lg:order-2"
                                    onError={(e) => {
                                        e.target.onerror = null; // Prevent infinite loop
                                        e.target.src = defaultClassImage; // Fallback to default image
                                    }}
                                />
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Call to Action */}
            <section className="bg-gray-100 py-8 sm:py-12 lg:py-16 px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl mx-auto text-center">
                    <h2 className="text-2xl sm:text-3xl lg:text-[34px] font-semibold mb-3 sm:mb-4 text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>Ready to Advance Your Career?</h2>
                    <p className="mb-6 sm:mb-8 text-gray-700 text-sm sm:text-base lg:text-lg px-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>Take the next step in your professional development with our comprehensive childcare training programs.</p>
                    <Link
                        to="/contact"
                        className="inline-block bg-black text-white px-6 sm:px-8 py-3 sm:py-4 font-normal border-0 hover:bg-gray-900 transition-colors text-sm sm:text-base"
                        style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 400 }}
                    >
                        CONTACT US
                    </Link>
                </div>
            </section>

            <Footer />
        </div>
    );
}

export default Classes; 