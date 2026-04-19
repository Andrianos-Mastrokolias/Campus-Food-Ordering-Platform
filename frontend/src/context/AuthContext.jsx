// Import React utilities for context and state management
import { createContext, useContext, useEffect, useState } from "react";

// Firebase authentication listener
import { onAuthStateChanged } from "firebase/auth";

// Firestore functions to read/write user data
import { doc, getDoc, setDoc } from "firebase/firestore";

// Firebase instances
import { auth, db } from "../firebase";

// Create a global authentication context
const AuthContext = createContext();

/**
 * Custom hook to easily access authentication context
 * Used in components like: const { user, role } = useAuth();
 */
export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider wraps the app and provides global authentication state.
 * It tracks:
 * - user (Firebase user)
 * - role (student/vendor/admin)
 * - status (approved/pending/etc.)
 */
export function AuthProvider({ children }) {
  // Stores authenticated Firebase user
  const [user, setUser] = useState(null);

  // Stores user's role (used for role-based access control)
  const [role, setRole] = useState(null);

  // Stores approval status (used for vendors/admins)
  const [status, setStatus] = useState(null);

  // Tracks whether authentication state is still loading
  const [loading, setLoading] = useState(true);

  /**
   * Runs once when the app loads.
   * Listens for authentication state changes (login/logout).
   */
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is logged in → store user in state
          setUser(firebaseUser);

          // Reference to user's Firestore document
          const userRef = doc(db, "users", firebaseUser.uid);

          // Fetch user data from Firestore
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            // If user profile exists → load role and status
            const userData = userSnap.data();
            setRole(userData.role || null);
            setStatus(userData.status || null);

          } else {
            /**
             * If user logs in for the first time (no Firestore document),
             * create a new user profile with default values.
             */
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email || "",
              displayName: firebaseUser.displayName || "",
              role: null,
              status: null,
              createdAt: new Date(),
            });

            // Default role and status are null until user selects role
            setRole(null);
            setStatus(null);
          }

        } else {
          // User logged out → clear all authentication-related state
          setUser(null);
          setRole(null);
          setStatus(null);
        }

      } catch (error) {
        // Catch any errors during auth or Firestore operations
        console.error("AuthContext error:", error.message);

        // Reset state to prevent inconsistent data
        setUser(null);
        setRole(null);
        setStatus(null);

      } finally {
        // Authentication check is complete
        setLoading(false);
      }
    });

    // Cleanup listener when component unmounts
    return () => unsubscribe();
  }, []);

  /**
   * Provide authentication state and setters to the entire app.
   * Children are only rendered once loading is complete.
   */
  return (
    <AuthContext.Provider
      value={{ user, role, setRole, status, setStatus, loading }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}