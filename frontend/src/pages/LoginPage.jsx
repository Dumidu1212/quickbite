// src/pages/LoginPage.jsx
//
// Authentication page — handles both login and registration.
//
// LAYOUT:
//   Single page with two tabs: Sign in and Register.
//   Switching tabs swaps the form — no page navigation required.
//   This gives a clean, modern UX without two separate routes.
//
// FORM VALIDATION:
//   react-hook-form manages form state and submission.
//   Zod schemas define validation rules declaratively.
//   @hookform/resolvers bridges the two libraries.
//   Validation runs client-side before any API call is made.
//   Field-level errors appear inline beneath each input.
//
// EMAIL VALIDATION:
//   We use .regex() instead of Zod's .email() because the version
//   of Zod installed (v4) changed the .email() signature and the
//   previous overload is flagged as deprecated by SonarLint (S1874).
//   The regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ matches standard email formats.
//
// ERROR HANDLING:
//   API errors are caught in onSubmit and displayed as toast notifications.
//   We distinguish: network errors (service down), 409 (duplicate email),
//   rate limiting (429), and general validation errors from the API.
//
// SECURITY:
//   After successful login/register, the JWT is stored in memory via
//   AuthContext which calls setToken() in api/client.js.
//   The user is then redirected to /restaurants.

import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import useAuth from '../hooks/useAuth';

// ── Validation schemas ────────────────────────────────────────────────────
//
// Using .regex() for email validation — avoids the deprecated .email()
// overload in Zod v4 which triggers SonarLint S1874.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(EMAIL_REGEX, 'Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required'),
});

const registerSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name cannot exceed 50 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(EMAIL_REGEX, 'Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/\d/, 'Must contain at least one number'),
});

// ── Reusable input field component ────────────────────────────────────────

const Field = ({ id, label, type, placeholder, registration, error, autoComplete }) => (
  <div>
    {/* htmlFor links label to input via matching id — required for accessibility (S6853) */}
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
      {label}
    </label>
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={`w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
        error ? 'border-red-400 bg-red-50' : 'border-gray-300'
      }`}
      {...registration}
    />
    {/* Inline error message — only shown when this field has a validation error */}
    {error && (
      <p className="mt-1 text-xs text-red-600" role="alert">
        {error.message}
      </p>
    )}
  </div>
);

Field.propTypes = {
  id:           PropTypes.string.isRequired,
  label:        PropTypes.string.isRequired,
  type:         PropTypes.string.isRequired,
  placeholder:  PropTypes.string.isRequired,
  registration: PropTypes.object.isRequired,
  error:        PropTypes.shape({ message: PropTypes.string }),
  autoComplete: PropTypes.string,
};

// ── Login form ─────────────────────────────────────────────────────────────

const LoginForm = ({ onSwitch }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

 const onSubmit = async (data) => {
  try {
    await login(data.email, data.password);
    toast.success('Welcome back!');
    // Return to checkout if that's where they came from
    const returnTo = location.state?.returnTo || '/restaurants';
    navigate(returnTo);
  } catch (err) {
      // Network error — User service not running
      if (!err.response) {
        toast.error('Cannot connect. Make sure the User service is running.');
        return;
      }
      // Rate limit — too many login attempts
      if (err.response.status === 429) {
        toast.error('Too many attempts. Please wait 15 minutes and try again.');
        return;
      }
      // API validation error — extract the first field-level message
      const firstError = err.response?.data?.errors?.[0]?.message;
      toast.error(firstError || 'Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field
        id="login-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        registration={register('email')}
        error={errors.email}
      />
      <Field
        id="login-password"
        label="Password"
        type="password"
        placeholder="••••••••"
        autoComplete="current-password"
        registration={register('password')}
        error={errors.password}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Signing in...' : 'Sign in'}
      </button>

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-blue-600 hover:underline font-medium"
        >
          Create one
        </button>
      </p>
    </form>
  );
};

LoginForm.propTypes = {
  onSwitch: PropTypes.func.isRequired,
};

// ── Register form ──────────────────────────────────────────────────────────

const RegisterForm = ({ onSwitch }) => {
  // rename to avoid shadowing the `register` from react-hook-form
  const { register: authRegister } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data) => {
    try {
      await authRegister(data.name, data.email, data.password);
      toast.success('Account created! Welcome to QuickBite.');
      navigate('/restaurants');
    } catch (err) {
      if (!err.response) {
        toast.error('Cannot connect. Make sure the User service is running.');
        return;
      }
      // 409 Conflict — email already registered
      if (err.response.status === 409) {
        toast.error('An account with this email already exists.');
        return;
      }
      const firstError = err.response?.data?.errors?.[0]?.message;
      toast.error(firstError || 'Registration failed. Please try again.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field
        id="reg-name"
        label="Full name"
        type="text"
        placeholder="Dumidu Perera"
        autoComplete="name"
        registration={register('name')}
        error={errors.name}
      />
      <Field
        id="reg-email"
        label="Email"
        type="email"
        placeholder="you@example.com"
        autoComplete="email"
        registration={register('email')}
        error={errors.email}
      />
      <Field
        id="reg-password"
        label="Password"
        type="password"
        placeholder="Min 8 chars, 1 uppercase, 1 number"
        autoComplete="new-password"
        registration={register('password')}
        error={errors.password}
      />

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gray-900 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Creating account...' : 'Create account'}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <button
          type="button"
          onClick={onSwitch}
          className="text-blue-600 hover:underline font-medium"
        >
          Sign in
        </button>
      </p>
    </form>
  );
};

RegisterForm.propTypes = {
  onSwitch: PropTypes.func.isRequired,
};

// ── Page ───────────────────────────────────────────────────────────────────

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('login');

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Brand header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-gray-900">QuickBite</h1>
          <p className="text-sm text-gray-500 mt-1">Food delivery, made simple</p>
        </div>

        {/* Customer login card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm mb-4">

          {/* Tab switcher */}
          <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
            {['login', 'register'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === tab
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab === 'login' ? 'Sign in' : 'Register'}
              </button>
            ))}
          </div>

          {/* Active form */}
          {activeTab === 'login'
            ? <LoginForm onSwitch={() => setActiveTab('register')} />
            : <RegisterForm onSwitch={() => setActiveTab('login')} />
          }
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-medium">FOR BUSINESS</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Restaurant staff card */}
        <Link
          to="/admin/login"
          className="block bg-white rounded-2xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-4">
            {/* Icon */}
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-800 transition-colors">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                focusable="false"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900">
                Restaurant dashboard
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage orders and track deliveries
              </p>
            </div>

            {/* Arrow */}
            <svg
              className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              focusable="false"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </Link>

      </div>
    </div>
  );
};

export default LoginPage;
