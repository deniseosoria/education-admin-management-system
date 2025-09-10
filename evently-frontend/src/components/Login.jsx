import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchLogin } from "../api";
import "../Login.css";

const Login = ({ setToken }) => {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);

    try {
      const loginData = await fetchLogin(formData);

      if (loginData?.error) {
        throw new Error(loginData.error);
      }

      if (loginData.token) {
        setToken(loginData.token);
        localStorage.setItem("token", loginData.token);
        navigate("/");
      } else {
        throw new Error("Account not found. Please register.");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="sign-up-container">
      <div>
        <h2>Login</h2>
        {error && <p style={{ color: "red" }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className="input-container">
            <label>
              <input
                type="text"
                id="username"
                value={formData.username}
                placeholder="Username"
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, username: e.target.value }))
                }
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
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, password: e.target.value }))
                }
                required
                minLength="4"
                maxLength="20"
              />
            </label>
          </div>

          <button className="form-button" type="submit">
            Login
          </button>
        </form>

        {error && error.includes("Username or password is incorrect") && (
          <p style={{ color: "red" }}>Incorrect username or password</p>
        )}

        <p>
          Don't have an account?{" "}
          <Link to="/users/register">
            <button>Sign-up</button>
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
