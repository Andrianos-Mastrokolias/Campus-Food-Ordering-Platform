import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

/**
 * Authentication Service
 * Handles all Firebase authentication operations
 */
class AuthService {
  
  /**
   * Register a new user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @param {string} displayName - User's display name
   * @param {string} role - Initial role (default: 'student')
   * @returns {Promise<Object>} User object
   */
  async register(email, password, displayName, role = 'student') {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name in Auth
      await updateProfile(user, { displayName });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: email,
        displayName: displayName,
        role: role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true
      });

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: role
      };
    } catch (error) {
      console.error('Error in register:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign in existing user with email and password
   * @param {string} email - User's email address
   * @param {string} password - User's password
   * @returns {Promise<Object>} User object with role
   */
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        throw new Error('User profile not found');
      }

      const userData = userDoc.data();

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: userData.role,
        isActive: userData.isActive
      };
    } catch (error) {
      console.error('Error in login:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Sign out current user
   * @returns {Promise<void>}
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error in logout:', error);
      throw this.handleAuthError(error);
    }
  }

  /**
   * Get current user with role information
   * @returns {Promise<Object|null>} User object or null if not authenticated
   */
  async getCurrentUser() {
    return new Promise((resolve, reject) => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        unsubscribe();
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              resolve({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                role: userData.role,
                isActive: userData.isActive
              });
            } else {
              resolve(null);
            }
          } catch (error) {
            reject(error);
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Subscribe to authentication state changes
   * @param {Function} callback - Callback function with user object
   * @returns {Function} Unsubscribe function
   */
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            callback({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              role: userData.role,
              isActive: userData.isActive
            });
          } else {
            callback(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          callback(null);
        }
      } else {
        callback(null);
      }
    });
  }

  /**
   * Handle Firebase auth errors and return user-friendly messages
   * @param {Error} error - Firebase error object
   * @returns {Error} Error with friendly message
   */
  handleAuthError(error) {
    const errorMessages = {
      'auth/email-already-in-use': 'This email is already registered',
      'auth/invalid-email': 'Invalid email address',
      'auth/operation-not-allowed': 'Operation not allowed',
      'auth/weak-password': 'Password is too weak (min 6 characters)',
      'auth/user-disabled': 'This account has been disabled',
      'auth/user-not-found': 'No account found with this email',
      'auth/wrong-password': 'Incorrect password',
      'auth/invalid-credential': 'Invalid email or password',
      'auth/too-many-requests': 'Too many failed attempts. Try again later',
      'auth/network-request-failed': 'Network error. Check your connection'
    };

    const message = errorMessages[error.code] || error.message || 'An error occurred';
    return new Error(message);
  }
}

export default new AuthService();
