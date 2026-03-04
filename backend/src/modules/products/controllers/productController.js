'use strict';
const { admin, db } = require('../../../config/firebase');

/**
 * Get all available products (Public).
 */
const getAllProducts = async (req, res) => {
    try {
        const { category } = req.query;
        let query = db.collection("products").where("status", "==", "Active");

        if (category) {
            query = query.where("category", "==", category);
        }

        const snapshot = await query.get();
        const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        return res.status(200).json({ success: true, products });
    } catch (error) {
        console.error("[Products] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

/**
 * Get a single product by ID.
 */
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await db.collection("products").doc(id).get();
        if (!doc.exists) return res.status(404).json({ success: false, message: "Product not found" });
        return res.status(200).json({ success: true, product: { id: doc.id, ...doc.data() } });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch product" });
    }
};

module.exports = { getAllProducts, getProductById };
