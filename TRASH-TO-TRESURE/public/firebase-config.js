// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBpr2avp2z4X4BV2rukGYzdDcg-Rj7Yhg8",
  authDomain: "trash-to-treasure-990bc.firebaseapp.com",
  projectId: "trash-to-treasure-990bc",
  storageBucket: "trash-to-treasure-990bc.appspot.com",
  messagingSenderId: "519045566161",
  appId: "1:519045566161:web:c544b425a52bbe1a617ff0",
  measurementId: "G-K11CXLDWKT",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

export { app, analytics, auth };
