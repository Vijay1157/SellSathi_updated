'use strict';
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyAuth } = require('../../../middleware/auth');

const upload = require('../../../middleware/upload');

router.post('/login', authController.login);
router.post('/register', authController.register);
router.post('/google-login', authController.googleLogin);
router.post('/apply-seller', verifyAuth, authController.applySeller);
router.post('/extract-aadhar', verifyAuth, upload.single('aadharImage'), authController.extractAadhar);
router.post('/upload-image', verifyAuth, upload.single('image'), authController.uploadImage);

module.exports = router;
