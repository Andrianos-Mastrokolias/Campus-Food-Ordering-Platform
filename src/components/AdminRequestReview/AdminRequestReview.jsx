// AdminRequestReview.jsx
// UAT2: Admin can approve/reject requests - Firebase version

import React, { useState, useEffect } from 'react';
import { auth } from './firebaseConfig';
import { 
  getPendingRequests, 
  getAllRequests,
  approveAdminRequest,
  rejectAdminRequest 
} from './adminRoleRequestService';
import './AdminRequestReview.css';

const AdminRequestReview = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [processingRequest, setProcessingRequest] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState({});
  const [approvalNotes, setApprovalNotes] = useState({});

  const currentUser = auth.currentUser;

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pending, all] = await Promise.all([
        getPendingRequests(),
        getAllRequests()
      ]);
      setPendingRequests(pending);
      setAllRequests(all);
      setError(null);
    } catch (err) {
      console.error('Error fetching requests:', err);
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Approve request (UAT2)
  const handleApprove = async (requestId, userId) => {
    if (!window.confirm('Are you sure you want to approve this admin access request? The user\'s role will be updated to Admin.')) {
      return;
    }

    setProcessingRequest(requestId);

    try {
      await approveAdminRequest(
        requestId,
        currentUser.uid,
        currentUser.displayName || 'Admin',
        approvalNotes[requestId] || ''
      );

      // Refresh data
      await fetchData();
      
      // Clear notes
      setApprovalNotes({ ...approvalNotes, [requestId]: '' });
      
      alert('✅ Admin access request approved! User role updated to Admin.');
    } catch (err) {
      console.error('Error approving request:', err);
      alert(err.message || 'Failed to approve request');
    } finally {
      setProcessingRequest(null);
    }
  };

  // Reject request
  const handleReject = async (requestId) => {
    const notes = rejectionNotes[requestId];
    
    if (!notes || notes.trim().length < 10) {
      alert('Please provide a rejection reason (at least 10 characters)');
      return;
    }

    if (!window.confirm('Are you sure you want to reject this admin access request?')) {
      return;
    }

    setProcessingRequest(requestId);

    try {
      await rejectAdminRequest(
        requestId,
        currentUser.uid,
        currentUser.displayName || 'Admin',
        notes.trim()
      );

      // Refresh data
      await fetchData();
      
      // Clear notes
      setRejectionNotes({ ...rejectionNotes, [requestId]: '' });
      
      alert('Request rejected.');
    } catch (err) {
      console.error('Error rejecting request:', err);
      alert(err.message || 'Failed to reject request');
    } finally {
      setProcessingRequest(null);
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

  const renderRequestCard = (request, showActions = false) => (
    <div key={request.id} className="request-card">
      <div className="request-card-header">
        <div className="user-info">
          <h3>{request.userName}</h3>
          <p className="user-email">{request.userEmail}</p>
          <span className="user-id-badge">ID: {request.userId.slice(0, 8)}...</span>
        </div>
        <div className="request-meta">
          <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
            {request.status}
          </span>
          {request.daysPending !== undefined && (
            <span className="days-pending">
              {request.daysPending} {request.daysPending === 1 ? 'day' : 'days'} pending
            </span>
          )}
        </div>
      </div>

      <div className="request-card-body">
        <div className="info-section">
          <h4>Request Details</h4>
          <p className="request-date">
            <strong>Submitted:</strong> {request.createdAt?.toLocaleString()}
          </p>
        </div>

        <div className="reason-section">
          <h4>Reason for Request</h4>
          <div className="reason-text">
            {request.requestReason}
          </div>
        </div>

        {request.status !== 'Pending' && request.reviewedByName && (
          <div className="review-section">
            <h4>Review Information</h4>
            <p>
              <strong>Reviewed by:</strong> {request.reviewedByName}
            </p>
            <p>
              <strong>Reviewed on:</strong> {request.reviewedAt?.toLocaleString()}
            </p>
            {request.reviewNotes && (
              <div className="review-notes">
                <strong>Notes:</strong> {request.reviewNotes}
              </div>
            )}
          </div>
        )}
      </div>

      {showActions && request.status === 'Pending' && (
        <div className="request-card-actions">
          <div className="notes-section">
            <div className="notes-input-group">
              <label>Approval Notes (optional):</label>
              <textarea
                value={approvalNotes[request.id] || ''}
                onChange={(e) => setApprovalNotes({
                  ...approvalNotes,
                  [request.id]: e.target.value
                })}
                placeholder="Optional notes for the applicant..."
                rows="2"
              />
            </div>
            
            <div className="notes-input-group">
              <label>Rejection Reason (required if rejecting):</label>
              <textarea
                value={rejectionNotes[request.id] || ''}
                onChange={(e) => setRejectionNotes({
                  ...rejectionNotes,
                  [request.id]: e.target.value
                })}
                placeholder="Provide a detailed reason for rejection (minimum 10 characters)..."
                rows="2"
              />
            </div>
          </div>

          <div className="action-buttons">
            <button
              onClick={() => handleApprove(request.id, request.userId)}
              disabled={processingRequest === request.id}
              className="btn-approve"
            >
              {processingRequest === request.id ? 'Processing...' : '✓ Approve & Make Admin'}
            </button>
            
            <button
              onClick={() => handleReject(request.id)}
              disabled={processingRequest === request.id || !rejectionNotes[request.id]}
              className="btn-reject"
            >
              {processingRequest === request.id ? 'Processing...' : '✗ Reject Request'}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  if (!currentUser) {
    return (
      <div className="admin-review-container">
        <div className="info-message">
          <h2>Please log in</h2>
          <p>You need to be logged in as an admin to view this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-review-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-review-container">
      <div className="page-header">
        <h1>Admin Access Requests</h1>
        <p>Review and approve/reject requests for admin privileges</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>⚠ Error</strong>
          <p>{error}</p>
        </div>
      )}

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-card pending-stat">
          <div className="stat-number">{pendingRequests.length}</div>
          <div className="stat-label">Pending Requests</div>
        </div>
        <div className="stat-card total-stat">
          <div className="stat-number">{allRequests.length}</div>
          <div className="stat-label">Total Requests</div>
        </div>
        <div className="stat-card approved-stat">
          <div className="stat-number">
            {allRequests.filter(r => r.status === 'Approved').length}
          </div>
          <div className="stat-label">Approved</div>
        </div>
        <div className="stat-card rejected-stat">
          <div className="stat-number">
            {allRequests.filter(r => r.status === 'Rejected').length}
          </div>
          <div className="stat-label">Rejected</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Pending ({pendingRequests.length})
        </button>
        <button
          className={`tab ${activeTab === 'all' ? 'active' : ''}`}
          onClick={() => setActiveTab('all')}
        >
          All Requests ({allRequests.length})
        </button>
      </div>

      {/* Content */}
      <div className="tab-content">
        {activeTab === 'pending' && (
          <div className="requests-section">
            {pendingRequests.length === 0 ? (
              <div className="empty-state">
                <h3>No Pending Requests</h3>
                <p>There are no admin access requests awaiting review.</p>
              </div>
            ) : (
              <div className="requests-list">
                {pendingRequests.map(request => renderRequestCard(request, true))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="requests-section">
            {allRequests.length === 0 ? (
              <div className="empty-state">
                <h3>No Requests</h3>
                <p>No admin access requests have been submitted yet.</p>
              </div>
            ) : (
              <div className="requests-list">
                {allRequests.map(request => renderRequestCard(request, false))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminRequestReview;
