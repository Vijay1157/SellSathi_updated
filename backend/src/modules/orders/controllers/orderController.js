'use strict';
const { admin, db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');
const invoiceService = require('../../../shared/services/invoiceService');
const emailService = require('../../../shared/services/emailService');
const path = require('path');
const fs = require('fs');

const ORDERS_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

/**
 * Handles placing a new order.
 */
const placeOrder = async (req, res) => {
    try {
        const { uid, orderData } = req.body;
        if (!uid || !orderData) return res.status(400).json({ success: false, message: "Missing data" });

        const orderRef = await db.collection("orders").add({
            ...orderData,
            userId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "Placed",
            invoiceGenerated: false
        });

        const orderId = orderRef.id;
        const fullOrder = { ...orderData, orderId: orderData.orderId || orderId, documentId: orderId };

        try {
            const invoicePath = await invoiceService.generateInvoice(fullOrder);
            await orderRef.update({ invoiceGenerated: true, invoicePath });
            if (orderData.email) {
                emailService.sendOrderConfirmation(orderData.email, fullOrder, invoicePath).catch(err => console.error(err));
            }
        } catch (e) {
            console.error("Invoice skip:", e.message);
        }

        // Invalidate user's order cache
        cache.invalidate(`userOrders_${uid}`, 'adminAllOrders');
        cache.invalidatePrefix('adminStats');

        return res.status(200).json({ success: true, orderId, message: "Order placed successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Order placement failed" });
    }
};

/**
 * Get orders for a specific user.
 * Cached per user for 2 minutes.
 */
const getUserOrders = async (req, res) => {
    try {
        const { uid } = req.params;
        const cacheKey = `userOrders_${uid}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, orders: cached });

        const snapshot = await db.collection("orders").where("userId", "==", uid).get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        orders.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));

        cache.set(cacheKey, orders, ORDERS_CACHE_TTL);
        return res.status(200).json({ success: true, orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

/**
 * Get an order by ID.
 * Cached per order for 5 minutes.
 */
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const cacheKey = `order_${orderId}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, order: cached });

        const doc = await db.collection("orders").doc(orderId).get();
        let order;
        if (!doc.exists) {
            const query = await db.collection("orders").where("orderId", "==", orderId).limit(1).get();
            if (query.empty) return res.status(404).json({ success: false, message: "Order not found" });
            order = { id: query.docs[0].id, ...query.docs[0].data() };
        } else {
            order = { id: doc.id, ...doc.data() };
        }

        cache.set(cacheKey, order);
        return res.status(200).json({ success: true, order });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
};

/**
 * Cancel an order.
 */
const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const uid = req.user.uid;

        const orderRef = db.collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();

        if (!orderSnap.exists) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const orderData = orderSnap.data();

        // Ensure the user owns the order
        if (orderData.uid !== uid && orderData.userId !== uid) {
            return res.status(403).json({ success: false, message: "Access denied" });
        }

        // Check if order can be cancelled
        if (["Shipped", "Delivered", "Cancelled"].includes(orderData.status)) {
            return res.status(400).json({ success: false, message: `Cannot cancel order in ${orderData.status} state` });
        }

        // Handle Shiprocket cancellation if applicable
        if (orderData.shiprocketOrderId) {
            const shiprocketResult = await shiprocketService.cancelShipment([orderData.awbNumber || orderData.shiprocketOrderId]);
            if (!shiprocketResult.success) {
                console.error("Failed to cancel Shiprocket order:", shiprocketResult.error);
                // Decide whether to fail the whole cancel operation or log and continue
                // For now, continue but log the error
            }
        }

        // Update status
        await orderRef.update({
            status: "Cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Invalidate caches
        cache.invalidate(`orders_${uid}`, 'adminAllOrders');
        if (orderData.sellerId) {
            cache.invalidate(`sellerDash_${orderData.sellerId}`);
        }
        cache.invalidate('adminStats', 'allSellers');

        // Optional: Send cancellation email
        if (orderData.email) {
            emailService.sendOrderCancellation(orderData.email, {
                orderId: orderData.orderId,
                customerName: orderData.customerName,
                total: orderData.total,
                items: orderData.items
            }).catch(e => console.error("Cancellation email error:", e));
        }

        return res.status(200).json({ success: true, message: "Order cancelled successfully" });
    } catch (error) {
        console.error("CANCEL ORDER ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to cancel order" });
    }
};

/**
 * Get reviewable orders for a user
 */
const getReviewableOrders = async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection("orders")
            .where("userId", "==", uid)
            .where("status", "==", "Delivered")
            .get();

        const reviewableOrders = [];
        for (const doc of snapshot.docs) {
            const data = doc.data();
            for (const item of data.items || []) {
                if (!item.reviewed) {
                    reviewableOrders.push({
                        orderId: data.orderId || doc.id,
                        productId: item.productId || item.id,
                        productName: item.name,
                        productImage: item.imageUrl || item.image,
                        deliveredAt: data.deliveredAt || data.updatedAt || data.createdAt
                    });
                }
            }
        }
        return res.status(200).json({ success: true, orders: reviewableOrders });
    } catch (error) {
        console.error("Fetch Reviewable orders error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch reviewable orders" });
    }
}

/**
 * Download Invoice
 */
const downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        const query = await db.collection("orders").where("orderId", "==", orderId).limit(1).get();

        let docSnap;
        if (query.empty) {
            docSnap = await db.collection("orders").doc(orderId).get();
            if (!docSnap.exists) return res.status(404).json({ success: false, message: "Order not found" });
        } else {
            docSnap = query.docs[0];
        }

        const order = docSnap.data();
        if (!order.invoicePath) {
            // Generate it on the fly if missing
            const invPath = await invoiceService.generateInvoice({ ...order, documentId: docSnap.id });
            await docSnap.ref.update({ invoiceGenerated: true, invoicePath: invPath });
            return res.sendFile(invPath);
        }

        if (fs.existsSync(order.invoicePath)) {
            return res.sendFile(order.invoicePath);
        } else {
            // Generate if file is missing from disk
            const invPath = await invoiceService.generateInvoice({ ...order, documentId: docSnap.id });
            await docSnap.ref.update({ invoiceGenerated: true, invoicePath: invPath });
            return res.sendFile(invPath);
        }
    } catch (error) {
        console.error("Invoice download error:", error);
        return res.status(500).json({ success: false, message: "Failed to download invoice" });
    }
}

/**
 * Fetch shipping label for an order.
 */
const getShippingLabel = async (req, res) => {
    try {
        let { orderId } = req.params;
        let orderDoc = await db.collection("orders").doc(orderId).get();
        let orderData;

        if (!orderDoc.exists) {
            const query = await db.collection("orders").where("orderId", "==", orderId).limit(1).get();
            if (query.empty) return res.status(404).json({ success: false, message: "Order not found" });
            orderDoc = query.docs[0];
            orderId = orderDoc.id; // Assign Firebase ID
            orderData = orderDoc.data();
        } else {
            orderData = orderDoc.data();
        }

        if (!orderData.shipmentId) {
            return res.status(400).json({
                success: false,
                message: "Shipment not yet created for this order. AWB must be generated first."
            });
        }

        // Return cached label URL if already fetched
        if (orderData.labelUrl) {
            return res.status(200).json({ success: true, labelUrl: orderData.labelUrl });
        }

        const labelResult = await shiprocketService.getShippingLabel([orderData.shipmentId]);

        if (labelResult.success && labelResult.labelUrl) {
            // Cache result in Firestore
            await db.collection("orders").doc(orderId).update({ labelUrl: labelResult.labelUrl });
            return res.status(200).json({ success: true, labelUrl: labelResult.labelUrl });
        } else {
            return res.status(400).json({
                success: false,
                message: labelResult.error || "Failed to generate shipping label"
            });
        }
    } catch (error) {
        console.error("[LABEL] Error:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch shipping label" });
    }
};

module.exports = {
    placeOrder,
    getUserOrders,
    getOrderById,
    cancelOrder,
    getReviewableOrders,
    downloadInvoice,
    getShippingLabel
};
