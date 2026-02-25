import { auth } from '../config/firebase';
import { authFetch } from './api';

// Get wishlist from backend
export const getWishlist = async () => {
    try {
        const user = auth.currentUser;
        if (!user) {
            console.log('🟡 User not logged in, returning empty wishlist');
            return { success: false, items: [] };
        }

        console.log('🟢 Fetching wishlist for user:', user.uid);
        const response = await authFetch(`/api/user/${user.uid}/wishlist`);
        const data = await response.json();

        console.log('🟢 Wishlist fetched:', data.items?.length || 0, 'items');

        if (data.success) {
            return { success: true, items: data.items || [] };
        }
        return { success: false, items: [] };
    } catch (error) {
        console.error('❌ Error fetching wishlist:', error);
        return { success: false, items: [] };
    }
};

// Add to wishlist
export const addToWishlist = async (product) => {
    try {
        console.log('🔵 addToWishlist called with product:', product);

        const user = auth.currentUser;
        console.log('🔵 Current user:', user ? user.uid : 'NOT LOGGED IN');

        if (!user) {
            console.error('❌ User not logged in');
            alert('Please login to add items to wishlist');
            return { success: false, message: 'Not logged in' };
        }

        // Ensure product has required fields
        const productToAdd = {
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image || product.imageUrl,
            category: product.category || 'Uncategorized',
            rating: product.rating || 4.5,
            reviews: product.reviews || 0
        };

        console.log('🔵 Sending request to backend:', productToAdd);

        const response = await authFetch(`/api/user/${user.uid}/wishlist/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: productToAdd })
        });

        console.log('🔵 Response status:', response.status);
        const data = await response.json();
        console.log('🔵 Response data:', data);

        if (data.success) {
            console.log('✅ Successfully added to wishlist');
            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('wishlistUpdated'));
            return { success: true, message: 'Added to wishlist' };
        }
        console.error('❌ Failed to add:', data.message);
        return { success: false, message: data.message };
    } catch (error) {
        console.error('❌ Error adding to wishlist:', error);
        alert('Error: ' + error.message + '. Make sure backend server is running.');
        return { success: false, message: 'Failed to add to wishlist' };
    }
};

// Remove from wishlist
export const removeFromWishlist = async (productId) => {
    try {
        console.log('🔴 removeFromWishlist called with productId:', productId);

        const user = auth.currentUser;
        console.log('🔴 Current user:', user ? user.uid : 'NOT LOGGED IN');

        if (!user) {
            console.error('❌ User not logged in');
            return { success: false, message: 'Not logged in' };
        }

        console.log('🔴 Sending remove request to backend');

        const response = await authFetch(`/api/user/${user.uid}/wishlist/remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId })
        });

        console.log('🔴 Response status:', response.status);
        const data = await response.json();
        console.log('🔴 Response data:', data);

        if (data.success) {
            console.log('✅ Successfully removed from wishlist');
            // Dispatch event to update UI
            window.dispatchEvent(new CustomEvent('wishlistUpdated'));
            return { success: true, message: 'Removed from wishlist' };
        }
        console.error('❌ Failed to remove:', data.message);
        return { success: false, message: data.message };
    } catch (error) {
        console.error('❌ Error removing from wishlist:', error);
        alert('Error: ' + error.message + '. Make sure backend server is running.');
        return { success: false, message: 'Failed to remove from wishlist' };
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
        console.log('🔄 Wishlist update event triggered, fetching latest data...');
        const result = await getWishlist();
        if (result.success) {
            console.log('🔄 Calling callback with', result.items.length, 'items');
            callback(result.items);
        } else {
            console.log('🔄 Calling callback with empty array');
            callback([]);
        }
    };

    // Initial load
    console.log('🎬 Setting up wishlist listener');
    handleUpdate();

    // Listen for updates
    window.addEventListener('wishlistUpdated', handleUpdate);

    // Return cleanup function
    return () => {
        console.log('🛑 Cleaning up wishlist listener');
        window.removeEventListener('wishlistUpdated', handleUpdate);
    };
};
