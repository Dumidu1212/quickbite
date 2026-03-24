// src/components/cart/CartDrawer.jsx
//
// Slide-in cart drawer — shown when the user clicks the cart icon.
//
// RESPONSIBILITIES:
//   - Display all items currently in the cart
//   - Allow quantity adjustment and item removal
//   - Show subtotal
//   - Provide a button to proceed to checkout
//
// INTERACTION PATTERN:
//   Parent component controls open/close state.
//   CartDrawer receives isOpen and onClose as props.
//   The backdrop overlay closes the drawer when clicked.
//
// ACCESSIBILITY:
//   The drawer panel uses <section> with aria-label rather than div role="dialog"
//   because it is a non-blocking slide-in panel, not a true modal dialog (S6819).
//   A blocking modal dialog (like the logout confirmation) uses <dialog> with
//   showModal(). A slide-in panel that does not trap focus is semantically
//   a complementary section, not a dialog.
//
// ANIMATION:
//   The drawer slides in from the right using CSS transform transitions.
//   The backdrop fades in behind it using Tailwind transition utilities.

import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import useCart from '../../hooks/useCart';

// ── Individual cart item row ───────────────────────────────────────────────
//
// Handles its own quantity changes and removal by calling CartContext actions.
// Decrementing to 0 removes the item entirely instead of showing quantity 0.

const CartItem = ({ item }) => {
  const { removeItem, updateQuantity } = useCart();

  // Decrement: if quantity is 1, remove the item entirely
  const handleDecrement = () => {
    if (item.quantity === 1) {
      removeItem(item.itemId);
    } else {
      updateQuantity(item.itemId, item.quantity - 1);
    }
  };

  const handleIncrement = () => {
    updateQuantity(item.itemId, item.quantity + 1);
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      {/* Item name and unit price */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          £{item.price.toFixed(2)} each
        </p>
      </div>

      {/* Quantity controls — × removes when at 1, − decrements otherwise */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          aria-label={
            item.quantity === 1
              ? `Remove ${item.name}`
              : `Decrease ${item.name} quantity`
          }
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          {item.quantity === 1 ? '×' : '−'}
        </button>

        <span className="w-5 text-center text-sm font-medium text-gray-900">
          {item.quantity}
        </span>

        <button
          type="button"
          onClick={handleIncrement}
          aria-label={`Increase ${item.name} quantity`}
          className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors text-sm font-medium"
        >
          +
        </button>
      </div>

      {/* Line total — price × quantity */}
      <p className="text-sm font-semibold text-gray-900 w-14 text-right">
        £{(item.price * item.quantity).toFixed(2)}
      </p>
    </div>
  );
};

CartItem.propTypes = {
  item: PropTypes.shape({
    itemId:   PropTypes.string.isRequired,
    name:     PropTypes.string.isRequired,
    price:    PropTypes.number.isRequired,
    quantity: PropTypes.number.isRequired,
  }).isRequired,
};

// ── Cart drawer ────────────────────────────────────────────────────────────

const CartDrawer = ({ isOpen, onClose }) => {
  const { items, totalItems, totalPrice, clearCart } = useCart();
  const navigate = useNavigate();

  // Close the drawer then navigate — order matters to avoid flash of empty cart
  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  // S7735 fix: use positive condition for plural suffix
  // "1 item" vs "2 items" — check equality, not inequality
  const itemCountLabel = `(${totalItems} item${totalItems === 1 ? '' : 's'})`;

  return (
    <>
      {/* Backdrop overlay — only rendered when drawer is open.
          Clicking it closes the drawer. aria-hidden so screen readers
          do not announce the decorative overlay. */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel — slides in from the right.
          S6819 fix: use <section> with aria-label instead of div role="dialog".
          This is a non-blocking panel — it does not trap focus or prevent
          interaction with the rest of the page, so <dialog> is semantically
          incorrect here. <section> with a descriptive aria-label is correct. */}
      <section
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Shopping cart"
      >
        {/* Header — title and close button */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Your cart
            {/* Item count — only shown when cart has items */}
            {totalItems > 0 && (
              <span className="ml-2 text-xs font-medium text-gray-500">
                {itemCountLabel}
              </span>
            )}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close cart"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content — empty state or items list */}
        {items.length === 0 ? (
          // Empty state — instructional message
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              Your cart is empty
            </p>
            <p className="text-xs text-gray-400">
              Add items from a restaurant menu to get started
            </p>
          </div>
        ) : (
          // Scrollable items list — fills available space between header and footer
          <div className="flex-1 overflow-y-auto px-5 py-2">
            {items.map((item) => (
              <CartItem key={item.itemId} item={item} />
            ))}
          </div>
        )}

        {/* Footer — subtotal, checkout, and clear cart.
            Only rendered when cart has items. */}
        {items.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 space-y-3">
            {/* Subtotal row */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Subtotal</span>
              <span className="text-base font-bold text-gray-900">
                £{totalPrice.toFixed(2)}
              </span>
            </div>

            {/* Proceed to checkout */}
            <button
              type="button"
              onClick={handleCheckout}
              className="w-full bg-gray-900 text-white py-3 rounded-xl text-sm font-semibold hover:bg-gray-800 transition-colors"
            >
              Proceed to checkout
            </button>

            {/* Clear entire cart */}
            <button
              type="button"
              onClick={clearCart}
              className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
            >
              Clear cart
            </button>
          </div>
        )}
      </section>
    </>
  );
};

CartDrawer.propTypes = {
  isOpen:  PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default CartDrawer;
