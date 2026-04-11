import { Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import StudentHome from "./pages/StudentHome";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/unauthorized";
import ProtectedRoute from "./components/protectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route
        path="/home"
        element={
          <ProtectedRoute allowedRoles={["student"]}>
            <StudentHome />
          </ProtectedRoute>
        }
      />

      <Route
        path="/vendor/dashboard"
        element={
          <ProtectedRoute allowedRoles={["vendor", "admin"]}>
            <VendorDashboard />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Login />} />
    </Routes>
  );
}