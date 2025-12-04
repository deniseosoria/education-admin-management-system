import React, { useState, useMemo, useCallback, useEffect, useLayoutEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { createPortal } from "react-dom";
import { useAuth } from "../../contexts/AuthContext";
import classService from "../../services/classService";
import "./Header.css";

function Header() {
    const { user, logout, loading, initialized } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isAdminRoute = location.pathname.startsWith("/admin");

    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const [isMobileView, setIsMobileView] = useState(false);
    const [classes, setClasses] = useState([]);
    const [classesLoading, setClassesLoading] = useState(true);
    const [isClassesDropdownOpen, setIsClassesDropdownOpen] = useState(false);

    // --- Responsive breakpoint check (mobile if < 1024px)
    useEffect(() => {
        const checkScreenSize = () => setIsMobileView(window.innerWidth < 1024);
        checkScreenSize();
        window.addEventListener("resize", checkScreenSize);
        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

    // --- Fetch classes for dropdown
    useEffect(() => {
        const fetchClasses = async () => {
            try {
                setClassesLoading(true);
                const data = await classService.getAllClasses();
                setClasses(data);
            } catch (error) {
                console.error('Error fetching classes for header dropdown:', error);
            } finally {
                setClassesLoading(false);
            }
        };
        fetchClasses();
    }, []);

    // --- Body scroll lock while the menu is open
    useLayoutEffect(() => {
        if (isMenuOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [isMenuOpen]);

    // --- Logout
    const handleLogout = useCallback(async () => {
        try {
            await logout();
            navigate("/");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    }, [logout, navigate]);

    // --- Menu open/close handlers (with closing animation) - moved before ClassesDropdown
    const toggleMenu = useCallback(() => {
        if (isMenuOpen) {
            setIsClosing(true);
            setTimeout(() => {
                setIsMenuOpen(false);
                setIsClosing(false);
            }, 300);
        } else {
            setIsMenuOpen(true);
        }
    }, [isMenuOpen]);

    const closeMenu = useCallback(() => {
        if (isMenuOpen) {
            setIsClosing(true);
            setTimeout(() => {
                setIsMenuOpen(false);
                setIsClosing(false);
            }, 300);
        }
    }, [isMenuOpen]);

    // --- Classes dropdown component
    const handleClassClick = useCallback(() => {
        setIsClassesDropdownOpen(false);
        if (isMobileView && isMenuOpen) {
            closeMenu();
        }
    }, [isMobileView, isMenuOpen, closeMenu]);

    const ClassesDropdown = useMemo(() => {
        return (
            <div
                className="classes-dropdown-container"
                onMouseEnter={() => !isMobileView && setIsClassesDropdownOpen(true)}
                onMouseLeave={() => !isMobileView && setIsClassesDropdownOpen(false)}
            >
                <div
                    className={`nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto cursor-pointer ${!isMobileView && isClassesDropdownOpen ? 'classes-button-open' : ''}`}
                    style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                    onClick={() => {
                        if (isMobileView) {
                            setIsClassesDropdownOpen(!isClassesDropdownOpen);
                        } else {
                            // On desktop, clicking "Classes" goes to /classes page
                            navigate('/classes');
                        }
                    }}
                >
                    Classes
                    {isMobileView && (
                        <span className="ml-2" style={{ fontSize: '10px' }}>
                            {isClassesDropdownOpen ? '▼' : '▶'}
                        </span>
                    )}
                </div>
                {isClassesDropdownOpen && (
                    <div className={`classes-dropdown ${isMobileView ? 'mobile' : 'desktop'}`}>
                        {classesLoading ? (
                            <div className="classes-dropdown-item">Loading...</div>
                        ) : classes.length > 0 ? (
                            classes.map((classItem) => (
                                <Link
                                    key={classItem.id}
                                    to={`/classes/${classItem.id}`}
                                    className="classes-dropdown-item"
                                    onClick={handleClassClick}
                                >
                                    {classItem.title}
                                </Link>
                            ))
                        ) : (
                            <div className="classes-dropdown-item">No classes available</div>
                        )}
                    </div>
                )}
            </div>
        );
    }, [classes, classesLoading, isClassesDropdownOpen, isMobileView, navigate, handleClassClick]);

    // --- Navigation links (unchanged from your original structure)
    const navigationLinks = useMemo(
        () => (
            <>
                <Link
                    to="/"
                    className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                    style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                >
                    About
                </Link>
                {ClassesDropdown}
                <Link
                    to="/contact"
                    className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                    style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                >
                    Contact
                </Link>
            </>
        ),
        [ClassesDropdown]
    );

    // --- Auth links (preserves your admin/profile/logout logic)
    const authLinks = useMemo(() => {
        if (!initialized || loading) {
            return <div className="animate-pulse bg-gray-200 h-8 w-32 rounded" />;
        }

        const userRole = user?.role;

        if (!user) {
            return (
                <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
                    <Link
                        to="/login"
                        className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                        style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                    >
                        Login
                    </Link>
                    <Link
                        to="/signup"
                        className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                        style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                    >
                        Sign Up
                    </Link>
                </div>
            );
        }

        // When logged in
        return (
            <div className="flex flex-col lg:flex-row items-center space-y-2 lg:space-y-0 lg:space-x-4 w-full lg:w-auto">
                {!isAdminRoute && userRole !== "admin" && (
                    <Link
                        to="/profile"
                        className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                        style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                    >
                        Profile
                    </Link>
                )}
                {userRole === "admin" && (
                    <Link
                        to="/admin/analytics"
                        className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                        style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                    >
                        Admin
                    </Link>
                )}
                <button
                    onClick={handleLogout}
                    className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                    style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                >
                    Logout
                </button>
            </div>
        );
    }, [user, initialized, loading, isAdminRoute, handleLogout]);

    // --- Close the mobile menu on route change
    useEffect(() => {
        if (isMenuOpen) closeMenu();
    }, [location.pathname]);

    // --- Close classes dropdown when mobile menu closes
    useEffect(() => {
        if (!isMenuOpen) {
            setIsClassesDropdownOpen(false);
        }
    }, [isMenuOpen]);

    return (
        <header className="bg-white shadow-sm sticky top-0 z-50 w-full site-header">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="relative flex justify-between items-center h-20 sm:h-24 lg:h-28">
                    {/* Left: Logo + (desktop) nav */}
                    <div className="flex items-center">
                        {/* ORIGINAL LOGO BLOCK */}
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <div className="h-32 w-[360px] sm:h-36 sm:w-[400px] lg:h-40 lg:w-[440px] overflow-hidden -my-4 sm:-my-6 lg:-my-8">
                                <img
                                    src="/images/logo-img.png"
                                    alt="YJ Child Care Plus Inc."
                                    className="h-full w-full object-cover object-left"
                                />
                            </div>
                        </Link>

                        {/* Desktop navigation (hidden on mobile) */}
                        {!isMobileView && (
                            <div className="ml-2 sm:ml-3 lg:ml-4 flex space-x-2 sm:space-x-4 lg:space-x-6 items-center">
                                {navigationLinks}
                            </div>
                        )}
                    </div>

                    {/* Right: (desktop) auth links or (mobile) hamburger */}
                    {!isMobileView ? (
                        <div className="ml-4 sm:ml-6 lg:ml-6 flex items-center">{authLinks}</div>
                    ) : (
                        <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex lg:hidden">
                            <button
                                onClick={toggleMenu}
                                className="mobile-menu-toggle-button inline-flex items-center justify-center p-3 rounded-md text-gray-500 hover:text-black focus:outline-none bg-white shadow-lg border border-gray-200"
                                aria-label="Toggle navigation menu"
                                aria-expanded={isMenuOpen}
                            >
                                {/* Icon changes when open */}
                                {isMenuOpen ? (
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                ) : (
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </nav>

            {/* MOBILE MENU OVERLAY via portal so it never pushes content */}
            {isMobileView &&
                createPortal(
                    <div
                        className={`mobile-menu-overlay lg:hidden ${isMenuOpen ? "open" : ""} ${isClosing ? "closing" : ""}`}
                        aria-hidden={!isMenuOpen}
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="mobile-menu-content">
                            <div className="mobile-menu-header">
                                <h3 className="mobile-menu-title">Navigation</h3>
                                <button onClick={closeMenu} className="mobile-menu-close" aria-label="Close navigation menu">
                                    <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="mobile-menu-sections">
                                <div className="mobile-menu-section">
                                    <h4 className="mobile-menu-section-title">Main Navigation</h4>
                                    <div className="mobile-menu-links">
                                        <Link
                                            to="/"
                                            className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                                            style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                                            onClick={closeMenu}
                                        >
                                            About
                                        </Link>
                                        {ClassesDropdown}
                                        <Link
                                            to="/contact"
                                            className="nav-button uppercase text-gray-500 hover:text-black transition-colors block w-full text-center py-3 lg:py-0 lg:w-auto"
                                            style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 400, fontSize: "14px", padding: "12px 16px" }}
                                            onClick={closeMenu}
                                        >
                                            Contact
                                        </Link>
                                    </div>
                                </div>
                                <div className="mobile-menu-section">
                                    <h4 className="mobile-menu-section-title">Account</h4>
                                    <div className="mobile-menu-links" onClick={closeMenu}>{authLinks}</div>
                                </div>
                            </div>
                        </div>
                        {/* Backdrop click closes */}
                        <button className="backdrop" aria-label="Close menu" onClick={closeMenu} />
                    </div>,
                    document.body
                )}
        </header>
    );
}

// Memoized export (as in your original)
const MemoizedHeader = React.memo(Header);
export default MemoizedHeader;
