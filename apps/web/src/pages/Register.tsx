import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { generateKeyPair, storePrivateKey } from '../utils/crypto';
import './Login.css';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);

  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password =
        'Password must contain at least one uppercase letter';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password =
        'Password must contain at least one lowercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsLoading(true);
    setIsGeneratingKeys(true);

    try {
      // Generate encryption keys
      const { publicKey, privateKey } = await generateKeyPair();
      setIsGeneratingKeys(false);

      // Register user
      const response = await authAPI.register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
        publicKey,
      });

      // Store private key locally
      storePrivateKey(privateKey);

      // Update auth state
      setAuth(response.user, response.accessToken, response.refreshToken);

      // Navigate to chat
      navigate('/chat');
    } catch (error: unknown) {
      setIsGeneratingKeys(false);
      let message = 'Registration failed. Please try again.';
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
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
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
              The journey of a thousand miles begins with a single step.
            </p>
            <footer className="quote-author">- Lao Tzu</footer>
          </blockquote>
        </div>

        {/* Right Side - Register Form */}
        <div className="form-section">
          <div className="form-container">
            <h1 className="form-title">Create Account</h1>
            <p className="form-subtitle">Join the adventure</p>

            <form onSubmit={handleSubmit} className="login-form">
              {errors.submit && (
                <div className="error-message">{errors.submit}</div>
              )}

              {isGeneratingKeys && (
                <div className="info-message">
                  🔐 Generating encryption keys...
                </div>
              )}

              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Choose a username"
                  required
                  disabled={isLoading}
                />
                {errors.username && (
                  <span className="field-error">{errors.username}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
                {errors.email && (
                  <span className="field-error">{errors.email}</span>
                )}
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
                  placeholder="Create a password"
                  required
                  disabled={isLoading}
                />
                {errors.password && (
                  <span className="field-error">{errors.password}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword" className="form-label">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <span className="field-error">{errors.confirmPassword}</span>
                )}
              </div>

              <button type="submit" className="submit-btn" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Sign up'}
              </button>

              <div className="form-footer">
                <Link to="/login" className="forgot-link">
                  Already have an account? Sign in
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
