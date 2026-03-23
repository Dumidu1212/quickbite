// src/components/ui/LoadingSpinner.jsx
//
// Reusable animated loading spinner.
// Displayed inline wherever an async operation is in progress.
//
// Three size options:
//   sm — 16px (w-4 h-4) — for inline use inside buttons
//   md — 32px (w-8 h-8) — default, for section loading states
//   lg — 48px (w-12 h-12) — for full-page loading states

import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = 'md' }) => {
  // Map size prop to Tailwind dimension classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex justify-center items-center" role="status" aria-label="Loading">
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
      />
    </div>
  );
};

LoadingSpinner.propTypes = {
  // oneOf enforces that only the three valid sizes are accepted
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default LoadingSpinner;
