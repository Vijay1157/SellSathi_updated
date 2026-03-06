'use strict';
const { db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');

const CONSUMER_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Get user cart.
 */
const getCart = async (req, res) => {
    try {
        const { uid } = req.params;
        const cacheKey = `cart_${uid}`;
        const cached = cache.get(cacheKey);
        if (cached !== null) return res.json({ success: true, cart: cached });

        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists) return res.status(404).json({ success: false, message: "User not found" });
        const cart = userDoc.data().cart || [];
        cache.set(cacheKey, cart, CONSUMER_CACHE_TTL);
        return res.json({ success: true, cart });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch cart" });
    }
};

/**
 * Update user cart.
 */
const updateCart = async (req, res) => {
    try {
        const { uid } = req.params;
        const { cart, action, item, itemId } = req.body;

        const userRef = db.collection('users').doc(uid);

        if (cart) {
            // Overwrite entire cart
            await userRef.update({ cart });
            cache.invalidate(`cart_${uid}`);
        } else if (action) {
            const userDoc = await userRef.get();
            let currentCart = userDoc.data()?.cart || [];

            if (action === 'add' && item) {
                const existingIdx = currentCart.findIndex(i => i.id === item.id);
                if (existingIdx > -1) {
                    currentCart[existingIdx].quantity += (item.quantity || 1);
                } else {
                    currentCart.push(item);
                }
            } else if (action === 'remove' && itemId) {
                currentCart = currentCart.filter(i => i.id !== itemId);
            } else if (action === 'clear') {
                currentCart = [];
            }

            await userRef.update({ cart: currentCart });
            cache.invalidate(`cart_${uid}`);
        }

        return res.json({ success: true, message: "Cart updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update cart" });
    }
};

/**
 * Get user addresses.
 */
const getAddresses = async (req, res) => {
    try {
        const { uid } = req.params;
        const cacheKey = `addresses_${uid}`;
        const cached = cache.get(cacheKey);
        if (cached !== null) return res.json({ success: true, addresses: cached });

        const doc = await db.collection('users').doc(uid).get();
        const addresses = doc.data()?.addresses || [];
        cache.set(cacheKey, addresses, CONSUMER_CACHE_TTL);
        return res.json({ success: true, addresses });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch addresses" });
    }
};

/**
 * Save/Update user address.
 */
const saveAddress = async (req, res) => {
    try {
        const { uid } = req.params;
        const { address } = req.body;
        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();
        let addresses = doc.data()?.addresses || [];

        if (address.isDefault) addresses = addresses.map(a => ({ ...a, isDefault: false }));

        const existingIdx = addresses.findIndex(a => a.id === address.id);
        if (existingIdx > -1) addresses[existingIdx] = address;
        else addresses.push({ ...address, id: Date.now() });

        await userRef.update({ addresses });
        cache.invalidate(`addresses_${uid}`);
        return res.json({ success: true, message: "Address saved" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to save address" });
    }
};

/**
 * Get user wishlist.
 */
const getWishlist = async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection("users").doc(uid).collection("wishlist").get();
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ success: true, items });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch wishlist", items: [] });
    }
};

/**
 * Add to user wishlist.
 */
const addToWishlist = async (req, res) => {
    try {
        const { uid } = req.params;
        const { product } = req.body;

        if (!product || !product.id) {
            return res.status(400).json({ success: false, message: "Invalid product data" });
        }

        await db.collection("users").doc(uid).collection("wishlist").doc(product.id).set(product);
        return res.status(200).json({ success: true, message: "Added to wishlist" });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        return res.status(500).json({ success: false, message: "Failed to add to wishlist" });
    }
};

/**
 * Remove from user wishlist.
 */
const removeFromWishlist = async (req, res) => {
    try {
        const { uid, productId } = req.params;

        if (!productId) {
            return res.status(400).json({ success: false, message: "Invalid product ID" });
        }

        await db.collection("users").doc(uid).collection("wishlist").doc(productId).delete();
        return res.status(200).json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        return res.status(500).json({ success: false, message: "Failed to remove from wishlist" });
    }
};

module.exports = {
    getCart,
    updateCart,
    getAddresses,
    saveAddress,
    getWishlist,
    addToWishlist,
    removeFromWishlist
};
