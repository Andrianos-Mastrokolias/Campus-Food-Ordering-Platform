import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase.jsx';
import './login.css';

// Login component handles both sign in and sign up functionality
export default function Login() {
  // Controls whether the form is in sign-up mode or login mode
  const [isSignUp, setIsSignUp] = useState(false);

  // Stores all user input fields from the form
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });

  // Stores validation or authentication error messages
  const [error, setError] = useState('');

  // Tracks whether an authentication request is in progress
  const [loading, setLoading] = useState(false);

  // Hook used to redirect users after successful login/signup
  const navigate = useNavigate();

  /**
   * Updates formData whenever the user types into an input field.
   * Uses the input's name attribute to determine which value to update.
   */
  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  /**
   * Validates the form before authentication is attempted.
   * Ensures required fields are completed and passwords match in sign-up mode.
   */
  const validateForm = () => {
    // Email and password must always be provided
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    // Firebase requires passwords to be at least 6 characters
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }

    // Extra validation rules only apply during sign-up
    if (isSignUp) {
      // Display name is required for new accounts
      if (!formData.displayName) {
        setError('Name is required');
        return false;
      }

      // Confirm password must match password
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    return true;
  };

  /**
   * Creates a Firestore user profile document if one does not already exist.
   * This ensures each authenticated user has a corresponding database record.
   */
  const createUserProfile = async (user, displayName) => {
    try {
      // Reference to the current user's document in Firestore
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      // Only create the profile if it does not already exist
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: displayName || user.displayName || user.email,
          role: null,
          status: null,
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  /**
   * Handles login using email and password.
   * Signs the user in, creates a profile if needed, then redirects them.
   */
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setError('');

    // Stop if the form is invalid
    if (!validateForm()) return;

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Ensure the signed-in user has a Firestore profile
      await createUserProfile(userCredential.user, formData.displayName);

      // Send user to role selection page after login
      navigate('/select-role');
    } catch (error) {
      console.error('Login error:', error);

      // Show friendly error messages based on Firebase error codes
      if (error.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (error.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (error.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles account creation using email and password.
   * Creates the Firebase account, creates a Firestore profile, then redirects.
   */
  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');

    // Stop if the form is invalid
    if (!validateForm()) return;

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Create a Firestore profile for the new user
      await createUserProfile(userCredential.user, formData.displayName);

      // Redirect new user to role selection
      navigate('/select-role');
    } catch (error) {
      console.error('Signup error:', error);

      // Handle common signup errors with clearer messages
      if (error.code === 'auth/email-already-in-use') {
        setError('An account already exists with this email');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handles authentication using Google sign-in popup.
   * Creates a Firestore profile if needed, then redirects the user.
   */
  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);

      // Create a Firestore profile for Google users if none exists
      await createUserProfile(result.user, result.user.displayName);

      // Redirect to role selection after successful sign-in
      navigate('/select-role');
    } catch (error) {
      console.error('Google sign-in error:', error);

      // Handle popup cancellation separately
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled');
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Campus Food Ordering Platform</h1>
          <p>{isSignUp ? 'Create your account' : 'Sign in to continue'}</p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={isSignUp ? handleSignUp : handleEmailSignIn} className="login-form">
          {isSignUp && (
            <div className="form-group">
              <label htmlFor="displayName">Full Name</label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                placeholder="Enter your name"
                disabled={loading}
                required={isSignUp}
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              disabled={loading}
              required
            />
          </div>

          {isSignUp && (
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                disabled={loading}
                required={isSignUp}
              />
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Sign In')}
          </button>
        </form>

        <div className="divider">
          <span>OR</span>
        </div>

        <button 
          onClick={handleGoogleSignIn} 
          className="btn btn-google"
          disabled={loading}
        >
          <img 
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" 
            alt="Google" 
            className="google-icon"
          />
          Sign in with Google
        </button>

        <div className="toggle-mode">
          {isSignUp ? (
            <p>
              Already have an account?{' '}
              <button 
                type="button" 
                onClick={() => {
                  setIsSignUp(false);
                  setError('');
                  setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
                }}
                className="link-button"
              >
                Sign In
              </button>
            </p>
          ) : (
            <p>
              Don't have an account?{' '}
              <button 
                type="button" 
                onClick={() => {
                  setIsSignUp(true);
                  setError('');
                  setFormData({ email: '', password: '', confirmPassword: '', displayName: '' });
                }}
                className="link-button"
              >
                Sign Up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
