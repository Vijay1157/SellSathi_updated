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
            ordersToDeliver: ordersToDeliverCount.data().count
        };

        cache.set('adminStats', stats);
        return res.status(200).json({ success: true, stats });
    } catch (error) {
        console.error("[AdminStats] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stats" });
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
                joined: formatDateDDMMYYYY(sellerData.appliedAt),
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

        cache.set('allSellers', sellers);
        return res.status(200).json({ success: true, sellers });
    } catch (error) {
        console.error("[AllSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch all sellers" });
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

module.exports = { getStats, getAllSellers, approveSeller, rejectSeller, blockSeller };
