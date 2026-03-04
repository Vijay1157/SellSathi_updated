'use strict';
const { admin, db } = require('../../../config/firebase');
const razorpay = require('../../../config/razorpay');
const crypto = require('crypto');
const invoiceService = require('../../../shared/services/invoiceService');
const emailService = require('../../../shared/services/emailService');
const shiprocketService = require('../../../shared/services/shiprocketService');

/**
 * Handle Razorpay order creation.
 */
const createOrder = async (req, res) => {
    try {
        const { amount, cartItems, customerInfo } = req.body;
        const options = {
            amount: Math.round(amount * 100),
            currency: 'INR',
            receipt: 'order_' + Date.now(),
            notes: { customerName: customerInfo?.firstName || 'Customer', itemCount: String(cartItems?.length || 0) },
        };
        const order = await razorpay.orders.create(options);
        return res.status(200).json({ success: true, order: { id: order.id, amount: order.amount, currency: order.currency }, key_id: process.env.RAZORPAY_KEY_ID });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to create payment" });
    }
};

/**
 * Handle payment verification and result processing.
 */
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature, cartItems, customerInfo, amount, uid } = req.body;
        const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(razorpay_order_id + "|" + razorpay_payment_id).digest('hex');

        if (expected !== razorpay_signature) return res.status(400).json({ success: false, message: "Invalid signature" });

        const orderId = "OD" + Date.now();
        const sellerId = (cartItems || []).find(i => i?.sellerId)?.sellerId || null;

        const orderData = {
            orderId, userId: uid || "guest", sellerId,
            customerName: `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim(),
            email: customerInfo?.email || "", phone: customerInfo?.phone || "",
            shippingAddress: customerInfo?.address || {}, items: cartItems || [],
            total: amount || 0, paymentMethod: "RAZORPAY", paymentId: razorpay_payment_id,
            status: "Processing", createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const orderRef = await db.collection("orders").add(orderData);

        // Handle invoice and shipping asynchronously
        try {
            const invPath = await invoiceService.generateInvoice({ ...orderData, documentId: orderRef.id });
            await orderRef.update({ invoiceGenerated: true, invoicePath: invPath });
            if (orderData.email) emailService.sendOrderConfirmation(orderData.email, { ...orderData, documentId: orderRef.id }, invPath).catch(err => console.error(err));

            const shipmentResult = await shiprocketService.createShipment({ ...orderData, orderId: orderData.orderId });
            if (shipmentResult.success) {
                await orderRef.update({ shiprocketOrderId: shipmentResult.shiprocketOrderId, shipmentId: shipmentResult.shipmentId, awbNumber: shipmentResult.awbNumber, courierName: shipmentResult.courierName, shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp() });
            }
        } catch (e) {
            console.error("Order follow-up logic error:", e.message);
        }

        return res.status(200).json({ success: true, orderId: orderData.orderId, documentId: orderRef.id });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Verification failed" });
    }
};

module.exports = { createOrder, verifyPayment };
