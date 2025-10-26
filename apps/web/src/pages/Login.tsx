import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import './Login.css';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      const response = await authAPI.login({
        email: formData.email,
        password: formData.password,
      });

      setAuth(response.user, response.accessToken, response.refreshToken);
      navigate('/chat');
    } catch (error: unknown) {
      let message = 'Login failed. Please check your credentials.';
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        message = error.response.data.message;
      }
      setErrors({ submit: message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear error when user starts typing
    if (errors[e.target.name] || errors.submit) {
      setErrors({});
    }
  };

  return (
    <div className={`login-container ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Decorative floating elements */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>
      <div className="floating-orb orb-4"></div>
      <div className="floating-orb orb-5"></div>

      {/* Header */}
      <header className="header">
        <div className="logo">
          <span className="logo-icon">✦</span>
          <span className="logo-text">encrypted-chat</span>
        </div>
        <nav className="nav">
          <a href="#" className="nav-link">
            Discover
          </a>
          <a href="#" className="nav-link">
            ✦ Randomizer
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <div className="content">
        {/* Left Side - Quote */}
        <div className="quote-section">
          <blockquote className="quote">
            <p className="quote-text">
              Keep your face always toward the sunshine - and shadows will fall
              behind you.
            </p>
            <footer className="quote-author">- Walt Whitman</footer>
          </blockquote>
        </div>

        {/* Right Side - Login Form */}
        <div className="form-section">
          <div className="form-container">
            <h1 className="form-title">Login</h1>
            <p className="form-subtitle">Welcome back adventurer</p>

            <form onSubmit={handleSubmit} className="login-form">
              {errors.submit && (
                <div className="error-message">{errors.submit}</div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Username/Email
                </label>
                <input
                  type="text"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                />
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>

              <div className="form-footer">
                <Link to="/register" className="forgot-link">
                  Don&apos;t have an account? Sign up
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div className="theme-toggle">
        <button
          className={`theme-btn ${isDarkMode ? 'active' : ''}`}
          onClick={() => setIsDarkMode(true)}
        >
          DARK
        </button>
        <button
          className={`theme-btn ${!isDarkMode ? 'active' : ''}`}
          onClick={() => setIsDarkMode(false)}
        >
          LIGHT
        </button>
      </div>
    </div>
  );
}
