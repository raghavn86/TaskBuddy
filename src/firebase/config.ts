import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Your web app's Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBZsfyu6M67DXvFWIyKl02QabouhSjkHC0",
  authDomain: "taskbuddy-13149.firebaseapp.com",
  projectId: "taskbuddy-13149",
  storageBucket: "taskbuddy-13149.firebasestorage.app",
  messagingSenderId: "270332043907",
  appId: "1:270332043907:web:b7709f4054614e41f4f1b6",
  measurementId: "G-5D60WW692R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;