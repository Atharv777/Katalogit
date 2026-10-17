# Requirements Document

## Introduction

This feature adds Google Sign-In authentication to KatalogitAI using Firebase Authentication. Users can sign in with their Google account via an OAuth popup flow, gaining access to write operations (add, delete, approve, reject products). Unauthenticated users can still browse the catalog in read-only mode. The authentication state is reflected persistently across page refreshes and displayed consistently throughout the UI (navigation sidebar, mobile header, and any gated action surfaces).

## Glossary

- **AuthService**: The Firebase Authentication service instance (`auth`) initialized in `src/lib/firebase.ts`
- **GoogleProvider**: The `GoogleAuthProvider` instance (`googleProvider`) configured in `src/lib/firebase.ts`
- **User**: An authenticated Firebase user object (`firebase/auth` `User` type)
- **Sign-In Popup**: The browser popup window opened by `signInWithPopup` that presents the Google account chooser
- **Auth State**: The current authentication state — either an authenticated `User` or `null` (unauthenticated)
- **Protected Action**: Any catalog write operation (add product, delete product, approve product, reject product) that requires an authenticated user
- **Navigation**: The `Navigation` React component rendered as the desktop sidebar and mobile top/bottom bars
- **Dashboard**: The `Dashboard` React component that is the default landing view
- **App**: The root `App` React component that owns global auth state

## Requirements

### Requirement 1: Google Sign-In Initiation

**User Story:** As an unauthenticated user, I want to click a "Sign in with Google" button, so that I can authenticate with my Google account and gain access to catalog write operations.

#### Acceptance Criteria

1. WHEN the user is unauthenticated, THE Navigation SHALL display a "Sign in with Google" button in the user section of the desktop sidebar.
2. WHEN the user is unauthenticated, THE Navigation SHALL display a "Sign in with Google" button in the mobile top bar.
3. WHEN the user clicks the "Sign in with Google" button, THE App SHALL open the Google Sign-In popup without navigating away from the current view.
4. IF the Google Sign-In popup opens successfully and the user completes sign-in, THEN THE Navigation SHALL replace the "Sign in with Google" button with the authenticated user's identity display.
5. IF the Google Sign-In popup fails or the user cancels, THEN THE Navigation SHALL display the "Sign in with Google" button again in an interactive (non-loading) state.

### Requirement 2: Successful Authentication Handling

**User Story:** As a user who has completed Google sign-in, I want my authenticated state to be reflected immediately throughout the app, so that I can start using protected features without reloading.

#### Acceptance Criteria

1. WHEN the user successfully completes Google sign-in, THE AuthService SHALL emit an auth state change event with the authenticated User object.
2. WHEN an auth state change event with a non-null User is received, THE App SHALL update the `user` state to the authenticated User.
3. WHEN the `user` state is a non-null User, THE Navigation SHALL display the user's display name and profile photo in the user section; IF `photoURL` is `null` or an empty string, THEN THE Navigation SHALL display the first character of `displayName` as an initials fallback.
4. WHEN the `user` state is a non-null User, THE Navigation SHALL replace the "Sign in with Google" button with a "Sign Out" button.
5. WHEN the `user` state is `null`, THE Navigation SHALL display the "Sign in with Google" button and SHALL NOT display the user profile or "Sign Out" button.

### Requirement 3: Sign-Out

**User Story:** As an authenticated user, I want to sign out of my account, so that I can end my session and prevent unauthorized access.

#### Acceptance Criteria

1. WHEN the user clicks the "Sign Out" button, THE App SHALL terminate the Firebase session.
2. WHEN the Firebase session is terminated successfully, THE App SHALL transition the auth state to unauthenticated.
3. WHEN the auth state transitions to unauthenticated, THE App SHALL update the UI to the signed-out state.
4. WHILE the `user` state is `null`, THE Navigation SHALL display the "Sign in with Google" button and SHALL NOT display the user profile or "Sign Out" button.
5. IF terminating the Firebase session fails, THEN THE App SHALL display a user-facing error message and SHALL NOT change the current auth state.

### Requirement 4: Auth State Persistence

**User Story:** As a returning authenticated user, I want my sign-in to persist across page refreshes, so that I do not need to sign in again every time I visit the app.

#### Acceptance Criteria

1. WHEN the app initializes, THE App SHALL subscribe to auth state changes via `onAuthStateChanged` on the AuthService.
2. WHEN `onAuthStateChanged` fires on app initialization with a non-null User (existing session), THE App SHALL set the `user` state to that User without requiring the user to sign in again.
3. WHEN `onAuthStateChanged` fires on app initialization with a `null` User (no session), THE App SHALL set the `user` state to `null` and display the "Sign in with Google" button in the Navigation user section.
4. WHEN the App component unmounts, THE App SHALL unsubscribe from the `onAuthStateChanged` listener to prevent memory leaks.
5. WHILE the app is waiting for the first `onAuthStateChanged` callback after initialization, THE App SHALL display a loading indicator and SHALL NOT render the main UI content.
6. IF the first `onAuthStateChanged` callback has not fired within 5 seconds of app initialization, THEN THE App SHALL treat the auth state as `null` and render the unauthenticated UI.

### Requirement 5: Protected Actions Enforcement

**User Story:** As an application, I want to prevent unauthenticated users from performing write operations, so that catalog data integrity is maintained.

#### Acceptance Criteria

1. IF the user is unauthenticated, WHEN the user attempts to add a product, THE App SHALL NOT submit the product to Firestore.
2. IF the user is unauthenticated, WHEN the user attempts to add a product, THE App SHALL display a message prompting the user to sign in.
3. IF the user is unauthenticated, WHEN the user attempts to delete a product, THE App SHALL NOT make a delete request to Firestore, SHALL NOT display an error message, and SHALL NOT change any UI state.
4. IF the user is unauthenticated, WHEN the user attempts to approve a product, THE App SHALL NOT make an update request to Firestore, SHALL NOT display an error message, and SHALL NOT change any UI state.
5. IF the user is unauthenticated, WHEN the user attempts to reject a product, THE App SHALL NOT make a delete request to Firestore, SHALL NOT display an error message, and SHALL NOT change any UI state.
6. WHEN the user is unauthenticated, THE Navigation user section SHALL display the "Sign in with Google" control and THE product list area SHALL display a sign-in prompt indicating that write features require authentication.

### Requirement 6: Sign-In Error Handling

**User Story:** As a user attempting to sign in, I want to be informed if sign-in fails, so that I understand why authentication did not complete.

#### Acceptance Criteria

1. WHEN the Sign-In Popup is dismissed by the user before completing, THE App SHALL return the sign-in UI to its pre-sign-in state without displaying an error message.
2. IF `signInWithPopup` returns an error with code `auth/popup-closed-by-user`, THEN THE App SHALL treat it as a user cancellation and SHALL NOT display an error message.
3. IF `signInWithPopup` returns an error other than `auth/popup-closed-by-user`, THEN THE App SHALL display a user-facing error message indicating that sign-in failed and the user should try again.
4. WHEN a sign-in attempt ends (whether by cancellation, error, or success), THE App SHALL restore the "Sign in with Google" button to an interactive state so the user can attempt sign-in again.
