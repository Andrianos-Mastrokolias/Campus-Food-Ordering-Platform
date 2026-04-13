// Order Tracking API Routes
// User Case 3: Order Tracking for Campus Food Ordering Platform

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendNotification } = require('../services/notificationService');

// Status flow validation
const VALID_STATUS_TRANSITIONS = {
  'Order Received': ['Preparing', 'Cancelled'],
  'Preparing': ['Ready for Pickup', 'Cancelled'],
  'Ready for Pickup': ['Completed', 'Cancelled'],
  'Completed': [],
  'Cancelled': []
};

// ===========================
// STUDENT ENDPOINTS
// ===========================

/**
 * GET /api/orders/my-orders
 * Get all orders for the authenticated student
 */
router.get('/my-orders', authenticateToken, authorizeRoles(['Student']), async (req, res) => {
  try {
    const studentId = req.user.userId;
    
    const query = `
      SELECT 
        o.order_id,
        o.total_amount,
        o.status,
        o.payment_status,
        o.created_at,
        o.updated_at,
        o.ready_at,
        v.vendor_name,
        v.location,
        COUNT(oi.item_id) as item_count
      FROM orders o
      JOIN vendors v ON o.vendor_id = v.vendor_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.student_id = ?
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
      LIMIT 50
    `;
    
    const [orders] = await db.query(query, [studentId]);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Error fetching student orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

/**
 * GET /api/orders/:orderId/status
 * Get real-time status of a specific order
 */
router.get('/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        o.order_id,
        o.status,
        o.created_at,
        o.updated_at,
        o.ready_at,
        v.vendor_name,
        v.location,
        v.estimated_prep_time
      FROM orders o
      JOIN vendors v ON o.vendor_id = v.vendor_id
      WHERE o.order_id = ? AND (o.student_id = ? OR o.vendor_id IN (
        SELECT vendor_id FROM vendor_staff WHERE user_id = ?
      ))
    `;
    
    const [orders] = await db.query(query, [orderId, userId, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }
    
    // Get order items
    const itemsQuery = `
      SELECT 
        oi.quantity,
        oi.unit_price,
        oi.special_instructions,
        mi.item_name,
        mi.description
      FROM order_items oi
      JOIN menu_items mi ON oi.menu_item_id = mi.menu_item_id
      WHERE oi.order_id = ?
    `;
    
    const [items] = await db.query(itemsQuery, [orderId]);
    
    // Get status history
    const historyQuery = `
      SELECT 
        previous_status,
        new_status,
        changed_at,
        notes
      FROM order_status_history
      WHERE order_id = ?
      ORDER BY changed_at ASC
    `;
    
    const [history] = await db.query(historyQuery, [orderId]);
    
    res.json({
      success: true,
      order: {
        ...orders[0],
        items: items,
        status_history: history
      }
    });
  } catch (error) {
    console.error('Error fetching order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order status',
      error: error.message
    });
  }
});

/**
 * GET /api/orders/:orderId/track
 * Get detailed tracking information with estimated times
 */
router.get('/:orderId/track', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        o.order_id,
        o.status,
        o.created_at,
        o.updated_at,
        o.ready_at,
        v.vendor_name,
        v.estimated_prep_time,
        TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) as elapsed_minutes
      FROM orders o
      JOIN vendors v ON o.vendor_id = v.vendor_id
      WHERE o.order_id = ? AND o.student_id = ?
    `;
    
    const [orders] = await db.query(query, [orderId, userId]);
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Calculate estimated completion time
    let estimatedMinutesRemaining = 0;
    if (order.status === 'Order Received') {
      estimatedMinutesRemaining = order.estimated_prep_time;
    } else if (order.status === 'Preparing') {
      const elapsedSincePreparing = order.elapsed_minutes;
      estimatedMinutesRemaining = Math.max(0, order.estimated_prep_time - elapsedSincePreparing);
    }
    
    res.json({
      success: true,
      tracking: {
        order_id: order.order_id,
        current_status: order.status,
        vendor_name: order.vendor_name,
        ordered_at: order.created_at,
        estimated_minutes_remaining: estimatedMinutesRemaining,
        estimated_ready_time: order.ready_at || new Date(Date.now() + estimatedMinutesRemaining * 60000),
        progress_percentage: getProgressPercentage(order.status),
        is_ready: order.status === 'Ready for Pickup'
      }
    });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track order',
      error: error.message
    });
  }
});

// ===========================
// VENDOR ENDPOINTS
// ===========================

/**
 * PUT /api/orders/:orderId/status
 * Update order status (Vendor only)
 */
router.put('/:orderId/status', authenticateToken, authorizeRoles(['Vendor']), async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { orderId } = req.params;
    const { status, notes } = req.body;
    const vendorUserId = req.user.userId;
    
    // Validate status
    const validStatuses = ['Order Received', 'Preparing', 'Ready for Pickup', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    // Get current order status
    const [orders] = await connection.query(
      `SELECT o.order_id, o.status, o.student_id, o.vendor_id, v.vendor_name
       FROM orders o
       JOIN vendors v ON o.vendor_id = v.vendor_id
       WHERE o.order_id = ? AND o.vendor_id IN (
         SELECT vendor_id FROM vendor_staff WHERE user_id = ?
       )`,
      [orderId, vendorUserId]
    );
    
    if (orders.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }
    
    const currentOrder = orders[0];
    const currentStatus = currentOrder.status;
    
    // Validate status transition
    if (!VALID_STATUS_TRANSITIONS[currentStatus].includes(status)) {
      await connection.rollback();
      return res.status(400).json({
        success: false,
        message: `Cannot transition from ${currentStatus} to ${status}`
      });
    }
    
    // Update order status
    const updateData = {
      status: status,
      updated_at: new Date()
    };
    
    // Set ready_at timestamp when status becomes Ready for Pickup
    if (status === 'Ready for Pickup') {
      updateData.ready_at = new Date();
    }
    
    await connection.query(
      'UPDATE orders SET ?, updated_at = NOW() WHERE order_id = ?',
      [updateData, orderId]
    );
    
    // Record status change in history
    await connection.query(
      `INSERT INTO order_status_history (history_id, order_id, previous_status, new_status, changed_by, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), orderId, currentStatus, status, vendorUserId, notes || null]
    );
    
    // Send notification to student
    const notificationMessage = getNotificationMessage(status, currentOrder.vendor_name);
    const notificationId = uuidv4();
    
    await connection.query(
      `INSERT INTO notifications (notification_id, user_id, order_id, title, message, type, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        notificationId,
        currentOrder.student_id,
        orderId,
        'Order Status Update',
        notificationMessage,
        status === 'Ready for Pickup' ? 'order_ready' : 'order_update'
      ]
    );
    
    await connection.commit();
    
    // Send real-time notification (WebSocket/Push notification)
    await sendNotification(currentOrder.student_id, {
      notification_id: notificationId,
      title: 'Order Status Update',
      message: notificationMessage,
      type: status === 'Ready for Pickup' ? 'order_ready' : 'order_update',
      order_id: orderId
    });
    
    res.json({
      success: true,
      message: 'Order status updated successfully',
      order: {
        order_id: orderId,
        previous_status: currentStatus,
        current_status: status,
        updated_at: new Date()
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating order status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

/**
 * GET /api/orders/vendor/active
 * Get all active orders for the vendor
 */
router.get('/vendor/active', authenticateToken, authorizeRoles(['Vendor']), async (req, res) => {
  try {
    const vendorUserId = req.user.userId;
    
    const query = `
      SELECT 
        o.order_id,
        o.student_id,
        o.total_amount,
        o.status,
        o.created_at,
        o.updated_at,
        u.first_name,
        u.last_name,
        u.email,
        COUNT(oi.item_id) as item_count,
        TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) as elapsed_minutes
      FROM orders o
      JOIN users u ON o.student_id = u.user_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.vendor_id IN (SELECT vendor_id FROM vendor_staff WHERE user_id = ?)
        AND o.status IN ('Order Received', 'Preparing', 'Ready for Pickup')
      GROUP BY o.order_id
      ORDER BY 
        FIELD(o.status, 'Order Received', 'Preparing', 'Ready for Pickup'),
        o.created_at ASC
    `;
    
    const [orders] = await db.query(query, [vendorUserId]);
    
    res.json({
      success: true,
      orders: orders
    });
  } catch (error) {
    console.error('Error fetching vendor orders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
});

// ===========================
// NOTIFICATION ENDPOINTS
// ===========================

/**
 * GET /api/notifications/unread
 * Get unread notifications for the authenticated user
 */
router.get('/notifications/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    const query = `
      SELECT 
        notification_id,
        order_id,
        title,
        message,
        type,
        created_at
      FROM notifications
      WHERE user_id = ? AND is_read = FALSE
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const [notifications] = await db.query(query, [userId]);
    
    res.json({
      success: true,
      notifications: notifications,
      count: notifications.length
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/notifications/:notificationId/read', authenticateToken, async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    await db.query(
      'UPDATE notifications SET is_read = TRUE WHERE notification_id = ? AND user_id = ?',
      [notificationId, userId]
    );
    
    res.json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
});

// ===========================
// HELPER FUNCTIONS
// ===========================

function getProgressPercentage(status) {
  const statusProgress = {
    'Order Received': 25,
    'Preparing': 50,
    'Ready for Pickup': 75,
    'Completed': 100,
    'Cancelled': 0
  };
  return statusProgress[status] || 0;
}

function getNotificationMessage(status, vendorName) {
  const messages = {
    'Order Received': `Your order from ${vendorName} has been received and is being processed.`,
    'Preparing': `${vendorName} is now preparing your order.`,
    'Ready for Pickup': `🎉 Your order from ${vendorName} is ready for pickup! Please collect it at your earliest convenience.`,
    'Completed': `Your order from ${vendorName} has been completed. Thank you!`,
    'Cancelled': `Your order from ${vendorName} has been cancelled.`
  };
  return messages[status] || 'Your order status has been updated.';
}

module.exports = router;
