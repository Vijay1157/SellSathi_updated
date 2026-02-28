import { auth } from '../config/firebase';
import { authFetch } from './api';

// Helper to get current user UID (supports Firebase and Test Login)
const getUID = () => {
    try {
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUser = auth.currentUser;

        // Priority: 1. Firebase Auth UID, 2. Stored user UID
        return currentUser?.uid || localUser?.uid;
    } catch (e) {
        return auth.currentUser?.uid;
    }
};

// Get wishlist items (one-time fetch)
export const getWishlist = async () => {
    try {
        const uid = getUID();
        if (!uid) {
            // Guest mode
            return { success: true, items: JSON.parse(localStorage.getItem('localWishlist') || '[]') };
        }

        const response = await authFetch(`/api/user/${uid}/wishlist`);
        const data = await response.json();

        if (data.success) {
            return { success: true, items: data.items || [] };
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
        console.log('🔵 addToWishlist called with:', product);
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
            if (!localWishlist.find(i => i.id === product.id)) {
                localWishlist.push(productToAdd);
                localStorage.setItem('localWishlist', JSON.stringify(localWishlist));
            }
        } else {
            // Logged in: Backend API
            const response = await authFetch(`/api/user/${uid}/wishlist/add`, {
                method: 'POST',
                body: JSON.stringify({ product: productToAdd })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to add to backend');
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
            // Logged in: Backend API
            const response = await authFetch(`/api/user/${uid}/wishlist/remove`, {
                method: 'POST',
                body: JSON.stringify({ productId })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to remove from backend');
        }

        window.dispatchEvent(new CustomEvent('wishlistUpdated'));
        return { success: true, message: 'Removed' };
    } catch (error) {
        console.error('Error removing from wishlist:', error);
        return { success: false, message: error.message || 'Failed to remove' };
    }
};

// Check if item is in wishlist
export const isInWishlist = async (productId) => {
    try {
        const result = await getWishlist();
        if (result.success) {
            return result.items.some(item => item.id === productId);
        }
        return false;
    } catch (error) {
        console.error('Error checking wishlist:', error);
        return false;
    }
};

// Listen to wishlist changes
export const listenToWishlist = (callback) => {
    const handleUpdate = async () => {
        const result = await getWishlist();
        if (result.success) {
            callback(result.items);
        } else {
            callback([]);
        }
    };

    // Initial load
    handleUpdate();

    // Listen for updates
    window.addEventListener('wishlistUpdated', handleUpdate);
    window.addEventListener('userDataChanged', handleUpdate);

    // Listen for Firebase Auth changes too
    const unsubscribeAuth = auth.onAuthStateChanged(handleUpdate);

    return () => {
        window.removeEventListener('wishlistUpdated', handleUpdate);
        window.removeEventListener('userDataChanged', handleUpdate);
        unsubscribeAuth();
    };
};
