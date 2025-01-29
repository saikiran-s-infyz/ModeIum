import { initializeApp } from "firebase/app";
import { getAuth, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAgin-fmK8AlP5fOAoCis1KrebXab-JcBI",
  authDomain: "modeium.firebaseapp.com",
  projectId: "modeium",
  storageBucket: "modeium.firebasestorage.app",
  messagingSenderId: "199061583079",
  appId: "1:199061583079:web:ddecd4900e1c4e29071e42",
  measurementId: "G-HZ9SZFJ8PZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Add a sign-out helper function
export const signOutUser = async () => {
  try {
    await signOut(auth);
    // Clear the auth cookie via API
    await fetch('/api/auth/cookie', {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

// Initialize Analytics only in browser and after window is loaded
let analytics = null;
if (typeof window !== 'undefined') {
  window.onload = () => {
    const { getAnalytics } = require('firebase/analytics');
    analytics = getAnalytics(app);
  };
}

export { analytics };