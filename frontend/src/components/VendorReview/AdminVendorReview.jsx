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
    pending: <mark className="badge badge-warning">Pending</mark>,
    approved: <mark className="badge badge-success">Approved</mark>,
    rejected: <mark className="badge badge-danger">Rejected</mark>
  };

  return badges[status] || (
    <mark className="badge badge-secondary">Unknown</mark>
  );
};

if (loading && !reviewingApp) {
  return (
    <main className="admin-vendor-review">
      <section className="loading">
        Loading vendor applications...
      </section>
    </main>
  );
}

if (role !== 'admin') {
  return (
    <main className="admin-vendor-review">
      <section className="alert alert-danger" role="alert">
        Access denied. You must be an admin to view this page.
      </section>
    </main>
  );
}

return (
  <main className="admin-vendor-review">
    <header className="dashboard-header">
      <h1>Vendor Application Review</h1>
      <p>Review and approve vendor registrations</p>
    </header>

    {error && (
      <section className="alert alert-danger" role="alert">
        <strong>Error:</strong> {error}
      </section>
    )}

    {success && (
      <section className="alert alert-success" role="status">
        <strong>Success:</strong> {success}
      </section>
    )}

    {stats && (
      <section className="stats-container">
        <article className="stat-card">
          <h2 className="stat-value">{stats.total}</h2>
          <p className="stat-label">Total Applications</p>
        </article>

        <article className="stat-card pending">
          <h2 className="stat-value">{stats.pending}</h2>
          <p className="stat-label">Pending Review</p>
        </article>

        <article className="stat-card approved">
          <h2 className="stat-value">{stats.approved}</h2>
          <p className="stat-label">Approved</p>
        </article>

        <article className="stat-card rejected">
          <h2 className="stat-value">{stats.rejected}</h2>
          <p className="stat-label">Rejected</p>
        </article>
      </section>
    )}

    <nav className="filter-buttons" aria-label="Application Filters">
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
    </nav>

    <section className="applications-container">
      {filteredApplications.length === 0 ? (
        <section className="no-applications">
          <p>
            No {filter !== 'all' ? filter : ''} vendor applications found.
          </p>
        </section>
      ) : (
        <ul className="applications-grid">
          {filteredApplications.map((app) => (
            <li
              key={app.id}
              className={`application-card ${app.status}`}
            >
              <article>
                <header className="card-header">
                  <section className="vendor-info">
                    <h3>{app.businessName}</h3>
                    <p className="applicant">
                      Applied by: {app.userName}
                    </p>
                    <address className="email">
                      {app.userEmail}
                    </address>
                  </section>

                  <section className="status-badge">
                    {getStatusBadge(app.status)}
                  </section>
                </header>

                <section className="card-body">
                  <p className="info-row">
                    <strong className="label">Submitted:</strong>
                    <time className="value">
                      {formatDate(app.createdAt)}
                    </time>
                  </p>

                  <section className="business-section">
                    <strong>Business Description:</strong>
                    <p className="description-text">
                      {app.businessDescription}
                    </p>
                  </section>

                  <section className="contact-section">
                    <p className="info-row">
                      <strong className="label">📞 Phone:</strong>
                      <span className="value">
                        {app.businessPhone}
                      </span>
                    </p>

                    <p className="info-row">
                      <strong className="label">📍 Location:</strong>
                      <span className="value">
                        {app.businessAddress}
                      </span>
                    </p>
                  </section>

                  {app.reviewedBy && (
                    <>
                      <p className="info-row">
                        <strong className="label">Reviewed:</strong>
                        <time className="value">
                          {formatDate(app.reviewedAt)}
                        </time>
                      </p>

                      {app.reviewNotes && (
                        <section className="review-section">
                          <strong>Review Notes:</strong>
                          <p className="review-text">
                            {app.reviewNotes}
                          </p>
                        </section>
                      )}
                    </>
                  )}
                </section>

                {app.status === 'pending' && (
                  <footer className="card-actions">
                    <button
                      className="btn btn-success"
                      onClick={() =>
                        handleReviewClick(app, 'approve')
                      }
                    >
                      Approve
                    </button>

                    <button
                      className="btn btn-danger"
                      onClick={() =>
                        handleReviewClick(app, 'reject')
                      }
                    >
                      Reject
                    </button>
                  </footer>
                )}
              </article>
            </li>
          ))}
        </ul>
      )}
    </section>

    {reviewingApp && (
      <aside
        className="modal-overlay"
        onClick={() => setReviewingApp(null)}
      >
        <section
          className="modal-content"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="modal-header">
            <h2>
              {reviewAction === 'approve'
                ? 'Approve'
                : 'Reject'}{' '}
              Vendor Application
            </h2>

            <button
              className="close-btn"
              onClick={() => setReviewingApp(null)}
              aria-label="Close modal"
            >
              ×
            </button>
          </header>

          <section className="modal-body">
            <article className="applicant-summary">
              <p>
                <strong>Business Name:</strong>{' '}
                {reviewingApp.businessName}
              </p>

              <p>
                <strong>Applicant:</strong>{' '}
                {reviewingApp.userName}
              </p>

              <p>
                <strong>Email:</strong>{' '}
                {reviewingApp.userEmail}
              </p>

              <p>
                <strong>Phone:</strong>{' '}
                {reviewingApp.businessPhone}
              </p>

              <p>
                <strong>Location:</strong>{' '}
                {reviewingApp.businessAddress}
              </p>
            </article>

            <fieldset className="form-group">
              <label htmlFor="reviewNotes">
                {reviewAction === 'approve'
                  ? 'Review Notes (Optional)'
                  : 'Reason for Rejection *'}
              </label>

              <textarea
                id="reviewNotes"
                className="form-control"
                rows="4"
                value={reviewNotes}
                onChange={(e) =>
                  setReviewNotes(e.target.value)
                }
                placeholder={
                  reviewAction === 'approve'
                    ? 'Add any notes about this approval...'
                    : 'Explain why this application is being rejected...'
                }
                required={reviewAction === 'reject'}
              />
            </fieldset>
          </section>

          <footer className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setReviewingApp(null)}
            >
              Cancel
            </button>

            <button
              className={`btn ${
                reviewAction === 'approve'
                  ? 'btn-success'
                  : 'btn-danger'
              }`}
              onClick={handleReviewSubmit}
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : `Confirm ${
                    reviewAction === 'approve'
                      ? 'Approval'
                      : 'Rejection'
                  }`}
            </button>
          </footer>
        </section>
      </aside>
    )}
  </main>
);
};

export default AdminVendorReview;
