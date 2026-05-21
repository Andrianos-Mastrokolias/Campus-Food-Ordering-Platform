import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import paymentService, { PAYMENT_STATUS } from '../../services/paymentService';
import './PaymentHistory.css';

export default function PaymentHistory() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadPayments();
  }, [user]);

  async function loadPayments() {
    try {
      const data = await paymentService.getUserPayments(user.uid);
      setPayments(data);
    } catch (err) {
      setError('Could not load payment history. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const STATUS_META = {
    [PAYMENT_STATUS.PENDING]:    { label: 'Pending',    cls: 'pending'    },
    [PAYMENT_STATUS.PROCESSING]: { label: 'Processing', cls: 'processing' },
    [PAYMENT_STATUS.SUCCESS]:    { label: 'Paid',       cls: 'success'    },
    [PAYMENT_STATUS.FAILED]:     { label: 'Failed',     cls: 'failed'     },
    [PAYMENT_STATUS.CANCELLED]:  { label: 'Cancelled',  cls: 'cancelled'  },
  };

  const METHOD_ICON = { upi: '📱', card: '💳', eft: '🏦', wallet: '👝' };

  function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <main className="page history-page">

  <section className="history-container">

    <header className="history-header">
      <h2>💳 Payment History</h2>

      <button
        className="btn btn-primary"
        onClick={() => navigate("/checkout")}
      >
        + New Order
      </button>
    </header>

    {loading && (
      <section className="history-loading">
        <progress className="spinner" />
        <p>Loading…</p>
      </section>
    )}

    {error && (
      <aside className="alert alert-danger">
        {error}
      </aside>
    )}

    {!loading && !error && payments.length === 0 && (
      <section className="history-empty">
        <p className="empty-icon">🧾</p>

        <h3>No payments yet</h3>

        <p>
          Your payment history will appear here after you place an order.
        </p>

        <button
          className="btn btn-primary"
          onClick={() => navigate("/checkout")}
        >
          Place your first order
        </button>
      </section>
    )}

    {!loading && payments.length > 0 && (
      <section className="history-list">
        {payments.map((p) => {
          const meta =
            STATUS_META[p.status] || {
              label: p.status,
              cls: "pending",
            };

          return (
            <article key={p.id} className="history-card">
              <header className="hcard-top">
                <section className="hcard-method">
                  <strong className="hcard-method-icon">
                    {METHOD_ICON[p.method] || "💰"}
                  </strong>

                  <section>
                    <p className="hcard-order-id">{p.orderId}</p>
                    <time className="hcard-date">
                      {formatDate(p.createdAt)}
                    </time>
                  </section>
                </section>

                <section className="hcard-right">
                  <p className="hcard-amount">
                    {paymentService.formatAmount(p.amount)}
                  </p>

                  <mark className={`status-badge ${meta.cls}`}>
                    {meta.label}
                  </mark>
                </section>
              </header>

              {p.items && p.items.length > 0 && (
                <section className="hcard-items">
                  {p.items.map((item, i) => (
                    <mark key={i} className="hcard-item-tag">
                      {item.name} ×{item.qty}
                    </mark>
                  ))}
                </section>
              )}

              {p.transactionRef && (
                <p className="hcard-txn">
                  Ref: <code>{p.transactionRef}</code>
                </p>
              )}

              {p.failureReason && (
                <aside className="hcard-failure">
                  {p.failureReason}
                </aside>
              )}
            </article>
          );
        })}
      </section>
    )}

  </section>

</main>
  );
}
