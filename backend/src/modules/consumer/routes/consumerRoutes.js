'use strict';
const express = require('express');
const router = express.Router();
const consumerController = require('../controllers/consumerController');
const { verifyAuth } = require('../../../middleware/auth');

router.use(verifyAuth);

router.get('/:uid/cart', consumerController.getCart);
router.post('/:uid/cart', consumerController.updateCart);
router.get('/:uid/addresses', consumerController.getAddresses);
router.post('/:uid/address', consumerController.saveAddress);

module.exports = router;
