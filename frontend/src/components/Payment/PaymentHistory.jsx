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
    <div className="page history-page">
      <div className="history-container">
        <div className="history-header">
          <h2>💳 Payment History</h2>
          <button className="btn btn-primary" onClick={() => navigate('/checkout')}>+ New Order</button>
        </div>

        {loading && <div className="history-loading"><div className="spinner" /><p>Loading…</p></div>}
        {error   && <div className="alert alert-danger">{error}</div>}

        {!loading && !error && payments.length === 0 && (
          <div className="history-empty">
            <div className="empty-icon">🧾</div>
            <h3>No payments yet</h3>
            <p>Your payment history will appear here after you place an order.</p>
            <button className="btn btn-primary" onClick={() => navigate('/checkout')}>Place your first order</button>
          </div>
        )}

        {!loading && payments.length > 0 && (
          <div className="history-list">
            {payments.map(p => {
              const meta = STATUS_META[p.status] || { label: p.status, cls: 'pending' };
              return (
                <div key={p.id} className="history-card">
                  <div className="hcard-top">
                    <div className="hcard-method">
                      <span className="hcard-method-icon">{METHOD_ICON[p.method] || '💰'}</span>
                      <div>
                        <div className="hcard-order-id">{p.orderId}</div>
                        <div className="hcard-date">{formatDate(p.createdAt)}</div>
                      </div>
                    </div>
                    <div className="hcard-right">
                      <div className="hcard-amount">{paymentService.formatAmount(p.amount)}</div>
                      <span className={`status-badge ${meta.cls}`}>{meta.label}</span>
                    </div>
                  </div>
                  {p.items && p.items.length > 0 && (
                    <div className="hcard-items">
                      {p.items.map((item, i) => (
                        <span key={i} className="hcard-item-tag">{item.name} ×{item.qty}</span>
                      ))}
                    </div>
                  )}
                  {p.transactionRef && (
                    <div className="hcard-txn">Ref: <code>{p.transactionRef}</code></div>
                  )}
                  {p.failureReason && (
                    <div className="hcard-failure">{p.failureReason}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
