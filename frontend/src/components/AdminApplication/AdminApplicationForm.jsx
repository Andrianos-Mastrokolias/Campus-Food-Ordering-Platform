import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import adminApplicationService from '../../services/adminApplicationService';
import './AdminApplicationForm.css';

const AdminApplicationForm = () => {
  const { user, role } = useAuth();
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasPendingApp, setHasPendingApp] = useState(false);
  const [userApplications, setUserApplications] = useState([]);

  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const pending = await adminApplicationService.getUserPendingApplication(user.uid);
      setHasPendingApp(!!pending);

      const apps = await adminApplicationService.getUserApplications(user.uid);
      setUserApplications(apps);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!reason.trim()) {
      setError('Please provide a reason for your application');
      return;
    }

    if (reason.trim().length < 50) {
      setError('Please provide a more detailed reason (at least 50 characters)');
      return;
    }

    if (role === 'admin') {
      setError('You are already an admin');
      return;
    }

    setLoading(true);

    try {
      await adminApplicationService.submitApplication(
        user.uid,
        user.email,
        user.displayName || user.email,
        role,
        reason.trim()
      );

      setSuccess('Application submitted successfully! You will be notified when it is reviewed.');
      setReason('');
      setHasPendingApp(true);
      
      setTimeout(() => {
        loadUserData();
      }, 1000);
    } catch (error) {
      setError(error.message || 'Failed to submit application');
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
      approved: <strong className="badge badge-success">Approved</strong>,
      rejected: <mark className="badge badge-danger">Rejected</mark>
    };
    return badges[status] || <mark className="badge badge-secondary">Unknown</mark>;
  };

  if (!user) {
    return (
      <main className="admin-application-form">
        <aside className="alert alert-info">
          Please log in to apply for admin privileges.
        </aside>
      </main>
    );
  }

  if (role === 'admin') {
    return (
      <main className="admin-application-form">
        <aside className="alert alert-success">
          You already have admin privileges!
        </aside>
      </main>
    );
  }

  return (
    <main className="admin-application-form">

  {/* -------------------------------------------------- */}
  {/* PAGE HEADER                                        */}
  {/* Displays title and application instructions        */}
  {/* -------------------------------------------------- */}
  <header className="form-header">

    <h2>Apply for Admin Role</h2>

    <p>
      Submit an application to gain
      administrative privileges on the platform.
    </p>

  </header>

  {/* -------------------------------------------------- */}
  {/* ERROR MESSAGE                                      */}
  {/* Displays submission or validation errors           */}
  {/* -------------------------------------------------- */}
  {error && (

    <aside className="alert alert-danger">

      <strong>Error:</strong> {error}

    </aside>
  )}

  {/* -------------------------------------------------- */}
  {/* SUCCESS MESSAGE                                    */}
  {/* Displays successful application submission         */}
  {/* -------------------------------------------------- */}
  {success && (

    <aside className="alert alert-success">

      <strong>Success:</strong> {success}

    </aside>
  )}

  {/* -------------------------------------------------- */}
  {/* PENDING APPLICATION WARNING                        */}
  {/* Prevents duplicate admin applications              */}
  {/* -------------------------------------------------- */}
  {hasPendingApp && (

    <aside className="alert alert-warning">

      <strong>Note:</strong>

      {" "}
      You already have a pending application.
      Please wait for it to be reviewed.

    </aside>
  )}

  {/* -------------------------------------------------- */}
  {/* ADMIN APPLICATION FORM                             */}
  {/* Allows users to apply for admin privileges         */}
  {/* -------------------------------------------------- */}
  <form
    onSubmit={handleSubmit}
    className="application-form"
  >

    {/* User name field */}
    <section className="form-group">

      <label htmlFor="userName">
        Name
      </label>

      <input
        type="text"
        id="userName"
        className="form-control"
        value={user.displayName || user.email}
        disabled
      />

    </section>

    {/* User email field */}
    <section className="form-group">

      <label htmlFor="userEmail">
        Email
      </label>

      <input
        type="email"
        id="userEmail"
        className="form-control"
        value={user.email}
        disabled
      />

    </section>

    {/* Current role field */}
    <section className="form-group">

      <label htmlFor="currentRole">
        Current Role
      </label>

      <input
        type="text"
        id="currentRole"
        className="form-control"
        value={role}
        disabled
      />

    </section>

    {/* Application reason input */}
    <section className="form-group">

      <label htmlFor="reason">

        Why do you want admin privileges? *

        {/* Character counter */}
        <mark className="char-count">
          ({reason.length}/500)
        </mark>

      </label>

      {/* Reason textarea */}
      <textarea
        id="reason"
        className="form-control"
        rows="6"
        value={reason}
        onChange={(e) =>
          setReason(
            e.target.value.slice(0, 500)
          )
        }
        placeholder="Please explain why you want to become an admin and how you plan to contribute to the platform (minimum 50 characters)"
        disabled={hasPendingApp || loading}
        required
      />

      {/* Help text */}
      <small className="form-text text-muted">

        Minimum 50 characters.
        Be specific and professional.

      </small>

    </section>

    {/* Submit button section */}
    <footer className="form-actions">

      <button
        type="submit"
        className="btn btn-primary"
        disabled={hasPendingApp || loading}
      >

        {loading
          ? "Submitting..."
          : "Submit Application"}

      </button>

    </footer>

  </form>

  {/* -------------------------------------------------- */}
  {/* APPLICATION HISTORY                                */}
  {/* Displays previous admin applications               */}
  {/* -------------------------------------------------- */}
  {userApplications.length > 0 && (

    <section className="application-history">

      <header>

        <h3>Your Application History</h3>

      </header>

      {/* List of previous applications */}
      <section className="applications-list">

        {userApplications.map((app) => (

          <article
            key={app.id}
            className="application-card"
          >

            {/* Application metadata */}
            <header className="application-header">

              {/* Status badge */}
              <section className="application-status">

                {getStatusBadge(app.status)}

              </section>

              {/* Submission date */}
              <time className="application-date">

                Submitted:
                {" "}
                {formatDate(app.createdAt)}

              </time>

            </header>

            {/* Application details */}
            <section className="application-body">

              <p>
                <strong>Reason:</strong>
              </p>

              {/* Application reason */}
              <p className="reason-text">

                {app.reason}

              </p>

              {/* Review notes */}
              {app.reviewNotes && (

                <>

                  <p>
                    <strong>
                      Review Notes:
                    </strong>
                  </p>

                  <p className="review-notes">

                    {app.reviewNotes}

                  </p>

                </>
              )}

              {/* Reviewed timestamp */}
              {app.reviewedAt && (

                <time className="reviewed-date">

                  Reviewed:
                  {" "}
                  {formatDate(app.reviewedAt)}

                </time>
              )}

            </section>

          </article>

        ))}

      </section>

    </section>
  )}

</main>
  );
};

export default AdminApplicationForm;
