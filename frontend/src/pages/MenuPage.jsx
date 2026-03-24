// src/pages/MenuPage.jsx
//
// Displays the full menu for a single restaurant.
//
// RESPONSIBILITIES:
//   - Fetch restaurant details and menu items from the Menu service
//   - Display items grouped by category (Starters, Mains, Desserts, etc.)
//   - Allow customers to add items to their cart via CartContext
//   - Show the CartDrawer slide-in panel with cart contents
//
// DATA FLOW:
//   useEffect → getRestaurant() + getRestaurantMenu() → Menu service
//   → grouped menu items by category → rendered with Add to Cart buttons
//   → Add to Cart → CartContext.addItem() → CartDrawer shows updated cart
//
// CART VALIDATION:
//   We check if the customer is trying to order from multiple restaurants.
//   CartContext stores the restaurantId of the first item added.
//   If they try to add from a different restaurant, we warn them
//   and offer to clear the cart before adding the new item.

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Navbar from '../components/ui/Navbar';
import SkeletonCard from '../components/ui/SkeletonCard';
import CartDrawer from '../components/cart/CartDrawer';
import useCart from '../hooks/useCart';
import { getRestaurant, getRestaurantMenu } from '../api/menu.api';
import BackButton from '../components/ui/BackButton';

// ── Menu item card ─────────────────────────────────────────────────────────

import PropTypes from 'prop-types';

const MenuItemCard = ({ item, onAddToCart }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-start gap-4 hover:shadow-sm transition-shadow">
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-gray-900 mb-0.5">{item.name}</h3>
      {item.description && (
        <p className="text-xs text-gray-500 mb-2 line-clamp-2">{item.description}</p>
      )}
      <p className="text-sm font-bold text-gray-900">£{item.price.toFixed(2)}</p>
    </div>

    <button
      type="button"
      onClick={() => onAddToCart(item)}
      disabled={!item.isAvailable}
      aria-label={`Add ${item.name} to cart`}
      className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-medium leading-none"
    >
      +
    </button>
  </div>
);

MenuItemCard.propTypes = {
  item: PropTypes.shape({
    id:          PropTypes.string.isRequired,
    name:        PropTypes.string.isRequired,
    description: PropTypes.string,
    price:       PropTypes.number.isRequired,
    isAvailable: PropTypes.bool.isRequired,
  }).isRequired,
  onAddToCart: PropTypes.func.isRequired,
};

// ── Page ───────────────────────────────────────────────────────────────────

const MenuPage = () => {
  const { id: restaurantId } = useParams();
  const { addItem, totalItems, restaurantId: cartRestaurantId, clearCart } = useCart();

  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu]             = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);
  const [cartOpen, setCartOpen]     = useState(false);

  // ── Fetch restaurant and menu ──────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch restaurant info and menu in parallel
        const [restaurantData, menuData] = await Promise.all([
          getRestaurant(restaurantId),
          getRestaurantMenu(restaurantId),
        ]);
        setRestaurant(restaurantData.restaurant);
        setMenu(menuData.menu || {});
      } catch (err) {
        console.error('[MenuPage] Fetch failed:', err);
        setError('Could not load this restaurant. Please try again.');
        toast.error('Could not load menu');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [restaurantId]); // re-fetch if restaurantId changes (navigation between menus)

  // ── Add to cart handler ────────────────────────────────────────────────

  const handleAddToCart = (item) => {
    // Check if customer is trying to mix items from different restaurants
    if (cartRestaurantId && cartRestaurantId !== restaurantId && totalItems > 0) {
      // Warn and offer to clear cart
      const confirmed = globalThis.confirm(
        `Your cart contains items from a different restaurant. Clear cart and start a new order from ${restaurant?.name}?`
      );
      if (!confirmed) return;
      clearCart();
    }

    addItem({
      itemId:       item.id,
      name:         item.name,
      price:        item.price,
      restaurantId, // stored in cart to detect cross-restaurant ordering
    });

    toast.success(`${item.name} added to cart`, { duration: 1500 });
    setCartOpen(true); // open drawer so customer sees their cart update
  };

  // ── Loading state ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-7 bg-gray-200 rounded w-48 mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-32 mb-8 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['sk-1','sk-2','sk-3','sk-4'].map((k) => <SkeletonCard key={k} />)}
          </div>
        </main>
      </div>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">{error}</p>
          <button
            onClick={() => globalThis.location.reload()}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const categories = Object.keys(menu);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onCartClick={() => setCartOpen(true)} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <BackButton fallback="/restaurants" label="All restaurants" />
        </div>

        {/* Restaurant header */}
        {restaurant && (
          <div className="mb-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">{restaurant.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                    {restaurant.cuisine}
                  </span>
                  <span className="text-xs text-amber-500 font-medium">
                    ★ {Number(restaurant.rating).toFixed(1)}
                  </span>
                  {restaurant.deliveryTime && (
                    <span className="text-xs text-gray-400">{restaurant.deliveryTime}</span>
                  )}
                </div>
              </div>

              {/* Cart button — shows item count */}
              {totalItems > 0 && (
                <button
                  type="button"
                  onClick={() => setCartOpen(true)}
                  className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-gray-800 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" focusable="false">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12l-2-5"/>
                  </svg>
                  View cart ({totalItems})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Menu sections grouped by category */}
        {categories.length === 0 ? (
          <p className="text-gray-400 text-center py-12">No menu items available</p>
        ) : (
          <div className="space-y-8">
            {categories.map((category) => (
              <section key={category}>
                <h2 className="text-base font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  {category}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {menu[category].map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      onAddToCart={handleAddToCart}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

      </main>

      {/* Cart drawer */}
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </div>
  );
};

export default MenuPage;
