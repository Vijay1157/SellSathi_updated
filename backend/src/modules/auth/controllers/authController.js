'use strict';
const { admin, db } = require('../../../config/firebase');

/**
 * Handles user login (Firebase Token or Test Mode).
 */
const login = async (req, res) => {
    try {
        const { idToken, isTest, email: testEmail } = req.body;

        let uid;
        let phoneNumber = null;
        let email = null;
        let fullName = null;

        if (isTest) {
            uid = `test_email_${(testEmail || "user").replace(/[^a-zA-Z0-9]/g, '')}`;
            email = testEmail;
            fullName = testEmail?.split('@')[0] || "Test User";
        } else {
            if (!idToken) return res.status(400).json({ success: false, message: "ID token is required" });
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
            phoneNumber = decodedToken.phone_number || null;
            email = decodedToken.email || null;
            fullName = decodedToken.name || null;
        }

        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            await userRef.set({
                uid,
                phone: phoneNumber,
                email,
                fullName,
                role: "CONSUMER",
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({
                success: true, uid, role: "CONSUMER", fullName, status: "NEW_USER",
                message: "New user created as CONSUMER",
            });
        }

        const userData = userSnap.data();
        if (userData.isActive === false) {
            return res.status(403).json({ success: false, role: userData.role, message: "Account is disabled. Contact support." });
        }

        const ADMIN_PHONE = "+917483743936";
        if (userData.role === "ADMIN" || phoneNumber === ADMIN_PHONE) {
            if (phoneNumber === ADMIN_PHONE) {
                if (userData.role !== "ADMIN") try { await userRef.update({ role: "ADMIN" }); } catch (e) { }
                return res.status(200).json({
                    success: true, uid, role: "ADMIN", status: "AUTHORIZED",
                    phone: phoneNumber, fullName: userData.fullName || "Admin User",
                    message: "Admin login successful"
                });
            }
        }

        const sellerSnap = await db.collection("sellers").doc(uid).get();
        if (sellerSnap.exists) {
            const sellerData = sellerSnap.data();
            const sellerStatus = sellerData.sellerStatus || "PENDING";

            if (sellerStatus === "APPROVED") {
                if (userData.role !== "SELLER") try { await userRef.update({ role: "SELLER" }); } catch (_) { }
                return res.status(200).json({ success: true, uid, role: "SELLER", status: "APPROVED", sellerStatus: "APPROVED", shopName: sellerData.shopName, message: "Seller login successful" });
            }

            // Pending or Rejected should remain CONSUMER
            if (userData.role !== "CONSUMER") try { await userRef.update({ role: "CONSUMER" }); } catch (_) { }

            if (sellerStatus === "REJECTED") return res.status(403).json({ success: false, uid, role: "CONSUMER", status: "REJECTED", message: "Your seller application was rejected." });
            return res.status(200).json({ success: true, uid, role: "CONSUMER", status: "PENDING", sellerStatus: "PENDING", shopName: sellerData.shopName, message: "Seller approval pending" });
        }

        return res.status(200).json({ success: true, uid, role: "CONSUMER", status: "AUTHORIZED", fullName: userData.fullName || fullName, message: "Consumer login successful" });

    } catch (error) {
        console.error("AUTH ERROR:", error);
        if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
            return res.status(503).json({ success: false, quotaExceeded: true, message: "Quota Exceeded." });
        }
        return res.status(401).json({ success: false, message: "Authentication failed" });
    }
};

/**
 * Handles user registration.
 */
const register = async (req, res) => {
    try {
        const { idToken, phone, fullName, email, password, isTest, otp } = req.body;
        let uid;
        let phoneNumber = phone;

        if (isTest) {
            uid = phone ? `test_${phone.replace(/[^0-9]/g, '')}` : `test_email_${Date.now()}`;
        } else {
            if (!idToken) return res.status(400).json({ success: false, message: "ID token is required" });
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
            phoneNumber = decodedToken.phone_number || phone;
        }

        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        const userData = {
            uid, phone: phoneNumber || null, fullName: fullName || "User",
            email: email || null, password: password || null, role: "CONSUMER",
            isActive: true, createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (userSnap.exists) {
            const updates = { updatedAt: admin.firestore.FieldValue.serverTimestamp() };
            if (fullName) updates.fullName = fullName;
            if (email) updates.email = email;
            if (password) updates.password = password;
            await userRef.update(updates);
        } else {
            await userRef.set(userData);
        }

        return res.status(200).json({ success: true, uid, role: "CONSUMER", status: "REGISTERED", fullName: fullName || "User", message: "Registration successful" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Registration failed: " + error.message });
    }
};

/**
 * Handles seller application.
 */
const applySeller = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const logFile = path.join(__dirname, '../../../../debug-gemini.log');

    const logLocal = (msg) => {
        const line = `[${new Date().toISOString()}] [applySeller] ${msg}\n`;
        fs.appendFileSync(logFile, line);
        console.log(`[applySeller] ${msg}`);
    };

    try {
        const { sellerDetails } = req.body;
        const uid = req.user?.uid;

        logLocal(`Request received for UID: ${uid}`);

        if (!uid) {
            logLocal(`ERROR: UID is missing from request`);
            return res.status(401).json({ success: false, message: "Unauthorized: Missing identity" });
        }

        if (!sellerDetails?.shopName || !sellerDetails?.category || !sellerDetails?.address) {
            logLocal(`ERROR: Missing required fields in sellerDetails`);
            return res.status(400).json({ success: false, message: "Missing required details" });
        }

        const userRef = db.collection("users").doc(uid);
        logLocal(`Fetching user document for: ${uid}`);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            logLocal(`ERROR: User not found in DB`);
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const userData = userSnap.data();
        if (userData.role === "SELLER") {
            logLocal(`ERROR: User is already a SELLER`);
            return res.status(400).json({ success: false, message: "Already a seller" });
        }

        const sellerRef = db.collection("sellers").doc(uid);

        // Scrub undefined values to prevent Firestore errors
        const finalData = JSON.parse(JSON.stringify(sellerDetails));

        logLocal(`Storing seller data in DB...`);
        await sellerRef.set({
            uid, ...finalData,
            sellerStatus: "PENDING",
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        logLocal(`Updating user document...`);
        await userRef.update({ updatedAt: admin.firestore.FieldValue.serverTimestamp() });

        logLocal(`SUCCESS: Application stored for UID: ${uid}`);
        return res.status(200).json({ success: true, uid, message: "Applied successfully", status: "PENDING" });

    } catch (error) {
        logLocal(`CRITICAL ERROR: ${error.message}`);
        console.error("[applySeller] FULL ERROR:", error);

        // Specific check for Firestore Quota
        const isQuota = error.code === 8 || error.code === 4 || error.message?.includes('RESOURCE_EXHAUSTED') || error.message?.includes('Quota exceeded');

        if (isQuota) {
            logLocal("ALERT: Firestore Quota Exceeded detected!");
            return res.status(503).json({
                success: false,
                message: "Database capacity reached. Please try again after 24 hours (Daily Quota).",
                isQuotaError: true
            });
        }

        return res.status(500).json({
            success: false,
            message: "Application failed",
            error: error.message
        });
    }
};

/**
 * Extract identity data from Aadhaar card image using AI.
 */
const extractAadhar = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No image file provided" });

        const geminiService = require('../../../shared/services/geminiService');
        const cloudinary = require('../../../config/cloudinary');
        const { Readable } = require('stream');

        // AI Extraction
        const extractedData = await geminiService.extractAadhaarData(req.file.buffer, req.file.mimetype);
        console.log("[ExtractAadhar] Raw Data from Gemini:", JSON.stringify(extractedData, null, 2));

        // Upload to Cloudinary
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: 'aadhaar_cards' },
                (error, result) => error ? reject(error) : resolve(result)
            );
            Readable.from([req.file.buffer]).pipe(uploadStream);
        });

        // Calculate age from DOB if present
        let age = "";
        if (extractedData.dob && typeof extractedData.dob === 'string') {
            const parts = extractedData.dob.split('/');
            const dobYear = parts.length > 0 ? parts.pop() : null;
            if (dobYear && dobYear.length === 4 && !isNaN(dobYear)) {
                const currentYear = new Date().getFullYear();
                age = String(currentYear - parseInt(dobYear));
            }
        }

        const responseData = {
            name: extractedData.name || "",
            aadharNumber: extractedData.aadhaar_no ? String(extractedData.aadhaar_no).replace(/\D/g, '') : "",
            age: age || "",
            phone: extractedData.phone ? String(extractedData.phone).replace(/\D/g, '') : "",
            address: extractedData.address || "",
            pincode: extractedData.pincode || "",
            imageUrl: uploadResult.secure_url
        };

        console.log("[ExtractAadhar] Mapped Response Data:", JSON.stringify(responseData, null, 2));

        return res.status(200).json({
            success: true,
            data: responseData
        });
    } catch (error) {
        console.error("[ExtractAadhar] ERROR:", error.message || error);

        if (error.isQuotaError) {
            return res.status(429).json({ success: false, message: error.message });
        }

        return res.status(500).json({ success: false, message: "Aadhaar processing failed" });
    }
};

/**
 * Upload a generic image to Cloudinary.
 */
const uploadImage = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No image provided" });
        const cloudinary = require('../../../config/cloudinary');
        const { Readable } = require('stream');

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "general" },
                (error, result) => error ? reject(error) : resolve(result)
            );
            Readable.from([req.file.buffer]).pipe(uploadStream);
        });

        return res.status(200).json({ success: true, url: result.secure_url });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Upload failed" });
    }
};

/**
 * Handles Google OAuth login.
 */
const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        // Validate input
        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "ID token is required"
            });
        }

        // Verify token with Firebase
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (verifyError) {
            console.error("[GoogleAuth] Token verification failed:", {
                error: verifyError.message,
                code: verifyError.code,
                timestamp: new Date().toISOString()
                // Note: Not logging token for security
            });
            return res.status(401).json({
                success: false,
                message: "Invalid or expired token"
            });
        }

        const { uid, email, name, picture } = decodedToken;

        // Validate required fields
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email not provided by Google"
            });
        }

        // Check if user exists
        const userRef = db.collection("users").doc(uid);
        let userSnap;
        try {
            userSnap = await userRef.get();
        } catch (queryError) {
            console.error("[GoogleAuth] Firestore user query failed:", {
                error: queryError.message,
                code: queryError.code,
                uid: uid.substring(0, 8) + "...", // Log partial uid for debugging
                timestamp: new Date().toISOString()
            });
            return res.status(500).json({
                success: false,
                message: "Authentication failed. Please try again."
            });
        }

        if (userSnap.exists) {
            // Existing user login
            const userData = userSnap.data();

            // Check if account is active
            if (userData.isActive === false) {
                return res.status(403).json({
                    success: false,
                    role: userData.role,
                    message: "Account is disabled. Contact support."
                });
            }

            // Check for seller status
            let sellerSnap;
            try {
                sellerSnap = await db.collection("sellers").doc(uid).get();
            } catch (sellerQueryError) {
                console.error("[GoogleAuth] Firestore seller query failed:", {
                    error: sellerQueryError.message,
                    code: sellerQueryError.code,
                    uid: uid.substring(0, 8) + "...",
                    timestamp: new Date().toISOString()
                });
                return res.status(500).json({
                    success: false,
                    message: "Authentication failed. Please try again."
                });
            }
            if (sellerSnap.exists) {
                const sellerData = sellerSnap.data();
                const sellerStatus = sellerData.sellerStatus || "PENDING";

                if (sellerStatus === "APPROVED") {
                    // Update role to SELLER if approved
                    if (userData.role !== "SELLER") {
                        try {
                            await userRef.update({ role: "SELLER" });
                        } catch (updateError) {
                            console.error("[GoogleAuth] Firestore role update failed", updateError);
                        }
                    }
                    return res.status(200).json({
                        success: true,
                        uid,
                        role: "SELLER",
                        status: "APPROVED",
                        sellerStatus: "APPROVED",
                        shopName: sellerData.shopName,
                        fullName: userData.fullName || name,
                        email,
                        message: "Seller login successful"
                    });
                } else {
                    // Pending or Rejected should remain CONSUMER
                    if (userData.role !== "CONSUMER") {
                        try { await userRef.update({ role: "CONSUMER" }); } catch (_) { }
                    }

                    if (sellerStatus === "REJECTED") {
                        return res.status(403).json({
                            success: false,
                            uid,
                            role: "CONSUMER",
                            status: "REJECTED",
                            message: "Your seller application was rejected."
                        });
                    } else {
                        return res.status(200).json({
                            success: true,
                            uid,
                            role: "CONSUMER",
                            status: "PENDING",
                            sellerStatus: "PENDING",
                            shopName: sellerData.shopName,
                            fullName: userData.fullName || name,
                            email,
                            message: "Seller approval pending"
                        });
                    }
                }
            }

            // Check for admin role
            if (userData.role === "ADMIN") {
                return res.status(200).json({
                    success: true,
                    uid,
                    role: "ADMIN",
                    status: "AUTHORIZED",
                    fullName: userData.fullName || name,
                    email,
                    message: "Admin login successful"
                });
            }

            // Regular consumer login
            return res.status(200).json({
                success: true,
                uid,
                role: "CONSUMER",
                status: "AUTHORIZED",
                fullName: userData.fullName || name,
                email,
                message: "Consumer login successful"
            });

        } else {
            // New user - create account
            const newUserData = {
                uid,
                email,
                fullName: name || email.split('@')[0],
                photoURL: picture || null,
                role: "CONSUMER",
                isActive: true,
                authProvider: "google",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            };

            try {
                await userRef.set(newUserData);
            } catch (writeError) {
                console.error("[GoogleAuth] Firestore user creation failed:", {
                    error: writeError.message,
                    code: writeError.code,
                    uid: uid.substring(0, 8) + "...",
                    timestamp: new Date().toISOString()
                });
                return res.status(500).json({
                    success: false,
                    message: "Authentication failed. Please try again."
                });
            }

            return res.status(200).json({
                success: true,
                uid,
                role: "CONSUMER",
                status: "NEW_USER",
                fullName: newUserData.fullName,
                email,
                message: "New user created as CONSUMER"
            });
        }

    } catch (error) {
        console.error("[GoogleAuth] Unexpected error:", {
            error: error.message,
            code: error.code,
            stack: error.stack?.split('\n')[0], // Log only first line of stack
            timestamp: new Date().toISOString()
        });

        // Handle quota exceeded errors
        if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
            return res.status(503).json({
                success: false,
                quotaExceeded: true,
                message: "Service temporarily unavailable. Please try again later."
            });
        }

        return res.status(500).json({
            success: false,
            message: "Authentication failed. Please try again."
        });
    }
};

module.exports = { login, register, applySeller, extractAadhar, uploadImage, googleLogin };

