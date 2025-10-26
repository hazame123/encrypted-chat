import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { authAPI } from '../services/api';
import { generateKeyPair, storePrivateKey } from '../utils/crypto';

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
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
        isDarkMode
          ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-slate-200'
          : 'bg-gradient-to-br from-slate-50 to-slate-200 text-slate-900'
      }`}
    >
      {/* Decorative floating orbs */}
      <div className="absolute w-[300px] h-[300px] rounded-full blur-[40px] opacity-60 -top-[150px] -left-[150px] bg-gradient-radial from-indigo-500/60 to-transparent animate-float" />
      <div className="absolute w-[200px] h-[200px] rounded-full blur-[40px] opacity-60 top-[20%] right-[10%] bg-gradient-radial from-pink-500/60 to-transparent animate-float-delayed-2" />
      <div className="absolute w-[150px] h-[150px] rounded-full blur-[40px] opacity-60 bottom-[10%] left-[5%] bg-gradient-radial from-teal-500/60 to-transparent animate-float-delayed-4" />
      <div className="absolute w-[100px] h-[100px] rounded-full blur-[40px] opacity-60 top-[60%] right-[20%] bg-gradient-radial from-amber-500/60 to-transparent animate-float-delayed-1" />
      <div className="absolute w-[120px] h-[120px] rounded-full blur-[40px] opacity-60 bottom-[20%] right-[5%] bg-gradient-radial from-purple-500/60 to-transparent animate-float-delayed-3" />

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center px-12 py-6">
        <div className="flex items-center gap-2 text-xl font-semibold">
          <span className="text-2xl text-indigo-500">✦</span>
          <span>encrypted-chat</span>
        </div>
        <nav className="hidden md:flex gap-8">
          <a
            href="#"
            className="text-sm opacity-80 hover:opacity-100 transition-opacity"
          >
            Discover
          </a>
          <a
            href="#"
            className="text-sm opacity-80 hover:opacity-100 transition-opacity"
          >
            ✦ Randomizer
          </a>
        </nav>
      </header>

      {/* Main Content */}
      <div className="relative z-10 grid lg:grid-cols-2 gap-16 max-w-7xl mx-auto px-8 py-8 min-h-[calc(100vh-200px)] items-center">
        {/* Left Side - Quote */}
        <div className="hidden lg:flex items-center justify-center p-8">
          <blockquote className="max-w-lg">
            <p className="text-4xl font-light leading-tight mb-6">
              The journey of a thousand miles begins with a single step.
            </p>
            <footer className="text-lg opacity-70 italic">- Lao Tzu</footer>
          </blockquote>
        </div>

        {/* Right Side - Register Form */}
        <div className="flex items-center justify-center">
          <div
            className={`w-full max-w-md p-12 rounded-3xl border backdrop-blur-md shadow-xl ${
              isDarkMode
                ? 'bg-white/5 border-white/10'
                : 'bg-white/80 border-black/10'
            }`}
          >
            <h1 className="text-3xl font-semibold mb-2">Create Account</h1>
            <p
              className={`text-sm mb-8 ${isDarkMode ? 'opacity-70' : 'opacity-60'}`}
            >
              Join the adventure
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
              {errors.submit && (
                <div
                  className={`p-3.5 rounded-xl text-sm ${
                    isDarkMode
                      ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                      : 'bg-red-500/15 border border-red-500/30 text-red-600'
                  }`}
                >
                  {errors.submit}
                </div>
              )}

              {isGeneratingKeys && (
                <div
                  className={`p-3.5 rounded-xl text-sm ${
                    isDarkMode
                      ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300'
                      : 'bg-indigo-500/15 border border-indigo-500/30 text-indigo-700'
                  }`}
                >
                  🔐 Generating encryption keys...
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="username"
                  className={`text-sm font-medium ${isDarkMode ? 'opacity-90' : 'opacity-80'}`}
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`px-4 py-3.5 rounded-xl border transition-all outline-none ${
                    isDarkMode
                      ? 'bg-white/10 border-white/20 focus:border-indigo-400 focus:bg-white/15 text-white placeholder:text-white/40'
                      : 'bg-black/5 border-black/15 focus:border-indigo-500 focus:bg-indigo-500/10 text-slate-900 placeholder:text-black/40'
                  }`}
                  placeholder="Choose a username"
                  required
                  disabled={isLoading}
                />
                {errors.username && (
                  <span
                    className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    {errors.username}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="email"
                  className={`text-sm font-medium ${isDarkMode ? 'opacity-90' : 'opacity-80'}`}
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`px-4 py-3.5 rounded-xl border transition-all outline-none ${
                    isDarkMode
                      ? 'bg-white/10 border-white/20 focus:border-indigo-400 focus:bg-white/15 text-white placeholder:text-white/40'
                      : 'bg-black/5 border-black/15 focus:border-indigo-500 focus:bg-indigo-500/10 text-slate-900 placeholder:text-black/40'
                  }`}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading}
                />
                {errors.email && (
                  <span
                    className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    {errors.email}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="password"
                  className={`text-sm font-medium ${isDarkMode ? 'opacity-90' : 'opacity-80'}`}
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`px-4 py-3.5 rounded-xl border transition-all outline-none ${
                    isDarkMode
                      ? 'bg-white/10 border-white/20 focus:border-indigo-400 focus:bg-white/15 text-white placeholder:text-white/40'
                      : 'bg-black/5 border-black/15 focus:border-indigo-500 focus:bg-indigo-500/10 text-slate-900 placeholder:text-black/40'
                  }`}
                  placeholder="Create a password"
                  required
                  disabled={isLoading}
                />
                {errors.password && (
                  <span
                    className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    {errors.password}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="confirmPassword"
                  className={`text-sm font-medium ${isDarkMode ? 'opacity-90' : 'opacity-80'}`}
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`px-4 py-3.5 rounded-xl border transition-all outline-none ${
                    isDarkMode
                      ? 'bg-white/10 border-white/20 focus:border-indigo-400 focus:bg-white/15 text-white placeholder:text-white/40'
                      : 'bg-black/5 border-black/15 focus:border-indigo-500 focus:bg-indigo-500/10 text-slate-900 placeholder:text-black/40'
                  }`}
                  placeholder="Confirm your password"
                  required
                  disabled={isLoading}
                />
                {errors.confirmPassword && (
                  <span
                    className={`text-xs mt-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
                  >
                    {errors.confirmPassword}
                  </span>
                )}
              </div>

              <button
                type="submit"
                className="px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-indigo-500/40 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                disabled={isLoading}
              >
                {isLoading ? 'Creating Account...' : 'Sign up'}
              </button>

              <div className="text-center mt-2">
                <Link
                  to="/login"
                  className="text-indigo-500 text-sm hover:opacity-80 transition-opacity"
                >
                  Already have an account? Sign in
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Theme Toggle */}
      <div
        className={`fixed bottom-8 right-8 z-50 flex gap-2 p-2 rounded-full border backdrop-blur-md ${
          isDarkMode
            ? 'bg-white/10 border-white/15'
            : 'bg-white/60 border-black/10'
        }`}
      >
        <button
          className={`px-6 py-3 rounded-full text-xs font-semibold transition-all ${
            isDarkMode ? 'bg-white/20 text-indigo-500' : 'bg-transparent'
          }`}
          onClick={() => setIsDarkMode(true)}
        >
          DARK
        </button>
        <button
          className={`px-6 py-3 rounded-full text-xs font-semibold transition-all ${
            !isDarkMode ? 'bg-black/10 text-indigo-600' : 'bg-transparent'
          }`}
          onClick={() => setIsDarkMode(false)}
        >
          LIGHT
        </button>
      </div>
    </div>
  );
}
