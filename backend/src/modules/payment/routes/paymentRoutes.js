'use strict';
const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { verifyAuth } = require('../../../middleware/auth');

router.post('/create-order', verifyAuth, paymentController.createOrder);
router.post('/verify', paymentController.verifyPayment);
router.post('/cod-order', verifyAuth, paymentController.codOrder);

module.exports = router;
