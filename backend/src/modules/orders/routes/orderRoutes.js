'use strict';
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyAuth } = require('../../../middleware/auth');

router.use(verifyAuth);

router.post('/place', orderController.placeOrder);
router.get('/user/:uid', orderController.getUserOrders);
router.get('/:orderId', orderController.getOrderById);

module.exports = router;
