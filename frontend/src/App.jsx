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
import OrderTracking from "./pages/OrderTracking";
import StudentAnalytics from "./pages/StudentAnalytics";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import VendorDetailChangeRequest from "./pages/VendorDetailChangeRequest/VendorDetailChangeRequest";
import AdminVendorChangeRequests from "./pages/AdminVendorChangeRequests/AdminVendorChangeRequests";
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
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <OrderTracking />
            </ProtectedRoute>
          }
        />

        <Route
          path="/student/analytics"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentAnalytics />
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

        <Route
          path="/vendor/analytics"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <AnalyticsDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/vendor/change-request"
          element={
            <ProtectedRoute allowedRoles={["vendor"]}>
              <VendorDetailChangeRequest />
            </ProtectedRoute>
          }
        />

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

        <Route
          path="/admin/vendor-change-requests"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminVendorChangeRequests />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Login />} />
      </Routes>
    </Layout>
  );
}