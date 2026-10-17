/**
 * Unit tests for CatalogService (src/lib/catalogService.ts)
 *
 * Mocks firebase/firestore and the local firebase module so no live
 * Firestore connection is needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

// ── Hoisted mocks (available inside vi.mock factories) ───────────────────────
const {
  mockUnsubscribe,
  mockOnSnapshot,
  mockAddDoc,
  mockDeleteDoc,
  mockUpdateDoc,
  mockCollection,
  mockQuery,
  mockOrderBy,
  mockLimit,
  mockDoc,
} = vi.hoisted(() => ({
  mockUnsubscribe: vi.fn(),
  mockOnSnapshot: vi.fn(),
  mockAddDoc: vi.fn(),
  mockDeleteDoc: vi.fn(),
  mockUpdateDoc: vi.fn(),
  mockCollection: vi.fn(),
  mockQuery: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockDoc: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
  collection: mockCollection,
  query: mockQuery,
  orderBy: mockOrderBy,
  limit: mockLimit,
  onSnapshot: mockOnSnapshot,
  addDoc: mockAddDoc,
  deleteDoc: mockDeleteDoc,
  updateDoc: mockUpdateDoc,
  doc: mockDoc,
}));

vi.mock('./firebase', () => ({ db: {} }));

// ── Import SUT after mocks are registered ────────────────────────────────────
import {
  subscribeToProducts,
  addProduct,
  deleteProduct,
  updateProduct,
} from './catalogService';
import type { Product } from '../types';
import { ProductStatus } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    sku: 'SKU-001',
    title: 'Test Product',
    category: 'Tops',
    subcategory: 'T-Shirts',
    description: 'A test product',
    attributes: {
      Color: 'Red',
      Material: 'Cotton',
      Pattern: 'Solid',
      Fit: 'Regular',
      Occasion: 'Casual',
      Gender: 'Unisex',
      Size_type: 'Regular',
    },
    price: 29.99,
    tags: ['casual'],
    status: ProductStatus.DRAFT,
    imageUrl: 'https://example.com/img.jpg',
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockCollection.mockReturnValue({ _type: 'collectionRef' });
  mockQuery.mockReturnValue({ _type: 'query' });
  mockOrderBy.mockReturnValue({ _type: 'orderBy' });
  mockLimit.mockReturnValue({ _type: 'limit' });
  mockDoc.mockReturnValue({ _type: 'docRef' });
  mockOnSnapshot.mockReturnValue(mockUnsubscribe);
  mockAddDoc.mockResolvedValue({ id: 'new-doc-id' });
  mockDeleteDoc.mockResolvedValue(undefined);
  mockUpdateDoc.mockResolvedValue(undefined);
});

// ── subscribeToProducts ────────────────────────────────────────────────────────

describe('subscribeToProducts', () => {
  it('builds a query on users/{uid}/products ordered by createdAt desc, limited to 100', () => {
    subscribeToProducts('uid-abc', vi.fn(), vi.fn());

    expect(mockCollection).toHaveBeenCalledWith({}, 'users', 'uid-abc', 'products');
    expect(mockOrderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(mockLimit).toHaveBeenCalledWith(100);
  });

  it('returns the unsubscribe function from onSnapshot', () => {
    const unsub = subscribeToProducts('uid-abc', vi.fn(), vi.fn());
    expect(unsub).toBe(mockUnsubscribe);
  });

  it('maps snapshot docs to Product[] and calls onUpdate', () => {
    const onUpdate = vi.fn();
    const docs = [
      { id: 'doc-1', data: () => ({ sku: 'A', title: 'Alpha', price: 10, createdAt: 1000 }) },
      { id: 'doc-2', data: () => ({ sku: 'B', title: 'Beta', price: 20, createdAt: 2000 }) },
    ];

    mockOnSnapshot.mockImplementation(
      (_q: unknown, successCb: (snap: { docs: typeof docs }) => void) => {
        successCb({ docs });
        return mockUnsubscribe;
      }
    );

    subscribeToProducts('uid-abc', onUpdate, vi.fn());

    expect(onUpdate).toHaveBeenCalledOnce();
    const products: Product[] = (onUpdate as Mock).mock.calls[0][0];
    expect(products).toHaveLength(2);
    expect(products[0].id).toBe('doc-1');
    expect(products[0].sku).toBe('A');
    expect(products[1].id).toBe('doc-2');
    expect(products[1].sku).toBe('B');
  });

  it('calls onError (not onUpdate) when snapshot emits an error', () => {
    const onUpdate = vi.fn();
    const onError = vi.fn();
    const firestoreError = new Error('permission-denied');

    mockOnSnapshot.mockImplementation(
      (_q: unknown, _successCb: unknown, errorCb: (e: Error) => void) => {
        errorCb(firestoreError);
        return mockUnsubscribe;
      }
    );

    subscribeToProducts('uid-abc', onUpdate, onError);

    expect(onError).toHaveBeenCalledWith(firestoreError);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

// ── addProduct ─────────────────────────────────────────────────────────────────

describe('addProduct', () => {
  it('writes to users/{uid}/products', async () => {
    const uid = 'user-42';
    await addProduct(uid, makeProduct());

    expect(mockCollection).toHaveBeenCalledWith({}, 'users', uid, 'products');
    expect(mockAddDoc).toHaveBeenCalledOnce();
  });

  it('strips the client-side id field from the document data', async () => {
    const uid = 'user-42';
    await addProduct(uid, makeProduct({ id: 'client-id' }));

    const writtenData = mockAddDoc.mock.calls[0][1];
    expect(writtenData).not.toHaveProperty('id');
  });

  it('stamps uid onto the written document', async () => {
    const uid = 'user-42';
    await addProduct(uid, makeProduct({ uid: 'some-old-uid' }));

    const writtenData = mockAddDoc.mock.calls[0][1];
    expect(writtenData.uid).toBe(uid);
  });
});

// ── deleteProduct ──────────────────────────────────────────────────────────────

describe('deleteProduct', () => {
  it('calls deleteDoc on users/{uid}/products/{productId}', async () => {
    const uid = 'user-42';
    const productId = 'prod-99';

    await deleteProduct(uid, productId);

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', uid, 'products', productId);
    expect(mockDeleteDoc).toHaveBeenCalledWith({ _type: 'docRef' });
  });
});

// ── updateProduct ──────────────────────────────────────────────────────────────

describe('updateProduct', () => {
  it('calls updateDoc on users/{uid}/products/{productId} with the patch', async () => {
    const uid = 'user-42';
    const productId = 'prod-99';
    const patch = { title: 'Updated Title' };

    await updateProduct(uid, productId, patch);

    expect(mockDoc).toHaveBeenCalledWith({}, 'users', uid, 'products', productId);
    expect(mockUpdateDoc).toHaveBeenCalledWith({ _type: 'docRef' }, patch);
  });

  it('throws and does NOT call updateDoc when patch contains createdAt', async () => {
    const patch = { title: 'X', createdAt: 9999 } as Partial<Product>;

    await expect(updateProduct('u', 'p', patch)).rejects.toThrow(
      'patch must not contain the createdAt field'
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('throws and does NOT call updateDoc when patch.status is invalid', async () => {
    const patch = { status: 'archived' as ProductStatus };

    await expect(updateProduct('u', 'p', patch)).rejects.toThrow('invalid status');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('accepts valid status values: active, draft, review', async () => {
    for (const status of ['active', 'draft', 'review'] as ProductStatus[]) {
      vi.clearAllMocks();
      mockDoc.mockReturnValue({ _type: 'docRef' });
      mockUpdateDoc.mockResolvedValue(undefined);

      await expect(updateProduct('u', 'p', { status })).resolves.toBeUndefined();
      expect(mockUpdateDoc).toHaveBeenCalledOnce();
    }
  });

  it('skips status validation when status key is absent from patch', async () => {
    const patch = { title: 'No status here' };
    await expect(updateProduct('u', 'p', patch)).resolves.toBeUndefined();
    expect(mockUpdateDoc).toHaveBeenCalledOnce();
  });
});
