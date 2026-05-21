import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase.jsx';
import './Layout.css';

export default function Layout({ children }) {
  const { user, role, status } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (!user) {
    return <>{children}</>;
  }

  const isApprovedVendor = role === 'vendor' && status === 'approved';
  const isApprovedAdmin = role === 'admin' && status === 'approved';

  return (
    <main className="layout">
  <header className="header">
    <section className="header-content">
      <h1 className="logo">Campus Food Ordering Platform</h1>

      <nav className="nav" aria-label="Main navigation">
        <p className="user-info">
          Welcome, {user.displayName || user.email} ({role})
        </p>

        {role === 'student' && (
          <>
            <Link to="/home" className="nav-link">Home</Link>
            <Link to="/orders" className="nav-link">My Orders</Link>
            <Link to="/student/analytics" className="nav-link">Analytics</Link>
            <Link to="/register-vendor" className="nav-link">Register as Vendor</Link>
            <Link to="/apply-admin" className="nav-link">Apply for Admin</Link>
          </>
        )}

        {isApprovedVendor && (
          <>
            <Link to="/vendor/dashboard" className="nav-link">Dashboard</Link>
            <Link to="/vendor/analytics" className="nav-link">Analytics</Link>
            <Link to="/vendor/change-request" className="nav-link">Request Detail Change</Link>
            <Link to="/apply-admin" className="nav-link">Apply for Admin</Link>
          </>
        )}

        {isApprovedAdmin && (
          <>
            <Link to="/admin/applications" className="nav-link">Admin Applications</Link>
            <Link to="/admin/vendors" className="nav-link">Vendor Applications</Link>
            <Link to="/admin/vendor-change-requests" className="nav-link">Detail Requests</Link>
          </>
        )}

        <button onClick={handleLogout} className="nav-link logout-btn">
          Logout
        </button>
      </nav>
    </section>
  </header>

  <section className="main-content">
    {children}
  </section>

  <footer className="footer">
    © 2026 Campus Food Ordering Platform - COMS3009A Software Design
  </footer>
</main>
  );
}