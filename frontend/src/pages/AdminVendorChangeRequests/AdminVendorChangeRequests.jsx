import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import vendorChangeRequestService from '../../services/vendorChangeRequestService';
import './AdminVendorChangeRequests.css';

export default function AdminVendorChangeRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [reviewNotes, setReviewNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadRequests = async () => {
    try {
      setLoading(true);
      const allRequests = await vendorChangeRequestService.getAllRequests();
      setRequests(allRequests);
    } catch (error) {
      console.error('Error loading vendor change requests:', error);
      setMessage('Failed to load vendor change requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleNotesChange = (requestId, value) => {
    setReviewNotes((previousNotes) => ({
      ...previousNotes,
      [requestId]: value
    }));
  };

  const handleApprove = async (requestId) => {
    try {
      await vendorChangeRequestService.approveRequest(
        requestId,
        user.uid,
        reviewNotes[requestId] || ''
      );

      setMessage('Vendor detail change request approved.');
      await loadRequests();
    } catch (error) {
      console.error('Error approving vendor change request:', error);
      setMessage(error.message || 'Failed to approve request.');
    }
  };

  const handleReject = async (requestId) => {
    try {
      await vendorChangeRequestService.rejectRequest(
        requestId,
        user.uid,
        reviewNotes[requestId] || ''
      );

      setMessage('Vendor detail change request rejected.');
      await loadRequests();
    } catch (error) {
      console.error('Error rejecting vendor change request:', error);
      setMessage(error.message || 'Failed to reject request.');
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleString('en-ZA');
  };

  const filteredRequests = requests.filter((request) => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  if (loading) {
    return <div className="admin-change-page"><p>Loading requests...</p></div>;
  }

  return (
    <div className="admin-change-page">
      <div className="admin-change-header">
        <h1>Vendor Detail Change Requests</h1>
        <p>Review vendor requests to update approved shop details.</p>
      </div>

      {message && <div className="admin-change-message">{message}</div>}

      <div className="admin-change-filters">
        <button onClick={() => setFilter('pending')} className={filter === 'pending' ? 'active' : ''}>
          Pending
        </button>
        <button onClick={() => setFilter('approved')} className={filter === 'approved' ? 'active' : ''}>
          Approved
        </button>
        <button onClick={() => setFilter('rejected')} className={filter === 'rejected' ? 'active' : ''}>
          Rejected
        </button>
        <button onClick={() => setFilter('all')} className={filter === 'all' ? 'active' : ''}>
          All
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="empty-state">
          No vendor detail change requests found.
        </div>
      ) : (
        <div className="admin-request-list">
          {filteredRequests.map((request) => (
            <div key={request.id} className="admin-request-card">
              <div className="request-card-header">
                <div>
                  <h2>{request.vendorName || request.vendorEmail || 'Vendor'}</h2>
                  <p>{request.vendorEmail}</p>
                  <small>Submitted: {formatDate(request.createdAt)}</small>
                </div>
                <span className={`status-pill ${request.status}`}>
                  {request.status}
                </span>
              </div>

              <div className="comparison-grid">
                <div>
                  <h3>Current Details</h3>
                  <p><strong>Name:</strong> {request.currentProfile?.businessName || 'N/A'}</p>
                  <p><strong>Description:</strong> {request.currentProfile?.businessDescription || 'N/A'}</p>
                  <p><strong>Phone:</strong> {request.currentProfile?.businessPhone || 'N/A'}</p>
                  <p><strong>Address:</strong> {request.currentProfile?.businessAddress || 'N/A'}</p>
                  <p><strong>Type:</strong> {request.currentProfile?.businessType || 'N/A'}</p>
                </div>

                <div>
                  <h3>Requested Details</h3>
                  <p><strong>Name:</strong> {request.requestedProfile?.businessName || 'N/A'}</p>
                  <p><strong>Description:</strong> {request.requestedProfile?.businessDescription || 'N/A'}</p>
                  <p><strong>Phone:</strong> {request.requestedProfile?.businessPhone || 'N/A'}</p>
                  <p><strong>Address:</strong> {request.requestedProfile?.businessAddress || 'N/A'}</p>
                  <p><strong>Type:</strong> {request.requestedProfile?.businessType || 'N/A'}</p>
                </div>
              </div>

              {request.status === 'pending' && (
                <div className="review-section">
                  <textarea
                    placeholder="Optional review notes"
                    value={reviewNotes[request.id] || ''}
                    onChange={(event) => handleNotesChange(request.id, event.target.value)}
                  />

                  <div className="review-buttons">
                    <button className="approve-btn" onClick={() => handleApprove(request.id)}>
                      Approve
                    </button>
                    <button className="reject-btn" onClick={() => handleReject(request.id)}>
                      Reject
                    </button>
                  </div>
                </div>
              )}

              {request.status !== 'pending' && (
                <div className="reviewed-info">
                  <p><strong>Review notes:</strong> {request.reviewNotes || 'No notes provided.'}</p>
                  <p><strong>Reviewed:</strong> {formatDate(request.reviewedAt)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}