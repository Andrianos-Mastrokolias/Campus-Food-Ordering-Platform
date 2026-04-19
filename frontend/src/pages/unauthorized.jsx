import "./unauthorized.css";

// Import navigation utilities from React Router
import { Link, useNavigate } from "react-router-dom";

// Import authentication context to access user role and status
import { useAuth } from "../context/AuthContext";

// Component displayed when a user tries to access a restricted page
export default function Unauthorized() {
  // Get current user's role and approval status from context
  const { role, status } = useAuth();

  // Hook for programmatic navigation
  const navigate = useNavigate();

  /**
   * Handles redirecting the user when they click "Go to my dashboard"
   * Redirect is based on role and approval status.
   */
  const handleGoBack = () => {
    // Approved admin → admin dashboard
    if (role === "admin" && status === "approved") {
      navigate("/admin/applications");

    // Approved vendor → vendor dashboard
    } else if (role === "vendor" && status === "approved") {
      navigate("/vendor/dashboard");

    // Students → home page (no approval required)
    } else if (role === "student") {
      navigate("/home");

    // Default fallback → role selection page
    } else {
      navigate("/select-role");
    }
  };

  return (
    <div className="unauth-container">
      <div className="unauth-card">
        
        <div className="unauth-icon">🚫</div>

        {/* Error title */}
        <h1 className="unauth-title">403 - Access Denied</h1>

        {/* Explanation message */}
        <p className="unauth-text">
          You do not have permission to view this page.
        </p>

        {/* Button to redirect user to appropriate page */}
        <div style={{ marginTop: "20px" }}>
          <button className="unauth-button" onClick={handleGoBack}>
            Go to my dashboard
          </button>
        </div>

        {/* Link to login page (useful if session expired) */}
        <div style={{ marginTop: "15px" }}>
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    </div>
  );
}