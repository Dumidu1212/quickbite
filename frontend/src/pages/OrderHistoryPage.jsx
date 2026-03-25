// src/pages/OrderHistoryPage.jsx
//
// Displays the authenticated user's order history.
//
// RESPONSIBILITIES:
//   - Fetch paginated order history from GET /orders/user/:userId
//   - Show each order with status badge, items, total, and date
//   - Link each order to /orders/:id for live tracking if still active
//
// DATA FLOW:
//   useEffect → getUserOrders() → Order service
//   → setOrders() → rendered as order cards

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import PropTypes from "prop-types";
import Navbar from "../components/ui/Navbar";
import BackButton from "../components/ui/BackButton";
import useAuth from "../hooks/useAuth";
import { getUserOrders } from "../api/orders.api";

// ── Status badge colours ───────────────────────────────────────────────────

const STATUS_STYLES = {
  placed: "bg-blue-50 text-blue-700",
  confirmed: "bg-yellow-50 text-yellow-700",
  preparing: "bg-orange-50 text-orange-700",
  ready: "bg-green-50 text-green-700",
  delivered: "bg-gray-100 text-gray-600",
  cancelled: "bg-red-50 text-red-600",
};

const STATUS_LABELS = {
  placed: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

// Terminal statuses — no live tracking needed
const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);

// ── Order summary card ─────────────────────────────────────────────────────

const OrderSummaryCard = ({ order }) => {
  const isActive = !TERMINAL_STATUSES.has(order.status);
  const orderRef = order.id?.slice(-8)?.toUpperCase();
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const orderTime = new Date(order.createdAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusStyle =
    STATUS_STYLES[order.status] || "bg-gray-100 text-gray-600";
  const statusLabel = STATUS_LABELS[order.status] || order.status;

  return (
    <Link
      to={`/orders/${order.id}`}
      className="block bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-sm hover:border-gray-200 transition-all group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-bold text-gray-900 font-mono">
              #{orderRef}
            </span>
            {/* Pulsing dot for active orders */}
            {isActive && (
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            )}
          </div>
          <p className="text-xs text-gray-400">
            {orderDate} at {orderTime}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle}`}
          >
            {statusLabel}
          </span>
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            focusable="false"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>

      {/* Restaurant and items */}
      <p className="text-sm font-semibold text-gray-900 mb-1">
        {order.restaurantName}
      </p>
      <p className="text-xs text-gray-500 truncate">
        {order.items
          ?.map((item) => `${item.quantity}× ${item.name}`)
          .join(", ")}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {order.items?.length} item{order.items?.length === 1 ? '' : 's'}
        </span>
        <span className="text-sm font-bold text-gray-900">
          £{order.totalPrice?.toFixed(2)}
        </span>
      </div>

      {/* Active order CTA */}
      {isActive && (
        <div className="mt-3 bg-green-50 rounded-xl px-3 py-2 text-xs font-medium text-green-700 text-center">
          Track live order
        </div>
      )}
    </Link>
  );
};

OrderSummaryCard.propTypes = {
  order: PropTypes.shape({
    id: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    restaurantName: PropTypes.string.isRequired,
    createdAt: PropTypes.string.isRequired,
    totalPrice: PropTypes.number.isRequired,
    items: PropTypes.arrayOf(
      PropTypes.shape({
        name: PropTypes.string.isRequired,
        quantity: PropTypes.number.isRequired,
      }),
    ).isRequired,
  }).isRequired,
};

// ── Page ───────────────────────────────────────────────────────────────────

const OrderHistoryPage = () => {
  const { user } = useAuth();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.id) return;

    const fetchOrders = async () => {
      try {
        const data = await getUserOrders(user.id);
        setOrders(data.orders || []);
      } catch (err) {
        console.error("[OrderHistoryPage] Fetch failed:", err);
        setError("Could not load your orders. Please try again.");
        toast.error("Could not load orders");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user?.id]);

  // Separate active and past orders
  const activeOrders = orders.filter((o) => !TERMINAL_STATUSES.has(o.status));
  const pastOrders = orders.filter((o) => TERMINAL_STATUSES.has(o.status));

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <BackButton fallback="/restaurants" label="Back" />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          Your orders
        </h1>

        {/* Loading state */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-3 bg-gray-200 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-32" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={() => globalThis.location.reload()}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Orders list */}
        {!loading && !error && (
          <>
            {/* Active orders — shown first with emphasis */}
            {activeOrders.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Active orders
                </h2>
                <div className="space-y-3">
                  {activeOrders.map((order) => (
                    <OrderSummaryCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}

            {/* Past orders */}
            {pastOrders.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Past orders
                </h2>
                <div className="space-y-3">
                  {pastOrders.map((order) => (
                    <OrderSummaryCard key={order.id} order={order} />
                  ))}
                </div>
              </section>
            )}

            {/* Empty state */}
            {orders.length === 0 && (
              <div className="text-center py-16">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-8 h-8 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    focusable="false"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1">
                  No orders yet
                </p>
                <p className="text-xs text-gray-400 mb-6">
                  Your order history will appear here
                </p>
                <Link
                  to="/restaurants"
                  className="px-6 py-2.5 bg-gray-900 text-white text-sm rounded-xl hover:bg-gray-800 transition-colors"
                >
                  Browse restaurants
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default OrderHistoryPage;
