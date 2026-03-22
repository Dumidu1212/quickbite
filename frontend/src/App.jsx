// src/App.jsx
//
// Root application component.
// Defines all routes and wraps the app with context providers.
//
// PROVIDER ORDER MATTERS:
//   AuthProvider wraps CartProvider because CartProvider might need
//   to clear the cart on logout in future sprints.
//   React Router wraps everything because hooks like useNavigate
//   require being inside a Router.

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import RestaurantsPage from './pages/RestaurantsPage';
import MenuPage from './pages/MenuPage';
import CheckoutPage from './pages/CheckoutPage';
import OrderPage from './pages/OrderPage';

const App = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          {/* Toaster renders toast notifications — positioned top-right */}
          <Toaster position="top-right" />

          <Routes>
            {/* Public routes — accessible without login */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes — redirect to /login if not authenticated */}
            <Route
              path="/restaurants"
              element={
                <ProtectedRoute>
                  <RestaurantsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/restaurants/:id"
              element={
                <ProtectedRoute>
                  <MenuPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute>
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders/:id"
              element={
                <ProtectedRoute>
                  <OrderPage />
                </ProtectedRoute>
              }
            />

            {/* Default: redirect root to /restaurants */}
            <Route path="/" element={<Navigate to="/restaurants" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
