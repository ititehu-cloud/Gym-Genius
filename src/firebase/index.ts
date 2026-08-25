'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'

// Cache for SDK instances to prevent redundant initialization calls
let cachedSdks: {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
} | null = null;

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (cachedSdks) return cachedSdks;

  let firebaseApp: FirebaseApp;

  if (!getApps().length) {
    try {
      // Attempt to initialize via Firebase App Hosting environment variables
      firebaseApp = initializeApp();
    } catch (e) {
      // Fallback for development
      firebaseApp = initializeApp(firebaseConfig);
    }
  } else {
    firebaseApp = getApp();
  }

  cachedSdks = {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };

  return cachedSdks;
}

export function getSdks(firebaseApp: FirebaseApp) {
  // If we have a cached version for this specific app, use it
  if (cachedSdks && cachedSdks.firebaseApp === firebaseApp) {
    return cachedSdks;
  }
  
  const auth = getAuth(firebaseApp);
  const firestore = getFirestore(firebaseApp);

  if (!cachedSdks) {
      cachedSdks = { firebaseApp, auth, firestore };
  }

  return {
    firebaseApp,
    auth,
    firestore
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
