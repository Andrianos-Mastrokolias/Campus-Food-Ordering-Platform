// orderTracking.test.js
// User Case 3: Comprehensive test suite for order tracking

const request = require('supertest');
const app = require('../app');
const db = require('../config/database');
const { v4: uuidv4 } = require('uuid');

describe('Order Tracking - User Case 3', () => {
  let studentToken;
  let vendorToken;
  let testOrderId;
  let studentUserId;
  let vendorUserId;

  // Setup before all tests
  beforeAll(async () => {
    // Create test users and get auth tokens
    studentUserId = uuidv4();
    vendorUserId = uuidv4();
    
    // Mock authentication tokens (implement according to your auth system)
    studentToken = 'test-student-token';
    vendorToken = 'test-vendor-token';
    
    // Create test order
    testOrderId = uuidv4();
    const vendorId = uuidv4();
    
    await db.query(
      `INSERT INTO orders (order_id, student_id, vendor_id, total_amount, status, payment_status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [testOrderId, studentUserId, vendorId, 150.00, 'Order Received', 'Paid']
    );
    
    // Add test order items
    await db.query(
      `INSERT INTO order_items (item_id, order_id, menu_item_id, quantity, unit_price, subtotal)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), testOrderId, uuidv4(), 2, 75.00, 150.00]
    );
  });

  // Cleanup after all tests
  afterAll(async () => {
    await db.query('DELETE FROM orders WHERE order_id = ?', [testOrderId]);
    await db.end();
  });

  describe('Student Order Tracking', () => {
    test('GET /api/orders/my-orders - Should return student orders', async () => {
      const response = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.orders)).toBe(true);
    });

    test('GET /api/orders/:orderId/status - Should return order status', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order).toBeDefined();
      expect(response.body.order.order_id).toBe(testOrderId);
      expect(response.body.order.status).toBe('Order Received');
    });

    test('GET /api/orders/:orderId/track - Should return tracking information', async () => {
      const response = await request(app)
        .get(`/api/orders/${testOrderId}/track`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.tracking).toBeDefined();
      expect(response.body.tracking.order_id).toBe(testOrderId);
      expect(response.body.tracking.current_status).toBe('Order Received');
      expect(response.body.tracking.progress_percentage).toBe(25);
    });

    test('GET /api/orders/:orderId/status - Should not access other student orders', async () => {
      const otherOrderId = uuidv4();
      
      await request(app)
        .get(`/api/orders/${otherOrderId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });
  });

  describe('Vendor Order Management', () => {
    test('PUT /api/orders/:orderId/status - Should update order to Preparing', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Preparing' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.order.current_status).toBe('Preparing');
      
      // Verify in database
      const [orders] = await db.query(
        'SELECT status FROM orders WHERE order_id = ?',
        [testOrderId]
      );
      expect(orders[0].status).toBe('Preparing');
    });

    test('PUT /api/orders/:orderId/status - Should update to Ready for Pickup', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Ready for Pickup' })
        .expect(200);

      expect(response.body.success).toBe(true);
      
      // Verify ready_at timestamp is set
      const [orders] = await db.query(
        'SELECT status, ready_at FROM orders WHERE order_id = ?',
        [testOrderId]
      );
      expect(orders[0].status).toBe('Ready for Pickup');
      expect(orders[0].ready_at).not.toBeNull();
    });

    test('PUT /api/orders/:orderId/status - Should reject invalid status transition', async () => {
      // Reset to Preparing
      await db.query(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        ['Preparing', testOrderId]
      );
      
      // Try to jump to Completed (invalid transition)
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Completed' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Cannot transition');
    });

    test('PUT /api/orders/:orderId/status - Should create status history entry', async () => {
      await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ 
          status: 'Ready for Pickup',
          notes: 'Order is ready'
        })
        .expect(200);

      // Check status history
      const [history] = await db.query(
        'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY changed_at DESC LIMIT 1',
        [testOrderId]
      );
      
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].new_status).toBe('Ready for Pickup');
      expect(history[0].notes).toBe('Order is ready');
    });

    test('GET /api/orders/vendor/active - Should return vendor active orders', async () => {
      const response = await request(app)
        .get('/api/orders/vendor/active')
        .set('Authorization', `Bearer ${vendorToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.orders)).toBe(true);
    });
  });

  describe('Notifications', () => {
    test('Status update should create notification for student', async () => {
      await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Ready for Pickup' })
        .expect(200);

      // Check notification was created
      const [notifications] = await db.query(
        'SELECT * FROM notifications WHERE order_id = ? AND type = ?',
        [testOrderId, 'order_ready']
      );
      
      expect(notifications.length).toBeGreaterThan(0);
      expect(notifications[0].user_id).toBe(studentUserId);
    });

    test('GET /api/notifications/unread - Should return unread notifications', async () => {
      const response = await request(app)
        .get('/api/notifications/unread')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.notifications)).toBe(true);
    });

    test('PUT /api/notifications/:notificationId/read - Should mark notification as read', async () => {
      // Get a notification
      const [notifications] = await db.query(
        'SELECT notification_id FROM notifications WHERE user_id = ? LIMIT 1',
        [studentUserId]
      );
      
      if (notifications.length > 0) {
        const notificationId = notifications[0].notification_id;
        
        const response = await request(app)
          .put(`/api/notifications/${notificationId}/read`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        
        // Verify in database
        const [updated] = await db.query(
          'SELECT is_read FROM notifications WHERE notification_id = ?',
          [notificationId]
        );
        expect(updated[0].is_read).toBe(1);
      }
    });
  });

  describe('Status Validation', () => {
    test('Should validate status values', async () => {
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Invalid Status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid status');
    });

    test('Should enforce status transition rules', async () => {
      // Set to Completed
      await db.query(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        ['Completed', testOrderId]
      );
      
      // Try to move back to Preparing (not allowed)
      const response = await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${vendorToken}`)
        .send({ status: 'Preparing' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Real-time Updates', () => {
    test('Progress percentage should update correctly', async () => {
      const statuses = [
        { status: 'Order Received', expected: 25 },
        { status: 'Preparing', expected: 50 },
        { status: 'Ready for Pickup', expected: 75 },
        { status: 'Completed', expected: 100 }
      ];

      for (const { status, expected } of statuses) {
        await db.query(
          'UPDATE orders SET status = ? WHERE order_id = ?',
          [status, testOrderId]
        );

        const response = await request(app)
          .get(`/api/orders/${testOrderId}/track`)
          .set('Authorization', `Bearer ${studentToken}`)
          .expect(200);

        expect(response.body.tracking.progress_percentage).toBe(expected);
      }
    });

    test('Should calculate estimated time remaining', async () => {
      await db.query(
        'UPDATE orders SET status = ?, created_at = NOW() WHERE order_id = ?',
        ['Preparing', testOrderId]
      );

      const response = await request(app)
        .get(`/api/orders/${testOrderId}/track`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);

      expect(response.body.tracking.estimated_minutes_remaining).toBeDefined();
      expect(typeof response.body.tracking.estimated_minutes_remaining).toBe('number');
    });
  });

  describe('Authorization', () => {
    test('Should require authentication for student endpoints', async () => {
      await request(app)
        .get('/api/orders/my-orders')
        .expect(401);
    });

    test('Should require authentication for vendor endpoints', async () => {
      await request(app)
        .get('/api/orders/vendor/active')
        .expect(401);
    });

    test('Should require vendor role to update order status', async () => {
      await request(app)
        .put(`/api/orders/${testOrderId}/status`)
        .set('Authorization', `Bearer ${studentToken}`) // Student token, not vendor
        .send({ status: 'Preparing' })
        .expect(403);
    });
  });

  describe('Edge Cases', () => {
    test('Should handle non-existent order ID', async () => {
      const fakeOrderId = uuidv4();
      
      await request(app)
        .get(`/api/orders/${fakeOrderId}/status`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(404);
    });

    test('Should handle concurrent status updates', async () => {
      // Reset order
      await db.query(
        'UPDATE orders SET status = ? WHERE order_id = ?',
        ['Order Received', testOrderId]
      );

      // Simulate concurrent updates
      const updates = [
        request(app)
          .put(`/api/orders/${testOrderId}/status`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .send({ status: 'Preparing' }),
        request(app)
          .put(`/api/orders/${testOrderId}/status`)
          .set('Authorization', `Bearer ${vendorToken}`)
          .send({ status: 'Preparing' })
      ];

      const results = await Promise.all(updates);
      
      // At least one should succeed
      const successCount = results.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThan(0);
    });
  });
});
