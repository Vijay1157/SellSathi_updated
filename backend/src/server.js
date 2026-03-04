'use strict';
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// Module Routes
const authRoutes = require('./modules/auth/routes/authRoutes');
const adminRoutes = require('./modules/admin/routes/adminRoutes');
const sellerRoutes = require('./modules/seller/routes/sellerRoutes');
const productRoutes = require('./modules/products/routes/productRoutes');
const orderRoutes = require('./modules/orders/routes/orderRoutes');
const consumerRoutes = require('./modules/consumer/routes/consumerRoutes');
const paymentRoutes = require('./modules/payment/routes/paymentRoutes');
const reviewRoutes = require('./modules/reviews/routes/reviewRoutes');
const shippingRoutes = require('./modules/shipping/routes/shippingRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Domain Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/seller', sellerRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);
app.use('/consumer', consumerRoutes);
app.use('/payment', paymentRoutes);
app.use('/reviews', reviewRoutes);
app.use('/webhook', shippingRoutes); // Unified webhook path

// Health Check
app.get('/health', (req, res) => res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() }));

// Error Handling
app.use((err, req, res, next) => {
    console.error(`[SERVER ERROR] ${err.stack}`);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`SellSathi Backend (Modular) running on port ${PORT}`);
    console.log(`Mode: ${process.env.NODE_ENV || 'development'}`);
});
