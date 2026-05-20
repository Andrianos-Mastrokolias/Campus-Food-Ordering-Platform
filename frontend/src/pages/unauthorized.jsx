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
    <main className="unauth-container">

  <section className="unauth-card">

    <header>

      <p className="unauth-icon" aria-label="Access denied icon">
        🚫
      </p>

      {/* Error title */}
      <h1 className="unauth-title">
        403 - Access Denied
      </h1>

    </header>

    {/* Explanation message */}
    <p className="unauth-text">
      You do not have permission to view this page.
    </p>

    {/* Button to redirect user to appropriate page */}
    <nav
      style={{ marginTop: "20px" }}
      aria-label="Unauthorized page actions"
    >

      <button
        className="unauth-button"
        onClick={handleGoBack}
      >
        Go to my dashboard
      </button>

    </nav>

    {/* Link to login page */}
    <footer style={{ marginTop: "15px" }}>

      <Link to="/login">
        Go to login
      </Link>

    </footer>

  </section>

</main>
  );
}