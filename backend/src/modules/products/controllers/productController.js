'use strict';
const { admin, db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');

const PRODUCTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all available products (Public).
 * Cached by category for 5 minutes to minimize Firestore reads.
 */
const getAllProducts = async (req, res) => {
    try {
        const { category } = req.query;
        const cacheKey = `products_${category || 'all'}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, products: cached });

        let query = db.collection("products").where("status", "==", "Active");

        if (category) {
            query = query.where("category", "==", category);
        }

        const snapshot = await query.get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        cache.set(cacheKey, products, PRODUCTS_CACHE_TTL);
        return res.status(200).json({ success: true, products });
    } catch (error) {
        console.error("[Products] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

/**
 * Get a single product by ID.
 * Individual products cached for 10 minutes.
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const cacheKey = `product_${id}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, product: cached });

        const doc = await db.collection("products").doc(id).get();
        if (!doc.exists) return res.status(404).json({ success: false, message: "Product not found" });

        const product = { id: doc.id, ...doc.data() };
        cache.set(cacheKey, product, 10 * 60 * 1000);
        return res.status(200).json({ success: true, product });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch product" });
    }
};

module.exports = { getAllProducts, getProductById };
