import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Unauthorized() {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (role === "admin") {
      navigate("/admin/dashboard");
    } else if (role === "vendor") {
      navigate("/vendor/dashboard");
    } else {
      navigate("/home");
    }
  };

  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1>403 - Access Denied</h1>
      <p>You do not have permission to view this page.</p>

      <div style={{ marginTop: "20px" }}>
        <button onClick={handleGoBack}>Go to my dashboard</button>
      </div>

      <div style={{ marginTop: "15px" }}>
        <Link to="/login">Go to login</Link>
      </div>
    </div>
  );
}