import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAgz9OL6NYOxwxpzgz7e6Y1Zk6861Gpvt0",
  authDomain: "sellsathi-94ede.firebaseapp.com",
  projectId: "sellsathi-94ede",
  storageBucket: "sellsathi-94ede.firebasestorage.app",
  messagingSenderId: "213392011043",
  appId: "1:213392011043:web:669298ae968e8af8a6a696",
  measurementId: "G-TRNXGBX0HL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
