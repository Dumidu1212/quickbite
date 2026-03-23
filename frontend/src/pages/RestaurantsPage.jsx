// src/pages/RestaurantsPage.jsx
//
// Displays all available restaurants fetched from the Menu service.
//
// RESPONSIBILITIES:
//   - Fetch the full restaurant list from GET /restaurants on mount
//   - Show skeleton placeholder cards while loading (prevents layout shift)
//   - Filter results client-side as the user types in the search bar
//   - Handle and display error states with a retry mechanism
//
// DESIGN DECISIONS:
//   Search filtering is client-side (no API call per keystroke).
//   The full restaurant list is small enough to hold in memory.
//   This gives instant feedback without network latency.
//
//   Location-based filtering is intentionally NOT implemented.
//   All restaurants are shown to all users for this prototype.
//   Geolocation would require storing coordinates, a 2dsphere MongoDB index,
//   and browser geolocation permission — out of scope for this assignment.
//
// DATA FLOW:
//   useEffect (mount) → getRestaurants() → Menu service GET /restaurants/
//   → setRestaurants() → useMemo filters by search → rendered as RestaurantCards

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import { getRestaurants } from '../api/menu.api';
import RestaurantCard from '../components/menu/RestaurantCard';
import SkeletonCard from '../components/ui/SkeletonCard';
import Navbar from '../components/ui/Navbar';

// Stable keys for the 8 skeleton placeholders.
// Using string literals instead of array indices prevents React reconciliation
// issues if the number of skeletons ever changes (S6479).
const SKELETON_KEYS = ['sk-1','sk-2','sk-3','sk-4','sk-5','sk-6','sk-7','sk-8'];

const RestaurantsPage = () => {
  // Full unfiltered list from the API — never mutated after fetch
  const [restaurants, setRestaurants] = useState([]);

  // true while API call is in flight — controls skeleton display
  const [loading, setLoading] = useState(true);

  // User-friendly error message if the fetch fails
  const [error, setError] = useState(null);

  // Controlled search bar input value
  const [search, setSearch] = useState('');

  // ── Data fetching ───────────────────────────────────────────────────────

  useEffect(() => {
    // Only fetch when loading is true — this lets handleRetry trigger a refetch
    // by calling setLoading(true) without needing a page reload
    if (!loading) return;

    const fetchRestaurants = async () => {
      try {
        const data = await getRestaurants();
        setRestaurants(data.restaurants || []);
      } catch (err) {
        console.error('[RestaurantsPage] Fetch failed:', err);
        setError('Failed to load restaurants. Please try again.');
        toast.error('Could not load restaurants');
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, [loading]); // re-runs whenever loading flips to true

  // ── Client-side filtering ───────────────────────────────────────────────

  // useMemo recalculates only when restaurants or search changes.
  // Without useMemo this would re-run on every render, including unrelated
  // state changes like the cart badge updating in Navbar.
  const filtered = useMemo(() => {
    if (!search.trim()) return restaurants;
    const q = search.toLowerCase();
    // Match against both name and cuisine so "Italian" and "Mario's" both work
    return restaurants.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q)
    );
  }, [restaurants, search]);

  // ── Derived display values ──────────────────────────────────────────────

  // Extracted to avoid a nested ternary with negated condition in JSX (S3358/S7735)
  const pluralSuffix = filtered.length === 1 ? '' : 's';
  const countLabel = loading
    ? 'Loading...'
    : `${filtered.length} restaurant${pluralSuffix} available`;

  // ── Event handlers ──────────────────────────────────────────────────────

  // Retriggers the data fetch by resetting error and loading state.
  // This calls the API again WITHOUT reloading the page, so the
  // in-memory JWT is preserved and the user stays logged in.
  const handleRetry = () => {
    setError(null);
    setLoading(true);
  };

  const handleClearSearch = () => {
    setSearch('');
  };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Header — count updates once loading completes */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">
            Available restaurants
          </h1>
          <p className="text-sm text-gray-500">{countLabel}</p>
        </div>

        {/* Search bar — filters client-side via useMemo above */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name or cuisine..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search restaurants by name or cuisine"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Error state — shown after loading fails */}
        {error && !loading && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-4">{error}</p>
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading state — skeleton cards maintain layout before data arrives */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {SKELETON_KEYS.map((key) => (
              <SkeletonCard key={key} />
            ))}
          </div>
        )}

        {/* Success state — restaurant grid */}
        {!loading && !error && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((r) => (
              // r.id is the MongoDB ObjectId string — guaranteed unique per restaurant
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}

        {/* Empty state — search has no matches OR database is empty */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg mb-2">No restaurants found</p>
            <p className="text-gray-400 text-sm">
              {search
                ? `No results for "${search}" — try a different search`
                : 'No restaurants available right now'}
            </p>
            {/* Only show Clear search when the user has typed something */}
            {search && (
              <button
                onClick={handleClearSearch}
                className="mt-4 text-sm text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        )}

      </main>
    </div>
  );
};

export default RestaurantsPage;
