const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

process.on('uncaughtException', (err) => {
    console.error('🔥 UNCAUGHT EXCEPTION:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 UNHANDLED REJECTION at:', promise, 'reason:', reason);
});

const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require('cloudinary').v2;
const { Readable } = require("stream");

// Environment flags
const IS_DEV = process.env.NODE_ENV !== 'production';
const ADMIN_PHONE = "+917483743936";
const ALLOW_TEST_UID = IS_DEV || process.env.ALLOW_TEST_UID === 'true';

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
console.log(`☁️  Cloudinary configured: cloud_name=${process.env.CLOUDINARY_CLOUD_NAME}, api_key=${(process.env.CLOUDINARY_API_KEY || '').substring(0, 4)}...`);

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { sendEmail, emailTemplates } = require("./emailService");

const app = express();
console.log("🚀 AUTH SERVICE VERSION 2.8 - QUOTA OPTIMIZED");
app.use(cors({
    origin: IS_DEV ? true : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(bodyParser.json());

const __registeredRoutes = [];
for (const method of ["get", "post", "put", "delete", "patch"]) {
    const orig = app[method].bind(app);
    app[method] = (routePath, ...handlers) => {
        __registeredRoutes.push({
            method: method.toUpperCase(),
            path: routePath,
        });
        return orig(routePath, ...handlers);
    };
}

app.get("/health", (req, res) => {
    return res.status(200).json({
        success: true,
        service: "auth",
        version: "2.8",
        port: PORT || 5000
    });
});

app.get("/__routes", (req, res) => {
    if (!IS_DEV) return res.status(404).json({ success: false, message: "Not found" });
    try {
        return res.status(200).json({
            success: true,
            routes: __registeredRoutes
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

app.get("/debug/headers", (req, res) => {
    if (!IS_DEV) return res.status(404).json({ success: false, message: "Not found" });
    return res.status(200).json({
        success: true,
        headers: {
            authorization: req.headers.authorization || null,
            xTestUid: req.headers["x-test-uid"] || null,
        }
    });
});

admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")),
    storageBucket: "sellsathi-94ede.firebasestorage.app"
});

const db = admin.firestore();

// ── Admin UID: fetched ONCE at startup from Firebase Auth (not Firestore) ─────
// Stored in memory for the lifetime of the process. No Firestore quota used.
let _adminUID = null;
admin.auth().getUserByPhoneNumber(ADMIN_PHONE)
    .then(user => {
        _adminUID = user.uid;
        console.log(`✅ Admin UID initialized: ${_adminUID.substring(0, 8)}...`);
    })
    .catch(err => {
        console.warn(`⚠️  Admin UID pre-fetch failed (admin may not have registered yet): ${err.message}`);
    });

// Gemini Configuration
const GEMINI_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_KEY || GEMINI_KEY === 'your_gemini_api_key_here') {
    console.warn("⚠️  WARNING: GEMINI_API_KEY is not set correctly in services/.env. Extraction will fail.");
    console.log("Current keys in process.env:", Object.keys(process.env).filter(k => k.includes("API")));
} else {
    console.log("✅ GEMINI_API_KEY loaded successfully:", GEMINI_KEY.substring(0, 5) + "..." + GEMINI_KEY.substring(GEMINI_KEY.length - 4));
}
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

// Multer Setup for Memory Storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed!'), false);
        }
    }
});

// TEST CREDENTIALS - For development/testing purposes only
const TEST_CREDENTIALS = {
    '+917483743936': { otp: '123456', role: 'ADMIN' },
    '+919876543210': { otp: '123456', role: 'CONSUMER' },
    '+919353469036': { otp: '741852', role: 'SELLER' },
};

// ── Test-user cache: avoids repeated Firestore reads for X-Test-UID requests ──
// Key: uid string, Value: { userData: object, expiresAt: number }
// TTL = 1 hour. Cleared on server restart.
const _testUserCache = new Map();
const TEST_USER_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Verifies user identity via one of two methods:
 * 1. Firebase ID token from Authorization: Bearer <token> header (production + dev)
 * 2. X-Test-UID header for test/dev mode only (completely disabled in production)
 *
 * Attaches user info to req.user on success.
 */
const verifyAuth = async (req, res, next) => {
    try {
        // DEV-ONLY: Allow test UID bypass (disabled in production)
        const testUid = req.headers["x-test-uid"];
        if (ALLOW_TEST_UID && testUid) {

            // Check in-memory cache first — avoids Firestore reads when quota is low
            const cached = _testUserCache.get(testUid);
            if (cached && cached.expiresAt > Date.now()) {
                req.user = {
                    uid: testUid,
                    phone_number: cached.userData.phone || null,
                    role: cached.userData.role,
                    isTestMode: true,
                };
                return next();
            }

            // Cache miss — read Firestore once, then cache the result
            const userSnap = await db.collection("users").doc(testUid).get();
            if (!userSnap.exists) {
                return res.status(401).json({
                    success: false,
                    message: "Test user not found in database",
                });
            }
            const userData = userSnap.data();

            // Cache the result so next request skips Firestore
            _testUserCache.set(testUid, { userData, expiresAt: Date.now() + TEST_USER_CACHE_TTL_MS });

            req.user = {
                uid: testUid,
                phone_number: userData.phone || null,
                role: userData.role,
                isTestMode: true,
            };
            return next();
        }

        // STANDARD: Firebase Bearer token verification
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authorization header with Bearer token is required",
            });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error.message);
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};

app.get("/debug/whoami", verifyAuth, async (req, res) => {
    try {
        const uid = req.user?.uid;
        let dbUser = null;

        if (uid) {
            const snap = await db.collection("users").doc(uid).get();
            dbUser = snap.exists ? snap.data() : null;
        }

        return res.status(200).json({
            success: true,
            reqUser: req.user,
            dbUser,
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

app.get("/debug/session", (req, res) => {
    if (!IS_DEV) return res.status(404).json({ success: false, message: "Not found" });
    res.json({
        headers: req.headers,
        env: {
            NODE_ENV: process.env.NODE_ENV,
            ALLOW_TEST_UID: ALLOW_TEST_UID
        }
    });
});

// ── Promise-coalescing admin role cache ───────────────────────────────────────
// Handles the concurrent-request race condition where 6 simultaneous dashboard
// calls all miss an empty cache at once and would each fire a Firestore read.
// By storing the in-flight Promise itself, all concurrent requests await the
// SAME single Firestore read. Result: exactly 1 read per cache-miss cycle.
//
// cache entry: { promise: Promise<bool> }  — while in flight
//           OR { isAdmin: bool, expiresAt: number } — after resolved
const _adminRoleCache = new Map();
const ADMIN_ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function _checkIsAdmin(uid) {
    const entry = _adminRoleCache.get(uid);

    // Resolved entry still fresh → return immediately
    if (entry && entry.isAdmin !== undefined && entry.expiresAt > Date.now()) {
        return Promise.resolve(entry.isAdmin);
    }

    // In-flight promise exists → join it (NO second Firestore read)
    if (entry && entry.promise) {
        return entry.promise;
    }

    // Cache miss → fire ONE Firestore read, store the Promise immediately
    const promise = db.collection("users").doc(uid).get()
        .then(snap => {
            const isAdmin = snap.exists && snap.data().role === "ADMIN";
            // Replace promise entry with resolved result
            _adminRoleCache.set(uid, { isAdmin, expiresAt: Date.now() + ADMIN_ROLE_CACHE_TTL });
            console.log(`[verifyAdmin] Firestore resolved — UID ${uid.substring(0, 8)} isAdmin=${isAdmin}`);
            return isAdmin;
        })
        .catch(err => {
            // On error, remove so next request can retry
            _adminRoleCache.delete(uid);
            throw err;
        });

    // Store promise BEFORE any await so concurrent callers reuse it
    _adminRoleCache.set(uid, { promise });
    return promise;
}

/**
 * verifyAdmin middleware.
 *
 * For test mode (X-Test-UID):   reads req.user.role set by verifyAuth — 0 extra reads.
 * For real Firebase token:       uses _checkIsAdmin() which coalesces concurrent
 *                                requests into a single Firestore read, then caches
 *                                the result for 5 minutes.
 *
 * Must be used AFTER verifyAuth middleware.
 */
const verifyAdmin = async (req, res, next) => {
    const uid = req.user.uid;
    const isTestMode = req.user.isTestMode || false;

    try {
        // ── TEST MODE: role already attached by verifyAuth ─────────────────────
        if (isTestMode) {
            const role = req.user.role || null;
            if (role === "ADMIN") {
                console.log(`[verifyAdmin] ✅ TestMode ADMIN — ${uid}`);
                return next();
            }
            console.warn(`[verifyAdmin] DENIED TestMode — role="${role}" for ${uid}`);
            return res.status(403).json({ success: false, message: `Admin access denied: role is ${role}`, code: "NOT_ADMIN" });
        }

        // ── REAL FIREBASE TOKEN: promise-coalesced Firestore role check ─────────
        const isAdmin = await _checkIsAdmin(uid);
        if (isAdmin) {
            console.log(`[verifyAdmin] ✅ Firestore ADMIN — ${uid.substring(0, 8)}...`);
            return next();
        }
        console.warn(`[verifyAdmin] DENIED — ${uid.substring(0, 8)} not ADMIN in Firestore`);
        return res.status(403).json({ success: false, message: "Admin access denied", code: "NOT_ADMIN" });

    } catch (err) {
        console.error("[verifyAdmin] ERROR:", err.message);
        return res.status(403).json({ success: false, message: "Admin verification failed: " + err.message, code: "VERIFY_ERROR" });
    }
};

// ========== UTILITY HELPERS ==========

/**
 * Safely converts a Firestore Timestamp or any date-like value to an ISO date string.
 * Returns today's date as fallback if the value is null/undefined.
 */
const safeToDateString = (val) => {
    try {
        if (!val) return new Date().toISOString().split("T")[0];
        if (val.toDate) return val.toDate().toISOString().split("T")[0];
        if (val instanceof Date) return val.toISOString().split("T")[0];
        return new Date(val).toISOString().split("T")[0];
    } catch {
        return new Date().toISOString().split("T")[0];
    }
};


// Endpoint for marketplace products (combines products and listedproduct)
app.get("/marketplace/products", async (req, res) => {
    console.log("Fetching marketplace products...");
    try {
        // Remove orderBy because documents without createdAt are omitted by Firestore
        const productsSnap = await db.collection("products").get();

        const products = productsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            name: doc.data().title || doc.data().name,
            imageUrl: doc.data().image || doc.data().imageUrl,
            price: Number(doc.data().price) // Ensure price is a number
        }));

        // Sort in memory to include products without timestamps
        const sortedProducts = products.sort((a, b) => {
            const getTime = (val) => {
                if (!val) return 0;
                if (val.toDate) return val.toDate().getTime(); // Firestore Timestamp
                if (val instanceof Date) return val.getTime(); // JS Date
                if (typeof val === 'number') return val; // Raw number/timestamp
                return new Date(val).getTime(); // Try to parse anything else
            };
            return getTime(b.createdAt) - getTime(a.createdAt);
        });

        return res.status(200).json({
            success: true,
            products: sortedProducts
        });
    } catch (error) {
        console.error("MARKETPLACE PRODUCTS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch products" });
    }
});

// ============================================================
// POST /seller/upload-image — Upload product image to Cloudinary
// ============================================================
app.post("/seller/upload-image", upload.single('image'), async (req, res) => {
    console.log("📸 Product image upload request received");

    if (!req.file) {
        return res.status(400).json({ success: false, message: "No image file provided" });
    }

    try {
        const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: 'sellsathi/products',
                    resource_type: 'image',
                    transformation: [
                        { width: 1200, height: 1200, crop: 'limit' },
                        { quality: 'auto:good' },
                        { fetch_format: 'auto' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );
            Readable.from([req.file.buffer]).pipe(uploadStream);
        });

        console.log("✅ Product image uploaded:", uploadResult.secure_url);
        return res.status(200).json({
            success: true,
            url: uploadResult.secure_url,
            publicId: uploadResult.public_id
        });
    } catch (error) {
        console.error("❌ Product image upload error:", error);
        return res.status(500).json({
            success: false,
            message: "Image upload failed: " + error.message
        });
    }
});

app.post("/auth/login", async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "ID token is required",
            });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const phoneNumber = decodedToken.phone_number || null;


        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        const normalizePhone = (val) => {
            if (!val) return "";
            const digits = String(val).replace(/\D/g, "");
            return digits.length > 10 ? digits.slice(-10) : digits;
        };

        if (!userSnap.exists) {
            const isAdminPhone = normalizePhone(phoneNumber) === normalizePhone(ADMIN_PHONE);
            const initialRole = isAdminPhone ? "ADMIN" : "CONSUMER";

            await userRef.set({
                uid,
                phone: phoneNumber,
                role: initialRole,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({
                success: true,
                uid,
                role: initialRole,
                status: isAdminPhone ? "AUTHORIZED" : "NEW_USER",
                message: `New user created as ${initialRole}`,
            });
        }
        const userData = userSnap.data();

        if (userData.isActive === false) {
            return res.status(403).json({
                success: false,
                role: userData.role,
                message: "Account is disabled. Contact support.",
            });
        }

        let userRole = userData.role;

        // STRICT SECURITY CHECK: Only the designated phone number can be ADMIN
        // DEV FIX: Ensure test-login admin always has Firestore role=ADMIN for verifyAdmin checks.
        if (normalizePhone(phoneNumber) === normalizePhone(ADMIN_PHONE)) {
            await userRef.set({
                uid,
                phone: phoneNumber,
                role: "ADMIN",
                isActive: true,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });

            return res.status(200).json({
                success: true,
                uid,
                role: "ADMIN",
                status: "AUTHORIZED",
                message: "Admin login successful",
            });
        }

        // If DB claims ADMIN but phone isn't admin phone, downgrade response for safety
        if (userData.role === "ADMIN" && normalizePhone(phoneNumber) !== normalizePhone(ADMIN_PHONE)) {
            console.warn(`Security Alert: Non-admin phone ${phoneNumber} tried to login as ADMIN. Downgrading to CONSUMER.`);
            userRole = "CONSUMER";
        }

        if (userData.role === "SELLER") {
            const sellerRef = db.collection("sellers").doc(uid);
            const sellerSnap = await sellerRef.get();

            if (!sellerSnap.exists) {
                return res.status(403).json({
                    success: false,
                    role: "SELLER",
                    message: "Seller profile missing. Contact admin.",
                });
            }

            const sellerData = sellerSnap.data();

            if (sellerData.sellerStatus === "APPROVED") {
                return res.status(200).json({
                    success: true,
                    uid,
                    role: "SELLER",
                    status: "APPROVED",
                    message: "Seller login successful",
                });
            }

            if (sellerData.sellerStatus === "PENDING") {
                return res.status(200).json({
                    success: true,
                    uid,
                    role: "SELLER",
                    status: "PENDING",
                    message: "Seller approval pending",
                });
            }

            if (sellerData.sellerStatus === "REJECTED") {
                return res.status(200).json({
                    success: true,
                    uid,
                    role: "SELLER", // KEEP AS SELLER so they can see the rejection message on dashboard
                    status: "REJECTED",
                    message: "Seller request rejected",
                });
            }
        }

        return res.status(200).json({
            success: true,
            uid,
            role: "CONSUMER",
            status: "AUTHORIZED",
            message: "Consumer login successful",
        });

    } catch (error) {
        console.error("AUTH ERROR:", error);

        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
});


// Endpoint for seller application
app.post("/auth/apply-seller", async (req, res) => {
    console.log("HIT: /auth/apply-seller");
    try {
        const { idToken, sellerDetails } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "ID token is required",
            });
        }

        if (!sellerDetails || !sellerDetails.shopName || !sellerDetails.category || !sellerDetails.address) {
            console.warn("REJECTED: Missing fields in apply-seller", {
                shopName: sellerDetails?.shopName,
                category: sellerDetails?.category,
                address: sellerDetails?.address
            });
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${!sellerDetails.shopName ? 'Shop Name, ' : ''}${!sellerDetails.category ? 'Category, ' : ''}${!sellerDetails.address ? 'Address' : ''}`.replace(/, $/, ""),
            });
        }

        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Check if user exists
        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            return res.status(404).json({
                success: false,
                message: "User not found. Please login first.",
            });
        }

        const userData = userSnap.data();
        console.log(`[DEBUG] Registration attempt: UID=${uid}, Current Role from DB=${userData.role}`);

        // Check if user is already a seller
        if (userData.role === "SELLER") {
            const sellerRef = db.collection("sellers").doc(uid);
            const sellerSnap = await sellerRef.get();

            if (sellerSnap.exists) {
                const sellerData = sellerSnap.data();
                console.log(`[DEBUG] Apply-Seller MATCH: UID=${uid} | Role=${userData.role} | StatusChecked=${sellerData.sellerStatus}`);
                if (sellerData.sellerStatus === "APPROVED") {
                    return res.status(400).json({
                        success: false,
                        message: `Database Alert: Your account (UID: ${uid.substring(0, 5)}...) is already registered as an APPROVED SELLER. You cannot apply again while this role is active.`,
                    });
                }
                if (sellerData.sellerStatus === "PENDING") {
                    return res.status(400).json({
                        success: false,
                        message: `Application Alert: You already have a PENDING seller application (UID: ${uid.substring(0, 5)}...). Please wait for admin approval.`,
                    });
                }
                // If rejected, we allow re-application below
            } else {
                console.log(`[DEBUG] Role is SELLER but no document found in sellers collection for UID: ${uid}. Proceeding with application.`);
            }
        }

        // Check if user is admin
        if (userData.role === "ADMIN") {
            return res.status(400).json({
                success: false,
                message: "Admin cannot become a seller",
            });
        }

        // Create seller application in sellers collection
        const sellerRef = db.collection("sellers").doc(uid);
        await sellerRef.set({
            uid,
            phone: sellerDetails.phone,
            shopName: sellerDetails.shopName,
            category: sellerDetails.category,
            address: sellerDetails.address,
            gstNumber: sellerDetails.gstNumber || "",
            // Aadhaar Specific Data
            aadhaarNumber: sellerDetails.aadhaarNumber,
            age: sellerDetails.age,
            aadhaarImageUrl: sellerDetails.aadhaarImageUrl,
            extractedName: sellerDetails.extractedName,

            sellerStatus: "PENDING",
            appliedAt: admin.firestore.FieldValue.serverTimestamp(),
            approvedAt: null,
            rejectedAt: null,
        });

        // Update user role to SELLER but keep status as PENDING
        await userRef.update({
            role: "SELLER",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return res.status(200).json({
            success: true,
            uid,
            message: "Seller application submitted successfully. Awaiting admin approval.",
            status: "PENDING",
        });

    } catch (error) {
        console.error("SELLER APPLICATION ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to submit seller application",
        });
    }
});

// GET /auth/user-status/:uid - Check application status
app.get("/auth/user-status/:uid", async (req, res) => {
    try {
        const { uid } = req.params;
        const sellerRef = db.collection("sellers").doc(uid);
        const sellerSnap = await sellerRef.get();

        if (!sellerSnap.exists) {
            return res.status(200).json({ success: true, status: 'NONE' });
        }

        const sellerData = sellerSnap.data();
        console.log(`[DEBUG] User-Status check: UID=${uid} | StatusFound=${sellerData.sellerStatus}`);
        return res.status(200).json({
            success: true,
            status: sellerData.sellerStatus // 'PENDING', 'APPROVED', 'REJECTED'
        });
    } catch (error) {
        console.error("STATUS CHECK ERROR:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
});

app.post("/auth/extract-aadhar", upload.single("aadharImage"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        console.log(`Processing Aadhaar extraction... [Size: ${(req.file.size / 1024 / 1024).toFixed(2)} MB]`);

        // 1. Extract Data using Gemini - QUOTA OPTIMIZED (v2.8)
        const models = ["gemini-flash-latest", "gemini-2.0-flash"];
        let lastError = null;
        let extractedData = null;

        const tryModel = async (modelName) => {
            console.log(`[Gemini] Attempting ${modelName}...`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const prompt = `Strict JSON extraction from Aadhaar. Extract: name, aadhaar_no, dob, gender, address. Format: {"name": "...", "aadhaar_no": "...", "dob": "...", "gender": "...", "address": "..."}.`;

            const result = await model.generateContent([
                { text: prompt },
                {
                    inlineData: {
                        data: req.file.buffer.toString("base64"),
                        mimeType: req.file.mimetype
                    }
                }
            ]);

            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error("AI failed to produce valid JSON.");

            const data = JSON.parse(jsonMatch[0]);
            if (!data.name || !data.aadhaar_no) throw new Error("Key fields missing in AI response.");

            return data;
        };

        for (const modelName of models) {
            try {
                extractedData = await tryModel(modelName);
                if (extractedData) break;
            } catch (err) {
                console.warn(`[Gemini] Model ${modelName} failed:`, err.message);
                lastError = err;
                if (err.message.includes("429") || err.message.includes("quota")) {
                    console.error("🚨 API QUOTA EXCEEDED (429). User must wait.");
                    return res.status(429).json({
                        success: false,
                        message: "The Google AI service is currently busy (Free Tier Limit reached). Please wait 30 seconds and try again."
                    });
                }
            }
        }

        if (!extractedData) {
            const isAIError = lastError && (lastError.message.includes("GoogleGenerativeAI") || lastError.message.includes("fetch") || lastError.message.includes("404"));
            return res.status(isAIError ? 503 : 400).json({
                success: false,
                message: isAIError ? "AI Extraction service is currently unstable. Our engineers are notified." : "Extraction failed. Please ensure the photo is clear.",
                error: lastError ? lastError.message : "Models exhausted"
            });
        }

        // 2. Upload to Cloudinary (Aadhaar Image)
        const uploadToCloudinary = () => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "aadhaar_cards",
                        resource_type: "image",
                        public_id: `aadhaar_${Date.now()}` // Optional: custom ID
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                Readable.from([req.file.buffer]).pipe(uploadStream);
            });
        };

        let imageUrl = "";
        try {
            console.log("[Cloudinary] Uploading Aadhaar image...");
            const cloudResult = await uploadToCloudinary();
            imageUrl = cloudResult.secure_url;
            console.log(`[Cloudinary] Upload complete: ${imageUrl}`);
        } catch (uploadErr) {
            console.error("[Cloudinary] Upload failed:", uploadErr);
            return res.status(500).json({
                success: false,
                message: "Image upload failed. Please try again.",
                error: uploadErr.message || "Cloudinary Upload Error"
            });
        }

        // Calculate Age from DOB
        let age = "N/A";
        if (extractedData.dob) {
            const birthYear = parseInt(extractedData.dob.split('/').pop());
            const currentYear = new Date().getFullYear();
            if (!isNaN(birthYear) && birthYear > 1900 && birthYear < currentYear) {
                age = currentYear - birthYear;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                name: extractedData.name,
                aadhaarNumber: extractedData.aadhaar_no,
                age: age,
                address: extractedData.address,
                gender: extractedData.gender,
                imageUrl: imageUrl || "" // No placeholder needed if it fails
            }
        });

    } catch (error) {
        require('fs').appendFileSync('extraction_debug.log', `[${new Date().toISOString()}] ERROR: ${error.message}\n${error.stack}\n`);
        console.error("AADHAAR EXTRACTION ERROR:", error);

        let userMessage = "Failed to process Aadhaar card.";
        if (error.message && error.message.includes("does not exist")) {
            userMessage = "Storage configuration error: Bucket not found. Contact Admin.";
        } else if (error.message && error.message.includes("API key")) {
            userMessage = "AI Extraction service is temporarily unavailable (Invalid Key).";
        }

        return res.status(500).json({
            success: false,
            message: userMessage,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// New Endpoint: Generic Image Upload to Cloudinary (for Products, etc.)
app.post("/seller/upload-image", upload.single("image"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No image file provided" });
        }

        const uploadToCloudinary = () => {
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: "products", // Store in products folder
                        resource_type: "image"
                    },
                    (error, result) => {
                        if (error) return reject(error);
                        resolve(result);
                    }
                );
                Readable.from([req.file.buffer]).pipe(uploadStream);
            });
        };

        console.log("[Cloudinary] Uploading product image...");
        const result = await uploadToCloudinary();
        console.log(`[Cloudinary] Product image uploaded: ${result.secure_url}`);

        return res.status(200).json({
            success: true,
            url: result.secure_url,
            message: "Image uploaded successfully"
        });

    } catch (error) {
        console.error("UPLOAD ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Image upload failed: " + error.message
        });
    }
});

// TEST CREDENTIALS ENDPOINT - For development/testing purposes only
// This endpoint allows testing without Firebase phone auth
app.post("/auth/test-login", async (req, res) => {
    try {
        if (!IS_DEV) {
            return res.status(404).json({
                success: false,
                message: "Endpoint not available",
            });
        }

        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: "Phone and OTP are required",
            });
        }

        const phoneNumber = phone.startsWith('+91') ? phone : `+91${phone}`;

        // Check if this is a test credential
        if (!TEST_CREDENTIALS[phoneNumber]) {
            return res.status(401).json({
                success: false,
                message: "Invalid test credentials",
            });
        }

        const testCred = TEST_CREDENTIALS[phoneNumber];

        // Verify OTP
        if (otp !== testCred.otp) {
            return res.status(401).json({
                success: false,
                message: "Invalid OTP",
            });
        }

        // Generate a mock UID based on phone number
        const uid = `test_${phoneNumber.replace(/[^0-9]/g, '')}`;

        // Check if user exists in database
        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
            // Create test user with predefined role
            await userRef.set({
                uid,
                phone: phoneNumber,
                role: testCred.role,
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({
                success: true,
                uid,
                role: testCred.role,
                status: "NEW_USER",
                message: "Test user created successfully",
            });
        }

        const userData = userSnap.data();

        if (userData.isActive === false) {
            return res.status(403).json({
                success: false,
                message: "Account is disabled. Contact support.",
            });
        }

        let userRole = userData.role;

        // STRICT SECURITY CHECK: Only the designated phone number can be ADMIN
        if (userData.role === "ADMIN") {
            if (phoneNumber !== ADMIN_PHONE) {
                console.warn(`Security Alert: Non-admin phone ${phoneNumber} tried to login as ADMIN. Downgrading to CONSUMER.`);
                userRole = "CONSUMER";
            } else {
                return res.status(200).json({
                    success: true,
                    uid,
                    role: "ADMIN",
                    status: "AUTHORIZED",
                    message: "Admin login successful",
                });
            }
        }

        return res.status(200).json({
            success: true,
            uid,
            role: userRole,
            status: "AUTHORIZED",
            message: "User login successful",
        });

    } catch (error) {
        console.error("TEST LOGIN ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Test login failed",
        });
    }
});

// ========== ADMIN ENDPOINTS ==========

// GET /admin/stats - Dashboard statistics
app.get("/admin/stats", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const [usersSnap, sellersSnap, productsSnap, ordersSnap] = await Promise.all([
            db.collection("users").get(),
            db.collection("sellers").get(),
            db.collection("products").get(),
            db.collection("orders").get()
        ]);

        const totalSellers = usersSnap.docs.filter(doc => doc.data().role === "SELLER").length;
        const pendingSellers = sellersSnap.docs.filter(doc => doc.data().sellerStatus === "PENDING").length;
        const totalProducts = productsSnap.size;
        const totalOrders = ordersSnap.size;

        return res.status(200).json({
            success: true,
            stats: {
                totalSellers,
                totalProducts,
                todayOrders: Math.floor(totalOrders * 0.3), // TODO: Replace with actual today's order count query
                pendingApprovals: pendingSellers
            }
        });
    } catch (error) {
        console.error("STATS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch stats"
        });
    }
});

// GET /admin/sellers - Pending sellers for approval
app.get("/admin/sellers", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const sellersSnap = await db.collection("sellers").where("sellerStatus", "==", "PENDING").get();

        const sellers = await Promise.all(sellersSnap.docs.map(async (doc) => {
            const sellerData = doc.data();
            const userSnap = await db.collection("users").doc(doc.id).get();
            const userData = userSnap.data();

            // Format date as dd/mm/yyyy
            const formatDate = (timestamp) => {
                const date = timestamp?.toDate() || new Date();
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            return {
                uid: doc.id,
                name: sellerData.shopName,
                email: userData?.phone || "N/A",
                type: "Individual",
                status: sellerData.sellerStatus,
                joined: formatDate(sellerData.appliedAt),
                timestamp: sellerData.appliedAt?.toDate().getTime() || Date.now(), // For sorting
                shopName: sellerData.shopName,
                category: sellerData.category,
                address: sellerData.address,
                // Aadhaar Data
                aadhaarNumber: sellerData.aadhaarNumber,
                age: sellerData.age,
                aadhaarImageUrl: sellerData.aadhaarImageUrl,
                extractedName: sellerData.extractedName
            };
        }));

        // Sort by timestamp descending (latest first)
        sellers.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({
            success: true,
            sellers
        });
    } catch (error) {
        console.error("GET SELLERS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch sellers"
        });
    }
});

// GET /admin/all-sellers - All sellers (approved, pending, rejected)
app.get("/admin/all-sellers", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const sellersSnap = await db.collection("sellers").get();

        const sellers = await Promise.all(sellersSnap.docs.map(async (doc) => {
            const sellerData = doc.data();
            const userSnap = await db.collection("users").doc(doc.id).get();
            const userData = userSnap.data();

            // Format date as dd/mm/yyyy
            const formatDate = (timestamp) => {
                const date = timestamp?.toDate() || new Date();
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            // Use approvedAt for approved sellers, rejectedAt for rejected, appliedAt as fallback
            const dateField = sellerData.sellerStatus === 'APPROVED' ? sellerData.approvedAt :
                sellerData.sellerStatus === 'REJECTED' ? (sellerData.rejectedAt || sellerData.blockedAt) :
                    sellerData.appliedAt;

            return {
                uid: doc.id,
                name: sellerData.shopName,
                email: userData?.phone || "N/A",
                type: "Individual",
                status: sellerData.sellerStatus,
                joined: formatDate(dateField),
                timestamp: dateField?.toDate().getTime() || Date.now(), // For sorting
                shopName: sellerData.shopName,
                category: sellerData.category,
                address: sellerData.address,
                // Aadhaar Data
                aadhaarNumber: sellerData.aadhaarNumber,
                age: sellerData.age,
                aadhaarImageUrl: sellerData.aadhaarImageUrl,
                extractedName: sellerData.extractedName,
                // Block info
                isBlocked: sellerData.isBlocked || false,
                blockDuration: sellerData.blockDuration
            };
        }));

        // Sort by timestamp descending (latest first)
        sellers.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({
            success: true,
            sellers
        });
    } catch (error) {
        console.error("GET ALL SELLERS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch all sellers"
        });
    }
});

// GET /admin/reviews-count - Get total review count
app.get("/admin/reviews-count", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const reviewsSnap = await db.collection("reviews").get();
        return res.status(200).json({
            success: true,
            count: reviewsSnap.size
        });
    } catch (error) {
        console.error("GET REVIEWS COUNT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reviews count"
        });
    }
});

// GET /admin/reviews - Get all reviews for admin dashboard
app.get("/admin/reviews", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const reviewsSnap = await db.collection("reviews")
            .orderBy("createdAt", "desc")
            .get();

        const reviews = await Promise.all(reviewsSnap.docs.map(async (doc) => {
            const reviewData = doc.data();

            // Get product details
            let productDetails = {
                name: "Unknown Product",
                category: "N/A",
                brand: "N/A",
                averageRating: 0,
                reviewCount: 0
            };

            try {
                const productSnap = await db.collection("products").doc(reviewData.productId).get();
                if (productSnap.exists) {
                    const productData = productSnap.data();
                    productDetails = {
                        name: productData.title || productData.name,
                        category: productData.category || "N/A",
                        brand: productData.brand || "N/A",
                        averageRating: productData.averageRating || 0,
                        reviewCount: productData.reviewCount || 0
                    };
                }
            } catch (err) {
                console.warn(`Could not fetch product for review ${doc.id}`);
            }

            // Format date as dd/mm/yyyy
            const formatDate = (timestamp) => {
                const date = timestamp?.toDate() || new Date();
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const year = date.getFullYear();
                return `${day}/${month}/${year}`;
            };

            return {
                id: doc.id,
                productId: reviewData.productId,
                productName: productDetails.name,
                productCategory: productDetails.category,
                productBrand: productDetails.brand,
                productAvgRating: productDetails.averageRating,
                productReviewCount: productDetails.reviewCount,
                customerName: reviewData.userName || "Anonymous",
                customerId: reviewData.userId || "N/A",
                rating: reviewData.rating,
                feedback: reviewData.feedback,
                date: formatDate(reviewData.createdAt),
                timestamp: reviewData.createdAt?.toDate().getTime() || Date.now()
            };
        }));

        return res.status(200).json({
            success: true,
            reviews
        });
    } catch (error) {
        console.error("GET ADMIN REVIEWS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reviews"
        });
    }
});

// GET /admin/products - All products for review
app.get("/admin/products", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const productsSnap = await db.collection("products").get();

        const products = [];
        for (const doc of productsSnap.docs) {
            try {
                const productData = doc.data() || {};
                let sellerPhone = "System/Seeded";

                if (productData.sellerId) {
                    try {
                        const sellerSnap = await db.collection("users").doc(productData.sellerId).get();
                        if (sellerSnap.exists) {
                            sellerPhone = sellerSnap.data()?.phone || "Unknown";
                        }
                    } catch (e) {
                        console.warn(`Could not fetch seller for product ${doc.id}: ${e.message}`);
                    }
                }

                const createdAtDate = (() => {
                    try {
                        if (!productData.createdAt) return null;
                        if (productData.createdAt.toDate) return productData.createdAt.toDate();
                        if (productData.createdAt instanceof Date) return productData.createdAt;
                        return new Date(productData.createdAt);
                    } catch {
                        return null;
                    }
                })();

                products.push({
                    id: doc.id,
                    title: productData.title || productData.name || "Untitled",
                    seller: sellerPhone,
                    price: Number(productData.price) || 0,
                    discountedPrice: productData.discountedPrice,
                    category: productData.category || "N/A",
                    status: productData.status || "Active",
                    date: createdAtDate ? safeToDateString(createdAtDate) : safeToDateString(null),
                    timestamp: createdAtDate ? createdAtDate.getTime() : Date.now()
                });
            } catch (docErr) {
                console.error(`[Admin Products] Skipping malformed product doc ${doc.id}:`, docErr);
            }
        }

        // Sort by timestamp descending (latest first)
        products.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products",
            error: error.message
        });
    }
});

// GET /admin/orders - All orders
app.get("/admin/orders", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const ordersSnap = await db.collection("orders").get();

        // Helper function to format date as dd/mm/yyyy
        const formatDate = (timestamp) => {
            const date = timestamp?.toDate() || new Date();
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        };

        // Helper function to normalize status
        const normalizeStatus = (status) => {
            if (status === 'Placed') return 'Order Placed';
            return status || 'Order Placed';
        };

        const orders = [];
        for (const doc of ordersSnap.docs) {
            const orderData = doc.data();
            orders.push({
                id: doc.id,
                orderId: orderData.orderId || doc.id,
                customer: orderData.customerName || "Unknown",
                total: orderData.total || 0,
                status: normalizeStatus(orderData.status),
                date: formatDate(orderData.createdAt),
                timestamp: orderData.createdAt?.toDate().getTime() || Date.now() // For sorting
            });
        }

        // Sort by timestamp descending (latest first)
        orders.sort((a, b) => b.timestamp - a.timestamp);

        return res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("GET ORDERS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders"
        });
    }
});

// POST /admin/seller/:uid/approve - Approve seller
app.post("/admin/seller/:uid/approve", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        console.log(`[Admin] Approving seller application for UID: ${uid}`);

        // Verify seller document exists
        const sellerRef = db.collection("sellers").doc(uid);
        const sellerSnap = await sellerRef.get();

        if (!sellerSnap.exists) {
            return res.status(404).json({
                success: false,
                message: "Seller application record not found"
            });
        }

        const sellerData = sellerSnap.data();

        // 1. Update status in sellers collection
        await sellerRef.update({
            sellerStatus: "APPROVED",
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 2. Update Role and Verified Data in users collection
        const userRef = db.collection("users").doc(uid);
        await userRef.update({
            role: "SELLER",
            // Sync verified name from Aadhaar extraction
            name: sellerData.extractedName || sellerData.shopName,
            isSeller: true,
            isActive: true,
            shopName: sellerData.shopName,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send approval email notification
        const emailTemplate = emailTemplates.approved(sellerData.shopName);
        await sendEmail(sellerData.phone, emailTemplate, { shopName: sellerData.shopName });

        console.log(`[Admin] ✅ Seller ${uid} approved and user profile synced.`);

        return res.status(200).json({
            success: true,
            message: "Seller approved successfully. Email notification sent."
        });
    } catch (error) {
        console.error("APPROVE SELLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to approve seller: " + error.message
        });
    }
});

// POST /admin/seller/:uid/reject - Reject seller
app.post("/admin/seller/:uid/reject", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;

        // Verify seller document exists
        const sellerRef = db.collection("sellers").doc(uid);
        const sellerSnap = await sellerRef.get();

        if (!sellerSnap.exists) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        const sellerData = sellerSnap.data();

        await sellerRef.update({
            sellerStatus: "REJECTED",
            rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const userRef = db.collection("users").doc(uid);
        await userRef.update({
            role: "SELLER",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send rejection email notification
        const emailTemplate = emailTemplates.rejected(sellerData.shopName);
        await sendEmail(sellerData.phone, emailTemplate, { shopName: sellerData.shopName });

        return res.status(200).json({
            success: true,
            message: "Seller rejected successfully. Email notification sent."
        });
    } catch (error) {
        console.error("REJECT SELLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject seller"
        });
    }
});

// POST /admin/seller/:uid/block - Block seller
app.post("/admin/seller/:uid/block", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { blockDuration } = req.body; // Can be number of days or 'permanent'

        const sellerRef = db.collection("sellers").doc(uid);
        const sellerSnap = await sellerRef.get();

        if (!sellerSnap.exists) {
            return res.status(404).json({ success: false, message: "Seller not found" });
        }

        const sellerData = sellerSnap.data();
        const blockUntil = blockDuration === 'permanent' ? null :
            new Date(Date.now() + (blockDuration * 24 * 60 * 60 * 1000));

        // Update seller status to REJECTED and mark as blocked
        await sellerRef.update({
            sellerStatus: "REJECTED", // Mark as rejected so they appear in rejected section
            isBlocked: true,
            blockDuration: blockDuration === 'permanent' ? 'permanent' : blockDuration,
            blockedAt: admin.firestore.FieldValue.serverTimestamp(),
            blockUntil: blockUntil,
            blockReason: "Blocked by admin",
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const userRef = db.collection("users").doc(uid);
        await userRef.update({
            isActive: false,
            isBlocked: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Send block notification email
        const blockDurationText = blockDuration === 'permanent' ? 'permanent' : blockDuration;
        const emailTemplate = emailTemplates.blocked(sellerData.shopName, blockDurationText);
        await sendEmail(sellerData.phone, emailTemplate, { shopName: sellerData.shopName, duration: blockDurationText });

        const blockMessage = blockDuration === 'permanent' ?
            'permanently blocked' :
            `blocked for ${blockDuration} day(s)`;

        return res.status(200).json({
            success: true,
            message: `Seller ${blockMessage}. Email notification sent.`
        });
    } catch (error) {
        console.error("BLOCK SELLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to block seller"
        });
    }
});

// ========== SELLER ENDPOINTS ==========

// GET /seller/:uid/stats - Seller dashboard statistics
// GET /seller/:uid/profile - Get seller profile details
app.get("/seller/:uid/profile", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const [sellerSnap, userSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get(),
            db.collection("users").doc(uid).get()
        ]);

        if (!sellerSnap.exists) {
            return res.status(404).json({ success: false, message: "Seller profile not found" });
        }

        const sellerData = sellerSnap.data();
        const userData = userSnap.data();

        return res.status(200).json({
            success: true,
            profile: {
                shopName: sellerData.shopName,
                name: userData?.name || sellerData.shopName, // Fallback to shopName if user name not set
                phone: sellerData.phone,
                category: sellerData.category,
                status: sellerData.sellerStatus
            }
        });
    } catch (error) {
        console.error("GET SELLER PROFILE ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch profile" });
    }
});

app.get("/seller/:uid/stats", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });

        // Fetch products and orders concurrently
        const [productsSnap, allOrdersSnap] = await Promise.all([
            db.collection("products").where("sellerId", "==", uid).get(),
            db.collection("orders").get()
        ]);

        const totalProducts = productsSnap.size;
        let totalSales = 0;
        let newOrdersCount = 0;
        let pendingOrdersCount = 0;

        allOrdersSnap.forEach(doc => {
            const order = doc.data();
            // Check if any item in this order belongs to the seller
            const sellerItems = order.items?.filter(item => item.sellerId === uid) || [];

            if (sellerItems.length > 0) {
                // Calculate sales from these items
                const orderSales = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                totalSales += orderSales;

                if (order.status === 'Processing') newOrdersCount++; // Assuming 'Processing' is new
                if (order.status === 'Pending') pendingOrdersCount++;
            }
        });

        return res.status(200).json({
            success: true,
            stats: {
                totalSales, // Value in currency
                totalProducts,
                newOrders: newOrdersCount,
                pendingOrders: pendingOrdersCount
            }
        });

    } catch (error) {
        console.error("SELLER STATS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch seller stats"
        });
    }
});

// GET /seller/:uid/products - Get all products for a seller
app.get("/seller/:uid/products", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        const productsSnap = await db.collection("sellers").doc(uid).collection("listedproducts").get();

        const products = [];
        productsSnap.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        return res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error("SELLER PRODUCTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products"
        });
    }
});

// POST /seller/product/add - Add a new product
app.post("/seller/product/add", verifyAuth, async (req, res) => {
    try {
        const { sellerId, productData } = req.body;

        if (!sellerId || !productData || typeof productData !== "object") {
            return res.status(400).json({ success: false, message: "sellerId and productData are required" });
        }

        // Validate required product fields
        if (!productData.title || !productData.price || !productData.category) {
            return res.status(400).json({
                success: false,
                message: "Product title, price, and category are required",
            });
        }

        const price = Number(productData.price);
        if (isNaN(price) || price <= 0) {
            return res.status(400).json({
                success: false,
                message: "Price must be a positive number",
            });
        }

        const newProduct = {
            title: productData.title,
            name: productData.title, // alias for ProductDetail compatibility
            price: price,
            discountPrice: productData.discountPrice || null,
            category: productData.category,
            description: productData.description || "",
            image: productData.image || "",
            imageUrl: productData.image || productData.imageUrl || "",
            stock: Number(productData.stock) || 0,
            sellerId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "Active"
        };

        // ── Dynamic fields: sizes, colors, variants, specifications ──
        if (productData.sizes && Array.isArray(productData.sizes) && productData.sizes.length > 0) {
            newProduct.sizes = productData.sizes;
            newProduct.pricingType = productData.pricingType || "same";
            if (productData.pricingType === "varied" && productData.sizePrices) {
                newProduct.sizePrices = productData.sizePrices;
            }
        }
        if (productData.colors && Array.isArray(productData.colors) && productData.colors.length > 0) {
            newProduct.colors = productData.colors;
        }
        // Variant arrays: storage, memory, weight, etc.
        const VARIANT_KEYS = ["storage", "memory", "weight"];
        for (const vk of VARIANT_KEYS) {
            if (productData[vk] && Array.isArray(productData[vk]) && productData[vk].length > 0) {
                newProduct[vk] = productData[vk];
            }
        }
        if (productData.specifications && typeof productData.specifications === "object" && Object.keys(productData.specifications).length > 0) {
            newProduct.specifications = productData.specifications;
        }

        // 1. Save to main products collection
        const mainDocRef = await db.collection("products").add(newProduct);

        // 2. Save to seller's listedproducts subcollection using the same ID or reference
        await db.collection("sellers").doc(sellerId).collection("listedproducts").doc(mainDocRef.id).set({
            ...newProduct,
            mainProductId: mainDocRef.id
        });

        return res.status(200).json({
            success: true,
            message: "Product listed successfully in both collections",
            productId: mainDocRef.id
        });
    } catch (error) {
        console.error("ADD PRODUCT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to add product"
        });
    }
});

// DELETE /seller/product/:id - Delete a product
app.delete("/seller/product/:id", verifyAuth, async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Get product to find sellerId
        const productRef = db.collection("products").doc(id);
        const productSnap = await productRef.get();

        if (!productSnap.exists) {
            return res.status(404).json({
                success: false,
                message: "Product not found",
            });
        }

        const { sellerId } = productSnap.data();

        // Delete from seller's subcollection
        if (sellerId) {
            await db.collection("sellers").doc(sellerId).collection("listedproducts").doc(id).delete();
        }

        // Delete from main collection
        await productRef.delete();

        return res.status(200).json({
            success: true,
            message: "Product deleted from all collections"
        });
    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete product"
        });
    }
});

// GET /seller/:uid/orders - Get orders for// Aggregated Dashboard Data Endpoint (Optimization)
app.get("/seller/:uid/dashboard-data", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;

        // Fetch everything in parallel on the server
        // Products come from MAIN collection filtered by sellerId (reliable source)
        const [sellerSnap, userSnap, productsSnap, allOrdersSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get(),
            db.collection("users").doc(uid).get(),
            db.collection("products").where("sellerId", "==", uid).get(),
            db.collection("orders").get()
        ]);

        if (!sellerSnap.exists) {
            return res.status(404).json({ success: false, message: "Seller profile not found" });
        }

        const sellerData = sellerSnap.data();
        const userData = userSnap.data();

        // Build products array from main collection
        const products = productsSnap.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Calculate Stats
        let totalSales = 0;
        let newOrdersCount = 0;
        let pendingOrdersCount = 0;
        const sellerOrders = [];

        allOrdersSnap.forEach(doc => {
            const order = doc.data();
            const sellerItems = order.items?.filter(item => item.sellerId === uid) || [];

            if (sellerItems.length > 0) {
                const orderSales = sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
                totalSales += orderSales;

                if (order.status === 'Processing') newOrdersCount++;
                if (order.status === 'Pending') pendingOrdersCount++;

                sellerOrders.push({
                    id: doc.id,
                    orderId: order.orderId || doc.id,
                    customer: order.customerName || "Customer",
                    items: sellerItems,
                    total: orderSales,
                    status: order.status,
                    date: order.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
                });
            }
        });

        console.log(`[Dashboard] Seller ${uid}: ${products.length} products found in main collection`);

        return res.status(200).json({
            success: true,
            profile: {
                shopName: sellerData.shopName,
                name: userData?.name || sellerData.shopName,
                phone: sellerData.phone,
                category: sellerData.category,
                status: sellerData.sellerStatus
            },
            stats: {
                totalSales,
                totalProducts: products.length,
                newOrders: newOrdersCount,
                pendingOrders: pendingOrdersCount
            },
            products,
            orders: sellerOrders
        });
    } catch (error) {
        console.error("DASHBOARD DATA ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
    }
});

// GET /seller/:uid/orders - Get orders for a seller (Legacy support, but optimized)
app.get("/seller/:uid/orders", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const allOrdersSnap = await db.collection("orders").get();
        const sellerOrders = [];

        allOrdersSnap.forEach(doc => {
            const order = doc.data();
            const sellerItems = order.items?.filter(item => item.sellerId === uid) || [];

            if (sellerItems.length > 0) {
                sellerOrders.push({
                    id: doc.id,
                    orderId: order.orderId || doc.id,
                    customer: order.customerName || "Customer",
                    items: sellerItems,
                    total: sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                    status: order.status,
                    date: safeToDateString(order.createdAt)
                });
            }
        });

        return res.status(200).json({ success: true, orders: sellerOrders });
    } catch (error) {
        console.error("SELLER ORDERS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch orders" });
    }
});

// PUT /seller/order/:id/status - Update order status
app.put("/seller/order/:id/status", verifyAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Validate status value
        const VALID_STATUSES = ["Processing", "Pending", "Shipped", "Delivered", "Cancelled"];
        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
            });
        }

        await db.collection("orders").doc(id).update({
            status,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            message: "Order status updated successfully"
        });
    } catch (error) {
        console.error("UPDATE ORDER STATUS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update order status"
        });
    }
});

// PUT /seller/product/update/:id - Update a product
app.put("/seller/product/update/:id", verifyAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { sellerId, productData } = req.body;

        if (!sellerId || !productData) {
            return res.status(400).json({ success: false, message: "Missing required update data" });
        }

        const updatePayload = {
            ...productData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        delete updatePayload.id;

        await db.collection("products").doc(id).update(updatePayload);
        await db.collection("sellers").doc(sellerId).collection("listedproducts").doc(id).update(updatePayload);

        return res.status(200).json({
            success: true,
            message: "Product updated successfully in all collections"
        });
    } catch (error) {
        console.error("UPDATE PRODUCT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update product"
        });
    }
});

// ========== REVIEW ENDPOINTS ==========

// POST /reviews/add - Submit a product review
app.post("/reviews/add", async (req, res) => {
    try {
        const { idToken, reviewData } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "ID token is required"
            });
        }

        if (!reviewData || !reviewData.productId || !reviewData.rating || !reviewData.feedback) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: productId, rating, and feedback are required"
            });
        }

        // Verify user authentication
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;

        // Get user details
        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const userData = userSnap.data();

        // Validate rating (1-5)
        const rating = parseInt(reviewData.rating);
        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "Rating must be between 1 and 5"
            });
        }

        // Create review document
        const reviewRef = await db.collection("reviews").add({
            productId: reviewData.productId,
            userId: uid,
            userName: userData.name || userData.phone || "Anonymous",
            rating: rating,
            feedback: reviewData.feedback,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update product's average rating and review count
        const productRef = db.collection("products").doc(reviewData.productId);
        const productSnap = await productRef.get();

        if (productSnap.exists) {
            const productData = productSnap.data();
            const currentReviewCount = productData.reviewCount || 0;
            const currentAvgRating = productData.averageRating || 0;

            // Calculate new average rating
            const newReviewCount = currentReviewCount + 1;
            const newAvgRating = ((currentAvgRating * currentReviewCount) + rating) / newReviewCount;

            await productRef.update({
                averageRating: parseFloat(newAvgRating.toFixed(1)),
                reviewCount: newReviewCount,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return res.status(200).json({
            success: true,
            message: "Review submitted successfully",
            reviewId: reviewRef.id
        });

    } catch (error) {
        console.error("ADD REVIEW ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to submit review"
        });
    }
});

// GET /reviews/:productId - Get all reviews for a product
app.get("/reviews/:productId", async (req, res) => {
    try {
        const { productId } = req.params;

        const reviewsSnap = await db.collection("reviews")
            .where("productId", "==", productId)
            .orderBy("createdAt", "desc")
            .get();

        const reviews = [];
        reviewsSnap.forEach(doc => {
            const reviewData = doc.data();
            reviews.push({
                id: doc.id,
                user: reviewData.userName,
                rating: reviewData.rating,
                feedback: reviewData.feedback,
                date: reviewData.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
            });
        });

        return res.status(200).json({
            success: true,
            reviews
        });

    } catch (error) {
        console.error("GET REVIEWS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch reviews"
        });
    }
});

// DELETE /admin/review/:id - Delete a review (admin only)
app.delete("/admin/review/:id", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        // Get review to update product stats
        const reviewRef = db.collection("reviews").doc(id);
        const reviewSnap = await reviewRef.get();

        if (!reviewSnap.exists) {
            return res.status(404).json({
                success: false,
                message: "Review not found"
            });
        }

        const reviewData = reviewSnap.data();
        const productId = reviewData.productId;
        const rating = reviewData.rating;

        // Delete the review
        await reviewRef.delete();

        // Update product's average rating and review count
        const productRef = db.collection("products").doc(productId);
        const productSnap = await productRef.get();

        if (productSnap.exists) {
            const productData = productSnap.data();
            const currentReviewCount = productData.reviewCount || 0;
            const currentAvgRating = productData.averageRating || 0;

            if (currentReviewCount > 1) {
                // Recalculate average rating
                const totalRating = currentAvgRating * currentReviewCount;
                const newTotalRating = totalRating - rating;
                const newReviewCount = currentReviewCount - 1;
                const newAvgRating = newTotalRating / newReviewCount;

                await productRef.update({
                    averageRating: parseFloat(newAvgRating.toFixed(1)),
                    reviewCount: newReviewCount,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } else {
                // Last review, reset to 0
                await productRef.update({
                    averageRating: 0,
                    reviewCount: 0,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: "Review deleted successfully"
        });

    } catch (error) {
        console.error("DELETE REVIEW ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete review"
        });
    }
});

// POST /admin/seed-reviews - Seed test review data (for testing only)
app.post("/admin/seed-reviews", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        // Get random products from the database
        const productsSnap = await db.collection("products").limit(5).get();

        if (productsSnap.empty) {
            return res.status(404).json({
                success: false,
                message: "No products found to seed reviews"
            });
        }

        const products = [];
        productsSnap.forEach(doc => {
            products.push({ id: doc.id, ...doc.data() });
        });

        // Sample customer names
        const customerNames = [
            "Rajesh Kumar", "Priya Sharma", "Amit Patel", "Sneha Reddy", "Vikram Singh",
            "Anita Desai", "Rahul Verma", "Kavita Nair", "Suresh Gupta", "Meera Iyer"
        ];

        // Sample reviews
        const reviewTemplates = [
            { rating: 5, feedback: "Excellent product! Highly recommended. Quality is top-notch and delivery was fast." },
            { rating: 5, feedback: "Amazing quality and great value for money. Will definitely buy again!" },
            { rating: 4, feedback: "Good product overall. Met my expectations. Packaging could be better." },
            { rating: 4, feedback: "Very satisfied with the purchase. Good quality and reasonable price." },
            { rating: 3, feedback: "Average product. It's okay for the price but nothing special." },
            { rating: 3, feedback: "Decent quality but expected better. Delivery was delayed." },
            { rating: 2, feedback: "Not satisfied with the quality. Product description was misleading." },
            { rating: 2, feedback: "Below average quality. Would not recommend to others." },
            { rating: 1, feedback: "Very poor quality. Completely disappointed with this purchase." },
            { rating: 1, feedback: "Worst product ever. Total waste of money. Do not buy!" }
        ];

        const reviewsCreated = [];
        const now = new Date();

        // Create 3-5 reviews per product
        for (const product of products) {
            const numReviews = Math.floor(Math.random() * 3) + 3; // 3 to 5 reviews
            let totalRating = 0;

            for (let i = 0; i < numReviews; i++) {
                const randomReview = reviewTemplates[Math.floor(Math.random() * reviewTemplates.length)];
                const randomCustomer = customerNames[Math.floor(Math.random() * customerNames.length)];

                // Generate dates in the last 30 days
                const daysAgo = Math.floor(Math.random() * 30);
                const reviewDate = new Date(now);
                reviewDate.setDate(reviewDate.getDate() - daysAgo);

                const reviewRef = await db.collection("reviews").add({
                    productId: product.id,
                    userId: `test_user_${Math.floor(Math.random() * 1000)}`,
                    userName: randomCustomer,
                    rating: randomReview.rating,
                    feedback: randomReview.feedback,
                    createdAt: admin.firestore.Timestamp.fromDate(reviewDate)
                });

                totalRating += randomReview.rating;
                reviewsCreated.push({
                    id: reviewRef.id,
                    productName: product.title || product.name,
                    customer: randomCustomer,
                    rating: randomReview.rating
                });
            }

            // Update product's average rating and review count
            const avgRating = totalRating / numReviews;
            await db.collection("products").doc(product.id).update({
                averageRating: parseFloat(avgRating.toFixed(1)),
                reviewCount: numReviews,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        return res.status(200).json({
            success: true,
            message: `Successfully created ${reviewsCreated.length} test reviews for ${products.length} products`,
            reviews: reviewsCreated
        });

    } catch (error) {
        console.error("SEED REVIEWS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to seed reviews: " + error.message
        });
    }
});

// Root endpoint - API info
app.get("/", (req, res) => {
    res.status(200).json({
        success: true,
        message: "SellSathi Backend API v2.8",
        status: "Running",
        endpoints: {
            auth: [
                "POST /auth/login",
                "POST /auth/apply-seller",
                "POST /auth/test-login",
                "POST /auth/extract-aadhar",
                "GET /auth/user-status/:uid"
            ],
            admin: [
                "GET /admin/stats",
                "GET /admin/sellers",
                "GET /admin/all-sellers",
                "GET /admin/products",
                "GET /admin/orders",
                "GET /admin/reviews-count",
                "POST /admin/seller/:uid/approve",
                "POST /admin/seller/:uid/reject"
            ],
            seller: [
                "GET /seller/:uid/profile",
                "GET /seller/:uid/stats",
                "GET /seller/:uid/products",
                "GET /seller/:uid/orders",
                "GET /seller/:uid/dashboard-data",
                "POST /seller/product/add",
                "PUT /seller/product/update/:id",
                "DELETE /seller/product/:id",
                "PUT /seller/order/:id/status"
            ],
            marketplace: [
                "GET /marketplace/products"
            ],
            reviews: [
                "POST /reviews/add",
                "GET /reviews/:productId"
            ]
        },
        timestamp: new Date().toISOString()
    });
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("🔥 GLOBAL SERVER ERROR:", err);
    res.status(500).json({
        success: false,
        message: "An internal server error occurred.",
        error: err.message
    });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 [BACKEND] Auth service version 2.8 is LIVE on port ${PORT}`);
});
