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
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);

  const latestOrderId = orders.length > 0 ? orders[0].id : null;

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
      case "paid":       return 25;
      case "preparing":  return 50;
      case "ready":      return 80;
      case "completed":  return 100;
      default:           return 10;
    }
  };

  /**
   * US3: Updated colours — "paid" is green to signal payment confirmed.
   */
  const getStatusColor = (status) => {
    switch (status) {
      case "paid":       return "#10b981";   // green — payment confirmed
      case "preparing":  return "#3498db";   // blue
      case "ready":      return "#2ecc71";   // bright green
      case "completed":  return "#7f8c8d";   // grey
      default:           return "#f39c12";   // amber
    }
  };

  /**
   * US3: Human-readable status labels.
   */
  const getStatusLabel = (status) => {
    switch (status) {
      case "paid":       return "✅ Paid — Awaiting Preparation";
      case "preparing":  return "👨‍🍳 Preparing";
      case "ready":      return "🔔 Ready for Collection";
      case "completed":  return "✓ Completed";
      default:           return status;
    }
  };

  /**
   * US3: Pay Now handler for orders that still have status "pending"
   * (legacy orders created before this update).
   */
  const handlePayNow = async (order) => {
    if (!user) { navigate('/login'); return; }
    try {
      const orderId   = order.orderId || order.id;
      const amount    = (order.total || 0) + 5.00;
      const paymentId = await paymentService.createPayment({
        userId:    user.uid,
        userEmail: user.email,
        userName:  user.displayName || '',
        orderId,
        amount,
        method:    'upi',
        items:     (order.items || []).map(item => ({
          name:      item.name,
          qty:       item.quantity || 1,
          price:     Number(String(item.price).replace('R', '')),
          vendorId:  order.vendorId,
          vendorName: order.vendorName,
          vendor:    { id: order.vendorId, name: order.vendorName },
        })),
      });
      navigate('/payment', {
        state: {
          paymentId,
          orderId,
          amount,
          method: 'upi',
          items:  order.items || [],
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
      <div className="tracking-container">
        <p>Loading live orders...</p>
      </div>
    );
  }

  return (
    <div className="tracking-container">

      <div className="tracking-header">
        <h1>Live Order Tracking</h1>
        <p>Your orders update in real time</p>
        <button
          className="pay-now-btn"
          style={{ marginTop: '10px' }}
          onClick={() => navigate('/payment-history')}
        >
          💳 View Payment History
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state">
          <h3>No orders yet</h3>
          <p>Once you pay for an order, it will appear here instantly.</p>
          <button
            className="pay-now-btn"
            style={{ marginTop: '12px' }}
            onClick={() => navigate('/home')}
          >
            🛒 Browse Menu
          </button>
        </div>
      ) : (
        <div className="orders-grid">
          {orders.map((order) => (
            <div
              key={order.id}
              className={`order-card ${order.id === latestOrderId ? "highlight" : ""}`}
            >
              {/* Top row */}
              <div className="order-top">
                <h3>
                  {/* 
                  ORDER DISPLAY FIX (Sprint 4 improvement)

                  We now show vendorOrderId if it exists.
                  This prevents confusion when one checkout
                  creates multiple vendor-specific orders.

                  Fallbacks:
                  1. vendorOrderId (best)
                  2. orderId (shared checkout ID)
                  3. Firestore doc id (last fallback)
                -------------------------------------------------- */}
                  Order #{(order.vendorOrderId || order.orderId || order.id).slice(0, 10)}
                  <p style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                    Order ID: {order.orderId}
                  </p>
                </h3>
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(order.status) }}
                >
                  {order.status?.toUpperCase()}
                </span>
              </div>
               {/* ux changes below for display*/}
              {order.vendorOrderId && (
                <p style={{ fontSize: "0.7rem", color: "#94a3b8", marginTop: "4px" }}>
                  Ref: {order.vendorOrderId}
                </p>
              )}

              {/* US3: Payment status label */}
              <p style={{
                fontSize: '0.85rem',
                fontWeight: '600',
                color: getStatusColor(order.status),
                marginBottom: '8px'
              }}>
                {getStatusLabel(order.status)}
              </p>

              <p>
                Vendor: <strong>{order.vendorName}</strong>
              </p>

              {/* Progress bar — US3: includes "paid" step */}
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${getProgress(order.status)}%` }}
                />
              </div>

              {/* Progress labels */}
              <div style={{ display: 'flex', justifyContent: 'space-between',
                            fontSize: '0.65rem', color: '#94a3b8', marginBottom: '10px' }}>
                <span>Paid</span>
                <span>Preparing</span>
                <span>Ready</span>
                <span>Done</span>
              </div>

              {/* Items */}
              <div>
                {(order.items || []).map((item, index) => (
                  <div key={index} className="item-row">
                    <span>{item.name} ×{item.quantity || 1}</span>
                    <span>{item.price}</span>
                  </div>
                ))}
              </div>

              <div className="total">Total: R{(order.total || 0).toFixed(2)}</div>

              {/* Transaction ref if available */}
              {order.transactionRef && (
                <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                 Payment Ref: <code>{order.transactionRef}</code>
                </p>
              )}

              <p className="timestamp">
                Placed:{" "}
                {order.createdAt?.toDate
                  ? order.createdAt.toDate().toLocaleString()
                  : "Just now"}
              </p>

              {/* US3: Pay Now only shown for legacy "pending" orders */}
              {order.status === "pending" && (
                <button
                  className="pay-now-btn"
                  onClick={() => handlePayNow(order)}
                >
                  💳 Pay Now
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
