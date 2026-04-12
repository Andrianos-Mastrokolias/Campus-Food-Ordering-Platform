import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useEffect } from "react";

export default function Login() {
  const { user, role, status } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && role) {
      if (role === "vendor") {
        if (status === "approved") {
          navigate("/vendor/dashboard");
        } else if (status === "pending") {
          alert("Your vendor account is pending admin approval.");
          navigate("/unauthorized");
        } else if (status === "suspended") {
          alert("Your vendor account has been suspended.");
          navigate("/unauthorized");
        } else {
          navigate("/unauthorized");
        }
      } else if (role === "admin") {
        navigate("/admin/dashboard");
      } else {
        navigate("/home");
      }
    }
  }, [user, role, status, navigate]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login failed:", err.message);
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h1>Campus Food Ordering Platform</h1>
      <p>Sign in to continue</p>
      <button onClick={handleLogin}>Sign in with Google</button>
    </div>
  );
}