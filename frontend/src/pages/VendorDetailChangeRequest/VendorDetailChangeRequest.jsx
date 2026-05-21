import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase.jsx';
import { useAuth } from '../../context/AuthContext';
import vendorChangeRequestService from '../../services/vendorChangeRequestService';
import './VendorDetailChangeRequest.css';

export default function VendorDetailChangeRequest() {
  const { user, role, loading } = useAuth();
  const [vendorProfile, setVendorProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [formData, setFormData] = useState({
    businessName: '',
    businessDescription: '',
    businessPhone: '',
    businessAddress: '',
    businessType: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const loadVendorData = async () => {
      if (loading || !user || role !== 'vendor') return;

      try {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const profile = userSnap.data().vendorProfile || {};
          setVendorProfile(profile);
          setFormData({
            businessName: profile.businessName || '',
            businessDescription: profile.businessDescription || '',
            businessPhone: profile.businessPhone || '',
            businessAddress: profile.businessAddress || '',
            businessType: profile.businessType || ''
          });
        }

        const vendorRequests = await vendorChangeRequestService.getVendorRequests(user.uid);
        setRequests(vendorRequests);
      } catch (err) {
        console.error('Error loading vendor detail requests:', err);
        setError('Failed to load vendor details. Please try again.');
      }
    };

    loadVendorData();
  }, [user, role, loading]);

  const handleInputChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.businessName.trim()) {
      setError('Business name is required.');
      return;
    }

    if (!formData.businessDescription.trim()) {
      setError('Business description is required.');
      return;
    }

    if (!formData.businessPhone.trim()) {
      setError('Business phone is required.');
      return;
    }

    if (!formData.businessAddress.trim()) {
      setError('Business address is required.');
      return;
    }

    try {
      setSubmitting(true);

      await vendorChangeRequestService.submitRequest(
        user.uid,
        user.email,
        user.displayName || user.email,
        vendorProfile,
        {
          businessName: formData.businessName.trim(),
          businessDescription: formData.businessDescription.trim(),
          businessPhone: formData.businessPhone.trim(),
          businessAddress: formData.businessAddress.trim(),
          businessType: formData.businessType.trim()
        }
      );

      const updatedRequests = await vendorChangeRequestService.getVendorRequests(user.uid);
      setRequests(updatedRequests);

      setSuccess('Your detail change request was submitted for admin review. An admin email notification was sent.');
    } catch (err) {
      console.error('Error submitting vendor detail change request:', err);
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return 'N/A';
    return timestamp.toDate().toLocaleString('en-ZA');
  };

  if (loading) {
  return (
    <main className="vendor-change-page">
      <section>
        <p>Loading...</p>
      </section>
    </main>
  );
}

return (
  <main className="vendor-change-page">
    <section className="vendor-change-card">
      <header>
        <h1>Request Shop Detail Changes</h1>
        <p>
          Submit updated shop details for admin approval. Changes only apply after an admin approves the request.
        </p>
      </header>

      {error && (
        <section className="change-alert change-alert-error" role="alert">
          <p>{error}</p>
        </section>
      )}

      {success && (
        <section className="change-alert change-alert-success" role="status">
          <p>{success}</p>
        </section>
      )}

      <form className="change-form" onSubmit={handleSubmit}>
        <label>
          Business Name
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Business Description
          <textarea
            name="businessDescription"
            value={formData.businessDescription}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Business Phone
          <input
            type="text"
            name="businessPhone"
            value={formData.businessPhone}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Business Address
          <input
            type="text"
            name="businessAddress"
            value={formData.businessAddress}
            onChange={handleInputChange}
          />
        </label>

        <label>
          Business Type
          <input
            type="text"
            name="businessType"
            value={formData.businessType}
            onChange={handleInputChange}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Change Request'}
        </button>
      </form>
    </section>

    <section className="vendor-change-card">
      <header>
        <h2>My Previous Requests</h2>
      </header>

      {requests.length === 0 ? (
        <p>No detail change requests submitted yet.</p>
      ) : (
        <ul className="request-list">
          {requests.map((request) => (
            <li
              key={request.id}
              className={`request-row ${request.status}`}
            >
              <article>
                <strong>
                  {request.requestedProfile?.businessName || 'Unnamed request'}
                </strong>
                <p>{request.requestedProfile?.businessAddress}</p>
                <small>
                  Submitted: <time>{formatDate(request.createdAt)}</time>
                </small>
              </article>

              <mark className="request-status">
                {request.status}
              </mark>
            </li>
          ))}
        </ul>
      )}
    </section>
  </main>
);
}