import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBKiMnOMlI3JXoUPh_yNMxkg1V62KduUXg",
  authDomain: "growvy-webapp.firebaseapp.com",
  projectId: "growvy-webapp",
   storageBucket: "growvy-webapp.firebasestorage.app",
  messagingSenderId: "244831195006",
  appId: "1:244831195006:web:99308b445d1f9e1396ad2f",
  measurementId: "G-5NK00CL9LZ"
};

export const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);