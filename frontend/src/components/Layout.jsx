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

  // Show the vendor dashboard only after the vendor has been approved.
  const isApprovedVendor = role === 'vendor' && status === 'approved';

  // Show admin review pages only after the admin request has been approved.
  const isApprovedAdmin = role === 'admin' && status === 'approved';

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">Campus Food Ordering Platform</h1>
          <nav className="nav">
            <div className="user-info">
              Welcome, {user.displayName || user.email} ({role})
            </div>

            {role === 'student' && (
              <>
                <Link to="/home" className="nav-link">Home</Link>
                <Link to="/register-vendor" className="nav-link">Register as Vendor</Link>
                <Link to="/apply-admin" className="nav-link">Apply for Admin</Link>
              </>
            )}

            {isApprovedVendor && (
              <>
                <Link to="/vendor/dashboard" className="nav-link">Dashboard</Link>
                <Link to="/apply-admin" className="nav-link">Apply for Admin</Link>
              </>
            )}

            {isApprovedAdmin && (
              <>
                <Link to="/admin/applications" className="nav-link">Admin Applications</Link>
                <Link to="/admin/vendors" className="nav-link">Vendor Applications</Link>
              </>
            )}

            <button onClick={handleLogout} className="nav-link logout-btn">
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        © 2026 Campus Food Ordering Platform - COMS3009A Software Design
      </footer>
    </div>
  );
}