import { doc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./SelectRole.css";

export default function SelectRole() {
  const { user, role, status, setRole, setStatus, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    if (role === "student") {
      navigate("/home");
    } else if (role === "admin") {
      if (status === "approved") {
        navigate("/admin/applications");
      } else {
        navigate("/unauthorized");
      }
    } else if (role === "vendor") {
      if (status === "approved") {
        navigate("/vendor/dashboard");
      } else {
        navigate("/unauthorized");
      }
    }
  }, [user, role, status, loading, navigate]);

  const handleSelectRole = async (selectedRole) => {
    if (!user) {
      return;
    }

    // Prevent users from choosing another role once one has already been assigned.
    if (role) {
      return;
    }

    try {
      const userRef = doc(db, "users", user.uid);

      if (selectedRole === "student") {
        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        setRole("student");
        setStatus(null);
        navigate("/home");
      } else if (selectedRole === "vendor") {
        // Keep the user as a student until they complete the vendor application flow.
        await updateDoc(userRef, {
          role: "student",
          status: null,
        });

        setRole("student");
        setStatus(null);
        navigate("/register-vendor");
      } else if (selectedRole === "admin") {
        // Admin access cannot be self-assigned and must go through the application process.
        alert("Admin access must be requested through the Admin Application form.");
        navigate("/login");
      }
    } catch (error) {
      console.error("Failed to save role:", error);
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