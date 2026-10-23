"use client";

import { firebaseConfig, FIREBASE_EMULATOR_HOST } from "./config";

type AuthSdk = typeof import("firebase/auth");
let cached: Promise<{ auth: import("firebase/auth").Auth; sdk: AuthSdk }> | null = null;

/**
 * Firebase is loaded only on the sign-in page. Auth state is kept in memory:
 * after sign-in the ID token is exchanged for an HttpOnly session cookie and
 * the Firebase client session is discarded, so no long-lived credential is
 * left in browser storage.
 */
export function firebaseAuth() {
  cached ??= (async () => {
    const [{ initializeApp, getApps }, sdk] = await Promise.all([import("firebase/app"), import("firebase/auth")]);
    const app =
      getApps()[0] ??
      initializeApp({
        apiKey: firebaseConfig.apiKey || "demo-api-key",
        authDomain: firebaseConfig.authDomain || undefined,
        projectId: firebaseConfig.projectId || "demo-khoka-news",
        appId: firebaseConfig.appId || undefined,
      });
    const auth = sdk.initializeAuth(app, { persistence: sdk.inMemoryPersistence, popupRedirectResolver: sdk.browserPopupRedirectResolver });
    if (FIREBASE_EMULATOR_HOST) sdk.connectAuthEmulator(auth, `http://${FIREBASE_EMULATOR_HOST}`, { disableWarnings: true });
    return { auth, sdk };
  })();
  return cached;
}
