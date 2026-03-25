// src/components/admin/StatusBadge.jsx
//
// Colour-coded status pill for order status display.
// Used in OrderCard and the dashboard order list.
//
// Each status has a distinct colour so restaurant staff can
// scan the queue at a glance without reading the text.

import PropTypes from 'prop-types';

// Status → Tailwind colour class mapping
const STATUS_STYLES = {
  placed:    'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  preparing: 'bg-orange-50 text-orange-700 border-orange-200',
  ready:     'bg-green-50 text-green-700 border-green-200',
  delivered: 'bg-gray-100 text-gray-600 border-gray-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const STATUS_LABELS = {
  placed:    'Order placed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready:     'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const StatusBadge = ({ status, size = 'md' }) => {
  const styles = STATUS_STYLES[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label  = STATUS_LABELS[status]  || status;

  const sizeClasses = size === 'lg'
    ? 'text-sm font-semibold px-3 py-1'
    : 'text-xs font-medium px-2 py-0.5';

  return (
    <span className={`inline-flex items-center rounded-full border ${styles} ${sizeClasses}`}>
      {label}
    </span>
  );
};

StatusBadge.propTypes = {
  status: PropTypes.oneOf([
    'placed', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled',
  ]).isRequired,
  size: PropTypes.oneOf(['md', 'lg']),
};

export default StatusBadge;
