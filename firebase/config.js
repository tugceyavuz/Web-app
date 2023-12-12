// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAiu7cbvXsaPc5HuvW_fuFc1wdsvMVFZDY",
  authDomain: "project-8015146977332307444.firebaseapp.com",
  projectId: "project-8015146977332307444",
  storageBucket: "project-8015146977332307444.appspot.com",
  messagingSenderId: "923710060170",
  appId: "1:923710060170:web:bf463e73571f2dd2215f73",
  databaseURL: "https://project-8015146977332307444-default-rtdb.europe-west1.firebasedatabase.app/",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);