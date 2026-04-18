import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import vendorApplicationService from '../../services/vendorApplicationService';
import './VendorRegistrationForm.css';

const VendorRegistrationForm = () => {
  const { user, role } = useAuth();
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    phone: '',
    location: ''
  });
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
      const pending = await vendorApplicationService.getUserPendingApplication(user.uid);
      setHasPendingApp(!!pending);

      const apps = await vendorApplicationService.getUserApplications(user.uid);
      setUserApplications(apps);
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load application data');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    if (!formData.businessName.trim()) {
      setError('Business name is required');
      return false;
    }

    if (formData.businessName.trim().length < 3) {
      setError('Business name must be at least 3 characters');
      return false;
    }

    if (!formData.description.trim()) {
      setError('Business description is required');
      return false;
    }

    if (formData.description.trim().length < 20) {
      setError('Business description must be at least 20 characters');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    const phoneRegex = /^(\+27|0)[0-9]{9}$/;
    if (!phoneRegex.test(formData.phone.replace(/\s/g, ''))) {
      setError('Please enter a valid South African phone number (e.g., +27123456789 or 0123456789)');
      return false;
    }

    if (!formData.location.trim()) {
      setError('Location is required');
      return false;
    }

    if (formData.location.trim().length < 5) {
      setError('Please provide a detailed location');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    if (role === 'vendor') {
      setError('You are already a registered vendor');
      return;
    }

    if (hasPendingApp) {
      setError('You already have a pending application');
      return;
    }

    setLoading(true);

    try {
      const businessData = {
        businessName: formData.businessName.trim(),
        businessDescription: formData.description.trim(),
        businessPhone: formData.phone.trim(),
        businessAddress: formData.location.trim(),
        businessType: 'General'
      };

      await vendorApplicationService.submitApplication(
        user.uid,
        user.email,
        user.displayName || user.email,
        businessData
      );

      setSuccess('Vendor registration submitted successfully! You will be notified when it is reviewed.');
      setFormData({
        businessName: '',
        description: '',
        phone: '',
        location: ''
      });
      setHasPendingApp(true);
      
      setTimeout(() => {
        loadUserData();
      }, 1000);
    } catch (error) {
      setError(error.message || 'Failed to submit registration');
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
      pending: <span className="badge badge-warning">Pending Review</span>,
      approved: <span className="badge badge-success">Approved</span>,
      rejected: <span className="badge badge-danger">Rejected</span>
    };
    return badges[status] || <span className="badge badge-secondary">Unknown</span>;
  };

  if (!user) {
    return (
      <div className="vendor-registration-form">
        <div className="alert alert-info">
          Please log in to register as a vendor.
        </div>
      </div>
    );
  }

  if (role === 'vendor') {
    return (
      <div className="vendor-registration-form">
        <div className="alert alert-success">
          <h3>You are already a registered vendor!</h3>
          <p>You can manage your business from the vendor dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="vendor-registration-form">
      <div className="form-header">
        <h2>Vendor Registration</h2>
        <p>Register your business to start selling on the Campus Food Ordering Platform.</p>
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
          <strong>Note:</strong> You already have a pending vendor application. Please wait for it to be reviewed.
        </div>
      )}

      <form onSubmit={handleSubmit} className="registration-form">
        <div className="form-group">
          <label htmlFor="businessName">Business Name *</label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            className="form-control"
            value={formData.businessName}
            onChange={handleChange}
            placeholder="E.g., Matrix Cafe"
            disabled={hasPendingApp || loading}
            required
          />
          <small className="form-text">The name of your business as it will appear to students</small>
        </div>

        <div className="form-group">
          <label htmlFor="description">Business Description *</label>
          <textarea
            id="description"
            name="description"
            className="form-control"
            rows="5"
            value={formData.description}
            onChange={handleChange}
            placeholder="Describe your business, what you sell, and what makes you unique... (minimum 20 characters)"
            disabled={hasPendingApp || loading}
            required
          />
          <small className="form-text">
            {formData.description.length}/500 characters (minimum 20)
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="phone">Phone Number *</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            className="form-control"
            value={formData.phone}
            onChange={handleChange}
            placeholder="+27123456789 or 0123456789"
            disabled={hasPendingApp || loading}
            required
          />
          <small className="form-text">South African format: +27XXXXXXXXX or 0XXXXXXXXX</small>
        </div>

        <div className="form-group">
          <label htmlFor="location">Business Location *</label>
          <textarea
            id="location"
            name="location"
            className="form-control"
            rows="3"
            value={formData.location}
            onChange={handleChange}
            placeholder="E.g., Campus Building A, Ground Floor, Near Library"
            disabled={hasPendingApp || loading}
            required
          />
          <small className="form-text">Provide detailed location on campus for easy pickup</small>
        </div>

        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary"
            disabled={hasPendingApp || loading}
          >
            {loading ? 'Submitting...' : 'Submit Registration'}
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
                  <p><strong>Business Name:</strong> {app.businessName}</p>
                  <p><strong>Description:</strong></p>
                  <p className="description-text">{app.businessDescription}</p>
                  <p><strong>Phone:</strong> {app.businessPhone}</p>
                  <p><strong>Location:</strong> {app.businessAddress}</p>
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

export default VendorRegistrationForm;
