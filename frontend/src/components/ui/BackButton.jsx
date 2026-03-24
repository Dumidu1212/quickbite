// src/components/ui/BackButton.jsx
//
// Reusable back navigation button.
// Uses useNavigate(-1) to go to the previous browser history entry.
// Falls back to a specific fallback route if there is no history
// (e.g. user opened the page directly from a bookmark).

import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ fallback = '/restaurants', label = 'Back' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    // If there is a previous history entry, go back.
    // history.length <= 1 means the page was opened directly
    // with no previous entry — navigate to the fallback instead.
    if (globalThis.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
      aria-label={`Go back to ${label}`}
    >
      <svg
        className="w-4 h-4 transition-transform group-hover:-translate-x-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        focusable="false"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 19l-7-7 7-7"
        />
      </svg>
      {label}
    </button>
  );
};

BackButton.propTypes = {
  // Route to navigate to if there is no browser history to go back to
  fallback: PropTypes.string,
  // Accessible label and visible text
  label:    PropTypes.string,
};

export default BackButton;
