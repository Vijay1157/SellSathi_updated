'use strict';
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const pdfController = require('../controllers/pdfController');
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
router.get('/seller/:uid/bank-details', adminController.getSellerBankDetails);
router.get('/seller/:uid/analytics-pdf', pdfController.generateAnalyticsPDF);
router.get('/seller/:uid/pdf', pdfController.generateInvoicePDF);
router.post('/seller/:uid/approve', adminController.approveSeller);
router.post('/seller/:uid/reject', adminController.rejectSeller);
router.post('/seller/:uid/accept-rejected', adminController.acceptRejectedSeller);
router.post('/seller/:uid/block', adminController.blockSeller);
router.post('/seller/:uid/unblock', adminController.unblockSeller);
router.delete('/seller/:uid', adminController.deleteSeller);
router.delete('/blocked-sellers/all', adminController.deleteAllBlockedSellers);
router.delete('/rejected-sellers/all', adminController.deleteAllRejectedSellers);
router.delete('/review/:reviewId', adminController.deleteReview);

module.exports = router;
