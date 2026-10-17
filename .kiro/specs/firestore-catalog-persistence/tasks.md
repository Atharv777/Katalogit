# Implementation Plan: Firestore Catalog Persistence

## Overview

Migrate KatalogitAI's catalog storage from a flat shared `products` collection to a per-user Firestore sub-collection (`users/{uid}/products`). This involves: adding a `uid` field to the `Product` type, creating a `CatalogService` module, rewiring `App.tsx` to use it, updating Firestore Security Rules, and installing `fast-check` for property-based tests.

## Tasks

- [x] 1. Extend the `Product` type and install testing dependencies
  - Add the optional `uid?: string` field to the `Product` interface in `src/types.ts`
  - Install `fast-check` as a dev dependency for property-based tests (`npm install --save-dev fast-check`)
  - Install `vitest` and `@vitest/ui` as dev testing infrastructure if not already present
  - Add a `test` script to `package.json` (e.g., `vitest --run`)
  - _Requirements: 2.1, 5.1_

- [x] 2. Implement `CatalogService` (`src/lib/catalogService.ts`)
  - [x] 2.1 Implement `subscribeToProducts(uid, onUpdate, onError)`
    - Build the collection reference `users/{uid}/products`
    - Apply `orderBy('createdAt', 'desc')` and `limit(100)`
    - Map each `DocumentSnapshot` to `{ id: doc.id, ...doc.data() }` as `Product`
    - Call `onUpdate` on every snapshot; route errors to `onError`
    - Return the `Unsubscribe` function
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ]* 2.2 Write property test for `subscribeToProducts` snapshot mapping (Property 4)
    - **Property 4: Snapshot-to-Product Mapping**
    - **Validates: Requirements 1.2**
    - Use `fast-check` to generate arbitrary arrays of N mock `DocumentSnapshot` objects with random `id` and `data()` fields
    - Assert that the mapped `Product[]` has length N, every `result[i].id === docs[i].id`, and all data fields are present

  - [x] 2.3 Implement `addProduct(uid, product)`
    - Strip the client-side `id` field from the product object
    - Stamp `uid` onto the document data
    - Call `addDoc` on the `users/{uid}/products` collection reference
    - _Requirements: 2.1_

  - [ ]* 2.4 Write property test for `addProduct` field handling (Property 5)
    - **Property 5: addProduct Strips id and Stamps uid**
    - **Validates: Requirements 2.1**
    - Use `fast-check` to generate arbitrary valid `Product` objects and arbitrary `uid` strings
    - Assert that `addDoc` is called with data where `'id'` is not a key and `data.uid === uid`

  - [x] 2.5 Implement `deleteProduct(uid, productId)`
    - Construct the document reference `users/{uid}/products/{productId}`
    - Call `deleteDoc` on that reference
    - _Requirements: 2.5_

  - [x] 2.6 Implement `updateProduct(uid, productId, patch)`
    - Guard: reject (throw) if `patch` contains the `createdAt` field
    - Guard: if `patch` contains a `status` field, reject if `status ∉ { 'active', 'draft', 'review' }`
    - Call `updateDoc` on `users/{uid}/products/{productId}` with the validated patch
    - _Requirements: 2.2, 2.3, 2.4_

  - [ ]* 2.7 Write property test for `updateProduct` immutable fields (Property 3)
    - **Property 3: Immutable Fields on Update**
    - **Validates: Requirements 2.3, 3.3, 3.4**
    - Use `fast-check` to generate patches that include `createdAt` and assert `updateProduct` throws without calling `updateDoc`
    - Also generate patches without `createdAt` and assert `updateDoc` is called and `createdAt` is not in the patch forwarded to Firestore

  - [ ]* 2.8 Write property test for `updateProduct` status validation (Property 8)
    - **Property 8: Valid Status Transitions**
    - **Validates: Requirements 2.4, 5.2, 5.6**
    - Use `fast-check` to generate arbitrary `status` strings
    - Assert that only values in `{ 'active', 'draft', 'review' }` allow `updateDoc` to be called; all other values cause a rejection without calling `updateDoc`

- [x] 3. Checkpoint — Ensure all CatalogService tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Rewire `App.tsx` to use `CatalogService`
  - [x] 4.1 Replace the flat-collection subscription with `CatalogService.subscribeToProducts`
    - Move the `onSnapshot` call out of `App.tsx` and call `CatalogService.subscribeToProducts(user.uid, setProducts, handleError)` instead
    - Wrap the call in a `useEffect` that depends on `user`: open the subscription when `user` is non-null, unsubscribe and call `setProducts([])` when `user` becomes null
    - Ensure the `useEffect` returns the `Unsubscribe` function as its cleanup so React unsubscribes on re-render
    - Handle `permission-denied` errors silently (set products to empty, no alert)
    - _Requirements: 1.1, 1.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [ ]* 4.2 Write unit test for subscription lifecycle (Property 6 & 7)
    - **Property 6: Subscription Cleanup** and **Property 7: No Ghost Reads After Sign-Out**
    - **Validates: Requirements 4.1, 4.2, 4.3**
    - Mock `CatalogService.subscribeToProducts` to return a jest/vitest spy `unsubscribe`
    - Simulate sign-out (set user to null) and assert: `unsubscribe` was called, and `setProducts` was called with `[]`
    - Simulate further Firestore changes and assert `onUpdate` is not called after unsubscribe

  - [x] 4.3 Replace `handleAddProduct` to call `CatalogService.addProduct(user.uid, product)`
    - Remove the inline `addDoc` call from `handleAddProduct` in `App.tsx`
    - Call `CatalogService.addProduct(user.uid, product)` instead
    - Retain the unauthenticated guard (`if (!user)`) and the error handling + user-facing message for oversized documents
    - _Requirements: 2.1, 2.6, 2.7, 6.1, 6.2, 6.5_

  - [x] 4.4 Replace `handleDeleteProduct` to call `CatalogService.deleteProduct(user.uid, product.id)`
    - Remove the inline `deleteDoc` call and replace with `CatalogService.deleteProduct(user.uid, id)`
    - Retain the unauthenticated guard and `handleFirestoreError` error handling
    - _Requirements: 2.5, 2.6, 6.1, 6.5_

  - [x] 4.5 Replace `handleApproveProduct` and `handleRejectProduct` to call `CatalogService.updateProduct` / `CatalogService.deleteProduct`
    - Replace the inline `updateDoc` call in `handleApproveProduct` with `CatalogService.updateProduct(user.uid, id, { status: ProductStatus.ACTIVE })`
    - Replace the inline `deleteDoc` call in `handleRejectProduct` with `CatalogService.deleteProduct(user.uid, id)`
    - Retain unauthenticated guards and error handling
    - _Requirements: 2.2, 2.4, 2.6, 6.1, 6.5_

  - [x] 4.6 Update `seedDemoData` to write to the user's sub-collection
    - Replace `collection(db, 'products')` in `seedDemoData` with `collection(db, 'users', user.uid, 'products')`
    - Add `uid: user.uid` to each demo item object before writing
    - Guard the function so it only runs when `user` is non-null
    - _Requirements: 2.1_

- [x] 5. Checkpoint — Ensure all App rewiring tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update Firestore Security Rules (`firestore.rules`)
  - [x] 6.1 Replace the existing `firestore.rules` with the user-scoped rules design
    - Remove the existing `match /products/{productId}` block with open read rules
    - Add `match /users/{uid}/products/{productId}` with `allow list, get` scoped to `request.auth.uid == uid`
    - Add `allow create` requiring `request.auth.uid == uid`, `isValidProduct`, and `request.resource.data.uid == uid`
    - Add `allow update` covering both full-update and status-only patch branches (immutable `createdAt` and `uid`)
    - Add `allow delete` requiring `request.auth.uid == uid`
    - Move the `isValidProduct` helper function outside all `match` blocks, add `uid` to required fields, and add `data.price > 0` check
    - Ensure the default-deny `match /{document=**}` rule covers all other paths including the legacy `products` collection
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [ ]* 6.2 Write Security Rules integration tests using Firebase Emulator (Property 1, 2, 9)
    - **Property 1: Ownership Invariant**, **Property 2: Isolation Invariant**, **Property 9: Document Validation Rejects Incomplete or Oversized Documents**
    - **Validates: Requirements 3.1, 3.2, 3.5, 5.1, 5.3, 5.4, 5.5**
    - Use `@firebase/rules-unit-testing` with the Firebase Local Emulator
    - Test: authenticated owner can CRUD `users/{uid}/products`
    - Test: authenticated user cannot read or write `users/{otherUid}/products`
    - Test: unauthenticated requests are denied on all operations
    - Test: `isValidProduct` rejects documents missing required fields, with `price ≤ 0`, or with oversized image strings
    - Test: `uid` field in document must equal `request.auth.uid` on create

- [x] 7. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties (using `fast-check`)
- Unit tests validate specific examples and edge cases
- Security Rules integration tests require the Firebase Local Emulator Suite (`firebase emulators:start`)
- The `seedDemoData` function must be updated alongside the main data layer (task 4.6) to avoid writes to the deprecated flat collection

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.3", "2.5", "2.6"] },
    { "id": 2, "tasks": ["2.2", "2.4", "2.7", "2.8"] },
    { "id": 3, "tasks": ["4.1", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 4, "tasks": ["4.2", "6.1"] },
    { "id": 5, "tasks": ["6.2"] }
  ]
}
```
