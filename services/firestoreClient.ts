import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Validate configuration
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === 'your_firebase_api_key' || firebaseConfig.apiKey === 'undefined') {
  console.warn('VITE_FIREBASE_API_KEY is not configured correctly');
}

if (!firebaseConfig.projectId || firebaseConfig.projectId === 'your-project-id' || firebaseConfig.projectId === 'undefined') {
  console.warn('VITE_FIREBASE_PROJECT_ID is not configured correctly');
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };