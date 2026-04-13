// VendorOrderManagement.jsx
// User Case 3: Vendor interface for managing order status

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './VendorOrderManagement.css';

const VendorOrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingOrder, setUpdatingOrder] = useState(null);

  // Status options for vendors
  const STATUS_OPTIONS = [
    { value: 'Order Received', label: 'Order Received', color: '#2196F3' },
    { value: 'Preparing', label: 'Preparing', color: '#FF9800' },
    { value: 'Ready for Pickup', label: 'Ready for Pickup', color: '#4CAF50' },
    { value: 'Completed', label: 'Completed', color: '#9E9E9E' },
    { value: 'Cancelled', label: 'Cancelled', color: '#f44336' }
  ];

  // Fetch active orders
  const fetchOrders = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await axios.get('/api/orders/vendor/active', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setOrders(response.data.orders);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError(err.response?.data?.message || 'Failed to load orders');
      setLoading(false);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId, newStatus, notes = '') => {
    setUpdatingOrder(orderId);
    
    try {
      const token = localStorage.getItem('authToken');
      await axios.put(
        `/api/orders/${orderId}/status`,
        { status: newStatus, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Refresh orders list
      await fetchOrders();
      
      // Show success message
      alert(`Order status updated to: ${newStatus}`);
    } catch (err) {
      console.error('Error updating order:', err);
      alert(err.response?.data?.message || 'Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  // Get next logical status
  const getNextStatus = (currentStatus) => {
    const transitions = {
      'Order Received': 'Preparing',
      'Preparing': 'Ready for Pickup',
      'Ready for Pickup': 'Completed'
    };
    return transitions[currentStatus];
  };

  // Get status color
  const getStatusColor = (status) => {
    const option = STATUS_OPTIONS.find(opt => opt.value === status);
    return option ? option.color : '#999';
  };

  // Format elapsed time
  const formatElapsedTime = (minutes) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="vendor-orders-container">
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="vendor-orders-container">
        <div className="error">{error}</div>
      </div>
    );
  }

  // Group orders by status
  const ordersByStatus = {
    'Order Received': orders.filter(o => o.status === 'Order Received'),
    'Preparing': orders.filter(o => o.status === 'Preparing'),
    'Ready for Pickup': orders.filter(o => o.status === 'Ready for Pickup')
  };

  return (
    <div className="vendor-orders-container">
      <div className="header">
        <h1>Order Management</h1>
        <button onClick={fetchOrders} className="refresh-btn">
          🔄 Refresh
        </button>
      </div>

      <div className="orders-summary">
        <div className="summary-card">
          <div className="summary-number">{ordersByStatus['Order Received'].length}</div>
          <div className="summary-label">New Orders</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{ordersByStatus['Preparing'].length}</div>
          <div className="summary-label">Preparing</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{ordersByStatus['Ready for Pickup'].length}</div>
          <div className="summary-label">Ready</div>
        </div>
      </div>

      <div className="orders-board">
        {Object.entries(ordersByStatus).map(([status, statusOrders]) => (
          <div key={status} className="status-column">
            <div className="column-header" style={{ borderLeftColor: getStatusColor(status) }}>
              <h2>{status}</h2>
              <span className="count">{statusOrders.length}</span>
            </div>
            
            <div className="orders-list">
              {statusOrders.length === 0 ? (
                <div className="empty-state">No orders</div>
              ) : (
                statusOrders.map(order => (
                  <div key={order.order_id} className="order-card">
                    <div className="order-header">
                      <div className="order-number">
                        #{order.order_id.slice(0, 8)}
                      </div>
                      <div className="elapsed-time">
                        ⏱️ {formatElapsedTime(order.elapsed_minutes)}
                      </div>
                    </div>
                    
                    <div className="customer-info">
                      <div className="customer-name">
                        👤 {order.first_name} {order.last_name}
                      </div>
                      <div className="item-count">
                        📦 {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                    
                    <div className="order-total">
                      Total: R{order.total_amount.toFixed(2)}
                    </div>
                    
                    <div className="order-actions">
                      {getNextStatus(order.status) && (
                        <button
                          onClick={() => updateOrderStatus(order.order_id, getNextStatus(order.status))}
                          disabled={updatingOrder === order.order_id}
                          className="btn-next-status"
                          style={{ background: getStatusColor(getNextStatus(order.status)) }}
                        >
                          {updatingOrder === order.order_id ? (
                            'Updating...'
                          ) : (
                            <>
                              Move to {getNextStatus(order.status)} →
                            </>
                          )}
                        </button>
                      )}
                      
                      {order.status !== 'Cancelled' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this order?')) {
                              updateOrderStatus(order.order_id, 'Cancelled', 'Order cancelled by vendor');
                            }
                          }}
                          disabled={updatingOrder === order.order_id}
                          className="btn-cancel"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                    
                    <button 
                      onClick={() => window.location.href = `/vendor/orders/${order.order_id}`}
                      className="btn-view-details"
                    >
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorOrderManagement;
