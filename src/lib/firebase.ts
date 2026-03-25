import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // Auth 연동 시 주석 해제

const firebaseConfig = {
  apiKey: "AIzaSyCaS1bh1XwzV6D3daFrW4yvhPue0jul8Os",
  authDomain: "watchtek-report.firebaseapp.com",
  projectId: "watchtek-report",
  storageBucket: "watchtek-report.firebasestorage.app",
  messagingSenderId: "305637358683",
  appId: "1:305637358683:web:0c88775d95784856ee537e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);
// export const auth = getAuth(app); // Auth 연동 시 주석 해제
