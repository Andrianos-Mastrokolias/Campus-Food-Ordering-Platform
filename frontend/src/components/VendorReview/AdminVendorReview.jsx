import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import vendorApplicationService from '../../services/vendorApplicationService';
import './AdminVendorReview.css';

const AdminVendorReview = () => {
  const { user, role } = useAuth();
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);
  const [reviewingApp, setReviewingApp] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState('');

  useEffect(() => {
    if (user && role === 'admin') {
      loadApplications();
    }
  }, [user, role]);

  useEffect(() => {
    filterApplications();
  }, [filter, applications]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const apps = await vendorApplicationService.getAllApplications();
      setApplications(apps);

      const statistics = await vendorApplicationService.getApplicationStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading vendor applications:', error);
      setError('Failed to load vendor applications');
    } finally {
      setLoading(false);
    }
  };

  const filterApplications = () => {
    if (filter === 'all') {
      setFilteredApplications(applications);
    } else {
      setFilteredApplications(applications.filter(app => app.status === filter));
    }
  };

  const handleReviewClick = (application, action) => {
    setReviewingApp(application);
    setReviewAction(action);
    setReviewNotes('');
    setError('');
    setSuccess('');
  };

  const handleReviewSubmit = async () => {
    if (!reviewingApp) return;

    if (reviewAction === 'reject' && !reviewNotes.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (reviewAction === 'approve') {
        await vendorApplicationService.approveApplication(
          reviewingApp.id,
          user.uid,
          reviewNotes.trim()
        );
        setSuccess(`Vendor approved! ${reviewingApp.userName} can now access the vendor dashboard.`);
      } else {
        await vendorApplicationService.rejectApplication(
          reviewingApp.id,
          user.uid,
          reviewNotes.trim()
        );
        setSuccess(`Application rejected.`);
      }

      await loadApplications();
      setReviewingApp(null);
      setReviewNotes('');
      setReviewAction('');
    } catch (error) {
      setError(error.message || 'Failed to process application');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return timestamp.toDate().toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: <span className="badge badge-warning">Pending</span>,
      approved: <span className="badge badge-success">Approved</span>,
      rejected: <span className="badge badge-danger">Rejected</span>
    };
    return badges[status] || <span className="badge badge-secondary">Unknown</span>;
  };

  if (loading && !reviewingApp) {
    return (
      <div className="admin-vendor-review">
        <div className="loading">Loading vendor applications...</div>
      </div>
    );
  }

  if (role !== 'admin') {
    return (
      <div className="admin-vendor-review">
        <div className="alert alert-danger">
          Access denied. You must be an admin to view this page.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-vendor-review">
      <div className="dashboard-header">
        <h1>Vendor Application Review</h1>
        <p>Review and approve vendor registrations</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <strong>Success:</strong> {success}
        </div>
      )}

      {stats && (
        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total Applications</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-value">{stats.pending}</div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card approved">
            <div className="stat-value">{stats.approved}</div>
            <div className="stat-label">Approved</div>
          </div>
          <div className="stat-card rejected">
            <div className="stat-value">{stats.rejected}</div>
            <div className="stat-label">Rejected</div>
          </div>
        </div>
      )}

      <div className="filter-buttons">
        <button
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({applications.length})
        </button>
        <button
          className={`filter-btn ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({stats?.pending || 0})
        </button>
        <button
          className={`filter-btn ${filter === 'approved' ? 'active' : ''}`}
          onClick={() => setFilter('approved')}
        >
          Approved ({stats?.approved || 0})
        </button>
        <button
          className={`filter-btn ${filter === 'rejected' ? 'active' : ''}`}
          onClick={() => setFilter('rejected')}
        >
          Rejected ({stats?.rejected || 0})
        </button>
      </div>

      <div className="applications-container">
        {filteredApplications.length === 0 ? (
          <div className="no-applications">
            <p>No {filter !== 'all' ? filter : ''} vendor applications found.</p>
          </div>
        ) : (
          <div className="applications-grid">
            {filteredApplications.map((app) => (
              <div key={app.id} className={`application-card ${app.status}`}>
                <div className="card-header">
                  <div className="vendor-info">
                    <h3>{app.businessName}</h3>
                    <p className="applicant">Applied by: {app.userName}</p>
                    <p className="email">{app.userEmail}</p>
                  </div>
                  <div className="status-badge">
                    {getStatusBadge(app.status)}
                  </div>
                </div>

                <div className="card-body">
                  <div className="info-row">
                    <span className="label">Submitted:</span>
                    <span className="value">{formatDate(app.createdAt)}</span>
                  </div>

                  <div className="business-section">
                    <strong>Business Description:</strong>
                    <p className="description-text">{app.businessDescription}</p>
                  </div>

                  <div className="contact-section">
                    <div className="info-row">
                      <span className="label">📞 Phone:</span>
                      <span className="value">{app.businessPhone}</span>
                    </div>
                    <div className="info-row">
                      <span className="label">📍 Location:</span>
                      <span className="value">{app.businessAddress}</span>
                    </div>
                  </div>

                  {app.reviewedBy && (
                    <>
                      <div className="info-row">
                        <span className="label">Reviewed:</span>
                        <span className="value">{formatDate(app.reviewedAt)}</span>
                      </div>
                      {app.reviewNotes && (
                        <div className="review-section">
                          <strong>Review Notes:</strong>
                          <p className="review-text">{app.reviewNotes}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {app.status === 'pending' && (
                  <div className="card-actions">
                    <button
                      className="btn btn-success"
                      onClick={() => handleReviewClick(app, 'approve')}
                    >
                      Approve
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleReviewClick(app, 'reject')}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {reviewingApp && (
        <div className="modal-overlay" onClick={() => setReviewingApp(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {reviewAction === 'approve' ? 'Approve' : 'Reject'} Vendor Application
              </h2>
              <button
                className="close-btn"
                onClick={() => setReviewingApp(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              <div className="applicant-summary">
                <p><strong>Business Name:</strong> {reviewingApp.businessName}</p>
                <p><strong>Applicant:</strong> {reviewingApp.userName}</p>
                <p><strong>Email:</strong> {reviewingApp.userEmail}</p>
                <p><strong>Phone:</strong> {reviewingApp.businessPhone}</p>
                <p><strong>Location:</strong> {reviewingApp.businessAddress}</p>
              </div>

              <div className="form-group">
                <label htmlFor="reviewNotes">
                  {reviewAction === 'approve' ? 'Review Notes (Optional)' : 'Reason for Rejection *'}
                </label>
                <textarea
                  id="reviewNotes"
                  className="form-control"
                  rows="4"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={
                    reviewAction === 'approve'
                      ? 'Add any notes about this approval...'
                      : 'Explain why this application is being rejected...'
                  }
                  required={reviewAction === 'reject'}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setReviewingApp(null)}
              >
                Cancel
              </button>
              <button
                className={`btn ${reviewAction === 'approve' ? 'btn-success' : 'btn-danger'}`}
                onClick={handleReviewSubmit}
                disabled={loading}
              >
                {loading ? 'Processing...' : `Confirm ${reviewAction === 'approve' ? 'Approval' : 'Rejection'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminVendorReview;
