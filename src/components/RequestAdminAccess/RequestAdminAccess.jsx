// RequestAdminAccess.jsx
// UAT1: User interface with "Request Admin Access" button - Firebase version

import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { 
  submitAdminRequest, 
  getUserRequests, 
  cancelRequest,
  checkPendingRequest 
} from './adminRoleRequestService';
import './RequestAdminAccess.css';

const RequestAdminAccess = () => {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [myRequests, setMyRequests] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [hasPending, setHasPending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const currentUser = auth.currentUser;

  // Fetch user's requests
  const fetchMyRequests = async () => {
    if (!currentUser) return;
    
    try {
      const requests = await getUserRequests(currentUser.uid);
      setMyRequests(requests);
      
      // Check if there's a pending request
      const pending = requests.some(req => req.status === 'Pending');
      setHasPending(pending);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  useEffect(() => {
    // Get user role from auth or custom claims
    if (currentUser) {
      currentUser.getIdTokenResult().then((idTokenResult) => {
        setUserRole(idTokenResult.claims.role || 'Student');
      });
      
      fetchMyRequests();
    }
  }, [currentUser]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (reason.trim().length < 20) {
      setError('Please provide a detailed reason (at least 20 characters)');
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      await submitAdminRequest(
        currentUser.uid,
        currentUser.displayName || 'Unknown User',
        currentUser.email,
        reason.trim()
      );
      
      setSuccess(true);
      setReason('');
      setShowForm(false);
      
      // Refresh requests list
      await fetchMyRequests();
      
      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error('Error submitting request:', err);
      setError(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  // Handle cancel request
  const handleCancelRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) {
      return;
    }
    
    try {
      await cancelRequest(requestId, currentUser.uid);
      await fetchMyRequests();
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert(err.message || 'Failed to cancel request');
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Pending': return 'status-pending';
      case 'Approved': return 'status-approved';
      case 'Rejected': return 'status-rejected';
      default: return '';
    }
  };

  if (!currentUser) {
    return (
      <div className="request-admin-container">
        <div className="info-message">
          <h2>Please log in</h2>
          <p>You need to be logged in to request admin access.</p>
        </div>
      </div>
    );
  }

  if (userRole === 'Admin') {
    return (
      <div className="request-admin-container">
        <div className="info-message">
          <h2>✅ You are already an admin</h2>
          <p>You have full administrative privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="request-admin-container">
      <div className="page-header">
        <h1>Admin Access</h1>
        <p>Request administrative privileges for the platform</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="alert alert-success">
          <strong>✓ Request Submitted!</strong>
          <p>Your admin access request has been saved. An existing admin will review it shortly.</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="alert alert-error">
          <strong>⚠ Error</strong>
          <p>{error}</p>
        </div>
      )}

      {/* Request Admin Access Button */}
      {!hasPending && !showForm && (
        <div className="request-button-container">
          <button 
            onClick={() => setShowForm(true)}
            className="btn-request-admin"
          >
            📋 Request Admin Access
          </button>
          <p className="button-description">
            Click here to submit a request for admin privileges
          </p>
        </div>
      )}

      {/* Request Form */}
      {showForm && !hasPending && (
        <div className="request-form-card">
          <h2>Submit Admin Access Request</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="reason">
                Why do you need admin access? <span className="required">*</span>
              </label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please provide a detailed explanation of why you need admin privileges. Minimum 20 characters."
                rows="6"
                className="form-textarea"
                required
                minLength={20}
              />
              <div className="character-count">
                {reason.length} / 20 characters minimum
              </div>
            </div>

            <div className="form-actions">
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn-primary"
                disabled={loading || reason.trim().length < 20}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Request Notice */}
      {hasPending && (
        <div className="info-message">
          <h3>📋 Pending Request</h3>
          <p>You already have a pending admin access request. Please wait for an admin to review it.</p>
        </div>
      )}

      {/* My Requests History */}
      {myRequests.length > 0 && (
        <div className="requests-history-card">
          <h2>My Request History</h2>
          
          <div className="requests-list">
            {myRequests.map((request) => (
              <div key={request.id} className="request-item">
                <div className="request-header">
                  <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                    {request.status}
                  </span>
                  <span className="request-date">
                    {request.createdAt?.toLocaleDateString()}
                  </span>
                </div>
                
                <div className="request-body">
                  <h4>Request Reason:</h4>
                  <p className="request-reason">{request.requestReason}</p>
                </div>
                
                {request.status === 'Approved' && (
                  <div className="review-section approved">
                    <h4>✓ Approved</h4>
                    <p className="review-info">
                      Reviewed by: {request.reviewedByName}
                    </p>
                    <p className="review-date">
                      On: {request.reviewedAt?.toLocaleString()}
                    </p>
                    {request.reviewNotes && (
                      <p className="review-notes">
                        <strong>Notes:</strong> {request.reviewNotes}
                      </p>
                    )}
                  </div>
                )}
                
                {request.status === 'Rejected' && (
                  <div className="review-section rejected">
                    <h4>✗ Rejected</h4>
                    <p className="review-info">
                      Reviewed by: {request.reviewedByName}
                    </p>
                    <p className="review-date">
                      On: {request.reviewedAt?.toLocaleString()}
                    </p>
                    {request.reviewNotes && (
                      <p className="review-notes">
                        <strong>Reason:</strong> {request.reviewNotes}
                      </p>
                    )}
                  </div>
                )}
                
                {request.status === 'Pending' && (
                  <div className="request-actions">
                    <button 
                      onClick={() => handleCancelRequest(request.id)}
                      className="btn-cancel"
                    >
                      Cancel Request
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RequestAdminAccess;
