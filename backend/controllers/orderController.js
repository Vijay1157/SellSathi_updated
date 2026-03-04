const admin = require("firebase-admin");
const db = admin.firestore();
const invoiceService = require("../services/invoiceService");
const emailService = require("../services/emailService");
const path = require('path');
const fs = require('fs');

// POST /api/orders/place
exports.placeOrder = async (req, res) => {
    try {
        const { uid, orderData } = req.body;

        if (!uid || !orderData) {
            return res.status(400).json({ success: false, message: "Missing uid or orderData" });
        }

        // Validate cart items
        if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        // Validate required order fields
        const requiredFields = ['customerName', 'phone', 'shippingAddress', 'total'];
        const missingFields = requiredFields.filter(field => !orderData[field]);
        
        if (missingFields.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: `Missing required fields: ${missingFields.join(', ')}` 
            });
        }

        // Check product stock availability
        const stockChecks = await Promise.all(
            orderData.items.map(async (item) => {
                if (!item.id && !item.productId) {
                    return { valid: false, item, reason: 'Missing product ID' };
                }
                
                const productId = item.id || item.productId;
                const productDoc = await db.collection("products").doc(productId).get();
                
                if (!productDoc.exists) {
                    return { valid: false, item, reason: 'Product not found' };
                }
                
                const product = productDoc.data();
                const requestedQty = item.quantity || 1;
                
                if (product.stock < requestedQty) {
                    return { 
                        valid: false, 
                        item, 
                        reason: `Insufficient stock. Available: ${product.stock}, Requested: ${requestedQty}` 
                    };
                }
                
                return { valid: true, item, product };
            })
        );

        // Check if any items failed stock validation
        const invalidItems = stockChecks.filter(check => !check.valid);
        if (invalidItems.length > 0) {
            return res.status(400).json({
                success: false,
                message: "Some items are out of stock or unavailable",
                invalidItems: invalidItems.map(i => ({
                    name: i.item.name || i.item.title,
                    reason: i.reason
                }))
            });
        }

        // 1. Save Order to Database
        const orderRef = await db.collection("orders").add({
            ...orderData,
            userId: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "Placed", // Initial status
            invoiceGenerated: false
        });

        const orderId = orderRef.id;
        console.log(`Order placed: ${orderId}`);

        // 2. Update product stock
        try {
            const stockUpdates = stockChecks.map(check => {
                const productId = check.item.id || check.item.productId;
                const newStock = check.product.stock - (check.item.quantity || 1);
                return db.collection("products").doc(productId).update({
                    stock: newStock,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            });
            await Promise.all(stockUpdates);
            console.log(`Stock updated for ${stockUpdates.length} products`);
        } catch (stockError) {
            console.error("Failed to update stock:", stockError);
            // Continue with order processing even if stock update fails
        }

        // 3. Generate Invoice (Async)
        const fullOrder = {
            ...orderData,
            orderId: orderData.orderId || orderId,
            documentId: orderId
        };

        let invoicePath = null;
        try {
            invoicePath = await invoiceService.generateInvoice(fullOrder);
            console.log(`Invoice generated at: ${invoicePath}`);

            // Update order with invoice reference
            await orderRef.update({
                invoiceGenerated: true,
                invoicePath: invoicePath
            });

        } catch (invError) {
            console.error("Failed to generate invoice:", invError);
            // Update order to indicate invoice generation failed
            await orderRef.update({
                invoiceGenerated: false,
                invoiceError: invError.message
            });
        }

        // 4. Send Emails (Async - non-blocking)
        if (invoicePath) {
            // A. Send to Consumer
            if (orderData.email) {
                emailService.sendOrderConfirmation(orderData.email, fullOrder, invoicePath)
                    .catch(err => console.error("Failed to send consumer email:", err));
            }

            // B. Send to Sellers
            if (orderData.items && orderData.items.length > 0) {
                const sellerGroups = orderData.items.reduce((acc, item) => {
                    const sellerId = item.sellerId;
                    if (sellerId) {
                        if (!acc[sellerId]) acc[sellerId] = [];
                        acc[sellerId].push(item);
                    }
                    return acc;
                }, {});

                Object.entries(sellerGroups).forEach(async ([sellerId, items]) => {
                    try {
                        const sellerSnap = await db.collection("users").doc(sellerId).get();
                        if (sellerSnap.exists) {
                            const sellerEmail = sellerSnap.data().email;
                            if (sellerEmail) {
                                emailService.sendSellerNotification(sellerEmail, fullOrder, items);
                            }
                        }
                    } catch (err) {
                        console.error(`Failed to notify seller ${sellerId}:`, err);
                    }
                });
            }
        }

        return res.status(200).json({
            success: true,
            orderId: orderId,
            message: "Order placed successfully"
        });

    } catch (error) {
        console.error("PLACE ORDER ERROR:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to place order: " + error.message 
        });
    }
};

// GET /api/user/:uid/orders
exports.getUserOrders = async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection("orders")
            .where("userId", "==", uid)
            .get();

        const orders = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            orders.push({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date() // Convert timestamp
            });
        });

        // Sort in-memory to avoid index requirement
        orders.sort((a, b) => b.createdAt - a.createdAt);

        return res.status(200).json({ success: true, orders });

    } catch (error) {
        console.error("GET USER ORDERS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
};

// GET /api/user/:uid/stats
exports.getOrderStats = async (req, res) => {
    try {
        const { uid } = req.params;
        const snapshot = await db.collection("orders").where("userId", "==", uid).get();

        let totalOrders = 0;
        let pendingOrders = 0;
        let deliveredOrders = 0;
        let cancelledOrders = 0;
        let totalSpend = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            totalOrders++;
            const status = data.status || "Placed";

            if (["Placed", "Confirmed", "Shipped", "Out for Delivery"].includes(status)) {
                pendingOrders++;
            } else if (status === "Delivered") {
                deliveredOrders++;
            } else if (status === "Cancelled") {
                cancelledOrders++;
            }

            if (status !== "Cancelled") {
                totalSpend += (data.total || 0);
            }
        });

        return res.status(200).json({
            success: true,
            stats: {
                totalOrders,
                pendingOrders,
                deliveredOrders,
                cancelledOrders,
                totalSpend
            }
        });

    } catch (error) {
        console.error("GET ORDER STATS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
};

// GET /api/orders/:orderId
exports.getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Try to find by orderId field first
        const snapshot = await db.collection("orders")
            .where("orderId", "==", orderId)
            .limit(1)
            .get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data();
            return res.status(200).json({
                success: true,
                order: {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                }
            });
        }

        // If not found by orderId field, try by document ID
        const docRef = await db.collection("orders").doc(orderId).get();
        if (docRef.exists) {
            const data = docRef.data();
            return res.status(200).json({
                success: true,
                order: {
                    id: docRef.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                }
            });
        }

        return res.status(404).json({ success: false, message: "Order not found" });

    } catch (error) {
        console.error("GET ORDER BY ID ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
};

// GET /api/invoice/:orderId
exports.downloadInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Try multiple invoice naming patterns
        const possibleNames = [
            `Invoice-${orderId}.pdf`,
            `Invoice-OD${orderId}.pdf`,
            `invoice-${orderId}.pdf`
        ];
        
        const invoicesDir = path.join(__dirname, '..', 'invoices');
        
        // Check if any of the possible invoice files exist
        for (const invoiceName of possibleNames) {
            const invoicePath = path.join(invoicesDir, invoiceName);
            if (fs.existsSync(invoicePath)) {
                console.log(`Invoice found: ${invoicePath}`);
                return res.download(invoicePath);
            }
        }
        
        // If no invoice found, try to find the order and generate invoice
        console.log(`Invoice not found for order ${orderId}, attempting to generate...`);
        
        try {
            // Find the order
            let orderDoc = await db.collection("orders").doc(orderId).get();
            
            if (!orderDoc.exists) {
                // Try finding by orderId field
                const snapshot = await db.collection("orders")
                    .where("orderId", "==", orderId)
                    .limit(1)
                    .get();
                    
                if (!snapshot.empty) {
                    orderDoc = snapshot.docs[0];
                } else {
                    return res.status(404).json({ 
                        success: false, 
                        message: "Order not found. Cannot generate invoice." 
                    });
                }
            }
            
            const orderData = orderDoc.data();
            const fullOrder = {
                ...orderData,
                orderId: orderData.orderId || orderId,
                documentId: orderDoc.id
            };
            
            // Generate invoice
            const invoicePath = await invoiceService.generateInvoice(fullOrder);
            console.log(`Invoice generated at: ${invoicePath}`);
            
            // Update order with invoice reference
            await orderDoc.ref.update({
                invoiceGenerated: true,
                invoicePath: invoicePath
            });
            
            // Download the newly generated invoice
            if (fs.existsSync(invoicePath)) {
                return res.download(invoicePath);
            } else {
                return res.status(500).json({ 
                    success: false, 
                    message: "Invoice generation failed" 
                });
            }
            
        } catch (genError) {
            console.error("Error generating invoice:", genError);
            return res.status(500).json({ 
                success: false, 
                message: "Failed to generate invoice: " + genError.message 
            });
        }

    } catch (error) {
        console.error("DOWNLOAD INVOICE ERROR:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to download invoice: " + error.message 
        });
    }
};
