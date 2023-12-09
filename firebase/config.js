// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCbPTZukflZgCwfG7tPOvpZuJctnsnfjT4",
  authDomain: "web-app-635.firebaseapp.com",
  databaseURL: "https://web-app-635-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "web-app-635",
  storageBucket: "web-app-635.appspot.com",
  messagingSenderId: "826021594341",
  appId: "1:826021594341:web:cf066b43a3879fc7eb000c",
  measurementId: "G-F3TPZ2H416"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);