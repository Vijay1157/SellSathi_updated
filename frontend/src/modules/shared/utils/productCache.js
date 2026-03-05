/**
 * productCache.js
 * ────────────────────────────────────────────────────────────────────────────
 * Module-level product cache shared across Deals, NewArrivals, Trending, and
 * any other page that needs a finite set of products.
 *
 * Instead of every page running its own getDocs(collection(db, "products"))
 * query on mount, they all share this single cache entry (TTL: 5 minutes).
 * On a typical user session navigating Deals → NewArrivals → Trending, this
 * collapses 3 × 12 = 36 firestore reads into a single read every 5 minutes.
 */
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { db } from '@/modules/shared/config/firebase';

const _cache = {
    products: null,
    ts: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Returns up to `count` products, served from cache if still fresh.
 * @param {number} count  Max number of products to fetch (default 20)
 * @param {'createdAt'|null} sortBy  Optional field to orderBy descending
 */
export const getCachedProducts = async (count = 20, sortBy = null) => {
    if (_cache.products && Date.now() - _cache.ts < CACHE_TTL) {
        return _cache.products;
    }

    const constraints = [collection(db, 'products')];
    if (sortBy) constraints.push(orderBy(sortBy, 'desc'));
    constraints.push(limit(count));

    const snap = await getDocs(query(...constraints));
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    _cache.products = products;
    _cache.ts = Date.now();
    return products;
};

/**
 * Force-invalidate the cache (call after a product is added/updated locally).
 */
export const invalidateProductCache = () => {
    _cache.products = null;
    _cache.ts = 0;
};
