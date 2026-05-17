// Import Firestore functions to update user role information
import { doc, updateDoc } from "firebase/firestore";

// Import React Router navigation utilities
import { Navigate, useNavigate } from "react-router-dom";

// Firebase database instance
import { db } from "../firebase";

// Custom authentication context
// Provides current user, role, status, and loading state
import { useAuth } from "../context/AuthContext";

// Component styling
import "./SelectRole.css";
export default function SelectRole() {

  // Get authentication and role state from AuthContext
  const { user, role, status, setRole, setStatus, loading } = useAuth();

  // Used for programmatic navigation
  const navigate = useNavigate();

  /**
   * Handles user role selection.
   *
   * Students immediately become students.
   *
   * Vendors/Admins are temporarily assigned as students
   * until they complete their application process.
   */
  const handleSelectRole = async (selectedRole) => {

    // Prevent role selection if user is not logged in
    if (!user) {
      return;
    }

    // Prevent changing roles once a role already exists
    if (role) {
      return;
    }

    try {

      // Reference to the current user's Firestore document
      const userRef = doc(db, "users", user.uid);

      /**
       * STUDENT ROLE
       * Students are immediately approved and redirected.
       */
      if (selectedRole === "student") {

        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        // Update local auth state
        setRole("student");
        setStatus(null);

        // Redirect student to dashboard
        navigate("/home", { replace: true });

      /**
       * VENDOR ROLE
       * Users stay temporarily as students until vendor registration
       * and approval are completed.
       */
      } else if (selectedRole === "vendor") {

        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        // Navigate to vendor registration form
        navigate("/register-vendor", { replace: true });

        setRole("student");
        setStatus(null);

      /**
       * ADMIN ROLE
       * Users stay temporarily as students until admin application
       * and approval are completed.
       */
      } else if (selectedRole === "admin") {

        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        // Navigate to admin application page
        navigate("/apply-admin", { replace: true });

        setRole("student");
        setStatus(null);
      }

    } catch (error) {

      // Log error for debugging
      console.error("Failed to save role:", error);

      // Notify user
      alert("Failed to save role. Check console.");
    }
  };

  /**
   * Prevent page rendering while Firebase authentication loads.
   * This avoids flickering between pages during login.
   */
  if (loading) {
    return <div>Loading...</div>;
  }

  /**
   * Redirect unauthenticated users back to login.
   */
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  /**
   * Existing students are redirected directly to the student dashboard.
   */
  if (role === "student") {
    return <Navigate to="/home" replace />;
  }

  /**
   * Approved vendors are redirected to the vendor dashboard.
   */
  if (role === "vendor" && status === "approved") {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  /**
   * Approved admins are redirected to the admin dashboard.
   */
  if (role === "admin" && status === "approved") {
    return <Navigate to="/admin/applications" replace />;
  }

  /**
   * Unapproved vendors/admins are blocked from dashboards.
   */
  if ((role === "vendor" || role === "admin") && status !== "approved") {
    return <Navigate to="/unauthorized" replace />;
  }

  /**
   * Main role selection UI
   */
  return (
    <div className="role-container">

      <div className="role-card">

        <h1 className="role-title">
          Choose Your Role
        </h1>

        <p className="role-subtitle">
          Select how you want to use the platform
        </p>

        {/* Role selection buttons */}
        <div className="role-buttons">

          <button
            type="button"
            onClick={() => handleSelectRole("student")}
          >
            Student
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole("vendor")}
          >
            Vendor
          </button>

          <button
            type="button"
            onClick={() => handleSelectRole("admin")}
          >
            Admin
          </button>

        </div>
      </div>
    </div>
  );
}