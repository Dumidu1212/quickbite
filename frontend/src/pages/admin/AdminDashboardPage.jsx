// src/pages/admin/AdminDashboardPage.jsx
//
// Restaurant dashboard — live order queue for staff.
//
// RESPONSIBILITIES:
//   - Fetch all active orders (placed, confirmed, preparing, ready) on mount
//   - Auto-refresh every 15 seconds to show new incoming orders
//   - Organise orders into columns by status (Kanban-style)
//   - Allow staff to advance order status with one click
//   - Show order history (delivered, cancelled) in a collapsible section
//
// POLLING:
//   We use setInterval polling (same pattern as OrderPage) rather than
//   WebSockets. 15 seconds is fast enough for a restaurant context —
//   a new order appearing within 15 seconds of being placed is acceptable.
//
// OPTIMISTIC UPDATES:
//   When staff click an action button, the order card updates immediately
//   in the UI (via onStatusUpdated callback) without waiting for the next
//   poll. This gives instant visual feedback.
//
// DATA FLOW:
//   useEffect (mount + interval) → getAllOrders() → Order service
//   → setOrders() → filtered into active/history columns → rendered

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import useAdminAuth from '../../hooks/useAdminAuth';
import OrderCard from '../../components/admin/OrderCard';
import { getAllOrders } from '../../api/admin.api';

// Active statuses shown in the main queue
const ACTIVE_STATUSES  = new Set(['placed', 'confirmed', 'preparing', 'ready']);
// Terminal statuses shown in the history section
const HISTORY_STATUSES = new Set(['delivered', 'cancelled']);

// Poll interval — 15 seconds
const POLL_INTERVAL_MS = 15_000;

// ── Column definitions ─────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'placed',    title: 'New orders',  color: 'border-blue-400',   dot: 'bg-blue-400' },
  { key: 'confirmed', title: 'Confirmed',   color: 'border-yellow-400', dot: 'bg-yellow-400' },
  { key: 'preparing', title: 'Preparing',   color: 'border-orange-400', dot: 'bg-orange-400' },
  { key: 'ready',     title: 'Ready',       color: 'border-green-400',  dot: 'bg-green-400' },
];

// ── Empty column state ─────────────────────────────────────────────────────

const EmptyColumn = ({ title }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
      <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" focusable="false">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
      </svg>
    </div>
    <p className="text-xs text-gray-400">No {title.toLowerCase()}</p>
  </div>
);

import PropTypes from 'prop-types';

EmptyColumn.propTypes = {
  title: PropTypes.string.isRequired,
};

// ── Page ───────────────────────────────────────────────────────────────────

const AdminDashboardPage = () => {
  const { adminKey, logout, isAuthenticated } = useAdminAuth();
  const navigate = useNavigate();

  const [orders, setOrders]               = useState([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [showHistory, setShowHistory]     = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);

  // ── Data fetching ──────────────────────────────────────────────────────
  // ALL hooks must be declared before any conditional return.
  // Rules of Hooks: hooks must be called in the same order on every render.

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getAllOrders(adminKey);
      setOrders(data.orders || []);
      setError(null);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error('[AdminDashboard] Failed to fetch orders:', err);
      if (err.response?.status === 403) {
        toast.error('Admin key rejected. Please log in again.');
        logout();
        navigate('/admin/login');
        return;
      }
      setError('Failed to load orders. Retrying...');
    } finally {
      setLoading(false);
    }
  }, [adminKey, logout, navigate]);

  useEffect(() => {
    // Skip fetching if not authenticated — redirect happens below
    if (!isAuthenticated) return;
    fetchOrders();
    const intervalId = setInterval(fetchOrders, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [fetchOrders, isAuthenticated]);

  const handleStatusUpdated = useCallback((orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o)
    );
  }, []);

  // ── Conditional redirect — AFTER all hooks ─────────────────────────────
  if (!isAuthenticated) {
    navigate('/admin/login', { replace: true });
    return null;
  }

  // ── Derived data ───────────────────────────────────────────────────────

  const activeOrders  = orders.filter((o) => ACTIVE_STATUSES.has(o.status));
  const historyOrders = orders.filter((o) => HISTORY_STATUSES.has(o.status));

  const ordersByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = activeOrders.filter((o) => o.status === col.key);
    return acc;
  }, {});

  const totalActive = activeOrders.length;

  const refreshedLabel = lastRefreshed
    ? `Updated ${lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
    : 'Loading...';

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">QuickBite</span>
            <span className="text-gray-500 text-sm">Restaurant Dashboard</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              {refreshedLabel}
            </div>

            {totalActive > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalActive} active
              </span>
            )}

            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/admin/login');
              }}
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-screen-xl mx-auto px-4 py-6">

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 flex items-center justify-between">
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={fetchOrders}
              className="text-xs text-red-500 hover:text-red-700 font-medium underline"
            >
              Retry now
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {COLUMNS.map((col) => (
              <div key={col.key} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="h-4 bg-gray-200 rounded w-24 mb-4 animate-pulse" />
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Kanban columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {COLUMNS.map((col) => {
                const colOrders = ordersByStatus[col.key] || [];
                return (
                  <div key={col.key} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className={`flex items-center justify-between px-4 py-3 border-b-2 ${col.color}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                        <span className="text-sm font-semibold text-gray-900">
                          {col.title}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {colOrders.length}
                      </span>
                    </div>

                    <div className="p-3 space-y-3 min-h-48">
                      {colOrders.length === 0 ? (
                        <EmptyColumn title={col.title} />
                      ) : (
                        colOrders.map((order) => (
                          <OrderCard
                            key={order.id}
                            order={order}
                            onStatusUpdated={handleStatusUpdated}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order history */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowHistory((prev) => !prev)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Order history</span>
                  <span className="text-xs text-gray-400">({historyOrders.length} orders)</span>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  focusable="false"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showHistory && (
                <div className="border-t border-gray-100 p-4">
                  {historyOrders.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-6">
                      No completed or cancelled orders yet
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                      {historyOrders.map((order) => (
                        <OrderCard
                          key={order.id}
                          order={order}
                          onStatusUpdated={handleStatusUpdated}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboardPage;
