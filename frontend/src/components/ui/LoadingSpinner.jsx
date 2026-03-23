// src/components/ui/LoadingSpinner.jsx
//
// Reusable animated loading spinner.
//
// ACCESSIBILITY:
//   Uses <output> element instead of div role="status" (SonarCloud S6819).
//   <output> is a native HTML element with an implicit status role — it is
//   recognised consistently across all browsers and assistive technologies
//   without needing an explicit role attribute.
//
// SIZES:
//   sm — 16px (w-4 h-4) — inline use inside buttons
//   md — 32px (w-8 h-8) — default, for section loading states
//   lg — 48px (w-12 h-12) — full-page loading states

import PropTypes from 'prop-types';

const LoadingSpinner = ({ size = 'md' }) => {
  // Map the size prop to Tailwind dimension classes
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    // <output> has implicit role="status" — no explicit role attribute needed
    <output className="flex justify-center items-center" aria-label="Loading">
      <div
        className={`${sizeClasses[size]} border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
      />
    </output>
  );
};

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default LoadingSpinner;
