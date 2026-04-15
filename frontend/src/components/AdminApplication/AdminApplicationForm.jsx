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
      pending: <span className="badge badge-warning">Pending</span>,
      approved: <span className="badge badge-success">Approved</span>,
      rejected: <span className="badge badge-danger">Rejected</span>
    };
    return badges[status] || <span className="badge badge-secondary">Unknown</span>;
  };

  if (!user) {
    return (
      <div className="admin-application-form">
        <div className="alert alert-info">
          Please log in to apply for admin privileges.
        </div>
      </div>
    );
  }

  if (role === 'admin') {
    return (
      <div className="admin-application-form">
        <div className="alert alert-success">
          You already have admin privileges!
        </div>
      </div>
    );
  }

  return (
    <div className="admin-application-form">
      <div className="form-header">
        <h2>Apply for Admin Role</h2>
        <p>Submit an application to gain administrative privileges on the platform.</p>
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

      {hasPendingApp && (
        <div className="alert alert-warning">
          <strong>Note:</strong> You already have a pending application. Please wait for it to be reviewed.
        </div>
      )}

      <form onSubmit={handleSubmit} className="application-form">
        <div className="form-group">
          <label htmlFor="userName">Name</label>
          <input
            type="text"
            id="userName"
            className="form-control"
            value={user.displayName || user.email}
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="userEmail">Email</label>
          <input
            type="email"
            id="userEmail"
            className="form-control"
            value={user.email}
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="currentRole">Current Role</label>
          <input
            type="text"
            id="currentRole"
            className="form-control"
            value={role}
            disabled
          />
        </div>

        <div className="form-group">
          <label htmlFor="reason">
            Why do you want admin privileges? *
            <span className="char-count">({reason.length}/500)</span>
          </label>
          <textarea
            id="reason"
            className="form-control"
            rows="6"
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            placeholder="Please explain why you want to become an admin and how you plan to contribute to the platform (minimum 50 characters)"
            disabled={hasPendingApp || loading}
            required
          />
          <small className="form-text text-muted">
            Minimum 50 characters. Be specific and professional.
          </small>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={hasPendingApp || loading}
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>

      {userApplications.length > 0 && (
        <div className="application-history">
          <h3>Your Application History</h3>
          <div className="applications-list">
            {userApplications.map((app) => (
              <div key={app.id} className="application-card">
                <div className="application-header">
                  <div className="application-status">
                    {getStatusBadge(app.status)}
                  </div>
                  <div className="application-date">
                    Submitted: {formatDate(app.createdAt)}
                  </div>
                </div>
                <div className="application-body">
                  <p><strong>Reason:</strong></p>
                  <p className="reason-text">{app.reason}</p>
                  {app.reviewNotes && (
                    <>
                      <p><strong>Review Notes:</strong></p>
                      <p className="review-notes">{app.reviewNotes}</p>
                    </>
                  )}
                  {app.reviewedAt && (
                    <p className="reviewed-date">
                      Reviewed: {formatDate(app.reviewedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApplicationForm;
