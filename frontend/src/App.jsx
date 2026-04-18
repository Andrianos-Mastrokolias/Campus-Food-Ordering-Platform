import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/login";
import SelectRole from "./pages/SelectRole";
import StudentHome from "./pages/StudentHome";
import VendorDashboard from "./pages/VendorDashboard";
import Unauthorized from "./pages/unauthorized";
import ProtectedRoute from "./components/protectedRoute";
import AdminApplicationForm from "./components/AdminApplication/AdminApplicationForm";
import AdminReviewDashboard from "./components/AdminApplication/AdminReviewDashboard";
import VendorRegistrationForm from "./components/VendorRegistration/VendorRegistrationForm";
import AdminVendorReview from "./components/VendorReview/AdminVendorReview";
import Layout from "./components/Layout";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/select-role" element={<SelectRole />} />
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
            <ProtectedRoute allowedRoles={["vendor"]}>
              <VendorDashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirect the old admin dashboard route to the active admin applications page. */}
        <Route
          path="/admin/dashboard"
          element={<Navigate to="/admin/applications" replace />}
        />

        <Route
          path="/apply-admin"
          element={
            <ProtectedRoute allowedRoles={["student", "vendor"]}>
              <AdminApplicationForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/applications"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminReviewDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/register-vendor"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <VendorRegistrationForm />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/vendors"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminVendorReview />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Login />} />
      </Routes>
    </Layout>
  );
}