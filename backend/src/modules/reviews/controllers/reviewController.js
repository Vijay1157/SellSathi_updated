'use strict';
const { admin, db } = require('../../../config/firebase');

/**
 * Handle new product review submission.
 */
const submitReview = async (req, res) => {
    try {
        const { productId, orderId, rating, title, body } = req.body;
        const userId = req.user.uid;

        if (!productId || !rating || !title || !body) return res.status(400).json({ success: false, message: "Missing fields" });

        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const customerName = userData.name || userData.fullName || "Anonymous";

        const productDoc = await db.collection("products").doc(productId).get();
        const productData = productDoc.exists ? productDoc.data() : {};
        const productName = productData.title || "Unknown Product";

        const reviewData = {
            productId, orderId: orderId || null, userId, customerName, productName,
            rating: parseInt(rating), title, body, verified: orderId ? true : false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(), status: "active"
        };

        const reviewRef = await db.collection("reviews").add(reviewData);
        return res.status(200).json({ success: true, message: "Review submitted", reviewId: reviewRef.id });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Review submission failed" });
    }
};

/**
 * Get reviews for a specific product.
 */
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const reviewsSnap = await db.collection("reviews").where("productId", "==", productId).where("status", "==", "active").get();
        const reviews = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        reviews.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

module.exports = { submitReview, getProductReviews };
