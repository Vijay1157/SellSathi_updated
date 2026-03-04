'use strict';
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyAuth, verifyAdmin } = require('../../../middleware/auth');

router.use(verifyAuth);
router.use(verifyAdmin);

router.get('/stats', adminController.getStats);
router.get('/all-sellers', adminController.getAllSellers);
router.post('/seller/:uid/approve', adminController.approveSeller);
router.post('/seller/:uid/reject', adminController.rejectSeller);

module.exports = router;
