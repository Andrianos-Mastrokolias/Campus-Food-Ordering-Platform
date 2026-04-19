// OrderTracking.jsx
// REAL-TIME Student Order Tracking
// Now uses Firestore onSnapshot for live updates from vendor actions

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./OrderTracking.css";


export default function OrderTracking() {
  const { user } = useAuth();

  // Stores ALL live student orders
  const [orders, setOrders] = useState([]);

  // Loading state
  const [loading, setLoading] = useState(true);

  // Finds the most recent order so we can highlight it visually
const latestOrderId = orders.length > 0 ? orders[0].id : null;

  useEffect(() => {
    if (!user) return;

    // 🔥 Create a query for ONLY this student's orders
    const q = query(
      collection(db, "orders"),
      where("studentId", "==", user.uid)
    );

    // 🔴 REAL-TIME LISTENER (this is the key upgrade)
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Convert Firestore docs → JS objects
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Sort newest first
        data.sort(
          (a, b) => b.createdAt?.seconds - a.createdAt?.seconds
        );

        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error("Realtime order error:", error.message);
        setLoading(false);
      }
    );

    // Cleanup listener when page closes
    return () => unsubscribe();
  }, [user]);

  // Progress mapping (for UI bar)
  const getProgress = (status) => {
    switch (status) {
      case "pending":
        return 20;
      case "preparing":
        return 50;
      case "ready":
        return 80;
      case "completed":
        return 100;
      default:
        return 0;
    }
  };

  // Color mapping for status badges
  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#f39c12";
      case "preparing":
        return "#3498db";
      case "ready":
        return "#2ecc71";
      case "completed":
        return "#7f8c8d";
      default:
        return "#ccc";
    }
  };

  if (loading) {
    return (
      <div className="tracking-container">
        <p>Loading live orders...</p>
      </div>
    );
  }

  return (
    <div className="tracking-container">

      {/* Header */}
      <div className="tracking-header">
        <h1>Live Order Tracking</h1>
        <p>Your orders update in real time</p>
      </div>

      {/* No orders */}
      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Once you place an order, it will appear here instantly.</p>
        </div>
      ) : (
        <div className="orders-grid">

          {/* Loop all live orders */}
          {orders.map((order) => (
              // Adds special styling to newest order so user instantly sees it
              <div
                  key={order.id}
                  className={`order-card ${order.id === latestOrderId ? "highlight" : ""}`}
>

              {/* Top row */}
              <div className="order-top">
                <h3>Order #{order.id.slice(0, 6)}</h3>

                {/* Live status badge */}
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status}
                </span>
              </div>

              {/* Vendor */}
              <p>
                Vendor: <strong>{order.vendorId}</strong>
              </p>

              {/* Live progress bar */}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgress(order.status)}%` }}
                />
              </div>

              {/* Items */}
              <div>
                {order.items.map((item, index) => (
                  <div key={index} className="item-row">
                    <span>{item.name}</span>
                    <span>{item.price}</span>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="total">
                Total: R{order.total.toFixed(2)}
              </div>

              {/* Timestamp */}
              <p className="timestamp">
                Placed:{" "}
                {order.createdAt?.toDate
                  ? order.createdAt.toDate().toLocaleString()
                  : "Just now"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}