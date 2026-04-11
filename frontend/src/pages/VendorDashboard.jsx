import LogoutButton from "../components/LogoutButton";

export default function VendorDashboard() {
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1>Vendor Dashboard</h1>
      <p>Welcome! You are logged in as a vendor.</p>
      <p>Menu and order management features will appear here.</p>
      <LogoutButton />
    </div>
  );
}