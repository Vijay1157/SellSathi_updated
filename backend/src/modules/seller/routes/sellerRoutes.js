'use strict';
const express = require('express');
const router = express.Router();
const sellerController = require('../controllers/sellerController');
const { verifyAuth } = require('../../../middleware/auth');

router.use(verifyAuth);

router.get('/:uid/dashboard-data', sellerController.getDashboardData);
router.post('/product/add', sellerController.addProduct);

module.exports = router;
