import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import paymentService, { PAYMENT_METHOD, PAYMENT_STATUS } from '../../services/paymentService';
import './PaymentPage.css';

/**
 * PaymentPage — US5: Student Payments
 *
 * Renders the correct payment UI based on the selected method:
 *  - UPI / PaySnap QR : Shows a scannable QR code built from a UPI URI
 *                       (same concept as github.com/jeetgoyal80/PaySnap but
 *                        pure frontend — no FastAPI backend required).
 *  - Card             : Mock card entry form with processing animation.
 *  - EFT / Wallet     : Mock confirmation with processing animation.
 *
 * All results are persisted to Firestore via paymentService.
 */

export default function PaymentPage() {
  const location = useLocation();
  const navigate  = useNavigate();

  const { paymentId, orderId, amount, method, items } = location.state || {};

  const [phase, setPhase]             = useState('input');   // input | processing | result
  const [result, setResult]           = useState(null);      // { success, transactionRef, reason }
  const [upiConfirmed, setUpiConfirmed] = useState(false);
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [cardErrors, setCardErrors]   = useState({});
  const [error, setError]             = useState('');

  // Guard: if landed here without state, redirect home
  useEffect(() => {
    if (!paymentId) navigate('/');
  }, [paymentId, navigate]);

  if (!paymentId) return null;

  // ── UPI URI & QR ─────────────────────────────────────────────────────────
  const upiUri  = paymentService.buildUpiUri(amount, `Order ${orderId}`);
  const qrUrl   = paymentService.getUpiQrUrl(upiUri, 220);

  // ── Card validation ───────────────────────────────────────────────────────
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
    return digits.length >= 3 ? `${digits.slice(0,2)}/${digits.slice(2)}` : digits;
  }

  // ── Submit handlers ───────────────────────────────────────────────────────
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

  async function runPayment(fn) {
    setError('');
    setPhase('processing');
    try {
      const res = await fn();
      setResult(res);
      setPhase('result');
    } catch (err) {
      setError('Payment processing failed. Please try again.');
      setPhase('input');
    }
  }

  async function handleCancel() {
    await paymentService.cancelPayment(paymentId);
    navigate('/checkout');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="page payment-page">
      <div className="payment-container">

        {/* Header */}
        <div className="payment-header">
          <div className="payment-header-left">
            <h2>Secure Payment</h2>
            <p>Order {orderId} · {paymentService.formatAmount(amount)}</p>
          </div>
          <div className="payment-lock">🔒</div>
        </div>

        {/* ── PROCESSING ────────────────────────────────────────────── */}
        {phase === 'processing' && (
          <div className="payment-phase processing-phase">
            <div className="spinner" />
            <h3>Processing your payment…</h3>
            <p>Please do not close this window.</p>
          </div>
        )}

        {/* ── RESULT ────────────────────────────────────────────────── */}
        {phase === 'result' && result && (
          <div className="payment-phase result-phase">
            <div className={`result-icon ${result.success ? 'success' : 'fail'}`}>
              {result.success ? '✅' : '❌'}
            </div>
            <h3>{result.success ? 'Payment Successful!' : 'Payment Failed'}</h3>
            {result.success ? (
              <>
                <p>Your order has been placed.</p>
                <div className="result-detail">
                  <span>Transaction ref</span>
                  <code>{result.transactionRef}</code>
                </div>
                <div className="result-detail">
                  <span>Amount paid</span>
                  <strong>{paymentService.formatAmount(amount)}</strong>
                </div>
              </>
            ) : (
              <>
                <p className="fail-reason">{result.reason}</p>
                <p>No amount has been charged. Please try again.</p>
              </>
            )}
            <div className="result-actions">
              {result.success ? (
                <button className="btn btn-primary" onClick={() => navigate('/')}>
                  Back to Home
                </button>
              ) : (
                <>
                  <button className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
                  <button className="btn btn-primary" onClick={() => setPhase('input')}>Try Again</button>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── INPUT — UPI ───────────────────────────────────────────── */}
        {phase === 'input' && method === PAYMENT_METHOD.UPI && (
          <div className="payment-phase upi-phase">
            <div className="upi-info-banner">
              <span>📱</span>
              <div>
                <strong>PaySnap / UPI QR Payment</strong>
                <p>Scan the QR code below with any UPI-enabled app (GPay, PhonePe, Paytm, PayFast).</p>
              </div>
            </div>

            <div className="qr-wrapper">
              <img
                src={qrUrl}
                alt="UPI Payment QR Code"
                className="qr-image"
                width={220}
                height={220}
              />
              <div className="qr-amount">{paymentService.formatAmount(amount)}</div>
              <div className="qr-vpa">Pay to: campus food@upi</div>
            </div>

            <div className="upi-uri-box">
              <span className="upi-uri-label">UPI URI</span>
              <code className="upi-uri-text">{upiUri.slice(0, 60)}…</code>
            </div>

            <p className="upi-instructions">
              After completing the payment in your UPI app, tap the button below to confirm.
            </p>

            {error && <div className="alert alert-danger">{error}</div>}

            <div className="payment-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleUpiConfirm}
                disabled={upiConfirmed}
              >
                {upiConfirmed ? 'Confirming…' : "I've Paid — Confirm"}
              </button>
            </div>
          </div>
        )}

        {/* ── INPUT — CARD ──────────────────────────────────────────── */}
        {phase === 'input' && method === PAYMENT_METHOD.CARD && (
          <div className="payment-phase card-phase">
            <div className="card-preview">
              <div className="card-chip">💳</div>
              <div className="card-number-preview">
                {cardDetails.number || '•••• •••• •••• ••••'}
              </div>
              <div className="card-meta-preview">
                <span>{cardDetails.name || 'CARDHOLDER NAME'}</span>
                <span>{cardDetails.expiry || 'MM/YY'}</span>
              </div>
            </div>

            <form className="card-form" onSubmit={handleCardSubmit} noValidate>
              <div className="form-group">
                <label>Card Number</label>
                <input
                  type="text"
                  className={`form-control ${cardErrors.number ? 'is-invalid' : ''}`}
                  placeholder="1234 5678 9012 3456"
                  value={cardDetails.number}
                  onChange={e => setCardDetails(p => ({ ...p, number: formatCardNumber(e.target.value) }))}
                  maxLength={19}
                />
                {cardErrors.number && <div className="invalid-feedback">{cardErrors.number}</div>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Expiry Date</label>
                  <input
                    type="text"
                    className={`form-control ${cardErrors.expiry ? 'is-invalid' : ''}`}
                    placeholder="MM/YY"
                    value={cardDetails.expiry}
                    onChange={e => setCardDetails(p => ({ ...p, expiry: formatExpiry(e.target.value) }))}
                    maxLength={5}
                  />
                  {cardErrors.expiry && <div className="invalid-feedback">{cardErrors.expiry}</div>}
                </div>
                <div className="form-group">
                  <label>CVV</label>
                  <input
                    type="password"
                    className={`form-control ${cardErrors.cvv ? 'is-invalid' : ''}`}
                    placeholder="•••"
                    value={cardDetails.cvv}
                    onChange={e => setCardDetails(p => ({ ...p, cvv: e.target.value.replace(/\D/g,'').slice(0,4) }))}
                    maxLength={4}
                  />
                  {cardErrors.cvv && <div className="invalid-feedback">{cardErrors.cvv}</div>}
                </div>
              </div>

              <div className="form-group">
                <label>Cardholder Name</label>
                <input
                  type="text"
                  className={`form-control ${cardErrors.name ? 'is-invalid' : ''}`}
                  placeholder="As it appears on the card"
                  value={cardDetails.name}
                  onChange={e => setCardDetails(p => ({ ...p, name: e.target.value }))}
                />
                {cardErrors.name && <div className="invalid-feedback">{cardErrors.name}</div>}
              </div>

              {error && <div className="alert alert-danger">{error}</div>}

              <div className="payment-actions">
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
                <button type="submit" className="btn btn-primary">
                  Pay {paymentService.formatAmount(amount)}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── INPUT — EFT ───────────────────────────────────────────── */}
        {phase === 'input' && method === PAYMENT_METHOD.EFT && (
          <div className="payment-phase eft-phase">
            <div className="eft-details">
              <h3>🏦 Instant EFT Details</h3>
              <div className="bank-detail"><span>Bank</span><strong>First National Bank</strong></div>
              <div className="bank-detail"><span>Account name</span><strong>Campus Food Platform</strong></div>
              <div className="bank-detail"><span>Account number</span><strong>62 000 123 456</strong></div>
              <div className="bank-detail"><span>Branch code</span><strong>250 655</strong></div>
              <div className="bank-detail"><span>Reference</span><strong>{orderId}</strong></div>
              <div className="bank-detail total"><span>Amount</span><strong>{paymentService.formatAmount(amount)}</strong></div>
            </div>
            <p className="eft-note">
              Complete the transfer in your banking app and click confirm once done.
              Your order will be processed after payment is verified.
            </p>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="payment-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMockSubmit}>
                I've Transferred — Confirm
              </button>
            </div>
          </div>
        )}

        {/* ── INPUT — WALLET ────────────────────────────────────────── */}
        {phase === 'input' && method === PAYMENT_METHOD.WALLET && (
          <div className="payment-phase wallet-phase">
            <div className="wallet-balance-card">
              <div className="wallet-icon">👝</div>
              <div>
                <div className="wallet-balance-label">Campus Wallet Balance</div>
                <div className="wallet-balance-amount">R 250.00</div>
              </div>
            </div>
            <div className="wallet-deduct">
              <span>Amount to deduct</span>
              <strong>{paymentService.formatAmount(amount)}</strong>
            </div>
            <div className="wallet-deduct">
              <span>Remaining balance after payment</span>
              <strong>R {(250.00 - amount).toFixed(2)}</strong>
            </div>
            {error && <div className="alert alert-danger">{error}</div>}
            <div className="payment-actions">
              <button className="btn btn-secondary" onClick={handleCancel}>Cancel</button>
              <button className="btn btn-primary" onClick={handleMockSubmit}>
                Pay with Wallet
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
