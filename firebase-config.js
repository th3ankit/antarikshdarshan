/* ==========================================================================
   ANTARIKSH DARSHAN - FIREBASE BACKEND CONFIGURATION
   ========================================================================== */

// Place your Firebase configuration details here from the Firebase Console:
// Project Settings -> General -> Your Apps -> Web App -> SDK Setup and Configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Helper flag to detect if Firebase credentials have been configured
const isFirebaseConfigured = 
    firebaseConfig.apiKey && 
    firebaseConfig.apiKey !== "YOUR_API_KEY" && 
    firebaseConfig.projectId !== "YOUR_PROJECT_ID";

// Export credentials / helper variables globally
window.firebaseConfig = firebaseConfig;
window.isFirebaseConfigured = isFirebaseConfigured;
