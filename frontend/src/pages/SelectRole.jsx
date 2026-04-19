// Import Firestore functions to update user data in the database
import { doc, updateDoc } from "firebase/firestore";

// React Router hook for navigation between pages
import { useNavigate } from "react-router-dom";

// React hook for handling side effects
import { useEffect } from "react";

// Firebase database instance
import { db } from "../firebase";

// Custom authentication context (provides user info, role, status, etc.)
import { useAuth } from "../context/AuthContext";
import "./SelectRole.css";

// Component for selecting a user role after login
export default function SelectRole() {
  // Destructure values from authentication context
  const { user, role, status, setRole, setStatus, loading } = useAuth();

  // Hook to programmatically navigate between routes
  const navigate = useNavigate();

  /**
   * useEffect runs whenever user, role, status, or loading changes.
   * It automatically redirects users based on their role and approval status.
   */
  useEffect(() => {
    // Wait until authentication state is fully loaded
    if (loading) return;

    // If no user is logged in, do nothing
    if (!user) return;

    // Redirect students directly to their home page
    if (role === "student") {
      navigate("/home");

    // Admin routing logic
    } else if (role === "admin") {
      if (status === "approved") {
        // Approved admins go to admin dashboard
        navigate("/admin/applications");
      } else {
        // Unapproved admins are blocked
        navigate("/unauthorized");
      }

    // Vendor routing logic
    } else if (role === "vendor") {
      if (status === "approved") {
        // Approved vendors go to vendor dashboard
        navigate("/vendor/dashboard");
      } else {
        // Unapproved vendors are blocked
        navigate("/unauthorized");
      }
    }
  }, [user, role, status, loading, navigate]);

  /**
   * Handles role selection when user clicks a button.
   * @param {string} selectedRole - The role chosen by the user
   */
  const handleSelectRole = async (selectedRole) => {
    // Ensure a user is logged in before proceeding
    if (!user) {
      return;
    }

    // Prevent users from changing roles after one is already assigned
    if (role) {
      return;
    }

    try {
      // Reference to the user's document in Firestore
      const userRef = doc(db, "users", user.uid);

      // Student role selection
      if (selectedRole === "student") {
        // Save role in database
        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        // Update local state
        setRole("student");
        setStatus(null);

        // Redirect to student home
        navigate("/home");

      // Vendor role selection
      } else if (selectedRole === "vendor") {
        /**
         * Users are temporarily kept as "student"
         * until they complete the vendor application process.
         */
        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        setRole("student");
        setStatus(null);

        // Redirect to vendor registration page
        navigate("/register-vendor");

      // Admin role selection
      } else if (selectedRole === "admin") {
        // Keep user as student so they are allowed to access /apply-admin
        await updateDoc(userRef, {
           role: "student",
           status: null,
        });

        setRole("student");
        setStatus(null);

        navigate("/apply-admin");
      }
    } catch (error) {
      // Log error for debugging
      console.error("Failed to save role:", error);

      // Notify user of failure
      alert("Failed to save role. Check console.");
    }
  };

  return (
    <div className="role-container">
      <div className="role-card">
        <h1 className="role-title">Choose Your Role</h1>
        <p className="role-subtitle">
          Select how you want to use the platform
        </p>

        {/* Role selection buttons */}
        <div className="role-buttons">
          <button type="button" onClick={() => handleSelectRole("student")}>
            Student
          </button>

          <button type="button" onClick={() => handleSelectRole("vendor")}>
            Vendor
          </button>

          <button type="button" onClick={() => handleSelectRole("admin")}>
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}