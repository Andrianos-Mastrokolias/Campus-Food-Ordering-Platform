import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, googleProvider, db } from "../firebase.jsx";
import { useAuth } from "../context/AuthContext";
import "./login.css";

export default function Login() {
  const [error, setError] = useState("");
  const [buttonLoading, setButtonLoading] = useState(false);

  const { user, role, status, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const createUserProfile = async (user) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || user.email || "",
          role: null,
          status: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setButtonLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);

      await createUserProfile(result.user);

      const userRef = doc(db, "users", result.user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (!userData.role) {
        navigate("/select-role", { replace: true });
      } else if (userData.role === "student") {
        navigate("/home", { replace: true });
      } else if (
        userData.role === "vendor" &&
        userData.status === "approved"
      ) {
        navigate("/vendor/dashboard", { replace: true });
      } else if (
        userData.role === "admin" &&
        userData.status === "approved"
      ) {
        navigate("/admin/dashboard", { replace: true });
      } else {
        navigate("/unauthorized", { replace: true });
      }
    } catch (error) {
      console.error("Google sign-in error:", error);

      if (error.code === "auth/popup-closed-by-user") {
        setError("Sign-in cancelled");
      } else {
        setError(error.message);
      }
    } finally {
      setButtonLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-container">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (user && role === "student") {
    return <Navigate to="/home" replace />;
  }

  if (user && role === "vendor" && status === "approved") {
    return <Navigate to="/vendor/dashboard" replace />;
  }

  if (user && role === "admin" && status === "approved") {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (user && !role) {
    return <Navigate to="/select-role" replace />;
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Campus Food Ordering Platform</h1>
          <p>Sign in with Google to continue</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button
          onClick={handleGoogleSignIn}
          className="btn btn-google"
          disabled={buttonLoading}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google"
            className="google-icon"
          />

          {buttonLoading ? "Please wait..." : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}