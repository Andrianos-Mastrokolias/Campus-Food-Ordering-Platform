import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import paymentService, { PAYMENT_METHOD, PAYMENT_STATUS } from '../../services/paymentService';
import './PaymentPage.css';

/**
 * PaymentPage — US5 + US3
 *
 * US3 change: after a successful payment, createOrderAfterPayment() is called
 * to create the Firestore order with status "paid". Orders are no longer
 * created at checkout — only after payment is confirmed.
 */
export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useCart();

  const { paymentId, orderId, amount, items, showMethodSelector: initialShowSelector } = location.state || {};

  const [phase, setPhase]               = useState('input');
  const [result, setResult]             = useState(null);
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [cardDetails, setCardDetails]   = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [cardErrors, setCardErrors]     = useState({});
  const [error, setError]               = useState('');
  const [showSelector, setShowSelector] = useState(initialShowSelector || false);
  const [selectedMethod, setSelectedMethod] = useState(location.state?.method || PAYMENT_METHOD.UPI);

  useEffect(() => {
    if (!paymentId) navigate('/home');
  }, [paymentId, navigate]);

  if (!paymentId) return null;

  const method = selectedMethod;
  const upiUri = paymentService.buildUpiUri(amount, `Order ${orderId}`);
  const qrUrl  = paymentService.getUpiQrUrl(upiUri, 220);

  function validateCard() {
    const errs = {};
    const num = cardDetails.number.replace(/\s/g, '');
    if (!num || num.length < 13) errs.number = 'Enter a valid card number';
    if (!cardDetails.expiry.match(/^\d{2}\/\d{2}$/)) errs.expiry = 'Format: MM/YY';
    if (!cardDetails.cvv.match(/^\d{3,4}$/)) errs.cvv = 'Enter 3 or 4 digits';
    if (!cardDetails.name.trim()) errs.name = 'Enter cardholder name';
    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function formatCardNumber(val) {
    return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  }
  function formatExpiry(val) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    return digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }

  async function handleCardSubmit(e) {
    e.preventDefault();
    if (!validateCard()) return;
    await runPayment(() => paymentService.processMockPayment(paymentId, cardDetails));
  }

  async function handleMockSubmit() {
    await runPayment(() => paymentService.processMockPayment(paymentId));
  }

  async function handleUpiConfirm() {
    setUpiConfirmed(true);
    await runPayment(() => paymentService.confirmUpiPayment(paymentId));
  }

  /**
   * US3: After payment succeeds, create the order in Firestore with status "paid".
   * This is the ONLY place orders are created — never at checkout.
   */
  async function runPayment(fn) {
    setError('');
    setPhase('processing');
    try {
      const res = await fn();

      // US3: create order only on successful payment
      if (res.success && items && items.length > 0) {
        try {
          await paymentService.createOrderAfterPayment({
            paymentId,
            orderId,
            userId:         user.uid,
            userEmail:      user.email,
            userName:       user.displayName || '',
            amount,
            items,
            transactionRef: res.transactionRef,
          });
      
          // Clear the cart only after the payment succeeds and the order is created.
          clearCart();
        } catch (orderErr) {
          // Payment went through — log error but don't block success screen
          console.error('Order creation failed after payment:', orderErr);
        }
      }

      setResult(res);
      setPhase('result');
    } catch (err) {
      setError('Payment processing failed. Please try again.');
      setPhase('input');
    }
  }

  async function handleCancel() {
    await paymentService.cancelPayment(paymentId);
    navigate('/home');
  }

  return (
    <main className="page payment-page">
      <section className="payment-container">

        {/* Header */}
        <header className="payment-header">
          <section className="payment-header-left">
            <h2>Secure Payment</h2>
            <p>Order {orderId} · {paymentService.formatAmount(amount)}</p>
          </section>
          <p className="payment-lock">🔒</p>
        </header>

        {/* Processing */}
        {phase === 'processing' && (
          <section className="payment-phase processing-phase">
            <section className="spinner" />
            <h3>Processing your payment…</h3>
            <p>Please do not close this window.</p>
          </section>
        )}

        {/* Result */}
{phase === 'result' && result && (
  <section className="payment-phase result-phase">
    <p
      className={`result-icon ${
        result.success ? 'success' : 'fail'
      }`}
    >
      {result.success ? '✅' : '❌'}
    </p>

    <h3>
      {result.success
        ? 'Payment Successful!'
        : 'Payment Failed'}
    </h3>

    {result.success ? (
      <>
        <p>
          Your order has been placed and is waiting for the vendor.
        </p>

        <section className="result-detail">
          <p>Transaction ref</p>

          <code>{result.transactionRef}</code>
        </section>

        <section className="result-detail">
          <p>Amount paid</p>

          <strong>
            {paymentService.formatAmount(amount)}
          </strong>
        </section>

        <section className="result-detail">
          <p>Order status</p>

          <strong style={{ color: '#10b981' }}>
            Paid ✓
          </strong>
        </section>
      </>
    ) : (
      <>
        <p className="fail-reason">{result.reason}</p>

        <p>
          No amount has been charged. Please try again.
        </p>
      </>
    )}

    <footer className="result-actions">
      {result.success ? (
        <button
          className="btn btn-primary"
          onClick={() => navigate('/orders')}
        >
          Track My Order
        </button>
      ) : (
        <>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/home')}
          >
            Cancel
          </button>

          <button
            className="btn btn-primary"
            onClick={() => setPhase('input')}
          >
            Try Again
          </button>
        </>
      )}
    </footer>
  </section>
)}

        {/* Method Selector */}
{phase === 'input' && showSelector && (
  <section className="payment-phase" style={{ padding: '24px' }}>
    <h3 style={{ marginBottom: '16px', color: '#1e3a5f', fontSize: '1rem', fontWeight: '700' }}>
      Choose Payment Method
    </h3>

    {/* Order summary */}
    <section style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
      <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '8px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Order Summary
      </p>

      {items && items.map((item, i) => (
        <section key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '4px 0', color: '#1e293b' }}>
          <p>{item.name} ×{item.quantity || item.qty || 1}</p>
          <p>{item.price}</p>
        </section>
      ))}

      <section style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '700', color: '#1e3a5f', borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '8px' }}>
        <p>Total</p>
        <p>{paymentService.formatAmount(amount)}</p>
      </section>
    </section>

    <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
      {[
        { id: PAYMENT_METHOD.UPI, label: 'UPI / PaySnap QR', icon: '📱' },
        { id: PAYMENT_METHOD.CARD, label: 'Credit / Debit Card', icon: '💳' },
        { id: PAYMENT_METHOD.EFT, label: 'EFT / Bank Transfer', icon: '🏦' },
        { id: PAYMENT_METHOD.WALLET, label: 'Campus Wallet', icon: '👝' },
      ].map(m => (
        <button
          key={m.id}
          onClick={() => setSelectedMethod(m.id)}
          style={{
            padding: '14px 10px',
            border: `2px solid ${selectedMethod === m.id ? '#1e3a5f' : '#e2e8f0'}`,
            borderRadius: '10px',
            background: selectedMethod === m.id ? '#dbeafe' : '#f8fafc',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '0.82rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            color: '#1e293b',
            transition: 'all 0.15s',
          }}
        >
          <p style={{ fontSize: '1.4rem' }}>{m.icon}</p>

          <p>{m.label}</p>

          {selectedMethod === m.id && (
            <p style={{ fontSize: '0.7rem', color: '#1e3a5f', fontWeight: '700' }}>
              ✓ Selected
            </p>
          )}
        </button>
      ))}
    </section>

    <footer style={{ display: 'flex', gap: '10px' }}>
      <button className="btn btn-secondary" onClick={handleCancel}>
        Cancel
      </button>

      <button
        className="btn btn-primary"
        style={{ flex: 1 }}
        onClick={() => setShowSelector(false)}
      >
        Continue with {selectedMethod.toUpperCase()} →
      </button>
    </footer>
  </section>
)}

        {/* UPI */}
{phase === 'input' && !showSelector && method === PAYMENT_METHOD.UPI && (
  <section className="payment-phase upi-phase">
    <section className="upi-info-banner">
      <p>📱</p>

      <section>
        <strong>PaySnap / UPI QR Payment</strong>

        <p>Scan the QR code below with any UPI-enabled app.</p>
      </section>
    </section>

    <figure className="qr-wrapper">
      <img
        src={qrUrl}
        alt="UPI Payment QR Code"
        className="qr-image"
        width={220}
        height={220}
      />

      <figcaption className="qr-amount">
        {paymentService.formatAmount(amount)}
      </figcaption>

      <p className="qr-vpa">Pay to: campusfood@upi</p>
    </figure>

    <section className="upi-uri-box">
      <p className="upi-uri-label">UPI URI</p>

      <code className="upi-uri-text">
        {upiUri.slice(0, 60)}…
      </code>
    </section>

    <p className="upi-instructions">
      After completing the payment in your UPI app, tap the button below to confirm.
    </p>

    {error && (
      <section className="alert alert-danger" role="alert">
        <p>{error}</p>
      </section>
    )}

    <footer className="payment-actions">
      <button
        className="btn btn-secondary"
        onClick={() => setShowSelector(true)}
      >
        ← Back
      </button>

      <button
        className="btn btn-primary"
        onClick={handleUpiConfirm}
        disabled={upiConfirmed}
      >
        {upiConfirmed ? 'Confirming…' : "I've Paid — Confirm"}
      </button>
    </footer>
  </section>
)}

        {/* Card */}
{phase === 'input' && !showSelector && method === PAYMENT_METHOD.CARD && (
  <section className="payment-phase card-phase">
    <section className="card-preview">
      <p className="card-chip">💳</p>

      <p className="card-number-preview">
        {cardDetails.number || '•••• •••• •••• ••••'}
      </p>

      <section className="card-meta-preview">
        <p>{cardDetails.name || 'CARDHOLDER NAME'}</p>
        <p>{cardDetails.expiry || 'MM/YY'}</p>
      </section>
    </section>

    <form className="card-form" onSubmit={handleCardSubmit} noValidate>
      <section className="form-group">
        <label>Card Number</label>

        <input
          type="text"
          className={`form-control ${cardErrors.number ? 'is-invalid' : ''}`}
          placeholder="1234 5678 9012 3456"
          value={cardDetails.number}
          onChange={(e) =>
            setCardDetails((p) => ({
              ...p,
              number: formatCardNumber(e.target.value),
            }))
          }
          maxLength={19}
        />

        {cardErrors.number && (
          <p className="invalid-feedback">{cardErrors.number}</p>
        )}
      </section>

      <section className="form-row">
        <section className="form-group">
          <label>Expiry Date</label>

          <input
            type="text"
            className={`form-control ${cardErrors.expiry ? 'is-invalid' : ''}`}
            placeholder="MM/YY"
            value={cardDetails.expiry}
            onChange={(e) =>
              setCardDetails((p) => ({
                ...p,
                expiry: formatExpiry(e.target.value),
              }))
            }
            maxLength={5}
          />

          {cardErrors.expiry && (
            <p className="invalid-feedback">{cardErrors.expiry}</p>
          )}
        </section>

        <section className="form-group">
          <label>CVV</label>

          <input
            type="password"
            className={`form-control ${cardErrors.cvv ? 'is-invalid' : ''}`}
            placeholder="•••"
            value={cardDetails.cvv}
            onChange={(e) =>
              setCardDetails((p) => ({
                ...p,
                cvv: e.target.value.replace(/\D/g, '').slice(0, 4),
              }))
            }
            maxLength={4}
          />

          {cardErrors.cvv && (
            <p className="invalid-feedback">{cardErrors.cvv}</p>
          )}
        </section>
      </section>

      <section className="form-group">
        <label>Cardholder Name</label>

        <input
          type="text"
          className={`form-control ${cardErrors.name ? 'is-invalid' : ''}`}
          placeholder="As it appears on the card"
          value={cardDetails.name}
          onChange={(e) =>
            setCardDetails((p) => ({
              ...p,
              name: e.target.value,
            }))
          }
        />

        {cardErrors.name && (
          <p className="invalid-feedback">{cardErrors.name}</p>
        )}
      </section>

      {error && (
        <section className="alert alert-danger" role="alert">
          <p>{error}</p>
        </section>
      )}

      <footer className="payment-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => setShowSelector(true)}
        >
          ← Back
        </button>

        <button type="submit" className="btn btn-primary">
          Pay {paymentService.formatAmount(amount)}
        </button>
      </footer>
    </form>
  </section>
)}

        {/* EFT */}
{phase === 'input' && !showSelector && method === PAYMENT_METHOD.EFT && (
  <section className="payment-phase eft-phase">
    <section className="eft-details">
      <h3>🏦 Instant EFT Details</h3>

      <section className="bank-detail">
        <p>Bank</p>
        <strong>First National Bank</strong>
      </section>

      <section className="bank-detail">
        <p>Account name</p>
        <strong>Campus Food Platform</strong>
      </section>

      <section className="bank-detail">
        <p>Account number</p>
        <strong>62 000 123 456</strong>
      </section>

      <section className="bank-detail">
        <p>Branch code</p>
        <strong>250 655</strong>
      </section>

      <section className="bank-detail">
        <p>Reference</p>
        <strong>{orderId}</strong>
      </section>

      <section className="bank-detail total">
        <p>Amount</p>
        <strong>{paymentService.formatAmount(amount)}</strong>
      </section>
    </section>

    <p className="eft-note">
      Complete the transfer in your banking app and click confirm once done.
    </p>

    {error && (
      <section className="alert alert-danger" role="alert">
        <p>{error}</p>
      </section>
    )}

    <footer className="payment-actions">
      <button
        className="btn btn-secondary"
        onClick={() => setShowSelector(true)}
      >
        ← Back
      </button>

      <button
        className="btn btn-primary"
        onClick={handleMockSubmit}
      >
        I've Transferred — Confirm
      </button>
    </footer>
  </section>
)}

        {/* Wallet */}
{phase === 'input' && !showSelector && method === PAYMENT_METHOD.WALLET && (
  <section className="payment-phase wallet-phase">
    <section className="wallet-balance-card">
      <p className="wallet-icon">👝</p>

      <section>
        <p className="wallet-balance-label">
          Campus Wallet Balance
        </p>

        <p className="wallet-balance-amount">
          R 250.00
        </p>
      </section>
    </section>

    <section className="wallet-deduct">
      <p>Amount to deduct</p>

      <strong>
        {paymentService.formatAmount(amount)}
      </strong>
    </section>

    <section className="wallet-deduct">
      <p>Remaining balance</p>

      <strong>
        R {(250.00 - amount).toFixed(2)}
      </strong>
    </section>

    {error && (
      <section className="alert alert-danger" role="alert">
        <p>{error}</p>
      </section>
    )}

    <footer className="payment-actions">
      <button
        className="btn btn-secondary"
        onClick={() => setShowSelector(true)}
      >
        ← Back
      </button>

      <button
        className="btn btn-primary"
        onClick={handleMockSubmit}
      >
        Pay with Wallet
      </button>
    </footer>
  </section>
)}

      </section>
    </main>
  );
}
