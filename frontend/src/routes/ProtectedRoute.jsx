import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function homeForRole(role) {
  return role === "SUPER_ADMIN" ? "/overview" : "/dashboard";
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return children;
}
