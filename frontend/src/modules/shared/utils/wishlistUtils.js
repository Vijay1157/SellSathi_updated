import { auth } from '../config/firebase';
import { authFetch } from './api';

// Helper to get current user UID (supports Firebase and Test Login)
const getUID = () => {
    try {
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUser = auth.currentUser;
        return currentUser?.uid || localUser?.uid;
    } catch (e) {
        return auth.currentUser?.uid;
    }
};

// ── In-memory wishlist cache (prevents repeated Firestore reads) ──
let _wishlistCache = null;
let _wishlistCacheTs = 0;
const WISHLIST_CACHE_TTL = 2 * 60 * 1000; // 2 minutes
const WISHLIST_MAX_ITEMS = 50; // Hard limit to prevent unbounded reads

const _isCacheFresh = () => _wishlistCache !== null && Date.now() - _wishlistCacheTs < WISHLIST_CACHE_TTL;

const _invalidateCache = () => {
    _wishlistCache = null;
    _wishlistCacheTs = 0;
};

// Get wishlist items (cached — avoids repeated Firestore reads)
export const getWishlist = async () => {
    try {
        const uid = getUID();
        if (!uid) {
            // Guest mode
            const items = JSON.parse(localStorage.getItem('localWishlist') || '[]');
            return { success: true, items: items.slice(0, WISHLIST_MAX_ITEMS) };
        }

        // Return from cache if still fresh
        if (_isCacheFresh()) {
            return { success: true, items: _wishlistCache };
        }

        const response = await authFetch(`/api/user/${uid}/wishlist`);
        const data = await response.json();

        if (data.success) {
            const items = (data.items || []).slice(0, WISHLIST_MAX_ITEMS);
            _wishlistCache = items;
            _wishlistCacheTs = Date.now();
            return { success: true, items };
        }
        return { success: false, items: [] };
    } catch (error) {
        console.error('getWishlist error:', error);
        return { success: false, items: [] };
    }
};

// Add to wishlist
export const addToWishlist = async (product) => {
    try {
        const uid = getUID();
        const productToAdd = {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            oldPrice: product.oldPrice ? Number(product.oldPrice) : null,
            image: product.image || product.imageUrl || (product.images && product.images[0]),
            category: product.category || 'Uncategorized',
            description: product.description || '',
            rating: product.rating || 4.5,
            reviews: product.reviews || 0,
            discount: product.discount || null,
            addedAt: Date.now()
        };

        if (!uid) {
            // Guest mode: localStorage
            const localWishlist = JSON.parse(localStorage.getItem('localWishlist') || '[]');
            if (localWishlist.length >= WISHLIST_MAX_ITEMS) {
                return { success: false, message: `Wishlist is full (max ${WISHLIST_MAX_ITEMS} items)` };
            }
            if (!localWishlist.find(i => i.id === product.id)) {
                localWishlist.push(productToAdd);
                localStorage.setItem('localWishlist', JSON.stringify(localWishlist));
            }
        } else {
            // Enforce limit: check cache first to avoid extra network call
            if (_isCacheFresh() && _wishlistCache.length >= WISHLIST_MAX_ITEMS) {
                return { success: false, message: `Wishlist is full (max ${WISHLIST_MAX_ITEMS} items)` };
            }
            const response = await authFetch(`/api/user/${uid}/wishlist/add`, {
                method: 'POST',
                body: JSON.stringify({ product: productToAdd })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to add to backend');
        }

        // Update cache locally instead of re-fetching
        if (_isCacheFresh() && !_wishlistCache.find(i => i.id === product.id)) {
            _wishlistCache = [..._wishlistCache, productToAdd];
        } else {
            _invalidateCache(); // Will re-fetch on next getWishlist call
        }

        window.dispatchEvent(new CustomEvent('wishlistUpdated'));
        return { success: true, message: 'Added to wishlist' };
    } catch (error) {
        console.error('Error adding to wishlist:', error);
        return { success: false, message: error.message || 'Failed to add' };
    }
};

// Remove from wishlist
export const removeFromWishlist = async (productId) => {
    try {
        const uid = getUID();
        if (!uid) {
            const localWishlist = JSON.parse(localStorage.getItem('localWishlist') || '[]');
            const updated = localWishlist.filter(i => i.id !== productId);
            localStorage.setItem('localWishlist', JSON.stringify(updated));
        } else {
            const response = await authFetch(`/api/user/${uid}/wishlist/remove`, {
                method: 'POST',
                body: JSON.stringify({ productId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to remove from backend');
        }

        // Update cache locally instead of re-fetching
        if (_isCacheFresh()) {
            _wishlistCache = _wishlistCache.filter(i => i.id !== productId);
        } else {
            _invalidateCache();
        }

        window.dispatchEvent(new CustomEvent('wishlistUpdated'));
        return { success: true, message: 'Removed' };
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, message: error.message || 'Failed to remove' };
    }
};

// Check if item is in wishlist — USES CACHE, no extra Firestore read
export const isInWishlist = async (productId) => {
    try {
        const result = await getWishlist(); // returns from cache if fresh
        if (result.success) {
            return result.items.some(item => item.id === productId);
        }
        return false;
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return false;
    }
};

// Listen to wishlist changes — debounced to prevent cascading fetches
export const listenToWishlist = (callback) => {
    let _debounceTimer = null;

    const handleUpdate = async () => {
        // Debounce: multiple rapid events only trigger one fetch
        if (_debounceTimer) clearTimeout(_debounceTimer);
        _debounceTimer = setTimeout(async () => {
            const result = await getWishlist();
            callback(result.success ? result.items : []);
        }, 300); // 300ms debounce
    };

    // Initial load (no debounce for first load)
    getWishlist().then(result => callback(result.success ? result.items : []));

    // Listen for updates
    window.addEventListener('wishlistUpdated', handleUpdate);
    window.addEventListener('userDataChanged', () => {
        _invalidateCache(); // User changed, clear wishlist cache
        handleUpdate();
    });

    // Listen for Firebase Auth changes — only re-fetch if UID actually changed
    let _lastKnownUid = undefined;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
        const currentUid = user?.uid ?? null;
        if (currentUid !== _lastKnownUid) {
            _lastKnownUid = currentUid;
            _invalidateCache(); // Different user, clear cache
            handleUpdate();
        }
    });

    return () => {
        if (_debounceTimer) clearTimeout(_debounceTimer);
        window.removeEventListener('wishlistUpdated', handleUpdate);
        window.removeEventListener('userDataChanged', handleUpdate);
        unsubscribeAuth();
    };
};
