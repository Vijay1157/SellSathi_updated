'use strict';
const paths = [
    './modules/auth/routes/authRoutes',
    './modules/admin/routes/adminRoutes',
    './modules/seller/routes/sellerRoutes',
    './modules/products/routes/productRoutes',
    './modules/orders/routes/orderRoutes',
    './modules/consumer/routes/consumerRoutes',
    './modules/payment/routes/paymentRoutes',
    './modules/reviews/routes/reviewRoutes',
    './modules/shipping/routes/shippingRoutes'
];

paths.forEach(p => {
    try {
        require(p);
        console.log(`✅ OK: ${p}`);
    } catch (e) {
        console.error(`❌ FAIL: ${p}\n   Error: ${e.message}\n   Stack: ${e.stack}`);
    }
});
