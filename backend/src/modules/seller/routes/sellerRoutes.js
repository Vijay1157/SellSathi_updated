'use strict';
const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { verifyAuth } = require('../../../middleware/auth');

router.get('/:uid/public-profile', sellerController.getPublicProfile);

// Protected routes below
router.use(verifyAuth);

router.get('/:uid/dashboard-data', sellerController.getDashboardData);
router.post('/product/add', sellerController.addProduct);
router.post('/pickup-address', sellerController.createPickupAddress);

module.exports = router;
