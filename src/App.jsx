import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import authService from './services/authService.js';
import AdminApplicationForm from './components/AdminApplication/AdminApplicationForm.jsx';
import AdminReviewDashboard from './components/AdminApplication/AdminReviewDashboard.jsx';

// US5: Payment imports
import CheckoutPage   from './components/Payment/CheckoutPage.jsx';
import PaymentPage    from './components/Payment/PaymentPage.jsx';
import PaymentHistory from './components/Payment/PaymentHistory.jsx';

import './App.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await authService.logout();
      setCurrentUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  if (loading) {
    return <div className="app-loading"><p>Loading...</p></div>;
  }

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="header-container">
            <h1>Campus Food Ordering Platform</h1>
            <nav className="main-nav">
              {currentUser ? (
                <>
                  <span className="user-info">
                    Welcome, {currentUser.displayName} ({currentUser.role})
                  </span>
                  <Link to="/" className="nav-link">Home</Link>
                  {currentUser.role === 'student' && (
                    <>
                      <Link to="/checkout"       className="nav-link">Order &amp; Pay</Link>
                      <Link to="/payment-history" className="nav-link">My Payments</Link>
                      <Link to="/apply-admin"     className="nav-link">Apply for Admin</Link>
                    </>
                  )}
                  {currentUser.role === 'admin' && (
                    <>
                      <Link to="/admin/applications" className="nav-link">Review Applications</Link>
                    </>
                  )}
                  <button onClick={handleLogout} className="nav-link logout-btn">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login"    className="nav-link">Login</Link>
                  <Link to="/register" className="nav-link">Register</Link>
                </>
              )}
            </nav>
          </div>
        </header>

        <main className="app-main">
          <Routes>
            <Route path="/"         element={<HomePage currentUser={currentUser} />} />
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/apply-admin"
              element={currentUser ? <AdminApplicationForm /> : <Navigate to="/login" replace />}
            />
            <Route path="/admin/applications"
              element={
                currentUser && currentUser.role === 'admin'
                  ? <AdminReviewDashboard />
                  : <Navigate to="/" replace />
              }
            />
            {/* US5 Payment Routes */}
            <Route path="/checkout"
              element={currentUser ? <CheckoutPage currentUser={currentUser} /> : <Navigate to="/login" replace />}
            />
            <Route path="/payment"
              element={currentUser ? <PaymentPage currentUser={currentUser} /> : <Navigate to="/login" replace />}
            />
            <Route path="/payment-history"
              element={currentUser ? <PaymentHistory currentUser={currentUser} /> : <Navigate to="/login" replace />}
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>

        <footer className="app-footer">
          <p>&copy; 2026 Campus Food Ordering Platform - COMS3009A Software Design</p>
        </footer>
      </div>
    </Router>
  );
}

function HomePage({ currentUser }) {
  return (
    <div className="page home-page">
      <h2>Welcome to Campus Food Ordering Platform</h2>
      {currentUser ? (
        <div className="welcome-content">
          <p>Hello, {currentUser.displayName}!</p>
          <p>Your current role: <strong>{currentUser.role}</strong></p>
          {currentUser.role === 'student' && (
            <div className="action-cards">
              <div className="action-card">
                <h3>🛒 Order Food</h3>
                <p>Browse vendors and pay for your order digitally.</p>
                <Link to="/checkout" className="btn btn-primary">Order Now</Link>
              </div>
              <div className="action-card">
                <h3>💳 Payment History</h3>
                <p>View all your past orders and payment statuses.</p>
                <Link to="/payment-history" className="btn btn-secondary">View History</Link>
              </div>
              <div className="action-card">
                <h3>Apply for Admin Role</h3>
                <p>Help manage the platform by applying for admin privileges.</p>
                <Link to="/apply-admin" className="btn btn-secondary">Apply Now</Link>
              </div>
            </div>
          )}
          {currentUser.role === 'admin' && (
            <div className="action-cards">
              <div className="action-card">
                <h3>Review Applications</h3>
                <p>Review and manage admin role applications from users.</p>
                <Link to="/admin/applications" className="btn btn-primary">Go to Dashboard</Link>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="welcome-content">
          <p>Please log in or register to access the platform.</p>
          <div className="auth-buttons">
            <Link to="/login"    className="btn btn-primary">Login</Link>
            <Link to="/register" className="btn btn-secondary">Register</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function LoginPage() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const handleLogin = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await authService.login(email, password); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="page auth-page">
      <div className="auth-container">
        <h2>Login</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" className="form-control"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" className="form-control"
              value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p className="auth-link">Don't have an account? <Link to="/register">Register here</Link></p>
      </div>
    </div>
  );
}

function RegisterPage() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const handleRegister = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await authService.register(email, password, displayName, 'student'); }
    catch (error) { setError(error.message); }
    finally { setLoading(false); }
  };
  return (
    <div className="page auth-page">
      <div className="auth-container">
        <h2>Register</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="displayName">Display Name</label>
            <input type="text" id="displayName" className="form-control"
              value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" className="form-control"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" className="form-control"
              value={password} onChange={(e) => setPassword(e.target.value)} minLength="6" required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Login here</Link></p>
      </div>
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="page not-found-page">
      <h2>404 - Page Not Found</h2>
      <p>The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn btn-primary">Go Home</Link>
    </div>
  );
}

export default App;
