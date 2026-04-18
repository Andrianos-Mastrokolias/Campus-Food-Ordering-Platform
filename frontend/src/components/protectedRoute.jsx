import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, status, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Approved admins only
  if (role === "admin" && status !== "approved") {
    return <Navigate to="/unauthorized" replace />;
  }

  // Approved vendors only
  if (role === "vendor" && status !== "approved") {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}