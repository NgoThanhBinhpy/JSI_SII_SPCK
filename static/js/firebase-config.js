const firebaseConfig = {
  apiKey: "AIzaSyCuxguSKYncNh_9-qlOjl4Zeck1IyWXj68",
  authDomain: "sh-jsi28-thanhbinh.firebaseapp.com",
  projectId: "sh-jsi28-thanhbinh",
  storageBucket: "sh-jsi28-thanhbinh.firebasestorage.app",
  messagingSenderId: "262894424190",
  appId: "1:262894424190:web:6a7b6d013283fb345ac82f",
  measurementId: "G-47XPE7RCK0",
};

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-storage.js";
import {
  getFirestore,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  addDoc,
  writeBatch,
  query,
  where,
  onSnapshot,
  Timestamp,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  OAuthProvider,
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";

const app = initializeApp(firebaseConfig);
console.log("🚀 ~ app:", app.name);
export const storage = getStorage(app);
console.log("🚀 ~ storage:", storage);
export const analytics = getAnalytics(app);
console.log("🚀 ~ analytics:", analytics);
export const auth = getAuth(app);
export const db = getFirestore(app);
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  serverTimestamp,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  linkWithPopup,
  linkWithCredential,
  OAuthProvider,
  getDocs,
  getDoc,
  onSnapshot,
  addDoc,
  query,
  where,
  writeBatch,
  Timestamp,
};
