import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Protects routes using both role-based access control and approval status.
 * This prevents vendors or admins from accessing dashboards before approval.
 */
export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, status, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect unauthenticated users back to login.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Block users whose role is not allowed for the route.
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Only approved admins may access admin pages.
  if (role === "admin" && status !== "approved") {
    return <Navigate to="/unauthorized" replace />;
  }

  // Only approved vendors may access the vendor dashboard.
  if (role === "vendor" && status !== "approved") {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}