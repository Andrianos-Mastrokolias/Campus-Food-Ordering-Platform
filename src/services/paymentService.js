/**
 * Payment Service - US5: Student Payments
 * Handles all payment operations and Firestore persistence.
 *
 * Integration strategy:
 *  - PaySnap/UPI: We construct a standard UPI URI (upi://pay?...) and render
 *    it as a QR code using the free, no-backend api.qrserver.com service.
 *    This follows exactly the same approach as the PaySnap GitHub project
 *    (github.com/jeetgoyal80/PaySnap) but without requiring a FastAPI backend.
 *  - Card / EFT / Wallet: Mock payment flow with simulated processing delay.
 *  - All payment records are persisted to the `payments` Firestore collection.
 */

import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';

// ── Constants ────────────────────────────────────────────────────────────────

/** Firestore collection name */
const PAYMENTS_COLLECTION = 'payments';

/** Simulated UPI merchant VPA for the campus canteen */
const CAMPUS_UPI_VPA = 'campusfood@upi';

/** Simulated processing time in ms (mock only) */
const MOCK_PROCESSING_MS = 2500;

/** Mock success rate (90 % succeed, 10 % fail — for realistic demo) */
const MOCK_SUCCESS_RATE = 0.9;

// ── Payment status enum ───────────────────────────────────────────────────────

export const PAYMENT_STATUS = {
  PENDING:   'pending',
  PROCESSING:'processing',
  SUCCESS:   'success',
  FAILED:    'failed',
  CANCELLED: 'cancelled',
};

// ── Payment method enum ───────────────────────────────────────────────────────

export const PAYMENT_METHOD = {
  UPI:    'upi',
  CARD:   'card',
  EFT:    'eft',
  WALLET: 'wallet',
};

// ── Service class ─────────────────────────────────────────────────────────────

class PaymentService {

  // ── UPI helpers ─────────────────────────────────────────────────────────────

  /**
   * Build a standard UPI deep-link URI.
   * Format: upi://pay?pa=<vpa>&pn=<name>&am=<amount>&tn=<note>&cu=ZAR
   * This is the same URI format used by PaySnap internally.
   *
   * @param {number} amount  - Amount in ZAR
   * @param {string} note    - Payment note / order reference
   * @param {string} vpa     - UPI Virtual Payment Address (defaults to campus canteen)
   * @returns {string} UPI URI string
   */
  buildUpiUri(amount, note = 'Campus Food Order', vpa = CAMPUS_UPI_VPA) {
    const params = new URLSearchParams({
      pa: vpa,
      pn: 'Campus Food Platform',
      am: amount.toFixed(2),
      tn: note,
      cu: 'ZAR',
    });
    return `upi://pay?${params.toString()}`;
  }

  /**
   * Generate a QR code image URL for a UPI URI using the free qrserver.com API.
   * No backend or API key required — identical to PaySnap's QR generation concept.
   *
   * @param {string} upiUri  - UPI URI from buildUpiUri()
   * @param {number} size    - QR image size in pixels (default 220)
   * @returns {string} Image URL that resolves to a QR code PNG
   */
  getUpiQrUrl(upiUri, size = 220) {
    const encoded = encodeURIComponent(upiUri);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  }

  // ── Firestore operations ─────────────────────────────────────────────────────

  /**
   * Create a new payment record in Firestore with status "pending".
   *
   * @param {Object} paymentData
   * @param {string} paymentData.userId
   * @param {string} paymentData.userEmail
   * @param {string} paymentData.userName
   * @param {string} paymentData.orderId       - ID of the associated order
   * @param {number} paymentData.amount        - Total amount in ZAR
   * @param {string} paymentData.method        - PAYMENT_METHOD value
   * @param {Array}  paymentData.items         - Array of { name, qty, price }
   * @returns {Promise<string>} New payment document ID
   */
  async createPayment({ userId, userEmail, userName, orderId, amount, method, items }) {
    try {
      const docRef = await addDoc(collection(db, PAYMENTS_COLLECTION), {
        userId,
        userEmail,
        userName,
        orderId: orderId || `ORDER-${Date.now()}`,
        amount,
        method,
        items: items || [],
        status: PAYMENT_STATUS.PENDING,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        processedAt: null,
        failureReason: null,
        transactionRef: null,
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw new Error('Failed to create payment record');
    }
  }

  /**
   * Update payment status in Firestore.
   *
   * @param {string} paymentId
   * @param {string} status        - PAYMENT_STATUS value
   * @param {Object} [extra={}]    - Additional fields to merge (e.g. transactionRef)
   * @returns {Promise<void>}
   */
  async updatePaymentStatus(paymentId, status, extra = {}) {
    try {
      await updateDoc(doc(db, PAYMENTS_COLLECTION, paymentId), {
        status,
        updatedAt: serverTimestamp(),
        ...(status === PAYMENT_STATUS.SUCCESS || status === PAYMENT_STATUS.FAILED
          ? { processedAt: serverTimestamp() }
          : {}),
        ...extra,
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      throw new Error('Failed to update payment status');
    }
  }

  /**
   * Fetch a single payment by ID.
   * @param {string} paymentId
   * @returns {Promise<Object|null>}
   */
  async getPaymentById(paymentId) {
    try {
      const snap = await getDoc(doc(db, PAYMENTS_COLLECTION, paymentId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error('Failed to fetch payment');
    }
  }

  /**
   * Fetch all payments for a specific user, ordered by most recent first.
   * @param {string} userId
   * @returns {Promise<Array>}
   */
  async getUserPayments(userId) {
    try {
      const q = query(
        collection(db, PAYMENTS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error fetching user payments:', error);
      throw new Error('Failed to fetch payment history');
    }
  }

  /**
   * Fetch all payments (admin use).
   * @returns {Promise<Array>}
   */
  async getAllPayments() {
    try {
      const q = query(
        collection(db, PAYMENTS_COLLECTION),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error fetching all payments:', error);
      throw new Error('Failed to fetch payments');
    }
  }

  // ── Mock payment processor ────────────────────────────────────────────────

  /**
   * Process a mock payment (card / EFT / wallet methods).
   * Simulates a payment gateway: sets status to "processing", waits, then
   * randomly succeeds or fails based on MOCK_SUCCESS_RATE.
   *
   * @param {string} paymentId  - Firestore payment document ID
   * @param {Object} [cardDetails={}] - Optional card details (not stored)
   * @returns {Promise<{ success: boolean, transactionRef: string|null, reason: string|null }>}
   */
  async processMockPayment(paymentId, cardDetails = {}) {
    // Mark as processing
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.PROCESSING);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, MOCK_PROCESSING_MS));

    const success = Math.random() < MOCK_SUCCESS_RATE;
    const transactionRef = success
      ? `TXN-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
      : null;
    const failureReason = success ? null : 'Payment declined by issuing bank';

    await this.updatePaymentStatus(
      paymentId,
      success ? PAYMENT_STATUS.SUCCESS : PAYMENT_STATUS.FAILED,
      { transactionRef, failureReason }
    );

    return { success, transactionRef, reason: failureReason };
  }

  /**
   * Confirm a UPI payment manually (student clicks "I've paid" after scanning QR).
   * In a real integration this would be verified server-side via a webhook.
   * For mock/demo purposes we accept the user's confirmation at face value.
   *
   * @param {string} paymentId
   * @returns {Promise<{ success: boolean, transactionRef: string }>}
   */
  async confirmUpiPayment(paymentId) {
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.PROCESSING);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const transactionRef = `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.SUCCESS, { transactionRef });
    return { success: true, transactionRef };
  }

  /**
   * Cancel a pending payment.
   * @param {string} paymentId
   * @returns {Promise<void>}
   */
  async cancelPayment(paymentId) {
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.CANCELLED);
  }

  // ── Formatting helpers ───────────────────────────────────────────────────────

  /**
   * Format a ZAR amount as a currency string.
   * @param {number} amount
   * @returns {string}
   */
  formatAmount(amount) {
    return `R ${Number(amount).toFixed(2)}`;
  }

  /**
   * Generate a human-readable order ID for display.
   * @returns {string}
   */
  generateOrderId() {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `CF-${ts}-${rnd}`;
  }
}

export default new PaymentService();
