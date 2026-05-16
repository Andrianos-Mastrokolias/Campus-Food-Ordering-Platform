/**
 * Payment Service - US5: Student Payments
 * Handles all payment operations and Firestore persistence.
 *
 * US3 update: createOrderAfterPayment() creates the Firestore order
 * ONLY after a successful payment, ensuring orders are never created
 * without a confirmed payment.
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
import { db } from '../firebase';

const PAYMENTS_COLLECTION = 'payments';
const ORDERS_COLLECTION   = 'orders';
const CAMPUS_UPI_VPA      = 'campusfood@upi';
const MOCK_PROCESSING_MS  = 2500;
const MOCK_SUCCESS_RATE   = 0.9;

export const PAYMENT_STATUS = {
  PENDING:   'pending',
  PROCESSING:'processing',
  SUCCESS:   'success',
  FAILED:    'failed',
  CANCELLED: 'cancelled',
};

export const PAYMENT_METHOD = {
  UPI:    'upi',
  CARD:   'card',
  EFT:    'eft',
  WALLET: 'wallet',
};

class PaymentService {

  // ── UPI helpers ──────────────────────────────────────────────────────────────
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

  getUpiQrUrl(upiUri, size = 220) {
    const encoded = encodeURIComponent(upiUri);
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`;
  }

  // ── Payment Firestore CRUD ────────────────────────────────────────────────────
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

  async getPaymentById(paymentId) {
    try {
      const snap = await getDoc(doc(db, PAYMENTS_COLLECTION, paymentId));
      return snap.exists() ? { id: snap.id, ...snap.data() } : null;
    } catch (error) {
      console.error('Error fetching payment:', error);
      throw new Error('Failed to fetch payment');
    }
  }

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

  async getAllPayments() {
    try {
      const q = query(collection(db, PAYMENTS_COLLECTION), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (error) {
      console.error('Error fetching all payments:', error);
      throw new Error('Failed to fetch payments');
    }
  }

  // ── US3: Create order AFTER successful payment ────────────────────────────────
  /**
   * Creates Firestore order documents only after payment is confirmed.
   * Orders start with status "paid" so vendors know payment is complete.
   * Groups cart items by vendorId — one order document per vendor.
   *
   * @param {Object} params
   * @param {string} params.paymentId
   * @param {string} params.orderId
   * @param {string} params.userId
   * @param {string} params.userEmail
   * @param {string} params.userName
   * @param {number} params.amount
   * @param {Array}  params.items       - Cart items with vendor info
   * @param {string} params.transactionRef
   * @returns {Promise<string[]>} Array of created order document IDs
   */
  async createOrderAfterPayment({ paymentId, orderId, userId, userEmail, userName, amount, items, transactionRef }) {
    try {
      // Group items by vendor
      const ordersByVendor = {};
      items.forEach((item) => {
        const vendorId   = item.vendor?.id || item.vendorId || 'unknown';
        const vendorName = item.vendor?.name || item.vendorName || 'Unknown Vendor';
        if (!ordersByVendor[vendorId]) {
          ordersByVendor[vendorId] = { vendorId, vendorName, items: [], total: 0 };
        }
        const price = Number(String(item.price).replace('R', ''));
        ordersByVendor[vendorId].items.push({
          id:       item.id || '',
          name:     item.name,
          price:    item.price,
          quantity: item.qty || item.quantity || 1,
        });
        ordersByVendor[vendorId].total += price * (item.qty || item.quantity || 1);
      });

      const orderIds = [];
      for (const vendorId in ordersByVendor) {
        const group = ordersByVendor[vendorId];
        const ref = await addDoc(collection(db, ORDERS_COLLECTION), {
          orderId,
          paymentId,
          transactionRef:  transactionRef || null,
          vendorId:        group.vendorId,
          vendorName:      group.vendorName,
          studentId:       userId,
          studentEmail:    userEmail,
          studentName:     userName || '',
          items:           group.items,
          total:           group.total,
          // US3: Order starts as "paid" — not "pending"
          // "paid"     = payment confirmed, waiting for vendor to start preparing
          // "preparing" = vendor is making the order
          // "ready"     = order is ready for collection
          // "completed" = student collected the order
          status:          'paid',
          paymentStatus:   'paid',
          createdAt:       serverTimestamp(),
        });
        orderIds.push(ref.id);
      }

      return orderIds;
    } catch (error) {
      console.error('Error creating order after payment:', error);
      throw new Error('Failed to create order after payment');
    }
  }

  // ── Mock payment processor ────────────────────────────────────────────────────
  async processMockPayment(paymentId, cardDetails = {}) {
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.PROCESSING);
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

  async confirmUpiPayment(paymentId) {
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.PROCESSING);
    await new Promise(resolve => setTimeout(resolve, 1500));
    const transactionRef = `UPI-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.SUCCESS, { transactionRef });
    return { success: true, transactionRef };
  }

  async cancelPayment(paymentId) {
    await this.updatePaymentStatus(paymentId, PAYMENT_STATUS.CANCELLED);
  }

  formatAmount(amount) {
    return `R ${Number(amount).toFixed(2)}`;
  }

  generateOrderId() {
    const ts  = Date.now().toString(36).toUpperCase();
    const rnd = Math.random().toString(36).slice(2, 5).toUpperCase();
    return `CF-${ts}-${rnd}`;
  }
}

export default new PaymentService();
