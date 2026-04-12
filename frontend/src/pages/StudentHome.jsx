import LogoutButton from "../components/LogoutButton";

export default function StudentHome() {
  return (
    <div style={{ textAlign: "center", marginTop: "80px" }}>
      <h1>Student Dashboard</h1>
      <p>Welcome! You are logged in as a student.</p>
      <p>Food browsing and ordering features will appear here.</p>
      <LogoutButton />
    </div>
  );
}