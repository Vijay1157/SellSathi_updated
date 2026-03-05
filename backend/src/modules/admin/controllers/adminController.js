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
        // Don't use cache for now to avoid format issues
        // const cached = cache.get('allSellers');
        // if (cached) return res.status(200).json({ success: true, sellers: cached });

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
                blockReason: sellerData.blockReason || null,
                financials: {
                    totalProducts: productCountMap[doc.id] || 0,
                    totalRevenue: fin.totalRevenue,
                    deliveredCount: fin.deliveredCount
                }
            };
        });

        // Separate sellers into categories
        const approvedSellers = sellers.filter(s => s.status === 'APPROVED' && !s.isBlocked);
        const pendingSellers = sellers.filter(s => s.status === 'PENDING' && !s.isBlocked);
        const rejectedSellers = sellers.filter(s => s.status === 'REJECTED' && !s.isBlocked);
        const blockedSellers = sellers.filter(s => s.isBlocked);

        // Return both old format (sellers array) and new format (categorized)
        // This maintains backward compatibility with frontend
        cache.set('allSellers', sellers);
        return res.status(200).json({ 
            success: true, 
            sellers: sellers, // Old format for backward compatibility
            categorized: {    // New format for enhanced features
                approved: approvedSellers,
                pending: pendingSellers,
                rejected: rejectedSellers,
                blocked: blockedSellers
            }
        });
    } catch (error) {
        console.error("[AllSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch all sellers" });
    }
};

/**
 * Approve a seller.
 */
const approveSeller = async (req, res) => {
    try {
        const { uid } = req.params;
        await db.collection("sellers").doc(uid).update({
            sellerStatus: "APPROVED",
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection("users").doc(uid).update({ role: "SELLER" });
        cache.invalidate('adminStats', 'allSellers');
        return res.status(200).json({ success: true, message: "Seller approved successfully" });
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
        await db.collection("sellers").doc(uid).update({
            sellerStatus: "REJECTED",
            rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        cache.invalidate('adminStats', 'allSellers');
        return res.status(200).json({ success: true, message: "Seller rejected successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to reject seller" });
    }
};

/**
 * Accept a rejected seller (move back to PENDING).
 */
const acceptRejectedSeller = async (req, res) => {
    try {
        const { uid } = req.params;
        
        // Move rejected seller back to PENDING status
        await db.collection("sellers").doc(uid).update({
            sellerStatus: "PENDING",
            acceptedFromRejectedAt: admin.firestore.FieldValue.serverTimestamp(),
            rejectedAt: admin.firestore.FieldValue.delete()
        });

        cache.invalidate('adminStats', 'allSellers');
        return res.status(200).json({ success: true, message: "Seller moved to pending approval" });
    } catch (error) {
        console.error("[AcceptRejectedSeller] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to accept seller" });
    }
};

/**
 * Block a seller.
 */
const blockSeller = async (req, res) => {
    try {
        const { uid } = req.params;
        const { reason } = req.body;

        // Update seller document
        await db.collection("sellers").doc(uid).update({
            isBlocked: true,
            blockedAt: admin.firestore.FieldValue.serverTimestamp(),
            blockReason: reason || "Policy violation"
        });

        // Update user document to deactivate
        await db.collection("users").doc(uid).update({
            isActive: false,
            blockedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Get seller details for email notification
        const sellerDoc = await db.collection("sellers").doc(uid).get();
        const userDoc = await db.collection("users").doc(uid).get();
        
        if (sellerDoc.exists && userDoc.exists) {
            const sellerData = sellerDoc.data();
            const userData = userDoc.data();
            
            // Send email notification
            const emailService = require('../../../shared/services/emailService');
            await emailService.sendSellerBlockedEmail(
                userData.email || userData.phone,
                userData.fullName || 'Seller',
                sellerData.shopName,
                reason || 'Policy violation'
            );
        }

        cache.invalidate('adminStats', 'allSellers');
        return res.status(200).json({ success: true, message: "Seller blocked successfully" });
    } catch (error) {
        console.error("[BlockSeller] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to block seller" });
    }
};

/**
 * Unblock a seller.
 */
const unblockSeller = async (req, res) => {
    try {
        const { uid } = req.params;

        // Update seller document - move to PENDING status
        await db.collection("sellers").doc(uid).update({
            isBlocked: false,
            sellerStatus: "PENDING", // Move to pending approval
            unblockedAt: admin.firestore.FieldValue.serverTimestamp(),
            blockReason: admin.firestore.FieldValue.delete()
        });

        // Update user document to reactivate
        await db.collection("users").doc(uid).update({
            isActive: true
        });

        // Get seller details for email notification
        const sellerDoc = await db.collection("sellers").doc(uid).get();
        const userDoc = await db.collection("users").doc(uid).get();
        
        if (sellerDoc.exists && userDoc.exists) {
            const sellerData = sellerDoc.data();
            const userData = userDoc.data();
            
            // Send email notification
            const emailService = require('../../../shared/services/emailService');
            await emailService.sendSellerUnblockedEmail(
                userData.email || userData.phone,
                userData.fullName || 'Seller',
                sellerData.shopName
            );
        }

        cache.invalidate('adminStats', 'allSellers');
        return res.status(200).json({ success: true, message: "Seller unblocked and moved to pending approval" });
    } catch (error) {
        console.error("[UnblockSeller] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to unblock seller" });
    }
};

/**
 * Delete a blocked seller and all their data
 * Removes seller, their products, and related data from the system
 */
const deleteSeller = async (req, res) => {
    try {
        const { uid } = req.params;

        // Verify seller is blocked or rejected before allowing deletion
        const sellerDoc = await db.collection("sellers").doc(uid).get();
        if (!sellerDoc.exists) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        const sellerData = sellerDoc.data();
        if (!sellerData.isBlocked && sellerData.sellerStatus !== 'REJECTED') {
            return res.status(400).json({ success: false, message: "Only blocked or rejected sellers can be deleted" });
        }

        // Delete all seller's products
        const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
        const productDeletePromises = productsSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(productDeletePromises);

        // Delete all reviews for seller's products
        const productIds = productsSnap.docs.map(doc => doc.id);
        if (productIds.length > 0) {
            for (let i = 0; i < productIds.length; i += 10) {
                const batch = productIds.slice(i, i + 10);
                const reviewsSnap = await db.collection("reviews").where("productId", "in", batch).get();
                const reviewDeletePromises = reviewsSnap.docs.map(doc => doc.ref.delete());
                await Promise.all(reviewDeletePromises);
            }
        }

        // Note: We don't delete orders as they contain customer purchase history
        // Instead, we could mark them or leave them for record-keeping

        // Delete seller document
        await db.collection("sellers").doc(uid).delete();

        // Update user role back to CONSUMER
        await db.collection("users").doc(uid).update({
            role: "CONSUMER"
        });

        cache.invalidate('adminStats', 'allSellers');
        console.log(`[DeleteSeller] Deleted seller ${uid} and ${productsSnap.size} products`);
        
        return res.status(200).json({ 
            success: true, 
            message: "Seller and all their data deleted successfully",
            deletedProducts: productsSnap.size
        });
    } catch (error) {
        console.error("[DeleteSeller] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to delete seller" });
    }
};

/**
 * Delete all blocked sellers and their data
 * Bulk deletion of all blocked sellers
 */
const deleteAllBlockedSellers = async (req, res) => {
    try {
        // Get all blocked sellers
        const blockedSellersSnap = await db.collection("sellers").where("isBlocked", "==", true).get();
        
        if (blockedSellersSnap.empty) {
            return res.status(200).json({ 
                success: true, 
                message: "No blocked sellers to delete",
                deletedSellers: 0,
                deletedProducts: 0
            });
        }

        const sellerUids = blockedSellersSnap.docs.map(doc => doc.id);
        let totalProductsDeleted = 0;

        // Delete all products for each blocked seller
        for (const uid of sellerUids) {
            const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
            totalProductsDeleted += productsSnap.size;
            
            const productDeletePromises = productsSnap.docs.map(doc => doc.ref.delete());
            await Promise.all(productDeletePromises);

            // Delete reviews for seller's products
            const productIds = productsSnap.docs.map(doc => doc.id);
            if (productIds.length > 0) {
                for (let i = 0; i < productIds.length; i += 10) {
                    const batch = productIds.slice(i, i + 10);
                    const reviewsSnap = await db.collection("reviews").where("productId", "in", batch).get();
                    const reviewDeletePromises = reviewsSnap.docs.map(doc => doc.ref.delete());
                    await Promise.all(reviewDeletePromises);
                }
            }
        }

        // Delete all blocked seller documents
        const sellerDeletePromises = blockedSellersSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(sellerDeletePromises);

        // Update all users back to CONSUMER role
        for (let i = 0; i < sellerUids.length; i += 10) {
            const batch = sellerUids.slice(i, i + 10);
            const updatePromises = batch.map(uid => 
                db.collection("users").doc(uid).update({ role: "CONSUMER" })
            );
            await Promise.all(updatePromises);
        }

        cache.invalidate('adminStats', 'allSellers');
        console.log(`[DeleteAllBlockedSellers] Deleted ${sellerUids.length} sellers and ${totalProductsDeleted} products`);
        
        return res.status(200).json({ 
            success: true, 
            message: `Successfully deleted ${sellerUids.length} blocked sellers and their data`,
            deletedSellers: sellerUids.length,
            deletedProducts: totalProductsDeleted
        });
    } catch (error) {
        console.error("[DeleteAllBlockedSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to delete blocked sellers" });
    }
};

/**
 * Delete all rejected sellers and their data
 * Bulk deletion of all rejected sellers
 */
const deleteAllRejectedSellers = async (req, res) => {
    try {
        // Get all rejected sellers (not blocked)
        const rejectedSellersSnap = await db.collection("sellers")
            .where("sellerStatus", "==", "REJECTED")
            .where("isBlocked", "==", false)
            .get();
        
        if (rejectedSellersSnap.empty) {
            return res.status(200).json({ 
                success: true, 
                message: "No rejected sellers to delete",
                deletedSellers: 0,
                deletedProducts: 0
            });
        }

        const sellerUids = rejectedSellersSnap.docs.map(doc => doc.id);
        let totalProductsDeleted = 0;

        // Delete all products for each rejected seller
        for (const uid of sellerUids) {
            const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
            totalProductsDeleted += productsSnap.size;
            
            const productDeletePromises = productsSnap.docs.map(doc => doc.ref.delete());
            await Promise.all(productDeletePromises);

            // Delete reviews for seller's products
            const productIds = productsSnap.docs.map(doc => doc.id);
            if (productIds.length > 0) {
                for (let i = 0; i < productIds.length; i += 10) {
                    const batch = productIds.slice(i, i + 10);
                    const reviewsSnap = await db.collection("reviews").where("productId", "in", batch).get();
                    const reviewDeletePromises = reviewsSnap.docs.map(doc => doc.ref.delete());
                    await Promise.all(reviewDeletePromises);
                }
            }
        }

        // Delete all rejected seller documents
        const sellerDeletePromises = rejectedSellersSnap.docs.map(doc => doc.ref.delete());
        await Promise.all(sellerDeletePromises);

        // Update all users back to CONSUMER role
        for (let i = 0; i < sellerUids.length; i += 10) {
            const batch = sellerUids.slice(i, i + 10);
            const updatePromises = batch.map(uid => 
                db.collection("users").doc(uid).update({ role: "CONSUMER" })
            );
            await Promise.all(updatePromises);
        }

        cache.invalidate('adminStats', 'allSellers');
        console.log(`[DeleteAllRejectedSellers] Deleted ${sellerUids.length} sellers and ${totalProductsDeleted} products`);
        
        return res.status(200).json({ 
            success: true, 
            message: `Successfully deleted ${sellerUids.length} rejected sellers and their data`,
            deletedSellers: sellerUids.length,
            deletedProducts: totalProductsDeleted
        });
    } catch (error) {
        console.error("[DeleteAllRejectedSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to delete rejected sellers" });
    }
};

/**
 * Get all products for admin management.
 */
const getAllProducts = async (req, res) => {
    try {
        const productsSnap = await db.collection("products").get();
        
        const products = productsSnap.docs.map(doc => {
            const data = doc.data();
            
            // Format date to dd/mm/yyyy
            let formattedDate = 'N/A';
            let timestamp = 0;
            
            if (data.createdAt) {
                try {
                    const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (!isNaN(date.getTime())) {
                        formattedDate = formatDateDDMMYYYY(date);
                        timestamp = date.getTime();
                    }
                } catch (e) {
                    console.error('Date formatting error for product:', doc.id, e);
                }
            }
            
            // If no date, use current date as fallback
            if (formattedDate === 'N/A' || formattedDate === 'NN/NN/NNNN') {
                const now = new Date();
                formattedDate = formatDateDDMMYYYY(now);
                timestamp = now.getTime();
            }
            
            return {
                id: doc.id,
                ...data,
                // Normalize field names
                name: data.name || data.title,
                price: data.price || 0,
                category: data.category || 'Uncategorized',
                sellerId: data.sellerId || 'Unknown',
                stock: data.stock || 0,
                status: data.status || 'active',
                createdAt: data.createdAt || null,
                date: formattedDate,
                // Keep timestamp for sorting
                timestamp: timestamp
            };
        });

        // Sort by timestamp descending (newest first)
        products.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({ 
            success: true, 
            products: products,
            count: products.length
        });
    } catch (error) {
        console.error("[GetAllProducts] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
};

/**
 * Get all orders for admin management.
 */
const getAllOrders = async (req, res) => {
    try {
        const ordersSnap = await db.collection("orders").get();
        
        const orders = ordersSnap.docs.map(doc => {
            const data = doc.data();
            
            // Format date to dd/mm/yyyy
            let formattedDate = 'N/A';
            let timestamp = 0;
            
            if (data.createdAt) {
                try {
                    const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (!isNaN(date.getTime())) {
                        formattedDate = formatDateDDMMYYYY(date);
                        timestamp = date.getTime();
                    }
                } catch (e) {
                    console.error('Date formatting error for order:', doc.id, e);
                }
            }
            
            // If no date, use current date as fallback
            if (formattedDate === 'N/A' || formattedDate === 'NN/NN/NNNN') {
                const now = new Date();
                formattedDate = formatDateDDMMYYYY(now);
                timestamp = now.getTime();
            }
            
            return {
                id: doc.id,
                ...data,
                // Ensure frontend-compatible field names
                customer: data.customerName || data.customer || 'N/A',
                orderId: data.orderId || doc.id,
                total: data.total || 0,
                status: data.status || 'Processing',
                date: formattedDate,
                timestamp: timestamp
            };
        });

        // Sort by timestamp descending (newest first)
        orders.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({ 
            success: true, 
            orders: orders,
            count: orders.length
        });
    } catch (error) {
        console.error("[GetAllOrders] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

/**
 * Get all reviews for admin dashboard
 * Returns all customer reviews with ratings, feedback, and product details
 */
const getAllReviews = async (req, res) => {
    try {
        const reviewsSnap = await db.collection("reviews").get();

        // Fetch all products once for efficiency
        const productsSnap = await db.collection("products").get();
        const productsMap = {};
        productsSnap.forEach(doc => {
            productsMap[doc.id] = { id: doc.id, ...doc.data() };
        });

        const reviews = [];

        for (const doc of reviewsSnap.docs) {
            const data = doc.data();

            // Format date to dd/mm/yyyy
            let formattedDate = 'N/A';
            let timestamp = 0;

            if (data.createdAt) {
                try {
                    const date = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
                    if (!isNaN(date.getTime())) {
                        formattedDate = formatDateDDMMYYYY(date);
                        timestamp = date.getTime();
                    }
                } catch (e) {
                    console.error('Date formatting error for review:', doc.id, e);
                }
            }

            // If no date, use current date as fallback
            if (formattedDate === 'N/A' || formattedDate === 'NN/NN/NNNN') {
                const now = new Date();
                formattedDate = formatDateDDMMYYYY(now);
                timestamp = now.getTime();
            }

            // Get product details
            const product = productsMap[data.productId] || {};
            
            // Calculate product average rating and review count
            const productReviews = reviewsSnap.docs.filter(d => d.data().productId === data.productId);
            const productReviewCount = productReviews.length;
            const productAvgRating = productReviewCount > 0 
                ? productReviews.reduce((sum, d) => sum + (d.data().rating || 0), 0) / productReviewCount 
                : 0;

            reviews.push({
                id: doc.id,
                ...data,
                // Ensure all required fields are present
                customerName: data.customerName || 'Anonymous',
                customerId: data.userId || 'N/A',
                productName: data.productName || product.title || 'Unknown Product',
                productCategory: product.category || 'N/A',
                productBrand: product.brand || 'N/A',
                productAvgRating: productAvgRating,
                productReviewCount: productReviewCount,
                rating: data.rating || 0,
                title: data.title || '',
                body: data.body || '',
                feedback: data.body || data.feedback || '', // Map body to feedback for frontend
                verified: data.verified || false,
                date: formattedDate,
                timestamp: timestamp
            });
        }

        // Sort by timestamp descending (newest first)
        reviews.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({
            success: true,
            reviews: reviews,
            count: reviews.length
        });
    } catch (error) {
        console.error("[GetAllReviews] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch reviews" });
    }
};

/**
 * Get seller analytics for payout section
 * Returns approved sellers with their financial metrics
 */
const getSellerAnalytics = async (req, res) => {
    try {
        const sellersSnap = await db.collection("sellers").where("sellerStatus", "==", "APPROVED").get();

        // Fetch all orders once
        const allOrdersSnap = await db.collection("orders").get();
        const allOrders = allOrdersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Build seller email map
        const sellerUids = sellersSnap.docs.map(d => d.id);
        const userEmailMap = {};
        for (let i = 0; i < sellerUids.length; i += 10) {
            const batch = sellerUids.slice(i, i + 10);
            const usersSnap = await db.collection("users")
                .where(admin.firestore.FieldPath.documentId(), "in", batch)
                .get();
            usersSnap.forEach(d => {
                const u = d.data();
                userEmailMap[d.id] = u.email || u.phone || "N/A";
            });
        }

        const sellers = [];

        for (const doc of sellersSnap.docs) {
            const sellerData = doc.data();
            const uid = doc.id;

            const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
            let totalProducts = 0;
            let totalStockLeft = 0;
            let totalProductValue = 0;
            let productStats = {};

            console.log(`[GetSellerAnalytics] Processing ${productsSnap.size} products for seller ${uid}`);

            productsSnap.forEach(p => {
                const prod = p.data();
                totalProducts++;
                totalStockLeft += (prod.stock || 0);
                totalProductValue += (prod.price || 0) * (prod.stock || 0);
                
                // Format product creation date - try multiple date fields
                let productDate = 'N/A';
                let productTimestamp = 0;
                
                // Try createdAt first, then updatedAt, then use current date as fallback
                const dateField = prod.createdAt || prod.updatedAt || prod.publishedAt;
                
                if (dateField) {
                    try {
                        const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
                        if (!isNaN(date.getTime())) {
                            productDate = formatDateDDMMYYYY(date);
                            productTimestamp = date.getTime();
                        }
                    } catch (e) {
                        console.error('Date formatting error for product:', p.id, e);
                    }
                }
                
                // If still N/A, use current date as fallback
                if (productDate === 'N/A') {
                    const now = new Date();
                    productDate = formatDateDDMMYYYY(now);
                    productTimestamp = now.getTime();
                }
                
                productStats[p.id] = { 
                    id: p.id, 
                    name: prod.title, 
                    price: prod.price || 0,
                    discountedPrice: prod.discountedPrice || null,
                    stock: prod.stock || 0, 
                    sold: 0, 
                    revenue: 0,
                    date: productDate,
                    timestamp: productTimestamp
                };
            });

            // Filter pre-fetched orders
            let unitsSold = 0;
            let grossRevenue = 0;
            allOrders.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        if (item.sellerId === uid) {
                            unitsSold += (item.quantity || 1);
                            const revenue = (item.price || 0) * (item.quantity || 1);
                            grossRevenue += revenue;
                            if (item.productId && productStats[item.productId]) {
                                productStats[item.productId].sold += (item.quantity || 1);
                                productStats[item.productId].revenue += revenue;
                            }
                        }
                    });
                }
            });

            // Format createdAt date
            let formattedDate = 'N/A';
            if (sellerData.createdAt) {
                try {
                    const date = sellerData.createdAt.toDate ? sellerData.createdAt.toDate() : new Date(sellerData.createdAt);
                    if (!isNaN(date.getTime())) {
                        formattedDate = formatDateDDMMYYYY(date);
                    }
                } catch (e) {
                    console.error('Date formatting error for seller:', uid, e);
                }
            }

            sellers.push({
                uid,
                shopName: sellerData.shopName,
                email: userEmailMap[uid] || "N/A",
                category: sellerData.category,
                createdAt: sellerData.createdAt,
                joined: formattedDate,
                // Include bank details
                bankName: sellerData.bankName || null,
                accountHolderName: sellerData.accountHolderName || null,
                ifscCode: sellerData.ifscCode || null,
                upiId: sellerData.upiId || null,
                metrics: { 
                    totalProducts, 
                    totalStockLeft, 
                    totalProductValue, 
                    unitsSold, 
                    grossRevenue 
                },
                productMatrix: Object.values(productStats).sort((a, b) => b.timestamp - a.timestamp) // Sort by newest first
            });
        }

        return res.status(200).json({ success: true, analytics: sellers });
    } catch (error) {
        console.error("[GetSellerAnalytics] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
};


/**
 * Get bank details for a specific seller
 */
const getSellerBankDetails = async (req, res) => {
    try {
        const { uid } = req.params;
        
        const sellerSnap = await db.collection("sellers").doc(uid).get();
        if (!sellerSnap.exists) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }
        
        const sellerData = sellerSnap.data();
        
        const bankDetails = {
            bankName: sellerData.bankName || null,
            accountHolderName: sellerData.accountHolderName || null,
            ifscCode: sellerData.ifscCode || null,
            upiId: sellerData.upiId || null
        };
        
        return res.status(200).json({ success: true, bankDetails });
    } catch (error) {
        console.error("[GetSellerBankDetails] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch bank details" });
    }
};


module.exports = { getStats, getAllSellers, approveSeller, rejectSeller, acceptRejectedSeller, blockSeller, unblockSeller, deleteSeller, deleteAllBlockedSellers, deleteAllRejectedSellers, getAllProducts, getAllOrders, getAllReviews, getSellerAnalytics, getSellerBankDetails };
