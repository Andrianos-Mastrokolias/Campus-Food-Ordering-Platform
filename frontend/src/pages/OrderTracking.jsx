// OrderTracking.jsx
// REAL-TIME Student Order Tracking
// US3 update: new "paid" status added to progress bar and colour mapping

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import paymentService from "../services/paymentService";
import "./OrderTracking.css";

export default function OrderTracking() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const latestOrderId = orders.length > 0 ? orders[0].id : null;
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "orders"),
      where("studentId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);
        setOrders(data);
        setLoading(false);
      },
      (error) => {
        console.error("Realtime order error:", error.message);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  /**
   * US3: Updated progress to include "paid" status.
   * paid(25) → preparing(50) → ready(80) → completed(100)
   */
  const getProgress = (status) => {
    switch (status) {
      case "paid": return 25;
      case "preparing": return 50;
      case "ready": return 80;
      case "completed": return 100;
      default: return 10;
    }
  };

  /**
   * US3: Updated colours — "paid" is green to signal payment confirmed.
   */
  const getStatusColor = (status) => {
    switch (status) {
      case "paid": return "#10b981";   // green — payment confirmed
      case "preparing": return "#3498db";   // blue
      case "ready": return "#2ecc71";   // bright green
      case "completed": return "#7f8c8d";   // grey
      default: return "#f39c12";   // amber
    }
  };

  /**
   * US3: Human-readable status labels.
   */
  const getStatusLabel = (status) => {
    switch (status) {
      case "paid": return "✅ Paid — Awaiting Preparation";
      case "preparing": return "👨‍🍳 Preparing";
      case "ready": return "🔔 Ready for Collection";
      case "completed": return "✓ Completed";
      default: return status;
    }
  };

  /**
   * US3: Pay Now handler for orders that still have status "pending"
   * (legacy orders created before this update).
   */
  const handlePayNow = async (order) => {
    if (!user) { navigate('/login'); return; }
    try {
      const orderId = order.orderId || order.id;
      const amount = (order.total || 0) + 5.00;
      const paymentId = await paymentService.createPayment({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName || '',
        orderId,
        amount,
        method: 'upi',
        items: (order.items || []).map(item => ({
          name: item.name,
          qty: item.quantity || 1,
          price: Number(String(item.price).replace('R', '')),
          vendorId: order.vendorId,
          vendorName: order.vendorName,
          vendor: { id: order.vendorId, name: order.vendorName },
        })),
      });
      navigate('/payment', {
        state: {
          paymentId,
          orderId,
          amount,
          method: 'upi',
          items: order.items || [],
          showMethodSelector: true,
        }
      });
    } catch (err) {
      console.error(err);
      alert('Could not initiate payment. Please try again.');
    }
  };

  if (loading) {
  return (
    <main className="tracking-container">
      <section>
        <p>Loading live orders...</p>
      </section>
    </main>
  );
}

  const groupedOrders = {
    paid: [],
    preparing: [],
    ready: [],
    completed: [],
    other: [],
  };

  orders.forEach((order) => {
    const status = order.status;

    if (groupedOrders[status]) {
      groupedOrders[status].push(order);
    } else {
      groupedOrders.other.push(order);
    }
  });

  const renderOrderCard = (order) => (
  <article
    key={order.id}
    className={`
      order-card
      ${order.id === latestOrderId ? "highlight" : ""}
      ${order.status === "ready" ? "ready-card" : ""}
    `}
  >
    <header className="order-top">
      <h3>Order #{order.orderId?.slice(0, 10)}</h3>

      <mark
        className="status-badge"
        style={{ backgroundColor: getStatusColor(order.status) }}
      >
        {order.status?.toUpperCase()}
      </mark>
    </header>

    <p style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
      Order Ref: {order.orderId}
    </p>

    {order.vendorOrderId && (
      <p style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
        Ref: {order.vendorOrderId}
      </p>
    )}

    <p
      style={{
        fontSize: "0.85rem",
        fontWeight: "600",
        color: getStatusColor(order.status),
        marginBottom: "8px",
      }}
    >
      {getStatusLabel(order.status)}
    </p>

    <p>
      Vendor: <strong>{order.vendorName}</strong>
    </p>

    <section className="progress-section">
     <progress
        className="progress-bar"
        value={getProgress(order.status)}
        max="100"
      >
      {getProgress(order.status)}%
    </progress>

      <nav
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: "0.65rem",
          color: "#94a3b8",
          marginBottom: "10px",
        }}
        aria-label="Order progress"
      >
        <p>Paid</p>
        <p>Preparing</p>
        <p>Ready</p>
        <p>Done</p>
      </nav>
    </section>

    <section>
      <ul>
        {(order.items || []).map((item, index) => (
          <li key={index} className="item-row">
            <p>
              {item.name} ×{item.quantity || 1}
            </p>

            <p>{item.price}</p>
          </li>
        ))}
      </ul>
    </section>

    <footer className="total">
      Total: R{(order.total || 0).toFixed(2)}
    </footer>
  </article>
);

  return (
   <main className="tracking-container">

  <header className="tracking-header">
    <h1>Live Order Tracking</h1>

    <p>Your orders update in real time</p>

    <button
      className="payment-history-btn"
      onClick={() => navigate('/payment-history')}
    >
      💳 View Payment History
    </button>
  </header>

  {orders.length === 0 ? (
    <section className="empty-state">
      <h3>No orders yet</h3>

      <p>
        Once you pay for an order, it will appear here instantly.
      </p>

      <button
        className="pay-now-btn"
        style={{ marginTop: '12px' }}
        onClick={() => navigate('/home')}
      >
        🛒 Browse Menu
      </button>
    </section>
  ) : (
    <section className="orders-layout">

      {groupedOrders.ready.length > 0 && (
        <section className="order-section">
          <h2>🔔 Ready</h2>

          <section className="horizontal-orders">
            {groupedOrders.ready.map(renderOrderCard)}
          </section>
        </section>
      )}

      {groupedOrders.preparing.length > 0 && (
        <section className="order-section">
          <h2>👨‍🍳 Preparing</h2>

          <section className="horizontal-orders">
            {groupedOrders.preparing.map(renderOrderCard)}
          </section>
        </section>
      )}

      {groupedOrders.paid.length > 0 && (
        <section className="order-section">
          <h2>🟡 Paid</h2>

          <section className="horizontal-orders">
            {groupedOrders.paid.map(renderOrderCard)}
          </section>
        </section>
      )}

      {groupedOrders.completed.length > 0 && (
        <section className="order-section">

          <button
            className="completed-toggle-btn"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted
              ? "Hide Completed Orders"
              : `View Completed Orders (${groupedOrders.completed.length})`}
          </button>

          {showCompleted && (
            <section className="orders-grid">
              {groupedOrders.completed.map(renderOrderCard)}
            </section>
          )}

        </section>
      )}

    </section>
  )}
</main>
  );
}
