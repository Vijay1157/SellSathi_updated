import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDT-demNl_Yx2eR_tsOHxn4MXAzIJ6d8nQ",
    authDomain: "sellsathi.firebaseapp.com",
    projectId: "sellsathi",
    storageBucket: "sellsathi.firebasestorage.app",
    messagingSenderId: "643847496704",
    appId: "1:643847496704:web:a3254d6452d2eb634224e5",
    measurementId: "G-FKQE3GELCZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app;
