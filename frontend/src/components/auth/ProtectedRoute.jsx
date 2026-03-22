// src/components/auth/ProtectedRoute.jsx
//
// Higher-order component that guards protected pages.
// Any route wrapped in <ProtectedRoute> redirects to /login
// if the user is not authenticated.

import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirect to login — replace:true prevents back-button returning to protected page
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
