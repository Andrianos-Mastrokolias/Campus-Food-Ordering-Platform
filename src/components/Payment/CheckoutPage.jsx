import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import paymentService, { PAYMENT_METHOD } from '../../services/paymentService';
import './CheckoutPage.css';

/**
 * CheckoutPage — US5: Student Payments
 *
 * Displays a mock cart/order summary and lets the student choose a payment
 * method before proceeding to the PaymentPage.
 *
 * In future sprints the cart will be driven by a real orders service; for now
 * we use a realistic hard-coded demo cart so the payment flow is fully testable.
 */

// ── Demo cart items (replace with real cart/orders in future sprint) ──────────
const DEMO_CART = [
  { id: '1', name: 'Chicken Burger',    qty: 1, price: 65.00 },
  { id: '2', name: 'Loaded Chips',      qty: 2, price: 35.00 },
  { id: '3', name: 'Coke 500ml',        qty: 2, price: 22.50 },
];

const PAYMENT_METHODS = [
  {
    id: PAYMENT_METHOD.UPI,
    label: 'UPI / PaySnap QR',
    icon: '📱',
    description: 'Scan a QR code with any UPI app (GPay, PayFast, etc.)',
  },
  {
    id: PAYMENT_METHOD.CARD,
    label: 'Credit / Debit Card',
    icon: '💳',
    description: 'Visa, Mastercard, American Express',
  },
  {
    id: PAYMENT_METHOD.EFT,
    label: 'EFT / Bank Transfer',
    icon: '🏦',
    description: 'Instant EFT via your online banking app',
  },
  {
    id: PAYMENT_METHOD.WALLET,
    label: 'Campus Wallet',
    icon: '👝',
    description: 'Pay using your pre-loaded campus wallet balance',
  },
];

export default function CheckoutPage({ currentUser }) {
  const navigate = useNavigate();
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHOD.UPI);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const subtotal = DEMO_CART.reduce((sum, item) => sum + item.price * item.qty, 0);
  const serviceFee = 5.00;
  const total = subtotal + serviceFee;

  const handleProceed = async () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const orderId = paymentService.generateOrderId();

      // Create the payment record in Firestore (status: pending)
      const paymentId = await paymentService.createPayment({
        userId:    currentUser.uid,
        userEmail: currentUser.email,
        userName:  currentUser.displayName,
        orderId,
        amount:    total,
        method:    selectedMethod,
        items:     DEMO_CART,
      });

      // Navigate to payment page with context via state
      navigate('/payment', {
        state: {
          paymentId,
          orderId,
          amount:    total,
          method:    selectedMethod,
          items:     DEMO_CART,
        },
      });
    } catch (err) {
      setError('Could not initiate payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page checkout-page">
      <div className="checkout-container">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="checkout-header">
          <h2>🛒 Checkout</h2>
          <p className="checkout-subtitle">Review your order and choose how to pay</p>
        </div>

        <div className="checkout-body">

          {/* ── Order Summary ─────────────────────────────────────── */}
          <section className="checkout-section order-summary">
            <h3>Order Summary</h3>
            <div className="order-items">
              {DEMO_CART.map(item => (
                <div key={item.id} className="order-item">
                  <span className="item-name">{item.name}</span>
                  <span className="item-qty">×{item.qty}</span>
                  <span className="item-price">
                    R {(item.price * item.qty).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
            <div className="order-totals">
              <div className="total-row">
                <span>Subtotal</span>
                <span>R {subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>Service fee</span>
                <span>R {serviceFee.toFixed(2)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total</span>
                <span>R {total.toFixed(2)}</span>
              </div>
            </div>
          </section>

          {/* ── Payment Method ─────────────────────────────────────── */}
          <section className="checkout-section payment-method-section">
            <h3>Payment Method</h3>
            <div className="method-grid">
              {PAYMENT_METHODS.map(m => (
                <button
                  key={m.id}
                  className={`method-card ${selectedMethod === m.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMethod(m.id)}
                >
                  <span className="method-icon">{m.icon}</span>
                  <span className="method-label">{m.label}</span>
                  <span className="method-desc">{m.description}</span>
                  {selectedMethod === m.id && (
                    <span className="method-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          </section>

        </div>

        {/* ── Error ────────────────────────────────────────────────── */}
        {error && <div className="alert alert-danger">{error}</div>}

        {/* ── Actions ──────────────────────────────────────────────── */}
        <div className="checkout-actions">
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            ← Back
          </button>
          <button
            className="btn btn-primary btn-pay"
            onClick={handleProceed}
            disabled={loading}
          >
            {loading ? 'Preparing payment…' : `Pay R ${total.toFixed(2)}`}
          </button>
        </div>

      </div>
    </div>
  );
}
