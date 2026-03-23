// src/pages/OrderPage.jsx
//
// Live order tracking — shows order status with a step indicator.
// Full implementation in Sprint 3.
// Polls GET /orders/:id every 10 seconds via useInterval hook
// to update the status stepper in real time.

import Navbar from '../components/ui/Navbar';

const OrderPage = () => (
  <div className="min-h-screen bg-gray-50">
    <Navbar />
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <p className="text-lg font-medium text-gray-600">Order tracking</p>
      <p className="text-sm text-gray-400 mt-1">Full implementation in Sprint 3</p>
    </div>
  </div>
);

export default OrderPage;
