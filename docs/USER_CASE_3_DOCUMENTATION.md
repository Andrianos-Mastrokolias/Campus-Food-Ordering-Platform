# User Case 3: Order Tracking - Implementation Guide

## Overview
This implementation provides a complete **Order Tracking** system for the Campus Food Ordering Platform. It allows students to receive real-time status updates and notifications when their order is ready for pickup.

## Features Implemented

### 1. **Real-time Order Status Tracking**
- Live status updates without page refresh (WebSocket)
- Progress bar showing order completion percentage
- Visual timeline with order status history
- Estimated time remaining until order is ready

### 2. **Status Flow**
```
Order Received (25%) → Preparing (50%) → Ready for Pickup (75%) → Completed (100%)
```

### 3. **Notification System**
- **In-app notifications**: Real-time banner notifications
- **Email notifications**: Sent when order is ready for pickup
- **WebSocket push**: Instant updates without polling
- Notification history and read/unread tracking

### 4. **Vendor Dashboard**
- Kanban-style board for managing orders
- Quick status update buttons
- Order filtering by status
- Real-time order count tracking

---

## File Structure

```
/backend
├── orderTrackingRoutes.js       # API routes for order tracking
├── notificationService.js        # WebSocket and email notifications
├── order-tracking-schema.sql    # Database schema
└── orderTracking.test.js        # Test suite

/frontend
├── OrderTracking.jsx             # Student tracking interface
├── OrderTracking.css            # Styles for tracking page
├── VendorOrderManagement.jsx    # Vendor order management
└── VendorOrderManagement.css    # Vendor dashboard styles
```

---

## Database Schema

### Tables Created:
1. **orders** - Main order table with status tracking
2. **order_items** - Individual items in each order
3. **notifications** - Notification queue for users
4. **order_status_history** - Audit trail of status changes

See `order-tracking-schema.sql` for complete schema.

---

## API Endpoints

### Student Endpoints

#### 1. Get My Orders
```http
GET /api/orders/my-orders
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "order_id": "uuid",
      "vendor_name": "Cafe 1",
      "total_amount": 150.00,
      "status": "Preparing",
      "created_at": "2026-04-12T10:30:00Z"
    }
  ]
}
```

#### 2. Get Order Status
```http
GET /api/orders/:orderId/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "order": {
    "order_id": "uuid",
    "status": "Preparing",
    "vendor_name": "Cafe 1",
    "items": [...],
    "status_history": [...]
  }
}
```

#### 3. Track Order (with estimates)
```http
GET /api/orders/:orderId/track
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "tracking": {
    "order_id": "uuid",
    "current_status": "Preparing",
    "progress_percentage": 50,
    "estimated_minutes_remaining": 15,
    "estimated_ready_time": "2026-04-12T11:00:00Z",
    "is_ready": false
  }
}
```

### Vendor Endpoints

#### 4. Update Order Status
```http
PUT /api/orders/:orderId/status
Authorization: Bearer {token}
Content-Type: application/json

{
  "status": "Ready for Pickup",
  "notes": "Optional note"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "order": {
    "order_id": "uuid",
    "previous_status": "Preparing",
    "current_status": "Ready for Pickup"
  }
}
```

#### 5. Get Active Orders
```http
GET /api/orders/vendor/active
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "orders": [
    {
      "order_id": "uuid",
      "student_name": "John Doe",
      "status": "Order Received",
      "item_count": 3,
      "elapsed_minutes": 5
    }
  ]
}
```

### Notification Endpoints

#### 6. Get Unread Notifications
```http
GET /api/notifications/unread
Authorization: Bearer {token}
```

#### 7. Mark Notification as Read
```http
PUT /api/notifications/:notificationId/read
Authorization: Bearer {token}
```

---

## WebSocket Connection

### Client-side Setup
```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

// Authenticate
ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'authenticate',
    userId: 'your-user-id'
  }));
};

// Listen for notifications
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  if (message.type === 'notification') {
    // Handle notification
    console.log(message.data);
  }
};
```

---

## Installation & Setup

### 1. Install Dependencies

```bash
# Backend
npm install express mysql2 ws nodemailer uuid

# Frontend
npm install react react-router-dom axios
```

### 2. Database Setup

```bash
mysql -u root -p your_database < order-tracking-schema.sql
```

### 3. Environment Variables

Create a `.env` file:

```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=campus_food

# SMTP for Email Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# App URL
APP_URL=http://localhost:3000
```

### 4. Backend Integration

In your main `app.js` or `server.js`:

```javascript
const express = require('express');
const http = require('http');
const orderTrackingRoutes = require('./routes/orderTrackingRoutes');
const { initializeWebSocketServer } = require('./services/notificationService');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket
initializeWebSocketServer(server);

// Register routes
app.use('/api/orders', orderTrackingRoutes);

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### 5. Frontend Integration

In your React app routing:

```javascript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import OrderTracking from './components/OrderTracking';
import VendorOrderManagement from './components/VendorOrderManagement';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/orders/:orderId" element={<OrderTracking />} />
        <Route path="/vendor/orders" element={<VendorOrderManagement />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Testing

Run the test suite:

```bash
npm test orderTracking.test.js
```

**Test Coverage:**
- Student order retrieval
- Order status tracking
- Status transitions validation
- Notification creation
- Vendor order management
- Authorization checks
- Edge cases and error handling

---

## Usage Examples

### For Students

1. **View order status:**
   - Navigate to `/orders/{orderId}`
   - See real-time progress bar
   - Get estimated wait time

2. **Receive notifications:**
   - WebSocket connection provides instant updates
   - Email sent when order is ready
   - In-app banner notifications

### For Vendors

1. **Manage orders:**
   - Navigate to `/vendor/orders`
   - See all orders grouped by status
   - Click "Move to [Next Status]" to progress orders

2. **Update status:**
   - Orders automatically move through workflow
   - Students are notified at each stage
   - Status history is tracked

---

## Status Transition Rules

```
Order Received → [Preparing, Cancelled]
Preparing → [Ready for Pickup, Cancelled]
Ready for Pickup → [Completed, Cancelled]
Completed → []
Cancelled → []
```

Invalid transitions will return a 400 error.

---

## Notification Messages

| Status | Message Template |
|--------|-----------------|
| Order Received | "Your order from {vendor} has been received and is being processed." |
| Preparing | "{vendor} is now preparing your order." |
| Ready for Pickup | "🎉 Your order from {vendor} is ready for pickup!" |
| Completed | "Your order from {vendor} has been completed. Thank you!" |
| Cancelled | "Your order from {vendor} has been cancelled." |

---

## Performance Considerations

1. **WebSocket Fallback:** Polling every 30 seconds if WebSocket fails
2. **Database Indexing:** Indexes on `student_id`, `vendor_id`, and `status`
3. **Query Optimization:** Limited to 50 most recent orders
4. **Connection Management:** Automatic cleanup of closed WebSocket connections

---

## Security Measures

1. **Authentication:** All endpoints require valid JWT token
2. **Authorization:** Students can only view their own orders
3. **Vendor Access:** Vendors can only update their own orders
4. **Input Validation:** Status values and transitions are validated
5. **SQL Injection Prevention:** Parameterized queries throughout

---

## Future Enhancements

- [ ] Push notifications for mobile apps
- [ ] SMS notifications option
- [ ] Order rating system after completion
- [ ] Vendor analytics dashboard
- [ ] Machine learning for wait time predictions
- [ ] Multi-language support for notifications

---

## Troubleshooting

### WebSocket not connecting
- Check firewall settings
- Verify WebSocket path `/ws` is not blocked
- Ensure server supports WebSocket upgrade

### Notifications not sending
- Verify SMTP credentials in `.env`
- Check email service isn't blocking connections
- Review email logs for errors

### Status updates not working
- Check vendor authentication
- Verify status transition is valid
- Review database transaction logs

---

## Contributing

When adding features to User Case 3:

1. Update database schema if needed
2. Add corresponding API tests
3. Update this documentation
4. Follow existing code structure
5. Maintain backward compatibility

---

## License

This implementation is part of the COMS3009A Software Design project.

---

**Last Updated:** April 12, 2026  
**Version:** 1.0  
**Author/s:** Maahira Essa
