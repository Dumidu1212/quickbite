// src/components/menu/RestaurantCard.jsx
//
// Displays a single restaurant as a clickable card in the restaurant grid.
//
// RESPONSIBILITIES:
//   - Render name, cuisine badge, rating, open/closed status, delivery time
//   - Show restaurant image with a graceful fallback icon on load error
//   - Navigate to /restaurants/:id on click via React Router Link
//
// DATA SOURCE:
//   Receives a restaurant object from RestaurantsPage.
//   Data comes from GET /restaurants on the Menu service via MongoDB.
//
// IMAGE HANDLING:
//   imageUrl is optional in the data model — not every restaurant has one.
//   If the URL is missing or the image fails to load, a food icon SVG shows instead.
//   onError hides the broken image element so the fallback div shows through.

import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';

const RestaurantCard = ({ restaurant }) => {
  const {
    id,
    name,
    cuisine,
    address,
    rating,
    isOpen,
    deliveryTime,
    imageUrl,
  } = restaurant;

  return (
    <Link to={`/restaurants/${id}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-200">

        {/* Restaurant image */}
        <div className="h-36 bg-gray-100 overflow-hidden relative">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={`${name} restaurant`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={(e) => {
                // Hide broken image — the fallback div behind it will show
                e.target.style.display = 'none';
              }}
            />
          ) : (
            // Fallback shown when no imageUrl is stored in the database
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 5h12l-2-5" />
              </svg>
            </div>
          )}
        </div>

        {/* Card content */}
        <div className="p-4">

          {/* Name and open/closed badge */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-1">
              {name}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
              isOpen
                ? 'bg-green-50 text-green-700'
                : 'bg-red-50 text-red-600'
            }`}>
              {isOpen ? 'Open' : 'Closed'}
            </span>
          </div>

          {/* Address — truncated to one line */}
          <p className="text-xs text-gray-400 mb-3 truncate">{address}</p>

          {/* Badges row — cuisine, rating, delivery time */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
              {cuisine}
            </span>

            {/* Number() ensures rating.toFixed() works even if rating comes as a string */}
            <span className="text-xs text-amber-500 font-medium">
              ★ {Number(rating).toFixed(1)}
            </span>

            {/* deliveryTime is optional in the data model */}
            {deliveryTime && (
              <span className="text-xs text-gray-400">{deliveryTime}</span>
            )}
          </div>

        </div>
      </div>
    </Link>
  );
};

// PropTypes.shape validates all nested fields of the restaurant object
RestaurantCard.propTypes = {
  restaurant: PropTypes.shape({
    id:           PropTypes.string.isRequired,
    name:         PropTypes.string.isRequired,
    cuisine:      PropTypes.string.isRequired,
    address:      PropTypes.string.isRequired,
    rating:       PropTypes.number.isRequired,
    isOpen:       PropTypes.bool.isRequired,
    deliveryTime: PropTypes.string,   // optional
    imageUrl:     PropTypes.string,   // optional
  }).isRequired,
};

export default RestaurantCard;
