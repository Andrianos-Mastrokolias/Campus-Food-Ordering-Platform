// OrderTracking.jsx
// User Case 3: Student order tracking interface with real-time updates

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './OrderTracking.css';

const OrderTracking = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  
  const [order, setOrder] = useState(null);
  const [tracking, setTracking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ws, setWs] = useState(null);
  const [notifications, setNotifications] = useState([]);

  // Status configuration
  const STATUS_STEPS = [
    { key: 'Order Received', label: 'Order Received', icon: '📋' },
    { key: 'Preparing', label: 'Preparing', icon: '👨‍🍳' },
    { key: 'Ready for Pickup', label: 'Ready for Pickup', icon: '✅' },
    { key: 'Completed', label: 'Completed', icon: '🎉' }
  ];

  // Fetch order details
  const fetchOrderDetails = useCallback(async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      const [orderResponse, trackingResponse] = await Promise.all([
        axios.get(`/api/orders/${orderId}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/orders/${orderId}/track`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      setOrder(orderResponse.data.order);
      setTracking(trackingResponse.data.tracking);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching order:', err);
      setError(err.response?.data?.message || 'Failed to load order');
      setLoading(false);
    }
  }, [orderId]);

  // Initialize WebSocket connection
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userId = localStorage.getItem('userId');
    
    if (!userId) return;

    // Create WebSocket connection
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      // Authenticate
      websocket.send(JSON.stringify({
        type: 'authenticate',
        userId: userId
      }));
    };

    websocket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'notification') {
          const notification = message.data;
          
          // If notification is for current order, refresh order details
          if (notification.order_id === orderId) {
            fetchOrderDetails();
            
            // Show notification banner
            setNotifications(prev => [notification, ...prev]);
            
            // Play notification sound
            playNotificationSound();
            
            // Auto-remove notification after 5 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n.notification_id !== notification.notification_id));
            }, 5000);
          }
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
    };

    setWs(websocket);

    // Cleanup on unmount
    return () => {
      if (websocket.readyState === WebSocket.OPEN) {
        websocket.close();
      }
    };
  }, [orderId, fetchOrderDetails]);

  // Fetch order details on mount and set up polling as fallback
  useEffect(() => {
    fetchOrderDetails();

    // Poll every 30 seconds as fallback if WebSocket fails
    const pollInterval = setInterval(() => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        fetchOrderDetails();
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  }, [fetchOrderDetails, ws]);

  // Play notification sound
  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => console.log('Could not play sound:', err));
  };

  // Get current step index
  const getCurrentStepIndex = (status) => {
    return STATUS_STEPS.findIndex(step => step.key === status);
  };

  // Format time remaining
  const formatTimeRemaining = (minutes) => {
    if (minutes <= 0) return 'Any moment now';
    if (minutes < 60) return `${Math.round(minutes)} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // Dismiss notification
  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
  };

  if (loading) {
    return (
      <div className="order-tracking-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your order...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-tracking-container">
        <div className="error-message">
          <h2>⚠️ Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/orders')} className="btn-primary">
            Back to Orders
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(order.status);
  const isOrderReady = order.status === 'Ready for Pickup';

  return (
    <div className="order-tracking-container">
      {/* Notification Banners */}
      {notifications.length > 0 && (
        <div className="notifications-container">
          {notifications.map((notification) => (
            <div 
              key={notification.notification_id} 
              className={`notification-banner ${notification.type === 'order_ready' ? 'ready' : ''}`}
            >
              <div className="notification-content">
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
              </div>
              <button 
                className="dismiss-btn"
                onClick={() => dismissNotification(notification.notification_id)}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="tracking-header">
        <button onClick={() => navigate('/orders')} className="back-btn">
          ← Back to Orders
        </button>
        <h1>Track Your Order</h1>
        <p className="order-id">Order #{orderId.slice(0, 8)}</p>
      </div>

      {/* Order Ready Alert */}
      {isOrderReady && (
        <div className="order-ready-alert">
          <div className="ready-icon">🎉</div>
          <div className="ready-content">
            <h2>Your Order is Ready!</h2>
            <p>Please collect your order from {order.vendor_name}</p>
            <p className="location">📍 {order.location}</p>
          </div>
        </div>
      )}

      {/* Progress Tracker */}
      <div className="progress-tracker">
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${tracking.progress_percentage}%` }}
          />
        </div>
        
        <div className="status-steps">
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div 
                key={step.key} 
                className={`status-step ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}
              >
                <div className="step-icon">
                  {isCompleted ? '✓' : step.icon}
                </div>
                <div className="step-label">{step.label}</div>
                {isCurrent && !isOrderReady && (
                  <div className="step-time">
                    {formatTimeRemaining(tracking.estimated_minutes_remaining)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Order Information */}
      <div className="order-info-card">
        <h3>Order Details</h3>
        <div className="info-row">
          <span className="label">Vendor:</span>
          <span className="value">{order.vendor_name}</span>
        </div>
        <div className="info-row">
          <span className="label">Ordered at:</span>
          <span className="value">{new Date(tracking.ordered_at).toLocaleString()}</span>
        </div>
        {tracking.estimated_ready_time && !isOrderReady && (
          <div className="info-row">
            <span className="label">Estimated ready:</span>
            <span className="value">{new Date(tracking.estimated_ready_time).toLocaleTimeString()}</span>
          </div>
        )}
        {order.ready_at && (
          <div className="info-row">
            <span className="label">Ready at:</span>
            <span className="value">{new Date(order.ready_at).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Order Items */}
      <div className="order-items-card">
        <h3>Your Items</h3>
        {order.items.map((item, index) => (
          <div key={index} className="order-item">
            <div className="item-info">
              <span className="item-quantity">{item.quantity}×</span>
              <div className="item-details">
                <span className="item-name">{item.item_name}</span>
                {item.special_instructions && (
                  <span className="item-instructions">Note: {item.special_instructions}</span>
                )}
              </div>
            </div>
            <span className="item-price">R{item.unit_price.toFixed(2)}</span>
          </div>
        ))}
      </div>

      {/* Status History */}
      {order.status_history && order.status_history.length > 0 && (
        <div className="status-history-card">
          <h3>Status History</h3>
          <div className="timeline">
            {order.status_history.map((history, index) => (
              <div key={index} className="timeline-item">
                <div className="timeline-marker" />
                <div className="timeline-content">
                  <div className="status-change">
                    {history.previous_status && (
                      <span className="previous-status">{history.previous_status}</span>
                    )}
                    <span className="arrow">→</span>
                    <span className="new-status">{history.new_status}</span>
                  </div>
                  <div className="timestamp">
                    {new Date(history.changed_at).toLocaleString()}
                  </div>
                  {history.notes && (
                    <div className="notes">{history.notes}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Connection Status */}
      <div className="connection-status">
        {ws && ws.readyState === WebSocket.OPEN ? (
          <span className="status-connected">🟢 Live updates active</span>
        ) : (
          <span className="status-disconnected">🔴 Reconnecting...</span>
        )}
      </div>
    </div>
  );
};

export default OrderTracking;
