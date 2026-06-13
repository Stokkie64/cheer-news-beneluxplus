/**
 * Firebase client SDK singleton (BROWSER).
 *
 * Used only for Firebase Auth on /admin (maintainer login). All data access
 * goes through the server (Admin SDK), never the client — Firestore rules
 * deny direct client reads/writes.
 */
"use client";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const clientApp: FirebaseApp = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const clientAuth: Auth = getAuth(clientApp);
