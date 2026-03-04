
import { auth } from '../config/firebase';
import { authFetch } from './api';
import { getProductPricing } from './priceUtils';

// Helper to get current user UID (consistent with wishlist)
const getUID = () => {
    try {
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (localUser?.uid?.startsWith('test_')) return localUser.uid;
        return auth.currentUser?.uid || localUser?.uid;
    } catch (e) {
        return auth.currentUser?.uid;
    }
};

export const addToCart = async (product, selections = {}) => {
    try {
        const uid = getUID();

        const { finalPrice, strikethroughPrice } = getProductPricing(product, selections);

        const variantKey = Object.values(selections).filter(Boolean).join('_');
        const cartItemId = variantKey ? `${product.id}_${variantKey.replace(/\s+/g, '')}` : product.id;

        const cartItemData = {
            productId: product.id,
            id: cartItemId, // Use cartItemId as the unique document ID
            sellerId: product.sellerId || null,
            name: product.name || product.title,
            price: finalPrice, // Keeping 'price' as the final selling price for compatibility
            originalPrice: strikethroughPrice,
            imageUrl: product.imageUrl || product.image,
            quantity: 1,
            category: product.category,
            selections: {
                color: selections.color || null,
                size: selections.size || null,
                storage: selections.storage?.label || selections.storage || null,
                memory: selections.memory?.label || selections.memory || null
            }
        };

        if (!uid) {
            // Guest mode: localStorage
            const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
            const existingItemIndex = localCart.findIndex(item => item.id === cartItemId);

            if (existingItemIndex > -1) {
                localCart[existingItemIndex].quantity += 1;
            } else {
                localCart.push(cartItemData);
            }
            localStorage.setItem('tempCart', JSON.stringify(localCart));
            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true, message: "Added to guest cart" };
        } else {
            // Logged in: Backend API
            const response = await authFetch(`/api/user/${uid}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ cartItem: cartItemData })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to add to backend');

            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true, message: "Added to cart successfully" };
        }
    } catch (error) {
        console.error("Error adding to cart:", error);
        return { success: false, message: error.message || "Failed to add to cart" };
    }
};

export const listenToCart = (callback) => {
    const handleUpdate = async () => {
        try {
            const uid = getUID();
            if (!uid) {
                const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
                callback(localCart);
            } else {
                const response = await authFetch(`/api/user/${uid}/cart`);
                const data = await response.json();
                if (data.success) {
                    callback(data.cart || []);  // Fixed: use data.cart instead of data.items
                } else {
                    callback([]);
                }
            }
        } catch (error) {
            console.error("Error fetching cart for listener:", error);
            callback([]);
        }
    };

    window.addEventListener('cartUpdate', handleUpdate);
    handleUpdate();

    return () => {
        window.removeEventListener('cartUpdate', handleUpdate);
    };
};

export const removeFromCart = async (cartItemId) => {
    try {
        const uid = getUID();
        if (!uid) {
            const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
            const updated = localCart.filter(item => item.id !== cartItemId);
            localStorage.setItem('tempCart', JSON.stringify(updated));
            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true };
        } else {
            const response = await authFetch(`/api/user/${uid}/cart/${cartItemId}`, {
                method: 'DELETE'
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to remove');

            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true };
        }
    } catch (error) {
        console.error("Error removing from cart:", error);
        return { success: false, message: error.message };
    }
};

export const clearCart = async () => {
    try {
        const uid = getUID();
        if (!uid) {
            localStorage.setItem('tempCart', '[]');
            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true };
        } else {
            // Clear cart by setting empty array
            const response = await authFetch(`/api/user/${uid}/cart/add`, {
                method: 'POST',
                body: JSON.stringify({ cartItem: null, clearCart: true })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to clear');

            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true };
        }
    } catch (error) {
        console.error("Error clearing cart:", error);
        return { success: false, message: error.message };
    }
};

export const updateCartItemQuantity = async (cartItemId, newQuantity) => {
    try {
        const uid = getUID();
        if (!uid) {
            // Guest mode: localStorage
            const localCart = JSON.parse(localStorage.getItem('tempCart') || '[]');
            const itemIndex = localCart.findIndex(item => item.id === cartItemId);
            
            if (itemIndex > -1) {
                localCart[itemIndex].quantity = newQuantity;
                localStorage.setItem('tempCart', JSON.stringify(localCart));
                window.dispatchEvent(new Event('cartUpdate'));
                return { success: true };
            }
            return { success: false, message: 'Item not found' };
        } else {
            // Logged in: Backend API
            const response = await authFetch(`/api/user/${uid}/cart/${cartItemId}`, {
                method: 'PUT',
                body: JSON.stringify({ quantity: newQuantity })
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.message || 'Failed to update quantity');

            window.dispatchEvent(new Event('cartUpdate'));
            return { success: true };
        }
    } catch (error) {
        console.error("Error updating cart quantity:", error);
        return { success: false, message: error.message };
    }
};
