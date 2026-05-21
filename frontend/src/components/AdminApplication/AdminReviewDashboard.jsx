import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import adminApplicationService from '../../services/adminApplicationService';
import './AdminReviewDashboard.css';

const AdminReviewDashboard = () => {
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
      const apps = await adminApplicationService.getAllApplications();
      setApplications(apps);

      const statistics = await adminApplicationService.getApplicationStats();
      setStats(statistics);
    } catch (error) {
      console.error('Error loading applications:', error);
      setError('Failed to load applications');
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
        await adminApplicationService.approveApplication(
          reviewingApp.id,
          user.uid,
          reviewNotes.trim()
        );
        setSuccess(`Application approved! ${reviewingApp.userName} is now an admin.`);
      } else {
        await adminApplicationService.rejectApplication(
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

  /* -------------------------------------------------- */
/* STATUS BADGE HELPER FUNCTION                       */
/* Returns styled badges based on application status  */
/* -------------------------------------------------- */
const getStatusBadge = (status) => {

  /* Status badge mappings */
  const badges = {

    pending: (
      <mark className="badge badge-warning">
        Pending
      </mark>
    ),

    approved: (
      <mark className="badge badge-success">
        Approved
      </mark>
    ),

    rejected: (
      <mark className="badge badge-danger">
        Rejected
      </mark>
    )
  };

  /* Fallback badge for unknown status */
  return (
    badges[status] || (
      <mark className="badge badge-secondary">
        Unknown
      </mark>
    )
  );
};

/* -------------------------------------------------- */
/* LOADING SCREEN                                     */
/* Displayed while applications are loading           */
/* -------------------------------------------------- */
if (loading && !reviewingApp) {

  return (

    <main className="admin-review-dashboard">

      <section className="loading">

        Loading applications...

      </section>

    </main>
  );
}

/* -------------------------------------------------- */
/* ACCESS CONTROL                                     */
/* Prevents non-admin users from viewing dashboard    */
/* -------------------------------------------------- */
if (role !== "admin") {

  return (

    <main className="admin-review-dashboard">

      <aside className="alert alert-danger">

        Access denied.
        You must be an admin to view this page.

      </aside>

    </main>
  );
}

/* -------------------------------------------------- */
/* MAIN ADMIN REVIEW DASHBOARD                        */
/* Displays admin application review interface        */
/* -------------------------------------------------- */
return (

  <main className="admin-review-dashboard">

    {/* Dashboard header */}
    <header className="dashboard-header">

      <h1>
        Admin Application Review Dashboard
      </h1>

      <p>
        Review and manage admin role applications
      </p>

    </header>

    {/* Error alert */}
    {error && (

      <aside className="alert alert-danger">

        <strong>Error:</strong> {error}

      </aside>
    )}

    {/* Success alert */}
    {success && (

      <aside className="alert alert-success">

        <strong>Success:</strong> {success}

      </aside>
    )}

    {/* -------------------------------------------------- */}
    {/* APPLICATION STATISTICS                             */}
    {/* Displays application counts and review summaries   */}
    {/* -------------------------------------------------- */}
    {stats && (

      <section className="stats-container">

        {/* Total applications */}
        <article className="stat-card">

          <p className="stat-value">
            {stats.total}
          </p>

          <p className="stat-label">
            Total Applications
          </p>

        </article>

        {/* Pending applications */}
        <article className="stat-card pending">

          <p className="stat-value">
            {stats.pending}
          </p>

          <p className="stat-label">
            Pending Review
          </p>

        </article>

        {/* Approved applications */}
        <article className="stat-card approved">

          <p className="stat-value">
            {stats.approved}
          </p>

          <p className="stat-label">
            Approved
          </p>

        </article>

        {/* Rejected applications */}
        <article className="stat-card rejected">

          <p className="stat-value">
            {stats.rejected}
          </p>

          <p className="stat-label">
            Rejected
          </p>

        </article>

      </section>
    )}

    {/* -------------------------------------------------- */}
    {/* FILTER BUTTONS                                     */}
    {/* Allows admins to filter applications by status     */}
    {/* -------------------------------------------------- */}
    <nav className="filter-buttons">

      <button
        className={`filter-btn ${
          filter === "all" ? "active" : ""
        }`}
        onClick={() => setFilter("all")}
      >
        All ({applications.length})
      </button>

      <button
        className={`filter-btn ${
          filter === "pending" ? "active" : ""
        }`}
        onClick={() => setFilter("pending")}
      >
        Pending ({stats?.pending || 0})
      </button>

      <button
        className={`filter-btn ${
          filter === "approved" ? "active" : ""
        }`}
        onClick={() => setFilter("approved")}
      >
        Approved ({stats?.approved || 0})
      </button>

      <button
        className={`filter-btn ${
          filter === "rejected" ? "active" : ""
        }`}
        onClick={() => setFilter("rejected")}
      >
        Rejected ({stats?.rejected || 0})
      </button>

    </nav>

    {/* -------------------------------------------------- */}
    {/* APPLICATION LIST                                   */}
    {/* Displays all filtered admin applications            */}
    {/* -------------------------------------------------- */}
    <section className="applications-container">

      {filteredApplications.length === 0 ? (

        <section className="no-applications">

          <p>
            No {filter !== "all" ? filter : ""}
            {" "}
            applications found.
          </p>

        </section>

      ) : (

        <section className="applications-grid">

          {/* Generate application cards dynamically */}
          {filteredApplications.map((app) => (

            <article
              key={app.id}
              className={`application-card ${app.status}`}
            >

              {/* Card header */}
              <header className="card-header">

                {/* Applicant details */}
                <section className="applicant-info">

                  <h3>{app.userName}</h3>

                  <p className="email">
                    {app.userEmail}
                  </p>

                  <p className="role">

                    Current Role:
                    {" "}

                    <strong>
                      {app.currentRole}
                    </strong>

                  </p>

                </section>

                {/* Status badge */}
                <section className="status-badge">

                  {getStatusBadge(app.status)}

                </section>

              </header>

              {/* Application details */}
              <section className="card-body">

                {/* Submission date */}
                <section className="info-row">

                  <p className="label">
                    Submitted:
                  </p>

                  <time className="value">

                    {formatDate(app.createdAt)}

                  </time>

                </section>

                {/* Application reason */}
                <section className="reason-section">

                  <strong>
                    Reason for Application:
                  </strong>

                  <p className="reason-text">

                    {app.reason}

                  </p>

                </section>

                {/* Review information */}
                {app.reviewedBy && (

                  <>

                    <section className="info-row">

                      <p className="label">
                        Reviewed:
                      </p>

                      <time className="value">

                        {formatDate(app.reviewedAt)}

                      </time>

                    </section>

                    {/* Review notes */}
                    {app.reviewNotes && (

                      <section className="review-section">

                        <strong>
                          Review Notes:
                        </strong>

                        <p className="review-text">

                          {app.reviewNotes}

                        </p>

                      </section>
                    )}

                  </>
                )}

              </section>

              {/* Review action buttons */}
              {app.status === "pending" && (

                <footer className="card-actions">

                  <button
                    className="btn btn-success"
                    onClick={() =>
                      handleReviewClick(
                        app,
                        "approve"
                      )
                    }
                  >
                    Approve
                  </button>

                  <button
                    className="btn btn-danger"
                    onClick={() =>
                      handleReviewClick(
                        app,
                        "reject"
                      )
                    }
                  >
                    Reject
                  </button>

                </footer>
              )}

            </article>

          ))}

        </section>
      )}

    </section>

    {/* -------------------------------------------------- */}
    {/* REVIEW MODAL                                       */}
    {/* Displays approval/rejection review form            */}
    {/* -------------------------------------------------- */}
    {reviewingApp && (

      <aside
        className="modal-overlay"
        onClick={() =>
          setReviewingApp(null)
        }
      >

        <section
          className="modal-content"
          onClick={(e) =>
            e.stopPropagation()
          }
        >

          {/* Modal header */}
          <header className="modal-header">

            <h2>

              {reviewAction === "approve"
                ? "Approve"
                : "Reject"}

              {" "}

              Application

            </h2>

            {/* Close modal button */}
            <button
              className="close-btn"
              onClick={() =>
                setReviewingApp(null)
              }
            >
              ×
            </button>

          </header>

          {/* Modal body */}
          <section className="modal-body">

            {/* Applicant summary */}
            <section className="applicant-summary">

              <p>
                <strong>Applicant:</strong>
                {" "}
                {reviewingApp.userName}
              </p>

              <p>
                <strong>Email:</strong>
                {" "}
                {reviewingApp.userEmail}
              </p>

              <p>
                <strong>Current Role:</strong>
                {" "}
                {reviewingApp.currentRole}
              </p>

            </section>

            {/* Review notes form */}
            <section className="form-group">

              <label htmlFor="reviewNotes">

                {reviewAction === "approve"
                  ? "Review Notes (Optional)"
                  : "Reason for Rejection *"}

              </label>

              <textarea
                id="reviewNotes"
                className="form-control"
                rows="4"
                value={reviewNotes}
                onChange={(e) =>
                  setReviewNotes(
                    e.target.value
                  )
                }
                placeholder={
                  reviewAction === "approve"
                    ? "Add any notes about this approval..."
                    : "Explain why this application is being rejected..."
                }
                required={
                  reviewAction === "reject"
                }
              />

            </section>

          </section>

          {/* Modal footer */}
          <footer className="modal-footer">

            <button
              className="btn btn-secondary"
              onClick={() =>
                setReviewingApp(null)
              }
            >
              Cancel
            </button>

            <button
              className={`btn ${
                reviewAction === "approve"
                  ? "btn-success"
                  : "btn-danger"
              }`}
              onClick={handleReviewSubmit}
              disabled={loading}
            >

              {loading
                ? "Processing..."
                : `Confirm ${
                    reviewAction === "approve"
                      ? "Approval"
                      : "Rejection"
                  }`}

            </button>

          </footer>

        </section>

      </aside>
    )}

  </main>
);
};

export default AdminReviewDashboard;
