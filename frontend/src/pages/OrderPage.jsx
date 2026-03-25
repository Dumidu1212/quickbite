// src/pages/OrderPage.jsx
//
// Live order tracking page — polls for status updates every 10 seconds.
//
// RESPONSIBILITIES:
//   - Fetch the order details immediately on mount
//   - Poll GET /orders/:id every 10 seconds for status updates
//   - Display a visual step indicator showing the order progress
//   - Stop polling once the order reaches a terminal state (delivered/cancelled)
//
// POLLING STRATEGY:
//   useEffect with a setInterval that polls every 10 seconds.
//   The interval is cleared:
//     1. When the component unmounts (cleanup function)
//     2. When the order reaches a terminal status (no point polling further)
//   This prevents memory leaks and unnecessary network calls.
//
// STATUS STEPS:
//   placed → confirmed → preparing → ready → delivered
//   'cancelled' is a terminal state shown separately.

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import Navbar from "../components/ui/Navbar";
import { getOrder } from "../api/orders.api";
import BackButton from "../components/ui/BackButton";

// ── Status step definitions ────────────────────────────────────────────────

const ORDER_STEPS = [
  {
    key: "placed",
    label: "Order placed",
    description: "Your order has been received",
  },
  {
    key: "confirmed",
    label: "Confirmed",
    description: "The restaurant has confirmed your order",
  },
  {
    key: "preparing",
    label: "Preparing",
    description: "Your food is being prepared",
  },
  {
    key: "ready",
    label: "Ready",
    description: "Your order is ready for pickup",
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Your order has been delivered. Enjoy!",
  },
];

const TERMINAL_STATUSES = new Set(["delivered", "cancelled"]);
const POLL_INTERVAL_MS = 10_000;

// ── Step indicator component ───────────────────────────────────────────────

const StatusStepper = ({ currentStatus }) => {
  const currentIndex = ORDER_STEPS.findIndex((s) => s.key === currentStatus);

  return (
    <div className="space-y-3">
      {ORDER_STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        // S1481/S1854 fix: isFuture was calculated but never used in JSX.
        // The styling now uses two explicit booleans — isCompleted and isCurrent.
        // Anything that is neither completed nor current is implicitly future.

        // S3358 fix: extract nested ternaries into named variables
        const circleClasses = isCompleted
          ? "bg-green-500 text-white"
          : isCurrent
            ? "bg-gray-900 text-white ring-4 ring-gray-200"
            : "bg-gray-100 text-gray-400";

        const labelClasses = isCompleted
          ? "text-green-700"
          : isCurrent
            ? "text-gray-900"
            : "text-gray-400";

        const connectorClasses = isCompleted ? "bg-green-400" : "bg-gray-200";

        return (
          <div key={step.key} className="flex items-start gap-4">
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${circleClasses}`}
              >
                {isCompleted ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    focusable="false"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {index < ORDER_STEPS.length - 1 && (
                <div
                  className={`w-0.5 h-6 mt-1 transition-colors duration-500 ${connectorClasses}`}
                />
              )}
            </div>

            <div className="pb-4">
              <p
                className={`text-sm font-semibold transition-colors duration-300 ${labelClasses}`}
              >
                {step.label}
              </p>
              {isCurrent && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

StatusStepper.propTypes = {
  currentStatus: PropTypes.string.isRequired,
};

// ── Page ───────────────────────────────────────────────────────────────────

const OrderPage = () => {
  const { id: orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Fetch order ────────────────────────────────────────────────────────

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrder(orderId);
      setOrder(data.order);
      setError(null);
    } catch (err) {
      console.error("[OrderPage] Failed to fetch order:", err);
      if (err.response?.status === 404) {
        setError("Order not found.");
      } else {
        setError("Could not load order details.");
      }
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  // ── Initial fetch + polling ────────────────────────────────────────────

  useEffect(() => {
    fetchOrder();

    // Start polling every 10 seconds
    const intervalId = setInterval(() => {
      // Stop polling if order has reached a terminal status
      if (order && TERMINAL_STATUSES.has(order.status)) {
        clearInterval(intervalId);
        return;
      }
      fetchOrder();
    }, POLL_INTERVAL_MS);

    // Cleanup: clear interval on component unmount or orderId change
    return () => clearInterval(intervalId);
  }, [fetchOrder, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse" />
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex-shrink-0" />
                <div className="h-4 bg-gray-200 rounded w-32 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => navigate("/restaurants")}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            Back to restaurants
          </button>
        </div>
      </div>
    );
  }

  const isCancelled = order?.status === "cancelled";
  const orderRef = order?.id?.slice(-8)?.toUpperCase();

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-4">
          <BackButton fallback="/restaurants" label="Back" />
        </div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              Order #{orderRef}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {order?.restaurantName}
            </p>
          </div>
          {/* Polling indicator — small animated dot when not terminal */}
          {!TERMINAL_STATUSES.has(order?.status) && (
            <div className="flex items-center gap-1.5 text-xs text-gray-400">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Live updates
            </div>
          )}
        </div>

        {isCancelled ? (
          /* Cancelled order */
          <div className="bg-red-50 rounded-2xl border border-red-200 p-6 text-center mb-4">
            <p className="text-base font-semibold text-red-700 mb-1">
              Order cancelled
            </p>
            <p className="text-sm text-red-500">
              This order has been cancelled.
            </p>
          </div>
        ) : (
          /* Status stepper */
          <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-4">
            <StatusStepper currentStatus={order?.status || "placed"} />
          </div>
        )}

        {/* Order details */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Items ordered
          </h2>
          <div className="space-y-2">
            {order?.items?.map((item) => (
              <div key={item.itemId} className="flex justify-between text-sm">
                <span className="text-gray-700">
                  {item.name}
                  <span className="text-gray-400 ml-1">× {item.quantity}</span>
                </span>
                <span className="font-medium text-gray-900">
                  £{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex justify-between pt-3 mt-3 border-t border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Total</span>
            <span className="text-base font-bold text-gray-900">
              £{order?.totalPrice?.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Delivery address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Delivery address
          </h2>
          <p className="text-sm text-gray-600">
            <span>{order?.deliveryAddress?.street}</span>
            <br />
            <span>{order?.deliveryAddress?.city}</span>
            <br />
            <span>{order?.deliveryAddress?.phone}</span>
          </p>
        </div>

        {/* Back button — shown after terminal status */}
        {TERMINAL_STATUSES.has(order?.status) && (
          <button
            onClick={() => navigate("/restaurants")}
            className="w-full mt-4 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
          >
            Order again
          </button>
        )}
      </main>
    </div>
  );
};

export default OrderPage;
