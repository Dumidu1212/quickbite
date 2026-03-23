// src/pages/CheckoutPage.jsx
//
// Checkout form — delivery address, order review, place order button.
// Full implementation in Sprint 3 after Order service is built.
// Calls POST /orders with JWT — Order service validates and saves the order.

import Navbar from '../components/ui/Navbar';

const CheckoutPage = () => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <p className="text-lg font-medium text-gray-600">Checkout</p>
      <p className="text-sm text-gray-400 mt-1">Full implementation in Sprint 3</p>
    </div>
  </div>
);

export default CheckoutPage;
