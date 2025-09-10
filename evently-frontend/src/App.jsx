import React, { useState } from "react";
import { Routes, Route, Link } from "react-router-dom";
import Navigation from "./components/Navigations";
import Events from "./components/Events";
import SingleEvent from "./components/SingleEvent";
import Login from "./components/Login";
import Register from "./components/Register";
import Account from "./components/Account";
import BookedEvents from "./components/BookedEvents";
import FavoriteEvents from "./components/FavoriteEvents";
import CreateEventPage from "./components/CreateEventPage.jsx";
import "./App.css";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // Function to handle setting & persisting the token
  const handleSetToken = (newToken) => {
    if (newToken) {
      setToken(newToken);
      localStorage.setItem("token", newToken); // Store token in localStorage
    } else {
      setToken(null);
      localStorage.removeItem("token"); // Remove token on logout
    }
  };

  const NotFound = () => (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>404 - Page Not Found</h1>
      <p>The page you're looking for doesn't exist.</p>
    </div>
  );

  return (
    <>
      <div className="app">
        <header>
          <h1>
            <Link to="/">Evently</Link>
          </h1>
          <nav>
            <Navigation />
          </nav>
        </header>
        <div>
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Events token={token} />
                </>
              }
            />
            <Route path="/event/:id" element={<SingleEvent token={token} />} />
            <Route
              path="/users/login"
              element={<Login setToken={handleSetToken} token={token} />}
            />
            <Route
              path="/users/register"
              element={<Register setToken={handleSetToken} token={token} />}
            />
            <Route
              path="/users/account"
              element={
                token ? (
                  <Account token={token} />
                ) : (
                  <p>Please register or log in.</p>
                )
              }
            />
            <Route
              path="/create-event"
              element={<CreateEventPage token={token} />}
            />
            <Route
              path="/booked-events"
              element={<BookedEvents token={token} />}
            />
            <Route
              path="/favorite-events"
              element={<FavoriteEvents token={token} />}
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </div>
      </div>
    </>
  );
}

export default App;
