// src/components/auth/ProtectedRoute.jsx
//
// Route guard — redirects unauthenticated users to /login.
//
// HOW IT WORKS:
//   Wrap any <Route> element with <ProtectedRoute>.
//   If isAuthenticated is false, renders <Navigate to="/login"> instead.
//   The replace prop replaces the history entry so the back button
//   does not return the user to the protected page after logout.
//
// USAGE:
//   <Route path="/restaurants" element={<ProtectedRoute><RestaurantsPage /></ProtectedRoute>} />

import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import useAuth from '../../hooks/useAuth';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // replace prevents the protected URL from appearing in browser history
    return <Navigate to="/login" replace />;
  }

  return children;
};

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ProtectedRoute;
