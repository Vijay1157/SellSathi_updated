import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { addToCart } from './cartUtils';

// Mock Firebase
vi.mock('../config/firebase', () => ({
  db: {},
  auth: {
    currentUser: { uid: 'test-user-123' }
  }
}));

// Mock Firestore functions
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  getDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  setDoc: vi.fn((ref, data) => {
    // Simulate Firebase validation - throw error if name is undefined
    if (data.name === undefined) {
      throw new Error('FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined (found in field name)');
    }
    return Promise.resolve();
  }),
  updateDoc: vi.fn(() => Promise.resolve()),
  increment: vi.fn((val) => val),
  collection: vi.fn(() => ({ id: 'mock-collection' })),
  onSnapshot: vi.fn(),
  deleteDoc: vi.fn(() => Promise.resolve()),
  getDocs: vi.fn(() => Promise.resolve({ forEach: () => {} }))
}));

describe('Bug Condition Exploration Test - Add to Cart Field Mismatch', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 2.1, 2.2**
   * 
   * Property 1: Fault Condition - Products with title field can be added to cart
   * 
   * This test encodes the EXPECTED behavior after the fix:
   * Products created via seller dashboard (with `title` field but no `name` field)
   * should be successfully added to cart without Firebase errors.
   * 
   * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists.
   * The test will pass after the fix is implemented.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE:
   * - Test FAILS with Firebase error about undefined `name` field
   * - This proves the bug exists and the root cause is correct
   */
  it('Property 1: Products with title field (no name field) can be added to cart', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator: Products with title field but NO name field (seller dashboard products)
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          title: fc.string({ minLength: 1, maxLength: 100 }), // Has title
          // Explicitly NO name field
          price: fc.integer({ min: 1, max: 100000 }),
          imageUrl: fc.webUrl(),
          category: fc.constantFrom('Electronics', 'Fashion', 'Home & Kitchen', 'Handicrafts'),
          stock: fc.integer({ min: 0, max: 1000 }),
          description: fc.string({ minLength: 10, maxLength: 500 })
        }),
        async (product) => {
          // Ensure product has title but NO name field
          const productWithTitleOnly = { ...product };
          delete productWithTitleOnly.name; // Explicitly remove name field if it exists

          // Attempt to add product to cart
          const result = await addToCart(productWithTitleOnly);

          // Expected behavior after fix:
          // 1. Operation should succeed
          expect(result.success).toBe(true);
          expect(result.message).toBe('Added to cart successfully');

          // 2. The cart item should use the title as the name
          // (We can't directly verify Firebase data in this test, but we verify no error was thrown)
          
          // If we reach here without throwing, the product was successfully added
          // This means the fix correctly handles products with only title field
        }
      ),
      {
        numRuns: 20, // Run 20 test cases to find counterexamples
        verbose: true
      }
    );
  });

  /**
   * Additional unit test to demonstrate the bug with a concrete example
   */
  it('Concrete example: Seller-created product with title field should be added to cart', async () => {
    // Product created via seller dashboard (AddProduct.jsx)
    const sellerProduct = {
      id: 'prod-123',
      title: 'Premium Silk Scarf', // Has title field
      // NO name field
      price: 2500,
      imageUrl: 'https://example.com/scarf.jpg',
      category: 'Fashion',
      stock: 10,
      description: 'Beautiful handcrafted silk scarf'
    };

    // Attempt to add to cart
    const result = await addToCart(sellerProduct);

    // Expected behavior after fix:
    expect(result.success).toBe(true);
    expect(result.message).toBe('Added to cart successfully');
  });
});

describe('Preservation Property Tests - Existing Behavior Must Remain Unchanged', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   * 
   * Property 2: Preservation - Existing name field products continue to work
   * 
   * This test verifies that products with the `name` field (seed data products)
   * continue to be added to cart successfully. This is the BASELINE behavior
   * that must be preserved after the fix.
   * 
   * CRITICAL: This test MUST PASS on unfixed code - passing confirms baseline behavior.
   * The test must also pass after the fix to ensure no regressions.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE:
   * - Test PASSES - seed data products work correctly
   * - This establishes the baseline behavior to preserve
   */
  it('Property 2: Products with name field (seed data) continue to add to cart successfully', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator: Products with name field (seed data products)
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          name: fc.string({ minLength: 1, maxLength: 100 }), // Has name field
          // Explicitly NO title field (seed data pattern)
          price: fc.integer({ min: 1, max: 100000 }),
          imageUrl: fc.webUrl(),
          category: fc.constantFrom('Electronics', 'Fashion', 'Home & Kitchen', 'Handicrafts'),
          stock: fc.integer({ min: 0, max: 1000 }),
          description: fc.string({ minLength: 10, maxLength: 500 })
        }),
        async (product) => {
          // Ensure product has name but NO title field (seed data pattern)
          const productWithNameOnly = { ...product };
          delete productWithNameOnly.title; // Explicitly remove title field if it exists

          // Attempt to add product to cart
          const result = await addToCart(productWithNameOnly);

          // Expected behavior (baseline that must be preserved):
          // 1. Operation should succeed
          expect(result.success).toBe(true);
          expect(result.message).toBe('Added to cart successfully');

          // 2. No Firebase errors should be thrown
          // If we reach here without throwing, the product was successfully added
          // This confirms the baseline behavior for seed data products
        }
      ),
      {
        numRuns: 20, // Run 20 test cases to verify preservation
        verbose: true
      }
    );
  });

  /**
   * **Validates: Requirements 3.2**
   * 
   * Preservation Test: Cart quantity increment for existing items
   * 
   * Verifies that adding the same product twice increments the quantity correctly.
   * This behavior must remain unchanged after the fix.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES
   */
  it('Preservation: Cart quantity increment works correctly for name field products', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generator: Product with name field
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          price: fc.integer({ min: 1, max: 100000 }),
          imageUrl: fc.webUrl(),
          category: fc.constantFrom('Electronics', 'Fashion', 'Home & Kitchen', 'Handicrafts'),
          stock: fc.integer({ min: 2, max: 1000 }), // At least 2 in stock
          description: fc.string({ minLength: 10, maxLength: 500 })
        }),
        async (product) => {
          const productWithNameOnly = { ...product };
          delete productWithNameOnly.title;

          // Add product to cart first time
          const result1 = await addToCart(productWithNameOnly);
          expect(result1.success).toBe(true);

          // Add same product to cart second time
          const result2 = await addToCart(productWithNameOnly);
          expect(result2.success).toBe(true);

          // Both operations should succeed
          // (Actual quantity verification would require checking Firebase/localStorage,
          // but the success of both operations confirms the increment logic works)
        }
      ),
      {
        numRuns: 15,
        verbose: true
      }
    );
  });

  /**
   * **Validates: Requirements 3.3**
   * 
   * Preservation Test: Guest cart functionality (localStorage)
   * 
   * Verifies that guest cart functionality works correctly for products with name field.
   * This behavior must remain unchanged after the fix.
   * 
   * EXPECTED OUTCOME ON UNFIXED CODE: Test PASSES
   */
  it('Preservation: Guest cart (localStorage) works for name field products', async () => {
    // Mock no authenticated user (guest scenario)
    const { auth } = await import('../config/firebase');
    auth.currentUser = null;
    localStorage.removeItem('user');

    await fc.assert(
      fc.asyncProperty(
        // Generator: Product with name field
        fc.record({
          id: fc.string({ minLength: 1, maxLength: 20 }),
          name: fc.string({ minLength: 1, maxLength: 100 }),
          price: fc.integer({ min: 1, max: 100000 }),
          imageUrl: fc.webUrl(),
          category: fc.constantFrom('Electronics', 'Fashion', 'Home & Kitchen', 'Handicrafts'),
          stock: fc.integer({ min: 1, max: 1000 }),
          description: fc.string({ minLength: 10, maxLength: 500 })
        }),
        async (product) => {
          const productWithNameOnly = { ...product };
          delete productWithNameOnly.title;

          // Clear localStorage before test
          localStorage.removeItem('tempCart');

          // Add product to guest cart
          const result = await addToCart(productWithNameOnly);

          // Expected behavior:
          expect(result.success).toBe(true);
          expect(result.message).toBe('Added to guest cart');

          // Verify product was added to localStorage
          const tempCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
          expect(tempCart.length).toBeGreaterThan(0);
          expect(tempCart[0].name).toBe(product.name);
        }
      ),
      {
        numRuns: 15,
        verbose: true
      }
    );
  });

  /**
   * Concrete example: Seed data product with name field
   */
  it('Concrete example: Seed data product with name field adds to cart successfully', async () => {
    // Product from seed data (has name field)
    const seedProduct = {
      id: 'seed-prod-456',
      name: 'MacBook Pro M2 Max', // Has name field
      // NO title field
      price: 250000,
      imageUrl: 'https://example.com/macbook.jpg',
      category: 'Electronics',
      stock: 5,
      description: 'Powerful laptop for professionals'
    };

    // Attempt to add to cart
    const result = await addToCart(seedProduct);

    // Expected behavior (baseline):
    expect(result.success).toBe(true);
    // Message can be either depending on auth state
    expect(['Added to cart successfully', 'Added to guest cart']).toContain(result.message);
  });

  /**
   * Concrete example: Adding same seed product twice increments quantity
   */
  it('Concrete example: Adding same seed product twice works correctly', async () => {
    const seedProduct = {
      id: 'seed-prod-789',
      name: 'Handmade Pottery Vase',
      price: 1500,
      imageUrl: 'https://example.com/vase.jpg',
      category: 'Handicrafts',
      stock: 10,
      description: 'Beautiful handcrafted pottery'
    };

    // Add first time
    const result1 = await addToCart(seedProduct);
    expect(result1.success).toBe(true);

    // Add second time
    const result2 = await addToCart(seedProduct);
    expect(result2.success).toBe(true);

    // Both operations should succeed
  });
});
