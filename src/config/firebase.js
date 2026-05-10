// Firebase Configuration
// Replace these values with your actual Firebase project credentials
// Get these from Firebase Console > Project Settings > General > Your apps > Web app

import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAodPISMTOM4irn-cLtWz6Zj5yBRHYsuVM",
  authDomain: "campus-food-app-f3973.firebaseapp.com",
  projectId: "campus-food-app-f3973",
  storageBucket: "campus-food-app-f3973.firebasestorage.app",
  messagingSenderId: "278743038373",
  appId: "1:278743038373:web:8029f79ce906d7c6cb104c",
  measurementId: "G-GB1M4XY968"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
