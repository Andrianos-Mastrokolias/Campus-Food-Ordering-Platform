import { Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import SelectRole from "./pages/SelectRole";
import StudentHome from "./pages/StudentHome";
import VendorDashboard from "./pages/VendorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Unauthorized from "./pages/unauthorized";
import ProtectedRoute from "./components/protectedRoute";
import AdminApplicationForm from "./components/AdminApplication/AdminApplicationForm";
import AdminReviewDashboard from "./components/AdminApplication/AdminReviewDashboard";
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
        
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
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
        
        <Route path="*" element={<Login />} />
      </Routes>
    </Layout>
  );
}
