'use strict';
const { admin, db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');
const { formatDateDDMMYYYY } = require('../../../utils/dateFormat');
const PDFDocument = require('pdfkit');

/**
 * Get overall admin dashboard statistics.
 */
const getStats = async (req, res) => {
    try {
        const cached = cache.get('adminStats');
        if (cached) return res.status(200).json({ success: true, stats: cached });

        const [
            totalSellersCount,
            pendingSellersCount,
            approvedSellersCount,
            totalProductsCount,
            totalOrdersCount,
            ordersToDeliverCount
        ] = await Promise.all([
            db.collection("sellers").count().get(),
            db.collection("sellers").where("sellerStatus", "==", "PENDING").count().get(),
            db.collection("sellers").where("sellerStatus", "==", "APPROVED").count().get(),
            db.collection("products").count().get(),
            db.collection("orders").count().get(),
            db.collection("orders").where("status", "in", ["Processing", "Shipped"]).count().get()
        ]);

        const stats = {
            totalSellers: totalSellersCount.data().count,
            approvedSellers: approvedSellersCount.data().count,
            totalProducts: totalProductsCount.data().count,
            totalOrders: totalOrdersCount.data().count,
            todayOrders: Math.floor(totalOrdersCount.data().count * 0.3), // Mock logic from original
            pendingApprovals: pendingSellersCount.data().count,
            totalFeedback: 0,
            ordersToDeliver: ordersToDeliverCount.data().count
        };

        cache.set('adminStats', stats, 5 * 60 * 1000); // 5 min cache
        return res.status(200).json({ success: true, stats });
    } catch (error) {
        console.error("[AdminStats] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
};

/**
 * Get pending sellers for approval.
 */
const getPendingSellers = async (req, res) => {
    try {
        const snapshot = await db.collection("sellers").where("sellerStatus", "==", "PENDING").get();
        const sellers = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        return res.status(200).json({ success: true, sellers });
    } catch (error) {
        console.error("[PendingSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch pending sellers" });
    }
};

/**
 * Get all sellers for management.
 */
const getAllSellers = async (req, res) => {
    try {
        const cached = cache.get('allSellers');
        if (cached) return res.status(200).json({ success: true, sellers: cached });

        const [sellersSnap, ordersSnap] = await Promise.all([
            db.collection("sellers").get(),
            db.collection("orders").where("status", "==", "Delivered").get()
        ]);

        const deliveredOrders = ordersSnap.docs.map(o => o.data());
        const sellerIds = sellersSnap.docs.map(d => d.id);

        const userMap = {};
        for (let i = 0; i < sellerIds.length; i += 10) {
            const batch = sellerIds.slice(i, i + 10);
            const usersSnap = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", batch).get();
            usersSnap.forEach(d => { userMap[d.id] = d.data(); });
        }

        const productCountMap = {};
        for (let i = 0; i < sellerIds.length; i += 10) {
            const batch = sellerIds.slice(i, i + 10);
            const productsSnap = await db.collection("products").where("sellerId", "in", batch).get();
            productsSnap.forEach(d => {
                const sid = d.data().sellerId;
                if (sid) productCountMap[sid] = (productCountMap[sid] || 0) + 1;
            });
        }

        const financialsMap = {};
        deliveredOrders.forEach(order => {
            if (!order.items || !Array.isArray(order.items)) return;
            const sellerHits = {};
            order.items.forEach(item => {
                if (!item.sellerId) return;
                if (!sellerHits[item.sellerId]) {
                    sellerHits[item.sellerId] = { rev: 0 };
                    financialsMap[item.sellerId] = financialsMap[item.sellerId] || { totalRevenue: 0, deliveredCount: 0 };
                }
                sellerHits[item.sellerId].rev += (item.price || 0) * (item.quantity || 1);
            });
            Object.entries(sellerHits).forEach(([sid, { rev }]) => {
                financialsMap[sid].totalRevenue += rev;
                financialsMap[sid].deliveredCount += 1;
            });
        });

        const sellers = sellersSnap.docs.map(doc => {
            const sellerData = doc.data();
            const userData = userMap[doc.id] || {};
            const fin = financialsMap[doc.id] || { totalRevenue: 0, deliveredCount: 0 };
            return {
                uid: doc.id,
                name: sellerData.shopName,
                email: userData.email || userData.phone || "N/A",
                phone: userData.phone || "N/A",
                status: sellerData.sellerStatus,
                joined: formatDateDDMMYYYY(sellerData.approvedAt || sellerData.appliedAt),
                shopName: sellerData.shopName,
                category: sellerData.category,
                isBlocked: sellerData.isBlocked || false,
                financials: {
                    totalProducts: productCountMap[doc.id] || 0,
                    totalRevenue: fin.totalRevenue,
                    deliveredCount: fin.deliveredCount
                }
            };
        });

        cache.set('allSellers', sellers, 5 * 60 * 1000);
        return res.status(200).json({ success: true, sellers });
    } catch (error) {
        console.error("[AllSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch all sellers" });
    }
};

/**
 * Get all products for admin dashboard.
 */
const getAllProducts = async (req, res) => {
    try {
        const snapshot = await db.collection("products").orderBy("createdAt", "desc").limit(500).get();
        const products = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: formatDateDDMMYYYY(doc.data().createdAt)
        }));
        return res.status(200).json({ success: true, products });
    } catch (error) {
        console.error("[AdminProducts] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

/**
 * Get all orders for admin dashboard.
 */
const getAllOrders = async (req, res) => {
    try {
        const snapshot = await db.collection("orders").orderBy("createdAt", "desc").limit(500).get();
        const orders = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: formatDateDDMMYYYY(doc.data().createdAt)
        }));
        return res.status(200).json({ success: true, orders });
    } catch (error) {
        console.error("[AdminOrders] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

/**
 * Get all reviews for admin dashboard.
 */
const getAllReviews = async (req, res) => {
    try {
        const snapshot = await db.collection("reviews").orderBy("createdAt", "desc").limit(500).get();
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            date: formatDateDDMMYYYY(doc.data().createdAt)
        }));
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        console.error("[AdminReviews] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

/**
 * Get seller analytics for admin dashboard.
 */
const getSellerAnalytics = async (req, res) => {
    try {
        const sellersSnap = await db.collection("sellers").where("sellerStatus", "==", "APPROVED").get();
        const analytics = await Promise.all(sellersSnap.docs.map(async (doc) => {
            const seller = doc.data();
            const [productsSnap, ordersSnap] = await Promise.all([
                db.collection("products").where("sellerId", "==", doc.id).get(),
                db.collection("orders").where("sellerId", "==", doc.id).get()
            ]);

            let totalSales = 0;
            let unitsSold = 0;
            let totalStock = 0;

            const productMatrix = productsSnap.docs.map(pDoc => {
                const prod = pDoc.data();
                const soldCount = (prod.soldCount || 0);
                unitsSold += soldCount;
                totalStock += (prod.stock || 0);
                const revenue = soldCount * (prod.discountPrice || prod.price || 0);
                totalSales += revenue;

                return {
                    id: pDoc.id,
                    name: prod.title || prod.name,
                    price: prod.price || 0,
                    discountedPrice: prod.discountPrice || null,
                    stock: prod.stock || 0,
                    sold: soldCount,
                    revenue: revenue
                };
            });

            return {
                uid: doc.id,
                shopName: seller.shopName,
                category: seller.category,
                joined: formatDateDDMMYYYY(seller.approvedAt || seller.appliedAt),
                email: seller.email || "N/A",
                metrics: {
                    totalProducts: productsSnap.size,
                    unitsSold: unitsSold,
                    totalStockLeft: totalStock,
                    grossRevenue: totalSales
                },
                productMatrix: productMatrix
            };
        }));

        return res.status(200).json({ success: true, analytics });
    } catch (error) {
        console.error("[AdminAnalytics] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
};

const adminService = require('../services/adminService');

/**
 * Approve a seller.
 */
const approveSeller = async (req, res) => {
    try {
        const { uid } = req.params;
        const result = await adminService.approveSeller(uid);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to approve seller" });
    }
};

/**
 * Reject a seller.
 */
const rejectSeller = async (req, res) => {
    try {
        const { uid } = req.params;
        const { reason } = req.body;
        const result = await adminService.rejectSeller(uid, reason);

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(200).json(result);
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to reject seller" });
    }
};

/**
 * Block a seller.
 */
const blockSeller = async (req, res) => {
    try {
        const { uid } = req.params;
        const { blockDuration } = req.body;
        const sellerRef = db.collection("sellers").doc(uid);
        const sellerSnap = await sellerRef.get();
        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller not found" });
        await sellerRef.update({
            sellerStatus: "REJECTED",
            isBlocked: true,
            blockDuration: blockDuration,
            blockedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection("users").doc(uid).update({ isActive: false, isBlocked: true });
        cache.invalidate('adminStats', 'allSellers');
        return res.status(200).json({ success: true, message: "Seller blocked" });
    } catch (error) {
        console.error("BLOCK SELLER ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to block seller" });
    }
};

/**
 * Delete a review.
 */
const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        await db.collection("reviews").doc(id).delete();
        cache.invalidate('adminStats');
        return res.status(200).json({ success: true, message: "Review deleted successfully" });
    } catch (error) {
        console.error("[DeleteReview] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to delete review" });
    }
};

module.exports = {
    getStats,
    getPendingSellers,
    getAllSellers,
    getAllProducts,
    getAllOrders,
    getAllReviews,
    getSellerAnalytics,
    approveSeller,
    rejectSeller,
    blockSeller,
    deleteReview
};
