// src/pages/MenuPage.jsx
//
// Displays the menu for a single restaurant.
// Full implementation in Sprint 3 — items, Add to Cart, CartDrawer.
// Placeholder shown for now so routing works end-to-end.

import { useParams } from 'react-router-dom';
import Navbar from '../components/ui/Navbar';

const MenuPage = () => {
  // id is the MongoDB ObjectId string from /restaurants/:id
  const { id } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <p className="text-lg font-medium text-gray-600">Restaurant menu</p>
        <p className="text-sm text-gray-400 mt-1">ID: {id}</p>
        <p className="text-sm text-gray-400 mt-1">Full implementation in Sprint 3</p>
      </div>
    </div>
  );
};

export default MenuPage;
