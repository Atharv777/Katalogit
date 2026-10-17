# Requirements Document

## Introduction

This feature adds user-scoped persistence for cataloged products in KatalogitAI. Each product saved through `AddCatalogFlow` is stored in a Firestore sub-collection (`users/{uid}/products/{productId}`) owned exclusively by the authenticated user. A `CatalogService` module abstracts all Firestore reads and writes. Firestore Security Rules enforce ownership, preventing cross-user data access. The subscription lifecycle is tied to Firebase Auth state so that product data is loaded on sign-in and cleared on sign-out.

## Glossary

- **CatalogService**: The module at `src/lib/catalogService.ts` that encapsulates all Firestore reads and writes for the `users/{uid}/products` sub-collection.
- **App**: The root React component (`src/App.tsx`) that owns auth state, product state, and mounts/unmounts the CatalogService subscription.
- **Firestore**: The Google Cloud Firestore database used as the persistence backend.
- **SecurityRules**: The Firestore Security Rules engine that evaluates every read and write request against the `firestore.rules` configuration.
- **Product**: The in-memory TypeScript data object representing a cataloged item, as defined in `src/types.ts`.
- **StoredProduct**: The Firestore document shape written to `users/{uid}/products/{auto-id}`, which includes a `uid` ownership field.
- **Subscription**: The real-time Firestore listener created by `onSnapshot` and managed through the `Unsubscribe` function returned by `CatalogService.subscribeToProducts`.
- **uid**: The Firebase Authentication user ID (`User.uid`) used to scope all Firestore paths and Security Rule checks.
- **patch**: A partial update object passed to `CatalogService.updateProduct` containing only the fields to be changed.
- **full-update**: An update operation that replaces all document fields, as opposed to a partial status-only patch.

---

## Requirements

### Requirement 1: Real-Time Product Subscription

**User Story:** As a signed-in user, I want my catalog to load automatically and update in real time, so that I always see an accurate list of my cataloged products without manually refreshing.

#### Acceptance Criteria

1. WHEN the authenticated user's `uid` becomes available, THE CatalogService SHALL open a real-time listener on the user's products sub-collection ordered by `createdAt` descending, returning the 100 most recent documents.
2. WHEN the Firestore snapshot changes, THE CatalogService SHALL invoke the `onUpdate` callback with the complete, up-to-date `Product[]` list derived from that snapshot.
3. WHEN `addProduct` resolves successfully, THE CatalogService SHALL invoke `onUpdate` with a product list that includes the newly added product within the next snapshot event.
4. WHEN a Firestore error occurs on the snapshot listener, THE CatalogService SHALL invoke only the `onError` callback with the error and SHALL NOT invoke the `onUpdate` callback for that same event.
5. THE CatalogService SHALL limit the subscription query to a maximum of 100 documents to bound memory usage, always returning the most recently created products first.
6. WHEN the authenticated user's `uid` becomes unavailable (user signs out or auth state is lost), THE CatalogService SHALL stop the active listener so that `onUpdate` is no longer invoked.

---

### Requirement 2: Product Write Operations

**User Story:** As a signed-in user, I want to add, update, and delete products in my catalog, so that I can manage my inventory accurately.

#### Acceptance Criteria

1. WHEN `addProduct` is called with a valid `uid` and `product`, THE CatalogService SHALL write a new document to the user's products sub-collection, omitting the client-side `id` field and setting the document's `uid` field to the provided `uid`.
2. WHEN `updateProduct` is called with a valid `uid`, `productId`, and `patch`, THE CatalogService SHALL apply only the fields present in `patch` to the target document, leaving all other fields unchanged.
3. IF `updateProduct` is called with a `patch` that contains the `createdAt` field, THEN THE CatalogService SHALL reject the call without modifying the document.
4. WHEN `updateProduct` is called with a `patch` that explicitly includes a `status` field, THE CatalogService SHALL reject the call without modifying the document if `patch.status` is not one of `{ 'active', 'draft', 'review' }`. IF the `patch` does not contain a `status` field, THEN THE CatalogService SHALL proceed without status validation.
5. WHEN `deleteProduct` is called with a valid `uid` and `productId`, THE CatalogService SHALL remove the corresponding document from the user's products sub-collection.
6. IF a write operation (`addProduct`, `updateProduct`, or `deleteProduct`) is rejected by Firestore, THEN THE App SHALL catch the error, display a dismissible error message indicating the nature of the failed operation visible for at least 4 seconds, and roll back the local product state to its pre-operation value.
7. IF a write operation is attempted when no user is authenticated, THEN THE App SHALL prevent the CatalogService call and display a prompt directing the user to sign in.

---

### Requirement 3: Ownership and Data Isolation

**User Story:** As a signed-in user, I want my catalog data to be completely private, so that no other user can read or modify my products.

#### Acceptance Criteria

1. IF a product document create is attempted and the document's `uid` field does not equal `request.auth.uid`, THEN THE SecurityRules SHALL deny the operation.
2. WHEN any read or write is attempted on a user's products sub-collection, THE SecurityRules SHALL deny the request if the requester is unauthenticated or if `request.auth.uid` does not equal the `uid` path segment of the sub-collection.
3. IF an update is attempted on a product document and the incoming document's `uid` field differs from the stored document's `uid` field, THEN THE SecurityRules SHALL deny the request.
4. IF an update is attempted on a product document and the incoming document's `createdAt` field differs from the stored document's `createdAt` field, THEN THE SecurityRules SHALL deny the request.
5. THE SecurityRules SHALL deny all read and write access to any path not explicitly allowed, including the legacy flat `products` collection, for both authenticated and unauthenticated requesters.

---

### Requirement 4: Subscription Lifecycle Management

**User Story:** As a user who signs in and out, I want the app to correctly start and stop listening to my catalog, so that there are no data leaks or stale data visible after sign-out.

#### Acceptance Criteria

1. WHEN the authenticated user signs out, THE App SHALL clear the product list to an empty array.
2. WHEN the authenticated user signs out, THE App SHALL call the `Unsubscribe` function of the active subscription to detach the Firestore listener before opening any new subscription.
3. WHEN the `Unsubscribe` function is called, THE CatalogService SHALL ensure that `onUpdate` is not invoked for any subsequent Firestore changes.
4. WHEN a user successfully authenticates, THE App SHALL open a new Firestore subscription scoped to that user's `uid`.
5. WHEN the authenticated user switches to a different account, THE App SHALL call the `Unsubscribe` function of the previous listener before opening the new subscription for the incoming user's `uid`.
6. WHILE no user is authenticated, THE App SHALL not open a Firestore subscription and SHALL maintain an empty product list.

---

### Requirement 5: Data Validation

**User Story:** As a developer, I want all product documents to be validated before they are persisted, so that the database never contains malformed or incomplete records.

#### Acceptance Criteria

1. WHEN a create or full-update is attempted, THE SecurityRules SHALL deny the operation if the document is missing any of the required fields: `sku`, `title`, `category`, `subcategory`, `description`, `price`, `status`, `imageUrl`, `tags`, `attributes`, `createdAt`.
2. WHEN a create or update is attempted, THE SecurityRules SHALL deny the operation if `status` is not a string or is not one of `{ 'active', 'draft', 'review' }`.
3. WHEN a create or update is attempted, THE SecurityRules SHALL deny the operation if `imageUrl` is not a string or exceeds 1,048,576 bytes in length.
4. IF a create or update is attempted with an optional AI image field (`aiImageProduct` or `aiImageLifestyle`) present in the document, THEN THE SecurityRules SHALL deny the operation if the provided value exceeds 1,048,576 bytes in length.
5. WHEN a create or update is attempted, THE SecurityRules SHALL deny the operation if `price` is not a number or is not greater than 0.
6. WHEN a full-update is attempted on a product document, THE SecurityRules SHALL deny the operation if the incoming `createdAt` value differs from the stored `createdAt` value.
7. WHEN a partial status-only update is attempted, THE SecurityRules SHALL allow the operation if and only if the update affects solely the `status` field and the new value is one of `{ 'active', 'draft', 'review' }`.

---

### Requirement 6: Error Handling

**User Story:** As a user, I want the application to handle Firestore errors gracefully, so that a failed operation does not crash the app or leave me with no feedback.

#### Acceptance Criteria

1. IF `addProduct`, `deleteProduct`, or `updateProduct` throws a Firestore error, THEN THE App SHALL display an error message indicating the nature of the failed operation.
2. IF the product document size exceeds Firestore's 1 MB document limit, THEN THE App SHALL display the message "The product images are too large. Try capturing a simpler image." and keep the `AddCatalogFlow` modal open for retry.
3. IF the snapshot listener emits a `permission-denied` error while no user is authenticated, THEN THE App SHALL handle it silently by setting the product list to empty, and this case SHALL NOT trigger the general error display described in criterion 6.1.
4. WHILE the device is offline, THE CatalogService SHALL accept `addProduct`, `updateProduct`, and `deleteProduct` calls and resolve their returned Promises without throwing, deferring synchronization until connectivity is restored.
5. IF a write operation (`addProduct`, `deleteProduct`, or `updateProduct`) is attempted when no user is authenticated, THEN THE App SHALL prevent the call to CatalogService and display a sign-in prompt to the user.
