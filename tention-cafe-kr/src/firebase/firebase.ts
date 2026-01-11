// src/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCzSl9-qPEJSka29it33YhBfJm5wQwEgbw",
  authDomain: "tention-cafe-kr-260107.firebaseapp.com",
  projectId: "tention-cafe-kr-260107",
  storageBucket: "tention-cafe-kr-260107.firebasestorage.app",
  messagingSenderId: "1084951262728",
  appId: "1:1084951262728:web:c7c1e83dfcb2c0d72503bd",
  measurementId: "G-Q4R03Q2ZEH"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export async function ensureAnonAuth() {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}
