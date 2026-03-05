'use strict';
const { admin, db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');
const { formatDateDDMMYYYY } = require('../../../utils/dateFormat');
const shiprocketService = require('../../../shared/services/shiprocketService');

const SELLER_DASH_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Get seller dashboard data.
 * Cached per seller UID for 3 minutes.
 */
const getDashboardData = async (req, res) => {
    try {
        const { uid } = req.params;
        console.log(`[SellerDashboard] Fetching data for UID: ${uid}`);
        const cacheKey = `sellerDash_${uid}`;
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log(`[SellerDashboard] Returning cached data for UID: ${uid}`);
            return res.status(200).json({ success: true, ...cached });
        }

        const [sellerSnap, userSnap, productsSnap, subProductsSnap, allOrdersSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get(),
            db.collection("users").doc(uid).get(),
            db.collection("products").where("sellerId", "==", uid).limit(50).get(),
            db.collection("sellers").doc(uid).collection("listedproducts").limit(50).get(),
            db.collection("orders").where("sellerId", "==", uid).limit(50).get()
        ]);

        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller not found" });
        const sellerData = sellerSnap.data();
        const userData = userSnap.data();

        // Merge products from both sources
        const mainProducts = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const subProducts = subProductsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        console.log(`[SellerDashboard] UID: ${uid} | Main: ${mainProducts.length} | Sub: ${subProducts.length}`);

        // Use a map to handle duplicates by ID
        const productsMap = new Map();
        [...mainProducts, ...subProducts].forEach(p => productsMap.set(p.id, p));
        const products = Array.from(productsMap.values());

        console.log(`[SellerDashboard] UID: ${uid} | Merged Total: ${products.length}`);

        let totalSales = 0, newOrdersCount = 0, pendingOrdersCount = 0;
        const sellerOrders = [];
        const productIds = new Set(products.map(p => p.id));

        allOrdersSnap.forEach(doc => {
            const order = doc.data();
            const sellerItems = (order.items || []).filter(item =>
                item && (item.sellerId === uid || productIds.has(item.id) || productIds.has(item.productId))
            );

            if (order.sellerId === uid || sellerItems.length > 0) {
                const orderSales = sellerItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
                totalSales += orderSales;
                if (order.status === 'Processing') newOrdersCount++;
                if (order.status === 'Pending') pendingOrdersCount++;

                sellerOrders.push({
                    id: doc.id,
                    orderId: order.orderId || doc.id,
                    customer: order.customerName || "Customer",
                    total: orderSales,
                    status: order.status,
                    date: formatDateDDMMYYYY(order.createdAt)
                });
            }
        });

        const responseData = {
            profile: {
                ...sellerData,
                name: userData?.fullName || sellerData.fullName || "Seller",
                status: sellerData.sellerStatus // Standardize status key for frontend
            },
            stats: {
                totalSales,
                totalProducts: products.length,
                newOrders: newOrdersCount,
                pendingOrders: pendingOrdersCount
            },
            products: products,
            orders: sellerOrders
        };

        cache.set(cacheKey, responseData, SELLER_DASH_TTL);
        return res.status(200).json({ success: true, ...responseData });
    } catch (error) {
        console.error("[SellerDashboard] ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
    }
};

/**
 * Add a new product for a seller.
 */
const addProduct = async (req, res) => {
    try {
        const { sellerId, productData } = req.body;
        if (!sellerId || !productData) return res.status(400).json({ success: false, message: "Missing data" });

        const price = Number(productData.price);
        if (isNaN(price) || price <= 0) return res.status(400).json({ success: false, message: "Invalid price" });

        const newProduct = {
            ...productData,
            price,
            sellerId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "Active"
        };

        const docRef = await db.collection("products").add(newProduct);
        const productId = docRef.id;

        // Also add to seller's sub-collection
        await db.collection("sellers").doc(sellerId).collection("listedproducts").doc(productId).set({
            ...newProduct,
            id: productId
        });

        // Invalidate relevant caches
        cache.invalidate(`sellerDash_${sellerId}`);
        cache.invalidate('adminStats', 'allSellers');
        cache.invalidatePrefix('products_');

        return res.status(200).json({ success: true, message: "Product added", productId });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to add product" });
    }
};

/**
 * Create Seller Pickup Address in Shiprocket
 */
const createPickupAddress = async (req, res) => {
    try {
        const { sellerData } = req.body;

        if (!sellerData) {
            return res.status(400).json({ success: false, message: "Seller data is required" });
        }

        const requiredFields = ['pickup_location', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'pin_code'];
        const missingFields = requiredFields.filter(field => !sellerData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({ success: false, message: `Missing required fields: ${missingFields.join(', ')}` });
        }

        const result = await shiprocketService.createPickupAddress(sellerData);

        if (result.success) {
            return res.status(200).json({ success: true, message: result.message, pickupId: result.pickupId });
        } else {
            return res.status(400).json({ success: false, message: result.error, details: result.details });
        }
    } catch (error) {
        console.error("CREATE PICKUP ADDRESS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to create pickup address", error: error.message });
    }
};

/**
 * Get public seller profile for product pages.
 */
const getPublicProfile = async (req, res) => {
    try {
        const { uid } = req.params;
        const [sellerSnap, userSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get(),
            db.collection("users").doc(uid).get()
        ]);

        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller not found" });
        const sellerData = sellerSnap.data();
        const userData = userSnap.exists ? userSnap.data() : {};

        // Only return data for APPROVED sellers
        if (sellerData.sellerStatus !== 'APPROVED') {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        // Parse city from address
        let city = "India";
        if (sellerData.address) {
            const parts = sellerData.address.split(',').map(p => p.trim()).filter(p => p.length > 0);
            const vtcPart = parts.find(p => p.startsWith('VTC:'));
            if (vtcPart) {
                city = vtcPart.replace('VTC:', '').trim();
            } else if (parts.length >= 2) {
                const lastParts = parts.filter(p => !p.startsWith('State:') && !/^\d{6}$/.test(p));
                city = lastParts.length > 0 ? lastParts[lastParts.length - 1] : parts[parts.length - 1];
            } else {
                city = parts[0];
            }
        }

        return res.status(200).json({
            success: true,
            seller: {
                name: userData?.fullName || userData?.name || sellerData.extractedName || "Verified Seller",
                shopName: sellerData.shopName || "SellSathi Partner",
                category: sellerData.category || "General",
                city: city,
                joinedAt: sellerData.approvedAt || sellerData.appliedAt
            }
        });
    } catch (error) {
        console.error("PUBLIC SELLER PROFILE ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch seller info" });
    }
};

module.exports = { getDashboardData, addProduct, createPickupAddress, getPublicProfile };
