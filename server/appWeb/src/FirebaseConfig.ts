import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyC-l4wevzwLNuoeuUrv8gWqnqbbkUBt0-M",
    authDomain: "gestion-api-rest-dam.firebaseapp.com",
    projectId: "gestion-api-rest-dam",
    storageBucket: "gestion-api-rest-dam.firebasestorage.app",
    messagingSenderId: "181457370400",
    appId: "1:181457370400:web:dc460dc4f9c86cbef82b45"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const fireStore = getFirestore(app);
