'use strict';
const { admin, db } = require('../../../config/firebase');
const cache = require('../../../utils/cache');
const { formatDateDDMMYYYY } = require('../../../utils/dateFormat');

const SELLER_DASH_TTL = 3 * 60 * 1000; // 3 minutes

/**
 * Get seller dashboard data.
 * Cached per seller UID for 3 minutes.
 */
const getDashboardData = async (req, res) => {
    try {
        const { uid } = req.params;
        const cacheKey = `sellerDash_${uid}`;
        const cached = cache.get(cacheKey);
        if (cached) return res.status(200).json({ success: true, dashboard: cached });

        const [sellerSnap, userSnap, productsSnap, allOrdersSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get(),
            db.collection("users").doc(uid).get(),
            db.collection("products").where("sellerId", "==", uid).limit(50).get(),
            db.collection("orders").where("sellerId", "==", uid).limit(50).get()
        ]);

        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller not found" });
        const sellerData = sellerSnap.data();
        const userData = userSnap.data();
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

        const dashboard = {
            shopName: sellerData.shopName,
            totalSales,
            productsCount: products.length,
            newOrdersCount,
            pendingOrdersCount,
            recentOrders: sellerOrders.slice(0, 5),
            products: products.slice(0, 10)
        };

        cache.set(cacheKey, dashboard, SELLER_DASH_TTL);
        return res.status(200).json({ success: true, dashboard });
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

        // Invalidate relevant caches
        cache.invalidate(`sellerDash_${sellerId}`);
        cache.invalidate('adminStats', 'allSellers');
        cache.invalidatePrefix('products_');

        return res.status(200).json({ success: true, message: "Product added", productId: docRef.id });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to add product" });
    }
};

module.exports = { getDashboardData, addProduct };
