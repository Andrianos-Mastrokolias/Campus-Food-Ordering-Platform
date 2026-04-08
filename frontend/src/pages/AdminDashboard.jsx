import LogoutButton from "../components/LogoutButton";

export default function AdminDashboard() {
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1>Admin Dashboard</h1>
      <p>Welcome! You are logged in as an admin.</p>
      <p>User and vendor management features will appear here.</p>
      <LogoutButton />
    </div>
  );
}