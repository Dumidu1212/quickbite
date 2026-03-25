// src/components/admin/OrderCard.jsx
//
// Displays a single order in the restaurant dashboard queue.
//
// RESPONSIBILITIES:
//   - Show order reference, restaurant name, items, total, time placed
//   - Show current status with colour-coded badge
//   - Provide one-click action buttons to advance the order status
//   - Show a cancel button for active orders
//
// STATUS TRANSITION BUTTONS:
//   placed    → [Confirm order]
//   confirmed → [Start preparing]
//   preparing → [Mark ready]
//   ready     → [Mark delivered]
//   delivered → no action (terminal)
//   cancelled → no action (terminal)
//
// OPTIMISTIC UI:
//   The button shows a spinner immediately on click while the API call
//   is in flight. If the call fails, the spinner stops and an error
//   toast is shown — the status does not change.

import { useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import StatusBadge from './StatusBadge';
import { updateOrderStatus } from '../../api/admin.api';
import useAdminAuth from '../../hooks/useAdminAuth';

// Status flow — what each status transitions to next
const NEXT_STATUS = {
  placed:    { status: 'confirmed', label: 'Confirm order' },
  confirmed: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'ready',     label: 'Mark ready' },
  ready:     { status: 'delivered', label: 'Mark delivered' },
};

// Terminal statuses — no further action possible
const TERMINAL_STATUSES = new Set(['delivered', 'cancelled']);

const OrderCard = ({ order, onStatusUpdated }) => {
  const { adminKey } = useAdminAuth();
  const [updating, setUpdating] = useState(false);

  // Format time as HH:MM from ISO string
  const orderTime = new Date(order.createdAt).toLocaleTimeString('en-GB', {
    hour:   '2-digit',
    minute: '2-digit',
  });

  // Short order reference — last 8 chars of MongoDB ID
  const orderRef = order.id?.slice(-8)?.toUpperCase();

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatus(adminKey, order.id, newStatus);
      // Notify parent to refresh the order list
      onStatusUpdated(order.id, newStatus);
      toast.success(`Order #${orderRef} — ${newStatus}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update status';
      toast.error(msg);
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => handleStatusUpdate('cancelled');

  const nextAction = NEXT_STATUS[order.status];
  const isTerminal = TERMINAL_STATUSES.has(order.status);

  return (
    <div className={`bg-white rounded-2xl border overflow-hidden transition-all duration-300 ${
      order.status === 'placed'
        ? 'border-blue-200 shadow-sm shadow-blue-50'
        : 'border-gray-100'
    }`}>
      {/* Card header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-gray-900 font-mono">
            #{orderRef}
          </span>
          <StatusBadge status={order.status} />
        </div>
        <span className="text-xs text-gray-400">{orderTime}</span>
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        {/* Restaurant name */}
        <p className="text-sm font-semibold text-gray-900 mb-3">
          {order.restaurantName}
        </p>

        {/* Items list */}
        <div className="space-y-1 mb-4">
          {order.items?.map((item, idx) => (
            <div
              key={`${item.itemId}-${idx}`}
              className="flex justify-between text-sm"
            >
              <span className="text-gray-600">
                <span className="font-medium text-gray-900">{item.quantity}×</span>
                {' '}{item.name}
              </span>
              <span className="text-gray-500">
                £{(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        {/* Total and delivery info */}
        <div className="flex items-center justify-between py-2 border-t border-gray-100 mb-4">
          <div className="text-xs text-gray-400">
            {order.deliveryAddress?.city} · {order.deliveryAddress?.phone}
          </div>
          <span className="text-sm font-bold text-gray-900">
            £{order.totalPrice?.toFixed(2)}
          </span>
        </div>

        {/* Action buttons — only shown for non-terminal orders */}
        {!isTerminal && (
          <div className="flex gap-2">
            {/* Primary action — advance to next status */}
            {nextAction && (
              <button
                type="button"
                onClick={() => handleStatusUpdate(nextAction.status)}
                disabled={updating}
                className="flex-1 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {updating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  nextAction.label
                )}
              </button>
            )}

            {/* Cancel button — available on all non-terminal orders */}
            <button
              type="button"
              onClick={handleCancel}
              disabled={updating}
              aria-label={`Cancel order #${orderRef}`}
              className="px-3 py-2.5 border border-red-200 text-red-500 text-sm font-medium rounded-xl hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

OrderCard.propTypes = {
  order: PropTypes.shape({
    id:             PropTypes.string.isRequired,
    status:         PropTypes.string.isRequired,
    restaurantName: PropTypes.string.isRequired,
    createdAt:      PropTypes.string.isRequired,
    totalPrice:     PropTypes.number.isRequired,
    items: PropTypes.arrayOf(PropTypes.shape({
      itemId:   PropTypes.string.isRequired,
      name:     PropTypes.string.isRequired,
      price:    PropTypes.number.isRequired,
      quantity: PropTypes.number.isRequired,
    })).isRequired,
    deliveryAddress: PropTypes.shape({
      street: PropTypes.string.isRequired,
      city:   PropTypes.string.isRequired,
      phone:  PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  // Called after a successful status update so the parent can refresh
  onStatusUpdated: PropTypes.func.isRequired,
};

export default OrderCard;
