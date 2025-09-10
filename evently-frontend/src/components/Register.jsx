import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchRegister } from "../api";
import "../Login.css";

const Register = ({ setToken }) => {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    location: "",
  });
  const [error, setError] = useState(null);
  const [token, setLocalToken] = useState(null); // Store the token locally
  const navigate = useNavigate(); // Hook to navigate programmatically

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null); // Clear previous errors

    try {
      const registerData = await fetchRegister(formData);

      if (registerData?.error) {
        throw new Error(registerData.error);
      }

      if (registerData.token) {
        setToken(registerData.token); // Update App.js state
        setLocalToken(registerData.token); // Store locally for the Link button
        localStorage.setItem("token", registerData.token); // Persist login
        navigate("/");
      } else {
        throw new Error("Registration failed. Please try again.");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="sign-up-container">
      <div>
        <h2>Sign Up</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-container">
            
              <label>
                
                <input
                  type="text"
                  value={formData.name}
                  placeholder="Name"
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }));
                  }}
                />
              </label>
            
          </div>

          <div className="input-container">
            
              <label>
                
                <input
                  type="text"
                  value={formData.username}
                  placeholder="Username"
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }));
                  }}
                />
              </label>
            
          </div>

          <div className="input-container">
            
              <label>
                
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  placeholder="Location"
                  onChange={(e) => {
                    setFormData((prev) => ({ ...prev, location: e.target.value }));
                  }}
                  required
                />
              </label>
            
          </div>

          <div className="input-container">
            
              <label>
                
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  placeholder="Password"
                  onChange={(e) => {
                    setFormData((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }));
                  }}
                  required
                  minLength="4"
                  maxLength="8"
                />
              </label>
            
          </div>
          
          <button className="form-button" type="submit">
            Register
          </button>
        </form>

        {/* Show login link if email already exists */}
        {error && error.includes("Account already exists") && (
          <p>
            Already have an account?{" "}
            <Link to="/users/login">
              <button>Log in here</button>
            </Link>
          </p>
        )}

        {/* Show link button only if registration is successful */}
        {token && (
          <Link to="/users/account">
            <button>Go to My Account</button>
          </Link>
        )}
      </div>
    </div>
  );
};

export default Register;
