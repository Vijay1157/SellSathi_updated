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
        cache.invalidate(`userOrders_${uid}`);
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

module.exports = { placeOrder, getUserOrders, getOrderById };
