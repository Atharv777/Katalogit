/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as fbSignOut,
  updateProfile,
  type User,
  type Unsubscribe,
} from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Use initializeFirestore with force long polling as a fallback/fix for sandbox environments
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

/** Human-readable messages for the auth errors sellers actually hit. */
function authMessage(code: string): string {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'That email already has an account. Sign in instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'That email and password do not match an account.';
    case 'auth/invalid-email':
      return 'That email address does not look right.';
    case 'auth/weak-password':
      return 'Choose a password with at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'The Google window closed before you signed in.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Wait a minute and try again.';
    case 'auth/network-request-failed':
      return 'Could not reach the sign-in service. Check your connection.';
    case 'auth/operation-not-allowed':
    case 'auth/OPERATION_NOT_ALLOWED':
      return 'Email sign-in is switched off for this project. Use Google, or ask the owner to enable Email/Password in Firebase Console → Authentication → Sign-in method.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorised for sign-in. Add localhost to Firebase Console → Authentication → Settings → Authorised domains.';
    default:
      return 'Sign-in failed. Try again.';
  }
}

/** Sign up with email + password, then attach the seller's display name. */
export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    return credential.user;
  } catch (error) {
    throw new Error(authMessage((error as { code?: string })?.code ?? ''));
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return credential.user;
  } catch (error) {
    throw new Error(authMessage((error as { code?: string })?.code ?? ''));
  }
}

export async function signInWithGoogle(): Promise<User> {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return credential.user;
  } catch (error) {
    throw new Error(authMessage((error as { code?: string })?.code ?? ''));
  }
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth);
}

/**
 * Watch the auth session.
 *
 * `onAuthStateChanged` does not always fire promptly on a cold start, so the
 * caller gets an explicit `onTimeout` after `timeoutMs` and treats the user as
 * signed out rather than leaving the app stuck on a spinner.
 */
export function watchAuth(
  onUser: (user: User | null) => void,
  onTimeout: () => void,
  timeoutMs = 5000,
): Unsubscribe {
  let settled = false;
  const timer = window.setTimeout(() => {
    if (settled) return;
    settled = true;
    onTimeout();
  }, timeoutMs);

  return onAuthStateChanged(auth, (user) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timer);
    onUser(user);
  });
}

// Connectivity is established by the authenticated catalog subscription that
// CatalogApp opens once a user is signed in — no extra probe request needed.

// Error handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
