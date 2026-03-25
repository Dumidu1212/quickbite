// src/App.jsx
//
// Root component — defines routing and wraps the app with context providers.
//
// PROVIDER ORDER:
//   AuthProvider wraps CartProvider because in future sprints the cart
//   may need to clear on logout (which requires knowing auth state).
//   BrowserRouter wraps everything because hooks like useNavigate
//   require being inside a Router.
//
// ROUTE STRUCTURE:
//   /login              — public (no auth required)
//   /restaurants        — protected
//   /restaurants/:id    — protected (MenuPage, Sprint 3)
//   /checkout           — protected (Sprint 3)
//   /orders/:id         — protected (Sprint 3)
//   /                   — redirects to /restaurants
//   * (catch-all)       — redirects to /login

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
import ProfilePage from './pages/ProfilePage';
import { AdminAuthProvider } from './context/AdminAuthContext';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import OrderHistoryPage from './pages/OrderHistoryPage';

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <CartProvider>
        {/* Toaster must be inside providers so toasts can be triggered from anywhere */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontSize: '14px' },
          }}
        />

        <Routes>
          {/* Public — accessible without authentication */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected — ProtectedRoute redirects to /login if not authenticated */}
          <Route path="/restaurants" element={
            <ProtectedRoute><RestaurantsPage /></ProtectedRoute>
          } />
          <Route path="/restaurants/:id" element={
            <ProtectedRoute><MenuPage /></ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute><CheckoutPage /></ProtectedRoute>
          } />
          <Route path="/orders/:id" element={
            <ProtectedRoute><OrderPage /></ProtectedRoute>
          } />

          <Route path="/orders/user/:userId" element={
            <ProtectedRoute><OrderHistoryPage /></ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute><ProfilePage /></ProtectedRoute>
          } />

          {/* Default redirect — root goes to restaurants */}
          <Route path="/" element={<Navigate to="/restaurants" replace />} />

          {/* Catch-all — unknown routes go to login */}
          <Route path="*" element={<Navigate to="/login" replace />} />

          <Route path="/admin/login" element={
            <AdminAuthProvider>
              <AdminLoginPage />
            </AdminAuthProvider>
          } />
          <Route path="/admin/dashboard" element={
            <AdminAuthProvider>
              <AdminDashboardPage />
            </AdminAuthProvider>
          } />
          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
        </Routes>

      </CartProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
