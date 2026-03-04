'use strict';
const multer = require('multer');

/**
 * Multer configuration for memory storage.
 * Standardizes file uploads across the application.
 */
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = upload;
