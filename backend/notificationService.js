// Notification Service
// User Case 3: Real-time notification system for order tracking

const WebSocket = require('ws');
const nodemailer = require('nodemailer');

// Store active WebSocket connections
const activeConnections = new Map();

/**
 * Initialize WebSocket server
 */
function initializeWebSocketServer(server) {
  const wss = new WebSocket.Server({ server, path: '/ws' });
  
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        
        // Handle authentication
        if (data.type === 'authenticate' && data.userId) {
          ws.userId = data.userId;
          activeConnections.set(data.userId, ws);
          
          ws.send(JSON.stringify({
            type: 'authenticated',
            message: 'Successfully authenticated',
            userId: data.userId
          }));
          
          console.log(`User ${data.userId} authenticated`);
        }
        
        // Handle ping/pong for keep-alive
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      if (ws.userId) {
        activeConnections.delete(ws.userId);
        console.log(`User ${ws.userId} disconnected`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  console.log('WebSocket server initialized');
  return wss;
}

/**
 * Send real-time notification to a specific user
 */
async function sendNotification(userId, notification) {
  try {
    // Send via WebSocket if user is connected
    const ws = activeConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'notification',
        data: notification
      }));
      console.log(`Real-time notification sent to user ${userId}`);
    }
    
    // Also send email notification for order ready status
    if (notification.type === 'order_ready') {
      await sendEmailNotification(userId, notification);
    }
    
    // Could also implement push notifications here
    // await sendPushNotification(userId, notification);
    
    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, notification) {
  try {
    // Get user email from database
    const db = require('../config/database');
    const [users] = await db.query('SELECT email, first_name FROM users WHERE user_id = ?', [userId]);
    
    if (users.length === 0) {
      console.error(`User ${userId} not found for email notification`);
      return false;
    }
    
    const user = users[0];
    
    // Configure email transporter (use your SMTP settings)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    
    // Email template
    const mailOptions = {
      from: `"Campus Food Platform" <${process.env.SMTP_USER}>`,
      to: user.email,
      subject: notification.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .container {
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
              background-color: #f9f9f9;
            }
            .header {
              background-color: #4CAF50;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 5px 5px 0 0;
            }
            .content {
              background-color: white;
              padding: 30px;
              border-radius: 0 0 5px 5px;
            }
            .button {
              display: inline-block;
              padding: 12px 30px;
              background-color: #4CAF50;
              color: white;
              text-decoration: none;
              border-radius: 5px;
              margin-top: 20px;
            }
            .order-info {
              background-color: #f0f0f0;
              padding: 15px;
              border-left: 4px solid #4CAF50;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🍽️ Order Ready for Pickup!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.first_name},</p>
              <p>${notification.message}</p>
              
              <div class="order-info">
                <strong>Order ID:</strong> ${notification.order_id}<br>
                <strong>Status:</strong> Ready for Pickup
              </div>
              
              <p>Please collect your order at the vendor's location as soon as possible.</p>
              
              <a href="${process.env.APP_URL}/orders/${notification.order_id}" class="button">
                View Order Details
              </a>
              
              <p style="margin-top: 30px; font-size: 12px; color: #666;">
                This is an automated notification from the Campus Food Ordering Platform.
              </p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    
    await transporter.sendMail(mailOptions);
    console.log(`Email notification sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

/**
 * Broadcast notification to all active vendor users
 */
async function broadcastToVendors(vendorId, notification) {
  try {
    const db = require('../config/database');
    
    // Get all vendor staff user IDs
    const [staff] = await db.query(
      'SELECT user_id FROM vendor_staff WHERE vendor_id = ?',
      [vendorId]
    );
    
    // Send to all vendor staff members
    for (const member of staff) {
      await sendNotification(member.user_id, notification);
    }
    
    return true;
  } catch (error) {
    console.error('Error broadcasting to vendors:', error);
    return false;
  }
}

/**
 * Get connection status for a user
 */
function isUserConnected(userId) {
  const ws = activeConnections.get(userId);
  return ws && ws.readyState === WebSocket.OPEN;
}

/**
 * Get count of active connections
 */
function getActiveConnectionsCount() {
  return activeConnections.size;
}

module.exports = {
  initializeWebSocketServer,
  sendNotification,
  sendEmailNotification,
  broadcastToVendors,
  isUserConnected,
  getActiveConnectionsCount
};
