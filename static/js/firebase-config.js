import { firebaseConfig } from "./config.js";

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
  reauthenticateWithPopup,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  deleteUser,
  updatePassword,
  updateEmail,
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
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  sendEmailVerification,
  deleteUser,
  updateEmail,
  updatePassword,
};
