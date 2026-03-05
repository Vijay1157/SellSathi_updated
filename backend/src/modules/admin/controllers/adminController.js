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

        // Get today's date range (start and end of today)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const [
            totalSellersCount,
            pendingSellersSnap,
            approvedSellersCount,
            totalProductsCount,
            totalOrdersCount,
            todayOrdersCount,
            ordersToDeliverCount,
            totalReviewsCount
        ] = await Promise.all([
            db.collection("sellers").count().get(),
            db.collection("sellers").where("sellerStatus", "==", "PENDING").get(), // Get full docs to filter
            db.collection("sellers").where("sellerStatus", "==", "APPROVED").count().get(),
            db.collection("products").count().get(),
            db.collection("orders").count().get(),
            db.collection("orders")
                .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(todayStart))
                .where("createdAt", "<=", admin.firestore.Timestamp.fromDate(todayEnd))
                .count()
                .get(),
            db.collection("orders").where("status", "in", ["Processing", "Shipped"]).count().get(),
            db.collection("reviews").count().get()
        ]);

        // Filter out blocked sellers from pending count (same logic as getPendingSellers)
        const nonBlockedPendingSellers = pendingSellersSnap.docs.filter(doc => {
            const data = doc.data();
            return data.isBlocked !== true; // Include if isBlocked is false, undefined, or null
        });

        console.log(`[GetStats] Total PENDING sellers: ${pendingSellersSnap.docs.length}, Non-blocked: ${nonBlockedPendingSellers.length}`);
        console.log(`[GetStats] Today's orders: ${todayOrdersCount.data().count}`);

        const stats = {
            totalSellers: totalSellersCount.data().count,
            approvedSellers: approvedSellersCount.data().count,
            totalProducts: totalProductsCount.data().count,
            totalOrders: totalOrdersCount.data().count,
            todayOrders: todayOrdersCount.data().count, // Dynamic count of today's orders
            pendingApprovals: nonBlockedPendingSellers.length, // Use filtered count
            ordersToDeliver: ordersToDeliverCount.data().count,
            totalFeedback: totalReviewsCount.data().count // Dynamic count of reviews
        };

        cache.set('adminStats', stats);
        return res.status(200).json({ success: true, stats });
    } catch (error) {
        console.error("[AdminStats] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
};

/**
 * Get pending sellers (for Pending Approval section).
 */
const getPendingSellers = async (req, res) => {
    try {
        // Get all sellers with PENDING status
        const sellersSnap = await db.collection("sellers")
            .where("sellerStatus", "==", "PENDING")
            .get();

        // Filter out blocked sellers (isBlocked === true)
        const filteredDocs = sellersSnap.docs.filter(doc => {
            const data = doc.data();
            return data.isBlocked !== true; // Include if isBlocked is false, undefined, or null
        });

        const sellerIds = filteredDocs.map(d => d.id);

        console.log(`[GetPendingSellers] Total PENDING sellers: ${sellersSnap.docs.length}, After filtering blocked: ${sellerIds.length}`);

        // Get user data for contact info
        const userMap = {};
        for (let i = 0; i < sellerIds.length; i += 10) {
            const batch = sellerIds.slice(i, i + 10);
            if (batch.length === 0) continue;
            const usersSnap = await db.collection("users")
                .where(admin.firestore.FieldPath.documentId(), "in", batch)
                .get();
            usersSnap.forEach(d => { userMap[d.id] = d.data(); });
        }

        const sellers = filteredDocs.map(doc => {
            const sellerData = doc.data();
            const userData = userMap[doc.id] || {};
            
            // Format joined date safely
            let joinedDate = 'N/A';
            if (sellerData.appliedAt) {
                try {
                    joinedDate = formatDateDDMMYYYY(sellerData.appliedAt);
                } catch (e) {
                    console.error(`Date formatting error for seller ${doc.id}:`, e);
                }
            }
            
            return {
                uid: doc.id,
                name: sellerData.shopName || 'Unknown Shop',
                email: userData.email || userData.phone || "N/A",
                phone: userData.phone || "N/A",
                status: sellerData.sellerStatus || 'PENDING',
                joined: joinedDate,
                shopName: sellerData.shopName || 'Unknown Shop',
                category: sellerData.category || 'Uncategorized',
                // Include all fields for Review Data modal
                extractedName: sellerData.extractedName || sellerData.fullName || null,
                aadhaarNumber: sellerData.aadhaarNumber || null,
                aadhaarImageUrl: sellerData.aadhaarImageUrl || null,
                age: sellerData.age || null,
                gender: sellerData.gender || null,
                address: sellerData.address || sellerData.shopAddress || null,
                appliedAt: sellerData.appliedAt || null,
                // Include bank details
                bankName: sellerData.bankName || null,
                accountHolderName: sellerData.accountHolderName || null,
                accountNumber: sellerData.accountNumber || null,
                ifscCode: sellerData.ifscCode || null,
                upiId: sellerData.upiId || null,
            };
        });

        console.log(`[GetPendingSellers] Returning ${sellers.length} pending sellers`);
        return res.status(200).json({ success: true, sellers });
    } catch (error) {
        console.error("[GetPendingSellers] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch pending sellers" });
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

        console.log(`[GetAllSellers] Total sellers in database: ${sellersSnap.docs.length}`);

        const deliveredOrders = ordersSnap.docs.map(o => o.data());
        const sellerIds = sellersSnap.docs.map(d => d.id);

        const userMap = {};
        for (let i = 0; i < sellerIds.length; i += 10) {
            const batch = sellerIds.slice(i, i + 10);
            if (batch.length === 0) continue;
            const usersSnap = await db.collection("users").where(admin.firestore.FieldPath.documentId(), "in", batch).get();
            usersSnap.forEach(d => { userMap[d.id] = d.data(); });
        }

        const productCountMap = {};
        for (let i = 0; i < sellerIds.length; i += 10) {
            const batch = sellerIds.slice(i, i + 10);
            if (batch.length === 0) continue;
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
            
            // Safely format date - use createdAt (registration date) instead of appliedAt
            let formattedDate = 'N/A';
            const dateField = sellerData.createdAt || sellerData.appliedAt;
            if (dateField) {
                try {
                    const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
                    if (!isNaN(date.getTime())) {
                        formattedDate = formatDateDDMMYYYY(date);
                    }
                } catch (e) {
                    console.error(`Date formatting error for seller ${doc.id}:`, e);
                }
            }
            
            return {
                uid: doc.id,
                name: sellerData.shopName || 'Unknown Shop',
                email: userData.email || userData.phone || "N/A",
                phone: userData.phone || "N/A",
                status: sellerData.sellerStatus || 'PENDING',
                joined: formattedDate,
                shopName: sellerData.shopName || 'Unknown Shop',
                category: sellerData.category || 'Uncategorized',
                isBlocked: sellerData.isBlocked === true, // Normalize to boolean
                blockReason: sellerData.blockReason || null,
                // Include all seller data fields
                extractedName: sellerData.extractedName || sellerData.fullName || null,
                aadhaarNumber: sellerData.aadhaarNumber || null,
                aadhaarImageUrl: sellerData.aadhaarImageUrl || null,
                age: sellerData.age || null,
                gender: sellerData.gender || null,
                address: sellerData.address || sellerData.shopAddress || null,
                appliedAt: sellerData.appliedAt || null,
                createdAt: sellerData.createdAt || null,
                // Include bank details
                bankName: sellerData.bankName || null,
                accountHolderName: sellerData.accountHolderName || null,
                accountNumber: sellerData.accountNumber || null,
                ifscCode: sellerData.ifscCode || null,
                upiId: sellerData.upiId || null,
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

        console.log(`[GetAllSellers] Categorized sellers:`, {
            total: sellers.length,
            approved: approvedSellers.length,
            pending: pendingSellers.length,
            rejected: rejectedSellers.length,
            blocked: blockedSellers.length
        });

        // Log each seller's status for debugging
        sellers.forEach(s => {
            console.log(`[GetAllSellers] Seller ${s.uid}: status=${s.status}, isBlocked=${s.isBlocked}, shopName=${s.shopName}`);
        });

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
        
        console.log(`[GetAllOrders] Total orders in database: ${ordersSnap.docs.length}`);
        
        // Get unique user IDs from orders
        const userIds = [...new Set(ordersSnap.docs.map(doc => doc.data().userId).filter(Boolean))];
        
        // Fetch user data in batches
        const userMap = {};
        for (let i = 0; i < userIds.length; i += 10) {
            const batch = userIds.slice(i, i + 10);
            if (batch.length === 0) continue;
            const usersSnap = await db.collection("users")
                .where(admin.firestore.FieldPath.documentId(), "in", batch)
                .get();
            usersSnap.forEach(doc => {
                const userData = doc.data();
                userMap[doc.id] = userData.fullName || userData.name || userData.email || userData.phone || 'Anonymous';
            });
        }
        
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
            
            // Get customer name from user map or fallback to order data
            const customerName = userMap[data.userId] || data.customerName || data.customer || data.shippingAddress?.name || 'Guest Customer';
            
            return {
                id: doc.id,
                ...data,
                // Ensure frontend-compatible field names
                customer: customerName,
                customerId: data.userId || 'N/A',
                orderId: data.orderId || doc.id,
                total: data.total || data.totalAmount || 0,
                status: data.status || 'Processing',
                date: formattedDate,
                timestamp: timestamp,
                createdAt: data.createdAt || null
            };
        });

        // Sort by timestamp descending (newest first)
        orders.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`[GetAllOrders] Returning ${orders.length} orders, sorted by newest first`);

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
 * Only includes reviews for products that exist in the database
 */
const getAllReviews = async (req, res) => {
    try {
        const reviewsSnap = await db.collection("reviews").get();
        
        console.log(`[GetAllReviews] Total reviews in database: ${reviewsSnap.docs.length}`);

        // Fetch all products once for efficiency
        const productsSnap = await db.collection("products").get();
        const productsMap = {};
        productsSnap.forEach(doc => {
            const productData = doc.data();
            productsMap[doc.id] = { 
                id: doc.id, 
                title: productData.title || productData.name || 'Unknown Product',
                category: productData.category || 'Uncategorized',
                brand: productData.brand || productData.brandName || 'No Brand',
                ...productData
            };
        });

        console.log(`[GetAllReviews] Total products in database: ${productsSnap.docs.length}`);

        const reviews = [];
        let skippedReviews = 0;

        for (const doc of reviewsSnap.docs) {
            const data = doc.data();
            const productId = data.productId;

            // Skip reviews for products that don't exist in database
            if (!productId || !productsMap[productId]) {
                console.log(`[GetAllReviews] Skipping review ${doc.id} - Product not found: ${productId}`);
                skippedReviews++;
                continue;
            }

            // Get product details from map
            const product = productsMap[productId];

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
            
            // Calculate product average rating and review count for this specific product
            const productReviews = reviewsSnap.docs.filter(d => {
                const reviewData = d.data();
                return reviewData.productId === productId && productsMap[reviewData.productId]; // Only count reviews for existing products
            });
            const productReviewCount = productReviews.length;
            const productAvgRating = productReviewCount > 0 
                ? productReviews.reduce((sum, d) => sum + (d.data().rating || 0), 0) / productReviewCount 
                : 0;

            reviews.push({
                id: doc.id,
                ...data,
                // Ensure all required fields are present with product data
                customerName: data.customerName || data.userName || 'Anonymous',
                customerId: data.userId || data.customerId || 'N/A',
                productName: product.title,
                productId: productId,
                productCategory: product.category,
                productBrand: product.brand,
                productAvgRating: parseFloat(productAvgRating.toFixed(1)),
                productReviewCount: productReviewCount,
                rating: data.rating || 0,
                title: data.title || '',
                body: data.body || data.review || '',
                feedback: data.feedback || data.body || data.review || '', // Support multiple field names
                verified: data.verified || data.verifiedPurchase || false,
                date: formattedDate,
                timestamp: timestamp,
                createdAt: data.createdAt || null
            });
        }

        // Sort by timestamp descending (newest first)
        reviews.sort((a, b) => b.timestamp - a.timestamp);

        console.log(`[GetAllReviews] Returning ${reviews.length} reviews (skipped ${skippedReviews} reviews for non-existent products)`);

        return res.status(200).json({
            success: true,
            reviews: reviews,
            count: reviews.length,
            skipped: skippedReviews
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

            // Format appliedAt date (seller registration date)
            let formattedDate = 'N/A';
            let timestamp = 0;
            
            const dateField = sellerData.appliedAt || sellerData.createdAt;
            console.log(`[GetSellerAnalytics] Seller ${uid} - appliedAt:`, sellerData.appliedAt ? 'exists' : 'missing', 'createdAt:', sellerData.createdAt ? 'exists' : 'missing');
            
            if (dateField) {
                try {
                    const date = dateField.toDate ? dateField.toDate() : new Date(dateField);
                    if (!isNaN(date.getTime())) {
                        formattedDate = formatDateDDMMYYYY(date);
                        timestamp = date.getTime();
                        console.log(`[GetSellerAnalytics] Seller ${uid} (${sellerData.shopName}) - formatted date: ${formattedDate}`);
                    }
                } catch (e) {
                    console.error('Date formatting error for seller:', uid, e);
                }
            } else {
                console.warn(`[GetSellerAnalytics] Seller ${uid} (${sellerData.shopName}) has no appliedAt or createdAt field`);
            }

            sellers.push({
                uid,
                shopName: sellerData.shopName,
                email: userEmailMap[uid] || "N/A",
                category: sellerData.category,
                createdAt: sellerData.createdAt,
                joined: formattedDate,
                timestamp: timestamp, // Add timestamp for sorting
                // Include bank details
                bankName: sellerData.bankName || null,
                accountHolderName: sellerData.accountHolderName || null,
                accountNumber: sellerData.accountNumber || null,
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

        // Sort sellers by timestamp descending (newest first)
        sellers.sort((a, b) => b.timestamp - a.timestamp);

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
            accountNumber: sellerData.accountNumber || null,
            ifscCode: sellerData.ifscCode || null,
            upiId: sellerData.upiId || null
        };
        
        return res.status(200).json({ success: true, bankDetails });
    } catch (error) {
        console.error("[GetSellerBankDetails] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch bank details" });
    }
};


/**
 * Delete a specific review
 */
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;

        if (!reviewId) {
            return res.status(400).json({ success: false, message: "Review ID is required" });
        }

        const reviewRef = db.collection("reviews").doc(reviewId);
        const reviewSnap = await reviewRef.get();

        if (!reviewSnap.exists) {
            return res.status(404).json({ success: false, message: "Review not found" });
        }

        const reviewData = reviewSnap.data();
        const productId = reviewData.productId;

        // Delete the review
        await reviewRef.delete();

        console.log(`[DeleteReview] Deleted review ${reviewId} for product ${productId}`);

        // Optionally: Update product's average rating
        if (productId) {
            try {
                const remainingReviewsSnap = await db.collection("reviews")
                    .where("productId", "==", productId)
                    .get();

                const reviewCount = remainingReviewsSnap.size;
                let avgRating = 0;

                if (reviewCount > 0) {
                    const totalRating = remainingReviewsSnap.docs.reduce((sum, doc) => {
                        return sum + (doc.data().rating || 0);
                    }, 0);
                    avgRating = totalRating / reviewCount;
                }

                // Update product with new average rating
                await db.collection("products").doc(productId).update({
                    averageRating: avgRating,
                    reviewCount: reviewCount
                });

                console.log(`[DeleteReview] Updated product ${productId} - avgRating: ${avgRating}, reviewCount: ${reviewCount}`);
            } catch (updateError) {
                console.error(`[DeleteReview] Error updating product ratings:`, updateError);
                // Don't fail the request if rating update fails
            }
        }

        return res.status(200).json({ 
            success: true, 
            message: "Review deleted successfully",
            reviewId: reviewId
        });
    } catch (error) {
        console.error("[DeleteReview] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to delete review" });
    }
};


module.exports = { getStats, getPendingSellers, getAllSellers, approveSeller, rejectSeller, acceptRejectedSeller, blockSeller, unblockSeller, deleteSeller, deleteAllBlockedSellers, deleteAllRejectedSellers, getAllProducts, getAllOrders, getAllReviews, getSellerAnalytics, getSellerBankDetails, deleteReview };
