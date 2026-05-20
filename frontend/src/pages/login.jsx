// --------------------------------------------------
// REACT HOOKS
// useState stores local component state.
// --------------------------------------------------
import { useState } from "react";

// --------------------------------------------------
// REACT ROUTER
// Navigate redirects users between routes.
// useNavigate allows programmatic navigation.
// --------------------------------------------------
import { Navigate, useNavigate } from "react-router-dom";

// --------------------------------------------------
// FIREBASE AUTHENTICATION
// signInWithPopup handles Google authentication.
// --------------------------------------------------
import { signInWithPopup } from "firebase/auth";

// --------------------------------------------------
// FIRESTORE FUNCTIONS
// Used to create and retrieve user profile data.
// --------------------------------------------------
import { doc, setDoc, getDoc } from "firebase/firestore";

// --------------------------------------------------
// FIREBASE CONFIGURATION
// auth = Firebase authentication instance
// googleProvider = Google login provider
// db = Firestore database instance
// --------------------------------------------------
import { auth, googleProvider, db } from "../firebase.jsx";

// --------------------------------------------------
// AUTH CONTEXT
// Provides logged-in user information,
// role, approval status, and loading state.
// --------------------------------------------------
import { useAuth } from "../context/AuthContext";

// Login page styling
import "./login.css";

/**
 * LOGIN COMPONENT
 *
 * Handles:
 * - Google authentication
 * - Creating Firestore user profiles
 * - Redirecting users based on role/status
 * - Preventing incorrect routing during auth loading
 */
export default function Login() {

  // --------------------------------------------------
  // LOCAL COMPONENT STATE
  // --------------------------------------------------

  // Stores authentication or login errors
  const [error, setError] = useState("");

  // Controls loading state of the login button
  const [buttonLoading, setButtonLoading] = useState(false);

  // --------------------------------------------------
  // AUTHENTICATION CONTEXT
  // --------------------------------------------------

  /**
   * user         -> currently authenticated user
   * role         -> student/vendor/admin
   * status       -> approval status
   * authLoading  -> true while Firebase auth initializes
   */
  const {
    user,
    role,
    status,
    loading: authLoading,
  } = useAuth();

  // React Router navigation hook
  const navigate = useNavigate();

  /**
   * CREATE USER PROFILE
   *
   * Creates a Firestore document for newly
   * authenticated users.
   *
   * Existing users are not overwritten.
   */
  const createUserProfile = async (user) => {

    try {

      // Reference to Firestore user document
      const userRef = doc(db, "users", user.uid);

      // Retrieve existing user document
      const userSnap = await getDoc(userRef);

      // Create profile only if it does not already exist
      if (!userSnap.exists()) {

        await setDoc(userRef, {

          // User ID from Firebase Authentication
          uid: user.uid,

          // User email
          email: user.email || "",

          // Display name fallback logic
          displayName:
            user.displayName ||
            user.email ||
            "",

          // Role assigned later during role selection
          role: null,

          // Approval status assigned later
          status: null,

          // Timestamps for tracking profile creation
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

    } catch (error) {

      // Log Firestore profile creation errors
      console.error(
        "Error creating user profile:",
        error
      );

      // Re-throw error for outer handler
      throw error;
    }
  };

  /**
   * HANDLE GOOGLE SIGN-IN
   *
   * Authenticates users using Google popup login.
   * After login:
   * - Creates user profile if needed
   * - Reads role/status from Firestore
   * - Redirects users to correct dashboard
   */
  const handleGoogleSignIn = async () => {

    // Clear previous errors
    setError("");

    // Enable loading state on button
    setButtonLoading(true);

    try {

      // Open Firebase Google login popup
      const result = await signInWithPopup(
        auth,
        googleProvider
      );

      // Create Firestore user profile if needed
      await createUserProfile(result.user);

      // Fetch latest Firestore user data
      const userRef = doc(
        db,
        "users",
        result.user.uid
      );

      const userSnap = await getDoc(userRef);

      // Extract user profile data
      const userData = userSnap.data();

      // --------------------------------------------------
      // ROLE-BASED REDIRECTION
      // --------------------------------------------------

      /**
       * No role selected yet
       * Redirect user to role selection page
       */
      if (!userData.role) {

        navigate("/select-role", {
          replace: true,
        });

      /**
       * STUDENT REDIRECTION
       */
      } else if (userData.role === "student") {

        navigate("/home", {
          replace: true,
        });

      /**
       * APPROVED VENDOR REDIRECTION
       */
      } else if (
        userData.role === "vendor" &&
        userData.status === "approved"
      ) {

        navigate("/vendor/dashboard", {
          replace: true,
        });

      /**
       * APPROVED ADMIN REDIRECTION
       */
      } else if (
        userData.role === "admin" &&
        userData.status === "approved"
      ) {

        navigate("/admin/dashboard", {
          replace: true,
        });

      /**
       * Unauthorized or unapproved users
       */
      } else {

        navigate("/unauthorized", {
          replace: true,
        });
      }

    } catch (error) {

      // Log authentication errors
      console.error(
        "Google sign-in error:",
        error
      );

      /**
       * User manually closed popup
       */
      if (
        error.code ===
        "auth/popup-closed-by-user"
      ) {

        setError("Sign-in cancelled");

      } else {

        // Show generic Firebase error
        setError(error.message);
      }

    } finally {

      // Disable loading state
      setButtonLoading(false);
    }
  };

  // --------------------------------------------------
  // AUTH LOADING SCREEN
  // Prevents route flickering while Firebase loads.
  // --------------------------------------------------
  if (authLoading) {

    return (
      <main className="login-page">

        <section className="login-container">

          <p>Loading...</p>

        </section>

      </main>
    );
  }

  // --------------------------------------------------
  // AUTO REDIRECTS
  // Redirect already authenticated users
  // directly to the correct dashboard.
  // --------------------------------------------------

  // Student redirect
  if (user && role === "student") {

    return <Navigate to="/home" replace />;
  }

  // Approved vendor redirect
  if (
    user &&
    role === "vendor" &&
    status === "approved"
  ) {

    return (
      <Navigate
        to="/vendor/dashboard"
        replace
      />
    );
  }

  // Approved admin redirect
  if (
    user &&
    role === "admin" &&
    status === "approved"
  ) {

    return (
      <Navigate
        to="/admin/dashboard"
        replace
      />
    );
  }

  // New users without a role
  if (user && !role) {

    return (
      <Navigate
        to="/select-role"
        replace
      />
    );
  }

  // --------------------------------------------------
  // LOGIN PAGE UI
  // --------------------------------------------------
  return (

    <main className="login-page">

      <section className="login-container">

        {/* Login page heading */}
        <header className="login-header">

          <h1>
            Campus Food Ordering Platform
          </h1>

          <p>
            Sign in with Google to continue
          </p>

        </header>

        {/* Display authentication errors */}
        {error && (

          <aside className="error-message">

            {error}

          </aside>
        )}

        {/* Google authentication button */}
        <button
          onClick={handleGoogleSignIn}
          className="btn btn-google"
          disabled={buttonLoading}
        >

          {/* Google icon */}
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="google-icon"
          />

          {/* Dynamic loading button text */}
          {buttonLoading
            ? "Please wait..."
            : "Sign in with Google"}

        </button>

      </section>

    </main>
  );
}