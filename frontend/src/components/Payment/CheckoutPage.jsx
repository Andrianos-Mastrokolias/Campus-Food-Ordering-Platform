import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import paymentService, { PAYMENT_METHOD } from '../../services/paymentService';
import './CheckoutPage.css';

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

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHOD.UPI);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const subtotal   = DEMO_CART.reduce((sum, item) => sum + item.price * item.qty, 0);
  const serviceFee = 5.00;
  const total      = subtotal + serviceFee;

  const handleProceed = async () => {
    if (!user) { navigate('/login'); return; }
    setError('');
    setLoading(true);
    try {
      const orderId    = paymentService.generateOrderId();
      const paymentId  = await paymentService.createPayment({
        userId:    user.uid,
        userEmail: user.email,
        userName:  user.displayName,
        orderId,
        amount:    total,
        method:    selectedMethod,
        items:     DEMO_CART,
      });
      navigate('/payment', {
        state: { paymentId, orderId, amount: total, method: selectedMethod, items: DEMO_CART },
      });
    } catch (err) {
      setError('Could not initiate payment. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page checkout-page">

  <section className="checkout-container">

    <header className="checkout-header">
      <h2>🛒 Checkout</h2>
      <p className="checkout-subtitle">
        Review your order and choose how to pay
      </p>
    </header>

    <section className="checkout-body">

      <section className="checkout-section order-summary">
        <h3>Order Summary</h3>

        <section className="order-items">
          {DEMO_CART.map((item) => (
            <article key={item.id} className="order-item">
              <strong className="item-name">{item.name}</strong>
              <strong className="item-qty">×{item.qty}</strong>
              <strong className="item-price">
                R {(item.price * item.qty).toFixed(2)}
              </strong>
            </article>
          ))}
        </section>

        <section className="order-totals">
          <p className="total-row">
            <strong>Subtotal</strong>
            <strong>R {subtotal.toFixed(2)}</strong>
          </p>

          <p className="total-row">
            <strong>Service fee</strong>
            <strong>R {serviceFee.toFixed(2)}</strong>
          </p>

          <p className="total-row total-final">
            <strong>Total</strong>
            <strong>R {total.toFixed(2)}</strong>
          </p>
        </section>
      </section>

      <section className="checkout-section payment-method-section">
        <h3>Payment Method</h3>

        <section className="method-grid">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.id}
              className={`method-card ${selectedMethod === m.id ? "selected" : ""}`}
              onClick={() => setSelectedMethod(m.id)}
            >
              <strong className="method-icon">{m.icon}</strong>
              <strong className="method-label">{m.label}</strong>
              <small className="method-desc">{m.description}</small>

              {selectedMethod === m.id && (
                <strong className="method-check">✓</strong>
              )}
            </button>
          ))}
        </section>
      </section>

    </section>

    {error && (
      <aside className="alert alert-danger">
        {error}
      </aside>
    )}

    <footer className="checkout-actions">
      <button
        className="btn btn-secondary"
        onClick={() => navigate("/home")}
        disabled={loading}
      >
        ← Back
      </button>

      <button
        className="btn btn-primary btn-pay"
        onClick={handleProceed}
        disabled={loading}
      >
        {loading ? "Preparing payment…" : `Pay R ${total.toFixed(2)}`}
      </button>
    </footer>

  </section>

</main>
  );
}
