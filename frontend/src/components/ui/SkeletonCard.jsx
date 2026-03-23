// src/components/ui/SkeletonCard.jsx
//
// Animated placeholder card shown while restaurant data is loading.
//
// WHY SKELETON INSTEAD OF A SPINNER?
//   Skeleton cards match the shape of the real content (RestaurantCard).
//   This prevents layout shift — the grid does not reflow when real cards arrive.
//   The animate-pulse class provides a subtle breathing animation that signals
//   content is loading without being distracting.

const SkeletonCard = () => (
  <div className="bg-white rounded-xl border border-gray-100 overflow-hidden animate-pulse">
    {/* Placeholder for the restaurant image */}
    <div className="h-36 bg-gray-200" />

    {/* Placeholder for card body text and badges */}
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-1/2" />
      <div className="flex gap-2">
        <div className="h-5 bg-gray-200 rounded-full w-16" />
        <div className="h-5 bg-gray-200 rounded-full w-12" />
      </div>
    </div>
  </div>
);

export default SkeletonCard;
