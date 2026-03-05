'use strict';
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { verifyAuth } = require('../../../middleware/auth');

router.post('/', verifyAuth, reviewController.submitReview);
router.get('/product/:productId', reviewController.getProductReviews);

router.get('/check-eligibility/:productId', verifyAuth, reviewController.checkEligibility);

module.exports = router;
