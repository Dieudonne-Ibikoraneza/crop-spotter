import { Navigate, useLocation } from "react-router-dom";
import { authService } from "@/lib/api/services/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole?: string;
}

/**
 * ProtectedRoute - Ensures a user is authenticated and has the required role
 * before rendering the protected content.
 */
export const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const { isAuthenticated, user } = authService.getAuthStatus();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to login but save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    // Redirect to a default page if the user doesn't have the required role
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
