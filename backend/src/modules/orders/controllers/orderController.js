'use strict';
const { admin, db } = require('../../../config/firebase');
const invoiceService = require('../../../shared/services/invoiceService');
const emailService = require('../../../shared/services/emailService');
const path = require('path');
const fs = require('fs');

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

        return res.status(200).json({ success: true, orderId, message: "Order placed successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Order placement failed" });
    }
};

/**
 * Get orders for a specific user.
 */
const getUserOrders = async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection("orders").where("userId", "==", uid).get();
        const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        orders.sort((a, b) => (b.createdAt?.toDate?.() || 0) - (a.createdAt?.toDate?.() || 0));
        return res.status(200).json({ success: true, orders });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

/**
 * Get an order by ID.
 */
const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        const doc = await db.collection("orders").doc(orderId).get();
        if (!doc.exists) {
            const query = await db.collection("orders").where("orderId", "==", orderId).limit(1).get();
            if (query.empty) return res.status(404).json({ success: false, message: "Order not found" });
            return res.status(200).json({ success: true, order: { id: query.docs[0].id, ...query.docs[0].data() } });
        }
        return res.status(200).json({ success: true, order: { id: doc.id, ...doc.data() } });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
};

module.exports = { placeOrder, getUserOrders, getOrderById };
