import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { fetchUserAccount } from "../api";
import "../Navigation.css";

const Navigations = () => {
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    async function getUser() {
      const data = await fetchUserAccount();
      if (data) {
        setUser(data);
      } else {
        setUser(null);
      }
    }

    getUser();
  }, [location]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    setUser(null);
    window.location.href = "/";
  };

  return (
    <nav className="nav-container">
      <div className="nav-right">
        {!user ? (
          <Link to="/users/login" className="nav-button">
            Login
          </Link>
        ) : (
          <>
            <Link to="/create-event" className="nav-button">
              Create Event
            </Link>
            <Link to="/booked-events" className="nav-button">
              Booked Events
            </Link>
            <Link to="/favorite-events" className="nav-button">
              Favorites
            </Link>
            <Link to="/users/account" className="nav-button">
              Account
            </Link>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navigations;

