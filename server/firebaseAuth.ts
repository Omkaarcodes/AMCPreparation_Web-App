// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYftKVjCU4KMl1ZqGPdCoJcoR4tTr0QfQ",
  authDomain: "amcpreparation-webapp.firebaseapp.com",
  databaseURL: "https://amcpreparation-webapp-default-rtdb.firebaseio.com",
  projectId: "amcpreparation-webapp",
  storageBucket: "amcpreparation-webapp.firebasestorage.app",
  messagingSenderId: "84767545939",
  appId: "1:84767545939:web:5c7417462fe2a5cab444a6",
  measurementId: "G-96GFQ4RYFK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);