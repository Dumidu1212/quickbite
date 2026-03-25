// src/pages/admin/AdminLoginPage.jsx
//
// Admin login page — accepts the X-Admin-Key to access the dashboard.
//
// DESIGN:
//   Visually distinct from the customer login page — uses a darker
//   header and "Restaurant Dashboard" branding so staff know they
//   are in the admin section, not the customer app.
//
// KEY VERIFICATION:
//   The entered key is verified against the Order service by making a
//   test API call in AdminAuthContext.login(). If the key returns 403
//   it is rejected. If it returns 404 (wrong order ID but valid key)
//   it is accepted. This avoids needing a dedicated /verify endpoint.
//
// SECURITY:
//   The admin key is stored in sessionStorage — cleared on tab close.
//   The key is never logged, never put in a URL, never sent in a cookie.

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAdminAuth from '../../hooks/useAdminAuth';

const AdminLoginPage = () => {
  const { login, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  const [key, setKey]         = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // Redirect immediately if already authenticated
  if (isAuthenticated) {
    navigate('/admin/dashboard', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!key.trim()) {
      setError('Please enter the admin key');
      return;
    }

    setLoading(true);
    const result = await login(key.trim());
    setLoading(false);

    if (result.success) {
      toast.success('Welcome to the restaurant dashboard');
      navigate('/admin/dashboard', { replace: true });
    } else {
      setError(result.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-800 mb-4">
            <svg
              className="w-7 h-7 text-white"
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
          <h1 className="text-xl font-semibold text-white">Restaurant Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">QuickBite — Staff access only</p>
        </div>

        {/* Login card */}
        <div className="bg-gray-800 rounded-2xl p-6 border border-gray-700">
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="admin-key-input"
                className="block text-sm font-medium text-gray-300 mb-1.5"
              >
                Admin key
              </label>
              <input
                id="admin-key-input"
                type="password"
                value={key}
                onChange={(e) => {
                  setKey(e.target.value);
                  setError('');
                }}
                placeholder="Enter your admin key"
                autoComplete="current-password"
                className={`w-full px-3 py-2.5 bg-gray-700 border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  error ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {error && (
                <p className="mt-1.5 text-xs text-red-400" role="alert">
                  {error}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-gray-900 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Access dashboard'}
            </button>
          </form>
        </div>

        {/* Back to customer app — use React Router Link, not bare <a> */}
        <p className="text-center mt-4">
          <Link
            to="/restaurants"
            className="text-xs text-gray-500 hover:text-gray-400 transition-colors"
          >
            Back to QuickBite
          </Link>
        </p>

      </div>
    </div>
  );
};

export default AdminLoginPage;
