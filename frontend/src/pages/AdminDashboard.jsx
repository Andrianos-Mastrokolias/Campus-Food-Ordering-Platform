import { useEffect, useState } from "react";
import LogoutButton from "../components/LogoutButton";
import {
  fetchVendors,
  approveVendor,
  suspendVendor,
} from "../services/vendorAdminService";

export default function AdminDashboard() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const loadVendors = async () => {
    try {
      setLoading(true);
      const data = await fetchVendors();
      setVendors(data);
    } catch (error) {
      console.error("Error loading vendors:", error);
      setMessage("Failed to load vendors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const handleApprove = async (id) => {
    try {
      await approveVendor(id);
      setMessage("Vendor approved successfully.");
      await loadVendors();
    } catch (error) {
      console.error("Error approving vendor:", error);
      setMessage("Failed to approve vendor.");
    }
  };

  const handleSuspend = async (id) => {
    try {
      await suspendVendor(id);
      setMessage("Vendor suspended successfully.");
      await loadVendors();
    } catch (error) {
      console.error("Error suspending vendor:", error);
      setMessage("Failed to suspend vendor.");
    }
  };

  return (
    <div style={{ padding: "40px", fontFamily: "Arial" }}>
      <h1>Admin Dashboard</h1>
      <p>Manage vendor accounts below.</p>

      {message && (
        <p style={{ color: "green", fontWeight: "bold" }}>{message}</p>
      )}

      {loading ? (
        <p>Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <p>No vendors found.</p>
      ) : (
        <table
          border="1"
          cellPadding="10"
          style={{
            borderCollapse: "collapse",
            width: "100%",
            marginTop: "20px",
          }}
        >
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((vendor) => (
              <tr key={vendor.id}>
                <td>{vendor.displayName || "No name"}</td>
                <td>{vendor.email || "No email"}</td>
                <td>{vendor.status || "pending"}</td>
                <td>
                  <button
                    onClick={() => handleApprove(vendor.id)}
                    disabled={vendor.status === "approved"}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleSuspend(vendor.id)}
                    disabled={vendor.status === "suspended"}
                    style={{ marginLeft: "10px" }}
                  >
                    Suspend
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div style={{ marginTop: "40px" }}>
        <LogoutButton />
      </div>
    </div>
  );
}