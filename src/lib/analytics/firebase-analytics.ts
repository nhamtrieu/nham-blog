import { env } from "@/env";
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalHostname(hostname: string) {
  return LOCAL_HOSTNAMES.has(hostname);
}

export const shouldEnableFirebaseAnalytics =
  env.NODE_ENV === "production" &&
  Boolean(env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) &&
  !isLocalHostname(new URL(env.APP_URL).hostname);

export const firebaseConfig = {
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }

  return initializeApp(firebaseConfig);
}

export function isTrackableHostname(hostname: string) {
  return !isLocalHostname(hostname);
}
