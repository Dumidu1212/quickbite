// src/components/ui/Navbar.jsx
//
// Top navigation bar — visible on all protected pages.
//
// DISPLAYS:
//   - QuickBite brand link
//   - Cart icon with item count badge
//   - Profile avatar linking to /profile
//   - Sign out button with confirmation modal
//
// MODAL RENDERING:
//   The logout confirmation uses Modal (which uses createPortal) so it
//   renders into document.body, escaping the sticky navbar's stacking
//   context. This prevents the modal from appearing behind page elements.

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuth from '../../hooks/useAuth';
import useCart from '../../hooks/useCart';
import Modal from './Modal';
import {
  loadProfileImage,
  generateInitialsAvatar,
} from '../../utils/profileImage';

// ── Logout confirmation modal content ─────────────────────────────────────

const LogoutModalContent = ({ onConfirm, onCancel }) => (
  <div className="p-6">
    {/* Warning icon */}
    <div className="flex justify-center mb-4">
      <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
        <svg
          className="w-6 h-6 text-red-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          focusable="false"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </div>
    </div>

    <h2 className="text-base font-semibold text-gray-900 text-center mb-1">
      Sign out of QuickBite?
    </h2>
    <p className="text-sm text-gray-500 text-center mb-6">
      You will need to sign in again to place orders.
    </p>

    <div className="flex gap-3">
      <button
        onClick={onCancel}
        className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        className="flex-1 py-2.5 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
      >
        Sign out
      </button>
    </div>
  </div>
);

LogoutModalContent.propTypes = {
  onConfirm: PropTypes.func.isRequired,
  onCancel:  PropTypes.func.isRequired,
};

// ── Navbar ─────────────────────────────────────────────────────────────────

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  // Controls the logout confirmation modal
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Profile avatar — load from sessionStorage or generate initials SVG
  const profileImage = user
    ? loadProfileImage(user.id) || generateInitialsAvatar(user.name, user.id)
    : null;

  // Open modal — does NOT log out yet
  const handleSignOutClick = () => setShowLogoutModal(true);

  // User confirmed — proceed with logout and navigate to login
  const handleConfirmLogout = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login');
  };

  // User cancelled — close modal, stay logged in
  const handleCancelLogout = () => setShowLogoutModal(false);

  // Singular/plural for cart aria-label
  const cartLabel = `Cart — ${totalItems} item${totalItems === 1 ? '' : 's'}`;

  return (
    <>
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">

          {/* Brand */}
          <Link
            to="/restaurants"
            className="text-xl font-semibold text-gray-900 hover:text-gray-700 transition-colors"
          >
            QuickBite
          </Link>

          {/* Right side — only shown when authenticated */}
          {isAuthenticated && (
            <div className="flex items-center gap-3">

              {/* Cart icon with item count badge */}
              <Link
                to="/checkout"
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label={cartLabel}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  focusable="false"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>

                {/* Badge — only shown when cart has items */}
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-medium w-5 h-5 rounded-full flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Link>

              {/* Profile avatar — links to /profile page */}
              <Link
                to="/profile"
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                aria-label="View your profile"
              >
                <div className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-gray-200">
                  <img
                    src={profileImage}
                    alt={`${user?.name}'s avatar`}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Name — hidden on small screens to save space */}
                <span className="text-sm text-gray-700 font-medium hidden sm:block">
                  {user?.name}
                </span>
              </Link>

              {/* Sign out — opens confirmation modal */}
              <button
                onClick={handleSignOutClick}
                className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
                aria-label="Sign out"
              >
                Sign out
              </button>

            </div>
          )}
        </div>
      </nav>

      {/* Modal rendered via createPortal into document.body —
          escapes the sticky navbar's stacking context */}
      <Modal
        open={showLogoutModal}
        onClose={handleCancelLogout}
        title="Sign out confirmation"
      >
        <LogoutModalContent
          onConfirm={handleConfirmLogout}
          onCancel={handleCancelLogout}
        />
      </Modal>
    </>
  );
};

export default Navbar;
