'use strict';
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAuth, verifyAdmin } = require('../../../middleware/auth');

router.use(verifyAuth);
router.use(verifyAdmin);

router.get('/stats', adminController.getStats);
router.get('/sellers', adminController.getPendingSellers);
router.get('/all-sellers', adminController.getAllSellers);
router.get('/products', adminController.getAllProducts);
router.get('/orders', adminController.getAllOrders);
router.get('/reviews', adminController.getAllReviews);
router.get('/seller-analytics', adminController.getSellerAnalytics);
router.post('/seller/:uid/approve', adminController.approveSeller);
router.post('/seller/:uid/reject', adminController.rejectSeller);
router.post('/seller/:uid/block', adminController.blockSeller);
router.delete('/review/:id', adminController.deleteReview);

module.exports = router;
