const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

// Environment flags
const IS_DEV = process.env.NODE_ENV !== 'production';
const ADMIN_PHONE = "+917483743936";
const ALLOW_TEST_UID = IS_DEV || process.env.ALLOW_TEST_UID === 'true';
const Razorpay = require("razorpay");
const crypto = require("crypto");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { Readable } = require("stream");
const PDFDocument = require("pdfkit");

// Cloudinary config (keys loaded from .env)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Gemini AI config — use gemini-2.0-flash with fallback to gemini-2.5-flash (key from .env)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash'];

async function runGeminiExtraction(imageBuffer, mimeType) {
    const prompt = `Strict JSON extraction from Aadhaar card image. Extract these exact fields only:
{"name": "full name", "aadhaar_no": "12 digit number", "dob": "DD/MM/YYYY", "gender": "Male or Female", "address": "full address"}
Return ONLY the JSON object, no markdown, no explanation.`;

    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            console.log(`[Gemini] Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                { text: prompt },
                { inlineData: { data: imageBuffer.toString('base64'), mimeType } }
            ]);
            const text = result.response.text().trim();
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON in AI response');
            const data = JSON.parse(jsonMatch[0]);
            if (!data.name && !data.aadhaar_no) throw new Error('Key fields missing');
            console.log(`[Gemini] Success with ${modelName}`);
            return data;
        } catch (err) {
            console.warn(`[Gemini] ${modelName} failed: ${err.message}`);
            lastError = err;
        }
    }
    throw lastError || new Error('All Gemini models failed');
}

// Multer - memory storage for file uploads
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const app = express();
app.use(cors({
    origin: IS_DEV ? true : ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
}));
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

const db = admin.firestore();
const orderController = require("./controllers/orderController");

// Initialize Shiprocket service
const shiprocketService = require("./services/shiprocketService");
const emailService = require("./services/emailService");
const invoiceService = require("./services/invoiceService");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Root route
app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "SellSathi Backend API is running",
        version: "1.0.0",
        endpoints: {
            auth: "/auth/login, /auth/register, /auth/apply-seller",
            admin: "/admin/stats, /admin/sellers, /admin/products, /admin/orders",
            seller: "/seller/:uid/stats, /seller/:uid/products, /seller/:uid/orders",
            payment: "/payment/create-order, /payment/verify, /payment/cod-order",
            orders: "/api/orders/:orderId, /api/user/:uid/orders"
        }
    });
});

// ========== AUTH MIDDLEWARE ==========

// Test-user cache: avoids repeated Firestore reads for X-Test-UID requests
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
            // Check in-memory cache first
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
                return res.status(401).json({ success: false, message: "Test user not found in database" });
            }
            const userData = userSnap.data();
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
            return res.status(401).json({ success: false, message: "Authorization header with Bearer token is required" });
        }

        const idToken = authHeader.split("Bearer ")[1];
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error("AUTH MIDDLEWARE ERROR:", error.message);
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

// Promise-coalescing admin role cache
const _adminRoleCache = new Map();
const ADMIN_ROLE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function _checkIsAdmin(uid) {
    const entry = _adminRoleCache.get(uid);
    if (entry && entry.isAdmin !== undefined && entry.expiresAt > Date.now()) {
        return Promise.resolve(entry.isAdmin);
    }
    if (entry && entry.promise) {
        return entry.promise;
    }
    const promise = db.collection("users").doc(uid).get()
        .then(snap => {
            const isAdmin = snap.exists && snap.data().role === "ADMIN";
            _adminRoleCache.set(uid, { isAdmin, expiresAt: Date.now() + ADMIN_ROLE_CACHE_TTL });
            return isAdmin;
        })
        .catch(err => {
            _adminRoleCache.delete(uid);
            throw err;
        });
    _adminRoleCache.set(uid, { promise });
    return promise;
}

/**
 * verifyAdmin middleware — must be used AFTER verifyAuth.
 */
const verifyAdmin = async (req, res, next) => {
    const uid = req.user.uid;
    const isTestMode = req.user.isTestMode || false;
    try {
        if (isTestMode) {
            if (req.user.role === "ADMIN") return next();
            return res.status(403).json({ success: false, message: "Admin access denied" });
        }
        const isAdmin = await _checkIsAdmin(uid);
        if (isAdmin) return next();
        return res.status(403).json({ success: false, message: "Admin access denied" });
    } catch (err) {
        console.error("[verifyAdmin] ERROR:", err.message);
        return res.status(403).json({ success: false, message: "Admin verification failed" });
    }
};

// TEST CREDENTIALS - For development/testing purposes only
const TEST_CREDENTIALS = {
    '+917483743936': { otp: '123456', role: 'ADMIN' },
    '+919876543210': { otp: '123456', role: 'CONSUMER' },
    '+917676879059': { otp: '123456', role: 'CONSUMER' },
    '+919353469036': { otp: '741852', role: 'SELLER' }, // Test seller
    // Add the actual seller phone numbers used in your DB here if different:
};

app.post("/auth/login", async (req, res) => {
    try {
        const { idToken, isTest, email: testEmail } = req.body;

        let uid;
        let phoneNumber = null;
        let email = null;
        let fullName = null;

        if (isTest) {
            // Bypass for dev mode
            uid = `test_email_${(testEmail || "user").replace(/[^a-zA-Z0-9]/g, '')}`;
            email = testEmail;
            fullName = testEmail?.split('@')[0] || "Test User";
        } else {
            if (!idToken) {
                return res.status(400).json({
                    success: false,
                    message: "ID token is required",
                });
            }

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
                success: true,
                uid,
                role: "CONSUMER",
                fullName,
                status: "NEW_USER",
                message: "New user created as CONSUMER",
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

        // ── ADMIN: strict phone-based gate ──
        const ADMIN_PHONE = "+917483743936";
        if (userData.role === "ADMIN" || phoneNumber === ADMIN_PHONE) {
            if (phoneNumber !== ADMIN_PHONE) {
                // Stored as ADMIN but wrong phone — demote to CONSUMER
                console.warn(`Security: phone ${phoneNumber} stored as ADMIN but doesn't match. Demoted.`);
            } else {
                return res.status(200).json({
                    success: true, uid,
                    role: "ADMIN",
                    status: "AUTHORIZED",
                    message: "Admin login successful",
                });
            }
        }

        // ── SELLER CHECK: ALWAYS query sellers collection regardless of users.role ──
        // This is the single source of truth. The users.role field may lag behind.
        const sellerSnap = await db.collection("sellers").doc(uid).get();

        if (sellerSnap.exists) {
            const sellerData = sellerSnap.data();
            const sellerStatus = sellerData.sellerStatus || "PENDING";

            // Sync users.role if it's stale
            if (userData.role !== "SELLER") {
                try {
                    await db.collection("users").doc(uid).update({ role: "SELLER" });
                    console.log(`[login] Synced users.role → SELLER for uid=${uid}`);
                } catch (_) { }
            }

            if (sellerStatus === "APPROVED") {
                return res.status(200).json({
                    success: true, uid,
                    role: "SELLER",
                    status: "APPROVED",
                    sellerStatus: "APPROVED",
                    shopName: sellerData.shopName,
                    message: "Seller login successful",
                });
            }
            if (sellerStatus === "REJECTED") {
                return res.status(403).json({
                    success: false, uid,
                    role: "SELLER",
                    status: "REJECTED",
                    message: "Your seller application was rejected.",
                });
            }
            // PENDING
            return res.status(200).json({
                success: true, uid,
                role: "SELLER",
                status: "PENDING",
                sellerStatus: "PENDING",
                shopName: sellerData.shopName,
                message: "Seller approval pending",
            });
        }

        // ── Default: CONSUMER ──
        return res.status(200).json({
            success: true, uid,
            role: "CONSUMER",
            status: "AUTHORIZED",
            fullName: userData.fullName || fullName,
            message: "Consumer login successful",
        });

    } catch (error) {
        console.error("AUTH ERROR:", error);

        if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
            return res.status(503).json({
                success: false,
                quotaExceeded: true,
                message: "Cloud Database Quota Exceeded. Please try again later or use Offline Mode.",
            });
        }

        return res.status(401).json({
            success: false,
            message: "Authentication failed",
        });
    }
});

app.post("/auth/register", async (req, res) => {
    try {
        const { idToken, phone, fullName, email, password, isTest, otp } = req.body;

        let uid;
        let phoneNumber = phone;

        if (isTest) {
            // Test mode registration - Allow bypass if no OTP is provided (for email/password setup issues)
            if (otp && (!TEST_CREDENTIALS[phone] || TEST_CREDENTIALS[phone].otp !== otp)) {
                return res.status(401).json({ success: false, message: "Invalid test credentials" });
            }
            uid = phone ? `test_${phone.replace(/[^0-9]/g, '')}` : `test_email_${Date.now()}`;
        } else {
            // Real Firebase verification
            if (!idToken) return res.status(400).json({ success: false, message: "ID token is required" });
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            uid = decodedToken.uid;
            phoneNumber = decodedToken.phone_number || phone;
        }

        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();

        const userData = {
            uid,
            phone: phoneNumber || null,
            fullName: fullName || "User",
            email: email || null,
            password: password || null,
            role: "CONSUMER",
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (userSnap.exists) {
            const updates = {
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };
            if (fullName) updates.fullName = fullName;
            if (email) updates.email = email;
            if (password) updates.password = password;

            await userRef.update(updates);
        } else {
            await userRef.set(userData);
        }

        return res.status(200).json({
            success: true,
            uid,
            role: "CONSUMER",
            status: "REGISTERED",
            fullName: fullName || "User",
            message: "Registration successful",
        });

    } catch (error) {
        console.error("REGISTRATION ERROR:", error);
        return res.status(500).json({ success: false, message: "Registration failed: " + error.message });
    }
});

// Endpoint for seller application
app.post("/auth/apply-seller", async (req, res) => {
    try {
        const { idToken, sellerDetails } = req.body;

        if (!idToken) {
            return res.status(400).json({
                success: false,
                message: "ID token is required",
            });
        }

        if (!sellerDetails || !sellerDetails.shopName || !sellerDetails.category || !sellerDetails.address) {
            return res.status(400).json({
                success: false,
                message: "Shop name, category, and address are required",
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

        // Check if user is already a seller
        if (userData.role === "SELLER") {
            return res.status(400).json({
                success: false,
                message: "You are already registered as a seller",
            });
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

// TEST CREDENTIALS ENDPOINT - For development/testing purposes only
// This endpoint allows testing without Firebase phone auth
app.post("/auth/test-login", async (req, res) => {
    if (!IS_DEV) {
        return res.status(404).json({ success: false, message: "Not found" });
    }
    try {
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

        // ── ADMIN: phone-based gate ──
        const ADMIN_PHONE = "+917483743936";
        if (userData.role === "ADMIN" || phoneNumber === ADMIN_PHONE) {
            if (phoneNumber === ADMIN_PHONE) {
                return res.status(200).json({
                    success: true, uid,
                    role: "ADMIN",
                    status: "AUTHORIZED",
                    message: "Admin login successful",
                });
            }
            // role=ADMIN but wrong phone — fall through to seller/consumer check
            console.warn(`Security: phone ${phoneNumber} stored as ADMIN but not admin phone. Checking sellers.`);
        }

        // ── SELLER CHECK: ALWAYS query sellers collection (single source of truth) ──
        const sellerSnap2 = await db.collection("sellers").doc(uid).get();

        if (sellerSnap2.exists) {
            const sellerData = sellerSnap2.data();
            const sellerStatus = sellerData.sellerStatus || "PENDING";

            // Auto-sync users.role if stale
            if (userData.role !== "SELLER") {
                try { await db.collection("users").doc(uid).update({ role: "SELLER" }); } catch (_) { }
            }

            if (sellerStatus === "APPROVED") {
                return res.status(200).json({
                    success: true, uid, role: "SELLER", status: "APPROVED",
                    sellerStatus: "APPROVED", shopName: sellerData.shopName,
                    message: "Seller login successful",
                });
            }
            if (sellerStatus === "REJECTED") {
                return res.status(403).json({
                    success: false, uid, role: "SELLER", status: "REJECTED",
                    message: "Your seller application was rejected.",
                });
            }
            return res.status(200).json({
                success: true, uid, role: "SELLER", status: "PENDING",
                sellerStatus: "PENDING", shopName: sellerData.shopName,
                message: "Seller approval pending",
            });
        }

        // ── Default: CONSUMER ──
        return res.status(200).json({
            success: true, uid,
            role: userData.role || "CONSUMER",
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
        const [sellersSnap, productsSnap, ordersSnap] = await Promise.all([
            db.collection("sellers").get(),
            db.collection("products").get(),
            db.collection("orders").get()
        ]);

        // Count from sellers collection (single source of truth)
        const totalSellers = sellersSnap.size;  // ALL who ever applied
        const pendingSellers = sellersSnap.docs.filter(doc => doc.data().sellerStatus === "PENDING").length;
        const approvedSellers = sellersSnap.docs.filter(doc => doc.data().sellerStatus === "APPROVED").length;
        const totalProducts = productsSnap.size;
        const totalOrders = ordersSnap.size;
        const ordersToDeliver = ordersSnap.docs.filter(doc => {
            const s = doc.data().status;
            return s === 'Processing' || s === 'Shipped';
        }).length;

        return res.status(200).json({
            success: true,
            stats: {
                totalSellers,          // all sellers ever registered
                approvedSellers,       // only approved
                totalProducts,
                todayOrders: Math.floor(totalOrders * 0.3),
                pendingApprovals: pendingSellers,
                totalOrders,
                ordersToDeliver
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

        const sellers = [];
        for (const doc of sellersSnap.docs) {
            const sellerData = doc.data();
            const userSnap = await db.collection("users").doc(doc.id).get();
            const userData = userSnap.data();

            sellers.push({
                uid: doc.id,
                name: sellerData.shopName,
                email: userData?.phone || "N/A",
                type: "Individual",
                status: sellerData.sellerStatus,
                joined: (sellerData.appliedAt && typeof sellerData.appliedAt.toDate === 'function')
                    ? sellerData.appliedAt.toDate().toISOString().split('T')[0]
                    : (sellerData.appliedAt && sellerData.appliedAt._seconds)
                        ? new Date(sellerData.appliedAt._seconds * 1000).toISOString().split('T')[0]
                        : new Date().toISOString().split('T')[0],
                shopName: sellerData.shopName,
                category: sellerData.category,
                address: sellerData.address
            });
        }

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

// GET /admin/products - All products for review
app.get("/admin/products", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const productsSnap = await db.collection("products").get();

        const products = [];
        for (const doc of productsSnap.docs) {
            try {
                const productData = doc.data() || {};
                let sellerPhone = "Unknown";

                // Safe sellerId check — prevents 500 when sellerId is missing
                if (productData.sellerId) {
                    try {
                        const sellerSnap = await db.collection("users").doc(productData.sellerId).get();
                        if (sellerSnap.exists) {
                            sellerPhone = sellerSnap.data()?.phone || "Unknown";
                        }
                    } catch (e) {
                        console.warn(`Could not fetch seller for product ${doc.id}:`, e.message);
                    }
                }

                let dateStr = new Date().toISOString().split('T')[0];
                try {
                    if (productData.createdAt?.toDate) dateStr = productData.createdAt.toDate().toISOString().split('T')[0];
                } catch (_) { }

                products.push({
                    id: doc.id,
                    title: productData.title || productData.name || "Untitled",
                    seller: sellerPhone,
                    price: Number(productData.price) || 0,
                    category: productData.category || "N/A",
                    status: productData.status || "Active",
                    date: dateStr
                });
            } catch (docErr) {
                console.error(`Skipping malformed product ${doc.id}:`, docErr.message);
            }
        }

        products.sort((a, b) => new Date(b.date) - new Date(a.date));

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

// GET /admin/all-sellers - All sellers regardless of status
app.get("/admin/all-sellers", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const sellersSnap = await db.collection("sellers").get();
        // Prefetch delivered orders to avoid querying per seller inside the loop
        const ordersSnap = await db.collection("orders").where("status", "==", "Delivered").get();
        const deliveredOrders = [];
        ordersSnap.forEach(o => deliveredOrders.push(o.data()));

        const sellers = [];
        for (const doc of sellersSnap.docs) {
            const sellerData = doc.data();
            const userSnap = await db.collection("users").doc(doc.id).get();
            const userData = userSnap.data();

            let totalRevenue = 0;
            let deliveredCount = 0;

            deliveredOrders.forEach(order => {
                if (order.items && Array.isArray(order.items)) {
                    let hasSellerItem = false;
                    order.items.forEach(item => {
                        if (item.sellerId === doc.id) {
                            totalRevenue += (item.price || 0) * (item.quantity || 1);
                            hasSellerItem = true;
                        }
                    });
                    if (hasSellerItem) deliveredCount++;
                }
            });

            sellers.push({
                uid: doc.id,
                name: sellerData.shopName,
                email: userData?.email || userData?.phone || "N/A",
                type: "Individual",
                status: sellerData.sellerStatus,
                joined: sellerData.appliedAt ? sellerData.appliedAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                shopName: sellerData.shopName,
                category: sellerData.category,
                address: sellerData.address,
                aadhaarNumber: sellerData.aadhaarNumber,
                age: sellerData.age,
                aadhaarImageUrl: sellerData.aadhaarImageUrl,
                extractedName: sellerData.extractedName,
                isBlocked: sellerData.isBlocked || false,
                financials: {
                    totalRevenue,
                    deliveredCount
                }
            });
        }
        return res.status(200).json({ success: true, sellers });
    } catch (error) {
        console.error("GET ALL SELLERS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch all sellers" });
    }
});

// POST /admin/seller/:uid/block - Block a seller
app.post("/admin/seller/:uid/block", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { blockDuration } = req.body;
        const sellerRef = db.collection("sellers").doc(uid);
        const sellerSnap = await sellerRef.get();
        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller not found" });
        await sellerRef.update({
            sellerStatus: "REJECTED",
            isBlocked: true,
            blockDuration: blockDuration,
            blockedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        await db.collection("users").doc(uid).update({ isActive: false, isBlocked: true });
        return res.status(200).json({ success: true, message: "Seller blocked" });
    } catch (error) {
        console.error("BLOCK SELLER ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to block seller" });
    }
});

// GET /admin/orders - All orders
app.get("/admin/orders", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const ordersSnap = await db.collection("orders").get();

        const orders = [];
        for (const doc of ordersSnap.docs) {
            const orderData = doc.data();
            orders.push({
                id: doc.id,
                orderId: orderData.orderId || doc.id,
                customer: orderData.customerName || "Unknown",
                total: orderData.total || 0,
                status: orderData.status || "Processing",
                date: orderData.createdAt ? orderData.createdAt.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                items: orderData.items || []
            });
        }

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

// GET /admin/seller-analytics - Advanced seller metrics for Payout tab
app.get("/admin/seller-analytics", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const sellersSnap = await db.collection("sellers").where("sellerStatus", "==", "APPROVED").get();
        const sellers = [];

        for (const doc of sellersSnap.docs) {
            const sellerData = doc.data();
            const uid = doc.id;

            // Get Products for this seller
            const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
            let totalProducts = 0;
            let totalStockLeft = 0;
            let totalProductValue = 0;

            productsSnap.forEach(p => {
                const prod = p.data();
                totalProducts++;
                totalStockLeft += (prod.stock || 0);
                totalProductValue += (prod.price || 0) * (prod.stock || 0);
            });

            // Get Orders and calculate units sold & revenue
            let unitsSold = 0;
            let grossRevenue = 0;
            let productStats = {}; // Map of productId -> { name, price, stock, sold, revenue }

            productsSnap.forEach(p => {
                const prod = p.data();
                productStats[p.id] = {
                    id: p.id,
                    name: prod.title,
                    price: prod.price || 0,
                    stock: prod.stock || 0,
                    sold: 0,
                    revenue: 0
                };
            });

            const ordersSnap = await db.collection("orders").get();
            ordersSnap.forEach(o => {
                const order = o.data();
                if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                        if (item.sellerId === uid) {
                            unitsSold += (item.quantity || 1);
                            const revenue = (item.price || 0) * (item.quantity || 1);
                            grossRevenue += revenue;

                            // Update product specific stats if product still exists
                            if (item.productId && productStats[item.productId]) {
                                productStats[item.productId].sold += (item.quantity || 1);
                                productStats[item.productId].revenue += revenue;
                            }
                        }
                    });
                }
            });

            sellers.push({
                uid,
                shopName: sellerData.shopName,
                email: sellerData.email || "", // we'll backfill below
                category: sellerData.category,
                metrics: {
                    totalProducts,
                    totalStockLeft,
                    totalProductValue,
                    unitsSold,
                    grossRevenue
                },
                productMatrix: Object.values(productStats).sort((a, b) => b.revenue - a.revenue)
            });
        }

        // Populate emails from users collection
        for (let s of sellers) {
            const userSnap = await db.collection("users").doc(s.uid).get();
            s.email = userSnap.data()?.email || userSnap.data()?.phone || "N/A";
        }

        return res.status(200).json({ success: true, analytics: sellers });
    } catch (error) {
        console.error("GET SELLER ANALYTICS ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch analytics" });
    }
});

// GET /admin/seller/:uid/analytics-pdf - Generate PDF Report for Seller Analytics
app.get("/admin/seller/:uid/analytics-pdf", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const sellerSnap = await db.collection("sellers").doc(uid).get();
        if (!sellerSnap.exists) return res.status(404).send("Seller not found");
        const sellerData = sellerSnap.data();

        // Get Products 
        const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
        let totalProducts = 0;
        let totalStockLeft = 0;
        let productStats = {};

        productsSnap.forEach(p => {
            const prod = p.data();
            totalProducts++;
            totalStockLeft += (prod.stock || 0);
            productStats[p.id] = { name: prod.title, price: prod.price || 0, stock: prod.stock || 0, sold: 0, revenue: 0 };
        });

        // Get Orders
        let unitsSold = 0;
        let grossRevenue = 0;
        const ordersSnap = await db.collection("orders").get();
        ordersSnap.forEach(o => {
            const order = o.data();
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.sellerId === uid) {
                        unitsSold += (item.quantity || 1);
                        const rev = (item.price || 0) * (item.quantity || 1);
                        grossRevenue += rev;
                        if (item.productId && productStats[item.productId]) {
                            productStats[item.productId].sold += (item.quantity || 1);
                            productStats[item.productId].revenue += rev;
                        }
                    }
                });
            }
        });

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=analytics_${sellerData.shopName?.replace(/\s+/g, '_') || 'seller'}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(20).text('Sellsathi Admin Platform', { align: 'center' });
        doc.fontSize(14).text('Detailed Seller Analytics Report', { align: 'center' });
        doc.moveDown();

        // Seller Info
        doc.fontSize(12).text(`Shop Name: ${sellerData.shopName}`);
        doc.text(`Category: ${sellerData.category}`);
        doc.text(`Report Date: ${new Date().toLocaleDateString()}`);
        doc.moveDown();

        // Summary
        doc.fontSize(14).text('Performance Summary', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10).text(`Total Active Products: ${totalProducts}`);
        doc.text(`Total Units Sold: ${unitsSold}`);
        doc.text(`Remaining Stock: ${totalStockLeft}`);
        doc.text(`Gross Revenue: Rs. ${grossRevenue.toLocaleString()}`);
        doc.moveDown();

        // Product Table
        doc.fontSize(14).text('Product Matrix', { underline: true });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Product Name', 50, tableTop);
        doc.text('Price', 250, tableTop);
        doc.text('Stock', 320, tableTop);
        doc.text('Sold', 380, tableTop);
        doc.text('Revenue', 450, tableTop);

        doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();

        let y = tableTop + 20;
        doc.font('Helvetica');
        Object.values(productStats).sort((a, b) => b.revenue - a.revenue).forEach(p => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.text(p.name.substring(0, 30), 50, y);
            doc.text(`Rs. ${p.price}`, 250, y);
            doc.text(`${p.stock}`, 320, y);
            doc.text(`${p.sold}`, 380, y);
            doc.text(`Rs. ${p.revenue}`, 450, y);
            y += 15;
            doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke('#f3f4f6');
        });

        doc.end();
    } catch (err) {
        console.error("PDF ERROR:", err);
        if (!res.headersSent) res.status(500).send("Error generating PDF");
    }
});

// GET /admin/seller/:uid/pdf - Invoice generation
app.get("/admin/seller/:uid/pdf", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const { fromDate, toDate } = req.query; // format: YYYY-MM-DD

        const sellerSnap = await db.collection("sellers").doc(uid).get();
        if (!sellerSnap.exists) return res.status(404).send("Seller not found");
        const sellerData = sellerSnap.data();

        // Fetch user data for email
        const userSnap = await db.collection("users").doc(uid).get();
        const sellerEmail = userSnap.data()?.email || userSnap.data()?.phone || "N/A";

        // Fetch Orders
        let ordersQuery = db.collection("orders").where("status", "==", "Delivered");

        // Notice: Cannot do inequality filters on multiple fields easily right now without an index,
        // so we will fetch all delivered and filter in memory if fromDate/toDate are provided.
        const ordersSnap = await ordersQuery.get();

        let totalRevenue = 0;
        let deliveredItems = [];

        ordersSnap.forEach(o => {
            const order = o.data();
            const orderDate = order.createdAt?.toDate();

            let inDateRange = true;
            if (orderDate) {
                if (fromDate && new Date(fromDate) > orderDate) inDateRange = false;
                if (toDate) {
                    const to = new Date(toDate);
                    to.setHours(23, 59, 59, 999);
                    if (to < orderDate) inDateRange = false;
                }
            } else {
                inDateRange = false; // Ignore orders without proper creation date if filtering
            }

            if (inDateRange && order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    if (item.sellerId === uid) {
                        const rev = (item.price || 0) * (item.quantity || 1);
                        totalRevenue += rev;
                        deliveredItems.push({
                            name: item.title,
                            qty: item.quantity || 1,
                            price: item.price || 0,
                            revenue: rev,
                            date: orderDate?.toLocaleDateString() || "N/A"
                        });
                    }
                });
            }
        });

        const platformCharges = totalRevenue * 0.10;
        const netPayout = totalRevenue - platformCharges;

        // Generate PDF
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice_${sellerData.shopName?.replace(/\s+/g, '_') || 'seller'}.pdf`);
        doc.pipe(res);

        // Header
        doc.fontSize(24).font('Helvetica-Bold').text('SELLER INVOICE', { align: 'right', color: '#333333' });
        doc.moveDown();

        doc.fontSize(12).font('Helvetica-Bold').text('Sellsathi Admin', 50, 50);
        doc.font('Helvetica').text('Platform Settlement Document', 50, 65);
        doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 50, 80);
        if (fromDate && toDate) {
            doc.text(`Period: ${fromDate} to ${toDate}`, 50, 95);
        } else {
            doc.text(`Period: All Time (Delivered)`, 50, 95);
        }

        // Seller Info
        doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, 130);
        doc.font('Helvetica').text(`Shop Name: ${sellerData.shopName}`, 50, 145);
        doc.text(`Owner: ${sellerData.extractedName || sellerData.name || "N/A"}`, 50, 160);
        doc.text(`Contact: ${sellerEmail}`, 50, 175);
        doc.text(`Category: ${sellerData.category}`, 50, 190);

        // Financial Summary
        doc.rect(50, 220, 500, 100).fillAndStroke('#f9fafb', '#e5e7eb');
        doc.fill('#000000');
        doc.fontSize(14).font('Helvetica-Bold').text('Settlement Summary', 60, 235);

        doc.fontSize(11).font('Helvetica');
        doc.text(`Total Items Delivered: ${deliveredItems.length}`, 60, 260);
        doc.text(`Gross Revenue: Rs. ${totalRevenue.toLocaleString()}`, 60, 275);
        doc.text(`Platform Fee (10%): Rs. ${platformCharges.toLocaleString()}`, 60, 290);

        doc.fontSize(12).font('Helvetica-Bold').text(`Net Amount Payable: Rs. ${netPayout.toLocaleString()}`, 300, 290, { align: 'right', width: 230 });

        doc.moveDown(4);

        // Itemized Breakdown
        doc.fontSize(14).font('Helvetica-Bold').text('Itemized Breakdown', 50, 340);
        doc.moveDown(0.5);

        let tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('Date', 50, tableTop);
        doc.text('Item Name', 120, tableTop);
        doc.text('Qty', 350, tableTop);
        doc.text('Price', 400, tableTop);
        doc.text('Total', 480, tableTop);

        // Line under table headers
        doc.moveTo(50, tableTop + 12).lineTo(550, tableTop + 12).stroke();

        let y = tableTop + 20;
        doc.font('Helvetica');
        deliveredItems.forEach(item => {
            if (y > 700) { doc.addPage(); y = 50; }
            doc.text(item.date, 50, y);
            doc.text(item.name.substring(0, 40), 120, y);
            doc.text(`${item.qty}`, 350, y);
            doc.text(`${item.price}`, 400, y);
            doc.text(`${item.revenue}`, 480, y);
            y += 15;
            doc.moveTo(50, y - 5).lineTo(550, y - 5).stroke('#f3f4f6');
        });

        doc.end();
    } catch (err) {
        console.error("INVOICE PDF ERROR:", err);
        if (!res.headersSent) res.status(500).send("Error generating Invoice PDF");
    }
});

// POST /admin/seller/:uid/approve - Approve seller
app.post("/admin/seller/:uid/approve", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;

        const sellerRef = db.collection("sellers").doc(uid);
        await sellerRef.update({
            sellerStatus: "APPROVED",
            approvedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const userRef = db.collection("users").doc(uid);
        await userRef.update({
            role: "SELLER"
        });

        return res.status(200).json({
            success: true,
            message: "Seller approved successfully"
        });
    } catch (error) {
        console.error("APPROVE SELLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to approve seller"
        });
    }
});

// POST /admin/seller/:uid/reject - Reject seller
app.post("/admin/seller/:uid/reject", verifyAuth, verifyAdmin, async (req, res) => {
    try {
        const { uid } = req.params;

        const sellerRef = db.collection("sellers").doc(uid);
        await sellerRef.update({
            sellerStatus: "REJECTED",
            rejectedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return res.status(200).json({
            success: true,
            message: "Seller rejected successfully"
        });
    } catch (error) {
        console.error("REJECT SELLER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject seller"
        });
    }
});

// ========== SELLER ENDPOINTS ==========

// GET /seller/:uid/stats - Seller dashboard statistics
app.get("/seller/:uid/stats", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;

        // Products
        const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();
        const totalProducts = productsSnap.size;

        // Orders (This is simplified. Ideally orders should store sellerId per item or we query subcollections)
        // For this hackathon scope, we'll scan all orders and filter in code or assume orders structure
        // Let's assume we search for all orders where items array contains a product with sellerId = uid
        // Fetching all orders is not scalable but works for small demo
        const allOrdersSnap = await db.collection("orders").get();
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
        const productsSnap = await db.collection("products").where("sellerId", "==", uid).get();

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

        if (!sellerId || !productData) {
            return res.status(400).json({ success: false, message: "Missing data" });
        }

        const newProduct = {
            ...productData,
            sellerId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "Active" // Default status
        };

        const docRef = await db.collection("products").add(newProduct);

        return res.status(200).json({
            success: true,
            message: "Product added successfully",
            productId: docRef.id
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
        await db.collection("products").doc(id).delete();

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });
    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete product"
        });
    }
});

// GET /seller/:uid/orders - Get orders for a seller
app.get("/seller/:uid/orders", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        // Again, assuming simplified order structure scanning for demo
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
                    items: sellerItems, // Only show items relevant to this seller
                    total: sellerItems.reduce((acc, item) => acc + (item.price * item.quantity), 0),
                    status: order.status,
                    date: order.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
                });
            }
        });

        return res.status(200).json({
            success: true,
            orders: sellerOrders
        });
    } catch (error) {
        console.error("SELLER ORDERS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders"
        });
    }
});

// GET /seller/:uid/profile
app.get("/seller/:uid/profile", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        const [sellerSnap, userSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get(),
            db.collection("users").doc(uid).get()
        ]);
        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller profile not found" });
        const sellerData = sellerSnap.data();
        const userData = userSnap.data();
        return res.status(200).json({
            success: true,
            profile: {
                shopName: sellerData.shopName,
                name: userData?.name || sellerData.shopName,
                phone: sellerData.phone,
                category: sellerData.category,
                status: sellerData.sellerStatus
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch profile" });
    }
});

// GET /seller/:uid/dashboard-data - Aggregated dashboard endpoint
app.get("/seller/:uid/dashboard-data", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        const [sellerSnap, userSnap, productsSnap, allOrdersSnap] = await Promise.all([
            db.collection("sellers").doc(uid).get().catch(e => { if (e.code === 8) return { exists: true, data: () => ({ shopName: "Demo Shop (Quota Limited)", sellerStatus: "APPROVED" }) }; throw e; }),
            db.collection("users").doc(uid).get().catch(e => { if (e.code === 8) return { exists: true, data: () => ({ name: "Demo User" }) }; throw e; }),
            db.collection("products").where("sellerId", "==", uid).limit(50).get().catch(e => { if (e.code === 8) return { docs: [] }; throw e; }),
            // Fetch orders for this seller specifically (new orders have sellerId field)
            db.collection("orders").where("sellerId", "==", uid).limit(50).get().catch(e => { if (e.code === 8) return { forEach: () => { } }; throw e; })
        ]);

        if (!sellerSnap.exists) return res.status(404).json({ success: false, message: "Seller not found" });
        const sellerData = sellerSnap.data();
        const userData = userSnap.data();
        const products = productsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`[Dashboard] Found ${products.length} products for seller ${uid}:`, products.map(p => p.id));

        let totalSales = 0, newOrdersCount = 0, pendingOrdersCount = 0;
        const sellerOrders = [];
        const productIds = new Set(products.map(p => p.id));
        allOrdersSnap.forEach(doc => {
            const order = doc.data();

            // Match orders strictly by: order.sellerId, or item.sellerId, or item product ID matching seller's products
            const sellerItems = (order.items || []).filter(item =>
                item && (
                    item.sellerId === uid ||
                    productIds.has(item.id) ||
                    productIds.has(item.productId)
                )
            );
            const orderBelongsToSeller =
                order.sellerId === uid ||
                sellerItems.length > 0;
            const effectiveItems = sellerItems.length > 0 ? sellerItems : (order.sellerId === uid ? (order.items || []) : []);
            if (orderBelongsToSeller) {
                const orderSales = effectiveItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 0)), 0);
                totalSales += orderSales;
                if (order.status === 'Processing') newOrdersCount++;
                if (order.status === 'Pending') pendingOrdersCount++;;

                let orderDate = new Date().toISOString().split('T')[0];
                try {
                    if (order.createdAt && typeof order.createdAt.toDate === 'function') {
                        orderDate = order.createdAt.toDate().toISOString().split('T')[0];
                    } else if (order.createdAt && order.createdAt._seconds) {
                        orderDate = new Date(order.createdAt._seconds * 1000).toISOString().split('T')[0];
                    }
                } catch (e) {
                    console.error("Error parsing order date:", e);
                }

                sellerOrders.push({
                    id: doc.id,
                    orderId: order.orderId || doc.id,
                    customer: order.customerName || "Customer",
                    items: effectiveItems,
                    total: orderSales,
                    status: order.status,
                    date: orderDate,
                    paymentMethod: order.paymentMethod || null,
                    shippingStatus: order.shippingStatus || null,
                    awbNumber: order.awbNumber || null,
                    courierName: order.courierName || null,
                    estimatedDeliveryDays: order.estimatedDeliveryDays || null,
                    pickupDate: order.pickupDate || (order.shiprocketCreatedAt ? new Date(order.shiprocketCreatedAt.toMillis ? order.shiprocketCreatedAt.toMillis() : order.shiprocketCreatedAt._seconds * 1000).toISOString() : null),
                    labelUrl: order.labelUrl || null
                });
            }
        });
        return res.status(200).json({
            success: true,
            quotaLimited: allOrdersSnap.docs === undefined, // Simple flag if it was caught
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

        if (error.code === 8 || error.message?.includes('RESOURCE_EXHAUSTED')) {
            // Return Mock Data so Dashboard doesn't break during Demo
            return res.status(200).json({
                success: true,
                quotaExceeded: true,
                profile: { shopName: "Demo Shop", name: "Demo Seller", status: "APPROVED" },
                stats: { totalSales: 15000, totalProducts: 2, newOrders: 1, pendingOrders: 0 },
                products: [{ id: 'mock1', title: 'Sample Product', price: 999, stock: 10, category: 'Electronics' }],
                orders: [{ id: 'mock-o1', orderId: 'OD123', customer: 'Demo Customer', total: 999, status: 'Processing', date: new Date().toISOString().split('T')[0] }]
            });
        }

        return res.status(500).json({ success: false, message: "Failed to fetch dashboard data" });
    }
});

// PUT /seller/product/update/:id
app.put("/seller/product/update/:id", verifyAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { sellerId, productData } = req.body;
        if (!sellerId || !productData) return res.status(400).json({ success: false, message: "Missing data" });
        const updatePayload = { ...productData, updatedAt: admin.firestore.FieldValue.serverTimestamp() };
        delete updatePayload.id;
        await db.collection("products").doc(id).update(updatePayload);
        return res.status(200).json({ success: true, message: "Product updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update product" });
    }
});

// PUT /seller/order/:id/status
app.put("/seller/order/:id/status", verifyAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const VALID = ["Processing", "Pending", "Shipped", "Delivered", "Cancelled"];
        if (!status || !VALID.includes(status)) return res.status(400).json({ success: false, message: "Invalid status" });
        await db.collection("orders").doc(id).update({ status, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        return res.status(200).json({ success: true, message: "Order status updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update order" });
    }
});

// GET /auth/user-status/:uid
app.get("/auth/user-status/:uid", async (req, res) => {
    try {
        const { uid } = req.params;
        const userSnap = await db.collection("users").doc(uid).get();
        if (!userSnap.exists) {
            // User doesn't exist in users collection — NONE status
            return res.status(200).json({ success: true, role: 'CONSUMER', sellerStatus: 'NONE', status: 'NONE', isActive: true });
        }
        const userData = userSnap.data();

        // ALWAYS check sellers collection regardless of users.role
        // (because role in users may lag behind actual sellers doc)
        const sellerSnap = await db.collection("sellers").doc(uid).get();
        let sellerStatus = 'NONE';
        let sellerRole = userData.role || 'CONSUMER';

        if (sellerSnap.exists) {
            sellerStatus = sellerSnap.data().sellerStatus || 'PENDING';
            sellerRole = 'SELLER'; // Seller doc exists → they are a seller
        }

        return res.status(200).json({
            success: true,
            role: sellerRole,
            sellerStatus,
            status: sellerStatus,
            isActive: userData.isActive !== false
        });
    } catch (error) {
        console.error('USER STATUS ERROR:', error);
        return res.status(500).json({ success: false, message: "Failed to get user status" });
    }
});

// POST /auth/apply-seller — Supports both Firebase (idToken) and test users (uid directly)
app.post("/auth/apply-seller", async (req, res) => {
    try {
        const { idToken, uid: directUid, sellerDetails } = req.body;

        if (!sellerDetails) return res.status(400).json({ success: false, message: "Seller details required" });

        let uid = directUid;

        // If an idToken was provided, verify it with Firebase Admin to get the real UID
        if (idToken && !directUid) {
            try {
                const decodedToken = await admin.auth().verifyIdToken(idToken);
                uid = decodedToken.uid;
            } catch (tokenErr) {
                console.error('[apply-seller] Token verification failed:', tokenErr.message);
                return res.status(401).json({ success: false, message: 'Invalid authentication token. Please login again.' });
            }
        }

        if (!uid) {
            return res.status(400).json({ success: false, message: 'User authentication required. Please login first.' });
        }

        // Ensure user doc exists; create if not (handles edge cases)
        const userRef = db.collection("users").doc(uid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            await userRef.set({
                uid,
                phone: sellerDetails.phone || '',
                role: 'SELLER',
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            await userRef.update({
                role: 'SELLER',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Write/overwrite seller application document
        const sellerRef = db.collection("sellers").doc(uid);
        await sellerRef.set({
            uid,
            phone: sellerDetails.phone || '',
            shopName: sellerDetails.shopName || '',
            category: sellerDetails.category || '',
            address: sellerDetails.address || '',
            aadhaarNumber: sellerDetails.aadhaarNumber || '',
            age: sellerDetails.age || '',
            aadhaarImageUrl: sellerDetails.aadhaarImageUrl || '',
            extractedName: sellerDetails.extractedName || sellerDetails.fullName || '',
            sellerStatus: 'PENDING',
            appliedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`[apply-seller] Application submitted for uid=${uid}, shop=${sellerDetails.shopName}`);
        return res.status(200).json({ success: true, message: 'Application submitted successfully', status: 'PENDING' });
    } catch (error) {
        console.error('APPLY SELLER ERROR:', error);
        return res.status(500).json({ success: false, message: 'Failed to submit application: ' + error.message });
    }
});

// Keep v2 as alias for backward compatibility
app.post("/auth/apply-seller-v2", async (req, res) => {
    req.url = '/auth/apply-seller';
    const { idToken, uid: directUid, sellerDetails } = req.body;
    if (!sellerDetails) return res.status(400).json({ success: false, message: 'Seller details required' });
    let uid = directUid;
    if (idToken && !directUid) {
        try { const d = await admin.auth().verifyIdToken(idToken); uid = d.uid; } catch (e) { return res.status(401).json({ success: false, message: 'Invalid token' }); }
    }
    if (!uid) return res.status(400).json({ success: false, message: 'UID required' });
    const userRef = db.collection('users').doc(uid);
    const uSnap = await userRef.get();
    if (!uSnap.exists) await userRef.set({ uid, role: 'SELLER', isActive: true, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    else await userRef.update({ role: 'SELLER' });
    await db.collection('sellers').doc(uid).set({ uid, phone: sellerDetails.phone || '', shopName: sellerDetails.shopName || '', category: sellerDetails.category || '', address: sellerDetails.address || '', aadhaarNumber: sellerDetails.aadhaarNumber || '', age: sellerDetails.age || '', aadhaarImageUrl: sellerDetails.aadhaarImageUrl || '', extractedName: sellerDetails.extractedName || '', sellerStatus: 'PENDING', appliedAt: admin.firestore.FieldValue.serverTimestamp() });
    return res.status(200).json({ success: true, message: 'Application submitted', status: 'PENDING' });
});

// POST /auth/extract-aadhar — Aadhaar extraction with Gemini + Cloudinary
app.post("/auth/extract-aadhar", verifyAuth, upload.single("aadharImage"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No image file provided" });

        console.log(`[Aadhaar] Processing: ${req.file.originalname} (${(req.file.size / 1024).toFixed(0)}KB, ${req.file.mimetype})`);

        // Step 1: Extract with Gemini AI (uses model fallback internally)
        let extractedData;
        try {
            extractedData = await runGeminiExtraction(req.file.buffer, req.file.mimetype);
        } catch (e) {
            console.error('[Gemini] All models failed:', e.message);
            return res.status(422).json({
                success: false,
                message: 'Could not extract Aadhaar data. Please upload a clearer image.',
                error: e.message
            });
        }

        // Step 2: Upload to Cloudinary
        let imageUrl = '';
        try {
            const uploadResult = await new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'aadhaar_cards', resource_type: 'image' },
                    (error, result) => { if (error) return reject(error); resolve(result); }
                );
                Readable.from([req.file.buffer]).pipe(uploadStream);
            });
            imageUrl = uploadResult.secure_url;
            console.log(`[Cloudinary] Uploaded: ${imageUrl}`);
        } catch (uploadErr) {
            console.error('[Cloudinary] Upload failed:', uploadErr.message);
            return res.status(500).json({ success: false, message: 'Image upload to Cloudinary failed. Please try again.' });
        }

        // Calculate age from DOB
        let age = 'N/A';
        if (extractedData.dob) {
            const parts = extractedData.dob.split('/');
            const birthYear = parseInt(parts[parts.length - 1]);
            const currentYear = new Date().getFullYear();
            if (!isNaN(birthYear) && birthYear > 1900 && birthYear < currentYear) {
                age = currentYear - birthYear;
            }
        }

        return res.status(200).json({
            success: true,
            data: {
                name: extractedData.name || '',
                aadhaarNumber: extractedData.aadhaar_no || '',
                age,
                address: extractedData.address || '',
                gender: extractedData.gender || '',
                imageUrl
            }
        });

    } catch (error) {
        console.error('AADHAAR EXTRACTION ERROR:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to process Aadhaar card.',
            error: error.message
        });
    }
});

// POST /seller/upload-image — Upload product image to Cloudinary
app.post("/seller/upload-image", verifyAuth, upload.single("image"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "No image provided" });
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: "products", resource_type: "image" },
                (error, result) => { if (error) return reject(error); resolve(result); }
            );
            Readable.from([req.file.buffer]).pipe(uploadStream);
        });
        return res.status(200).json({ success: true, url: result.secure_url, message: "Image uploaded successfully" });
    } catch (error) {
        console.error("UPLOAD ERROR:", error);
        return res.status(500).json({ success: false, message: "Image upload failed: " + error.message });
    }
});

// ========== CONSUMER & PAYMENT ENDPOINTS ==========

// Order Tracking & Invoices
app.get("/api/orders/:orderId", verifyAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const snapshot = await db.collection("orders").doc(orderId).get();
        if (!snapshot.exists) {
            const query = await db.collection("orders").where("orderId", "==", orderId).get();
            if (query.empty) return res.status(404).json({ success: false, message: "Order not found" });
            return res.status(200).json({ success: true, order: { id: query.docs[0].id, ...query.docs[0].data() } });
        }
        return res.status(200).json({ success: true, order: { id: snapshot.id, ...snapshot.data() } });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to fetch order" });
    }
});

app.get("/api/user/:uid/orders", verifyAuth, orderController.getUserOrders);
app.get("/api/user/:uid/stats", verifyAuth, orderController.getOrderStats);
app.get("/api/invoice/:orderId", verifyAuth, orderController.downloadInvoice);

app.get("/api/orders/:orderId/label", verifyAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const snapshot = await db.collection("orders").doc(orderId).get();
        if (!snapshot.exists) {
            const query = await db.collection("orders").where("orderId", "==", orderId).get();
            if (query.empty) return res.status(404).json({ success: false, message: "Order not found" });
            const orderDoc = query.docs[0];
            const orderData = orderDoc.data();

            if (!orderData.shipmentId || !orderData.awbNumber) {
                return res.status(400).json({ success: false, message: "No shipment or AWB available for this order" });
            }

            const labelResult = await shiprocketService.getShippingLabel([orderData.shipmentId]);
            if (labelResult.success) {
                await orderDoc.ref.update({ labelUrl: labelResult.labelUrl });
                return res.status(200).json({ success: true, labelUrl: labelResult.labelUrl });
            } else {
                return res.status(400).json({ success: false, message: "Failed to fetch label", error: labelResult.error });
            }
        }

        const orderData = snapshot.data();
        if (!orderData.shipmentId || !orderData.awbNumber) {
            return res.status(400).json({ success: false, message: "No shipment or AWB available for this order" });
        }

        const labelResult = await shiprocketService.getShippingLabel([orderData.shipmentId]);
        if (labelResult.success) {
            await snapshot.ref.update({ labelUrl: labelResult.labelUrl });
            return res.status(200).json({ success: true, labelUrl: labelResult.labelUrl });
        } else {
            return res.status(400).json({ success: false, message: "Failed to fetch label", error: labelResult.error });
        }
    } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching label" });
    }
});

// Wishlist
app.get("/api/user/:uid/wishlist", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const snapshot = await db.collection("users").doc(uid).collection("wishlist").get();
        const items = [];
        snapshot.forEach(doc => items.push({ id: doc.id, ...doc.data() }));
        return res.status(200).json({ success: true, items });
    } catch (error) {
        console.error("Error fetching wishlist:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch wishlist", items: [] });
    }
});

app.post("/api/user/:uid/wishlist/add", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const { product } = req.body;

        console.log(`Adding to wishlist for user ${uid}:`, product);

        if (!product || !product.id) {
            return res.status(400).json({ success: false, message: "Invalid product data" });
        }

        await db.collection("users").doc(uid).collection("wishlist").doc(product.id).set(product);
        console.log(`✅ Successfully added ${product.id} to wishlist`);

        return res.status(200).json({ success: true, message: "Added to wishlist" });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        return res.status(500).json({ success: false, message: "Failed to add to wishlist" });
    }
});

// Profile & Address
app.post("/api/user/:uid/profile/update", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const { profileData } = req.body;
        // Prevent role escalation via profile update
        delete profileData.role;
        delete profileData.isActive;
        delete profileData.isAdmin;
        delete profileData.uid;
        await db.collection("users").doc(uid).update(profileData);
        return res.status(200).json({ success: true, message: "Profile updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update profile" });
    }
});

app.post("/api/user/:uid/address/update", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const { address } = req.body;
        await db.collection("users").doc(uid).update({ savedAddress: address });
        return res.status(200).json({ success: true, message: "Address updated" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to update address" });
    }
});

// Razorpay Payment Routes
app.post("/payment/create-order", verifyAuth, async (req, res) => {
    try {
        const { amount, cartItems, customerInfo } = req.body;
        const options = {
            amount: Math.round(amount * 100),
            currency: "INR",
            receipt: "order_" + Date.now(),
            notes: {
                customerName: customerInfo?.firstName || "Customer",
                itemCount: String(cartItems?.length || 0),
            },
        };
        const order = await razorpay.orders.create(options);
        return res.status(200).json({
            success: true,
            order: {
                id: order.id,
                amount: order.amount,
                currency: order.currency,
            },
            key_id: process.env.RAZORPAY_KEY_ID,
        });
    } catch (error) {
        console.error("CREATE ORDER ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to create payment order" });
    }
});

app.post("/payment/verify", async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            cartItems,
            customerInfo,
            amount,
            uid,
        } = req.body;

        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            const orderId = "OD" + Date.now();
            // Resolve sellerId from cart items (each item should have it from product data)
            const resolvedSellerId = (cartItems || []).find(i => i?.sellerId)?.sellerId || null;
            const orderData = {
                orderId,
                uid: uid || "guest",
                userId: uid || "guest",
                sellerId: resolvedSellerId,
                customerName: `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim(),
                email: customerInfo?.email || "",
                phone: customerInfo?.phone || "",
                shippingAddress: customerInfo?.address || {},
                items: cartItems || [],
                total: amount || 0,
                paymentMethod: "RAZORPAY",
                paymentId: razorpay_payment_id,
                razorpayOrderId: razorpay_order_id,
                status: "Processing",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Reuse orderController logic for saving/invoicing if possible, 
            // but for simplicity we'll just call it or duplicate a bit
            // Actually, let's just use the placeOrder logic or similar
            const orderRef = await db.collection("orders").add(orderData);

            // Try to generate invoice
            try {
                const invPath = await invoiceService.generateInvoice({ ...orderData, documentId: orderRef.id });
                await orderRef.update({ invoiceGenerated: true, invoicePath: invPath });
                if (orderData.email) {
                    emailService.sendOrderConfirmation(orderData.email, { ...orderData, documentId: orderRef.id }, invPath);
                }
            } catch (e) { console.error("Invoice Error:", e); }

            // Create shipment in Shiprocket after order creation
            try {
                console.log(`📦 Attempting to create Shiprocket shipment for order ${orderRef.id}...`);

                const shipmentData = {
                    orderId: orderData.orderId,
                    customerName: orderData.customerName,
                    customerEmail: orderData.email,
                    customerPhone: orderData.phone,
                    shippingAddress: orderData.shippingAddress,
                    items: orderData.items,
                    total: orderData.total,
                    paymentMethod: orderData.paymentMethod
                };

                const shipmentResult = await shiprocketService.createShipment(shipmentData);

                if (shipmentResult.success) {
                    // Update order with shipping data
                    const shippingUpdate = {
                        shiprocketOrderId: shipmentResult.shiprocketOrderId,
                        shipmentId: shipmentResult.shipmentId,
                        awbNumber: shipmentResult.awbNumber,
                        courierName: shipmentResult.courierName,
                        // shippingStatus will be set by webhook when Shiprocket confirms
                        shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
                    };

                    // Add estimated delivery if available
                    if (shipmentResult.estimatedDelivery) {
                        shippingUpdate.estimatedDelivery = shipmentResult.estimatedDelivery;
                    }

                    await orderRef.update(shippingUpdate);
                    console.log(`✅ Shiprocket shipment created successfully for order ${orderRef.id}`);

                    // 🚀 Trigger Auto Courier Assignment in Background
                    if (shipmentResult.shiprocketOrderId && shipmentResult.shipmentId) {
                        shiprocketService.autoAssignCourierAndGenerateAWB(
                            shipmentResult.shiprocketOrderId,
                            shipmentResult.shipmentId,
                            orderRef.id,
                            3000 // 3-second delay
                        ).then(async (assignmentResult) => {
                            if (assignmentResult.success) {
                                // Update order with AWB and courier details - strip undefined values
                                const awbUpdate = {};
                                if (assignmentResult.awbNumber !== undefined) awbUpdate.awbNumber = assignmentResult.awbNumber;
                                if (assignmentResult.courierName !== undefined) awbUpdate.courierName = assignmentResult.courierName;
                                if (assignmentResult.courierId !== undefined) awbUpdate.courierId = assignmentResult.courierId;
                                if (assignmentResult.courierRate !== undefined) awbUpdate.courierRate = assignmentResult.courierRate;
                                if (assignmentResult.estimatedDeliveryDays !== undefined) awbUpdate.estimatedDeliveryDays = assignmentResult.estimatedDeliveryDays;
                                awbUpdate.courierAssignedAt = admin.firestore.FieldValue.serverTimestamp();
                                await orderRef.update(awbUpdate);
                                console.log(`🚚 Background courier assignment successful for order ${orderRef.id}`);
                            } else {
                                console.error(`❌ Background courier assignment failed for order ${orderRef.id}:`, assignmentResult.error);
                            }
                        }).catch(err => {
                            console.error(`❌ Background courier assignment crashed for order ${orderRef.id}:`, err);
                        });
                    }
                } else {
                    // Log error but don't fail order creation
                    console.error(`❌ Shiprocket shipment creation failed for order ${orderRef.id}:`, shipmentResult.error);
                    await orderRef.update({
                        shiprocketError: shipmentResult.error || 'Shipment creation failed',
                        shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                }
            } catch (shiprocketError) {
                // Gracefully handle Shiprocket failures - order processing continues
                console.error(`❌ Shiprocket integration error for order ${orderRef.id}:`, shiprocketError.message);
                try {
                    await orderRef.update({
                        shiprocketError: shiprocketError.message || 'Shipment creation failed',
                        shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                } catch (updateError) {
                    console.error(`❌ Failed to update order with Shiprocket error:`, updateError.message);
                }
            }

            return res.status(200).json({ success: true, orderId: orderRef.id });
        } else {
            return res.status(400).json({ success: false, message: "Invalid signature" });
        }
    } catch (error) {
        console.error("VERIFY ERROR:", error);
        return res.status(500).json({ success: false, message: "Verification failed" });
    }
});

app.post("/payment/cod-order", verifyAuth, async (req, res) => {
    try {
        const { cartItems, customerInfo, amount, uid } = req.body;
        const orderId = "OD" + Date.now();
        // Resolve sellerId from cart items (each item should carry it from the product catalogue)
        const resolvedSellerId = (cartItems || []).find(i => i?.sellerId)?.sellerId || null;
        const orderData = {
            orderId,
            uid: uid || "guest",
            userId: uid || "guest",
            sellerId: resolvedSellerId,
            customerName: `${customerInfo?.firstName || ""} ${customerInfo?.lastName || ""}`.trim(),
            email: customerInfo?.email || "",
            phone: customerInfo?.phone || "",
            shippingAddress: customerInfo?.address || {},
            items: cartItems || [],
            total: amount || 0,
            paymentMethod: "COD",
            status: "Processing",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        const orderRef = await db.collection("orders").add(orderData);

        try {
            const invPath = await invoiceService.generateInvoice({ ...orderData, documentId: orderRef.id });
            await orderRef.update({ invoiceGenerated: true, invoicePath: invPath });
            if (orderData.email) {
                emailService.sendOrderConfirmation(orderData.email, { ...orderData, documentId: orderRef.id }, invPath);
            }
        } catch (e) { console.error("Invoice Error:", e); }

        // Create shipment in Shiprocket after order creation
        try {
            console.log(`📦 Attempting to create Shiprocket shipment for order ${orderRef.id}...`);

            const shipmentData = {
                orderId: orderData.orderId,
                customerName: orderData.customerName,
                customerEmail: orderData.email,
                customerPhone: orderData.phone,
                shippingAddress: orderData.shippingAddress,
                items: orderData.items,
                total: orderData.total,
                paymentMethod: orderData.paymentMethod
            };

            const shipmentResult = await shiprocketService.createShipment(shipmentData);

            if (shipmentResult.success) {
                // Update order with shipping data
                const shippingUpdate = {
                    shiprocketOrderId: shipmentResult.shiprocketOrderId,
                    shipmentId: shipmentResult.shipmentId,
                    awbNumber: shipmentResult.awbNumber,
                    courierName: shipmentResult.courierName,
                    // shippingStatus will be set by webhook when Shiprocket confirms
                    shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
                };

                // Add estimated delivery if available
                if (shipmentResult.estimatedDelivery) {
                    shippingUpdate.estimatedDelivery = shipmentResult.estimatedDelivery;
                }

                await orderRef.update(shippingUpdate);
                console.log(`✅ Shiprocket shipment created successfully for order ${orderRef.id}`);

                // 🚀 Trigger Auto Courier Assignment in Background
                if (shipmentResult.shiprocketOrderId && shipmentResult.shipmentId) {
                    shiprocketService.autoAssignCourierAndGenerateAWB(
                        shipmentResult.shiprocketOrderId,
                        shipmentResult.shipmentId,
                        orderRef.id,
                        3000 // 3-second delay
                    ).then(async (assignmentResult) => {
                        if (assignmentResult.success) {
                            // Update order with AWB and courier details - strip undefined values
                            const awbUpdate = {};
                            if (assignmentResult.awbNumber !== undefined) awbUpdate.awbNumber = assignmentResult.awbNumber;
                            if (assignmentResult.courierName !== undefined) awbUpdate.courierName = assignmentResult.courierName;
                            if (assignmentResult.courierId !== undefined) awbUpdate.courierId = assignmentResult.courierId;
                            if (assignmentResult.courierRate !== undefined) awbUpdate.courierRate = assignmentResult.courierRate;
                            if (assignmentResult.estimatedDeliveryDays !== undefined) awbUpdate.estimatedDeliveryDays = assignmentResult.estimatedDeliveryDays;
                            awbUpdate.courierAssignedAt = admin.firestore.FieldValue.serverTimestamp();
                            await orderRef.update(awbUpdate);
                            console.log(`🚚 Background courier assignment successful for order ${orderRef.id}`);
                        } else {
                            console.error(`❌ Background courier assignment failed for order ${orderRef.id}:`, assignmentResult.error);
                        }
                    }).catch(err => {
                        console.error(`❌ Background courier assignment crashed for order ${orderRef.id}:`, err);
                    });
                }
            } else {
                // Log error but don't fail order creation
                console.error(`❌ Shiprocket shipment creation failed for order ${orderRef.id}:`, shipmentResult.error);
                await orderRef.update({
                    shiprocketError: shipmentResult.error || 'Shipment creation failed',
                    shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        } catch (shiprocketError) {
            // Gracefully handle Shiprocket failures - order processing continues
            console.error(`❌ Shiprocket integration error for order ${orderRef.id}:`, shiprocketError.message);
            try {
                await orderRef.update({
                    shiprocketError: shiprocketError.message || 'Shipment creation failed',
                    shiprocketCreatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            } catch (updateError) {
                console.error(`❌ Failed to update order with Shiprocket error:`, updateError.message);
            }
        }

        return res.status(200).json({ success: true, orderId: orderRef.id });
    } catch (error) {
        console.error("COD ERROR:", error);
        return res.status(500).json({ success: false, message: "COD placement failed" });
    }
});

// POST /seller/pickup-address - Create seller pickup address in Shiprocket
app.post("/seller/pickup-address", verifyAuth, async (req, res) => {
    try {
        const { sellerData } = req.body;

        if (!sellerData) {
            return res.status(400).json({
                success: false,
                message: "Seller data is required"
            });
        }

        // Validate required fields
        const requiredFields = ['pickup_location', 'name', 'email', 'phone', 'address', 'city', 'state', 'country', 'pin_code'];
        const missingFields = requiredFields.filter(field => !sellerData[field]);

        if (missingFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Missing required fields: ${missingFields.join(', ')}`
            });
        }

        const result = await shiprocketService.createPickupAddress(sellerData);

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: result.message,
                pickupId: result.pickupId
            });
        } else {
            return res.status(400).json({
                success: false,
                message: result.error,
                details: result.details
            });
        }
    } catch (error) {
        console.error("CREATE PICKUP ADDRESS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to create pickup address"
        });
    }
});

// POST /api/orders/:orderId/cancel - Cancel order and shipment
app.post("/api/orders/:orderId/cancel", verifyAuth, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Find order by document ID or orderId field
        let orderDoc = await db.collection("orders").doc(orderId).get();

        if (!orderDoc.exists) {
            const query = await db.collection("orders").where("orderId", "==", orderId).get();
            if (query.empty) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found"
                });
            }
            orderDoc = query.docs[0];
        }

        const orderData = orderDoc.data();

        // Check if order has a shipment ID
        if (!orderData.shipmentId) {
            return res.status(400).json({
                success: false,
                message: "Order does not have a shipment ID"
            });
        }

        // Cancel shipment in Shiprocket
        const cancelResult = await shiprocketService.cancelOrder(
            orderData.shipmentId,
            orderData.orderId || orderId
        );

        if (cancelResult.success) {
            // Update order status in database
            await orderDoc.ref.update({
                status: "Cancelled",
                shippingStatus: "CANCELLED",
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
                cancellationReason: "Customer requested cancellation"
            });

            return res.status(200).json({
                success: true,
                message: "Order cancelled successfully"
            });
        } else {
            return res.status(400).json({
                success: false,
                message: cancelResult.error,
                details: cancelResult.details
            });
        }
    } catch (error) {
        console.error("CANCEL ORDER ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to cancel order"
        });
    }
});

// GET /seller/phone/:phone - Fetch seller details by phone number
app.get("/seller/phone/:phone", verifyAuth, async (req, res) => {
    try {
        const { phone } = req.params;

        // Query sellers collection by phone
        const sellersQuery = await db.collection("sellers")
            .where("phone", "==", phone)
            .limit(1)
            .get();

        if (sellersQuery.empty) {
            return res.status(404).json({
                success: false,
                message: "Seller not found with this phone number"
            });
        }

        const sellerDoc = sellersQuery.docs[0];
        const sellerData = sellerDoc.data();

        // Get user data as well
        const userDoc = await db.collection("users").doc(sellerDoc.id).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        return res.status(200).json({
            success: true,
            seller: {
                uid: sellerDoc.id,
                shopName: sellerData.shopName,
                phone: sellerData.phone,
                category: sellerData.category,
                address: sellerData.address,
                sellerStatus: sellerData.sellerStatus,
                email: userData.email || null,
                fullName: userData.fullName || sellerData.extractedName || null
            }
        });
    } catch (error) {
        console.error("GET SELLER BY PHONE ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch seller details"
        });
    }
});

// Shiprocket webhook endpoint for shipping status updates
app.post("/webhook/shiprocket", async (req, res) => {
    try {
        console.log("📦 Received Shiprocket webhook");

        // Extract webhook signature from header
        const signature = req.headers['x-shiprocket-signature'];

        if (!signature) {
            console.error('⚠️  SECURITY WARNING: Webhook request without signature');
            return res.status(403).json({
                success: false,
                message: "Forbidden: Missing signature"
            });
        }

        // Extract payload from request body
        const payload = req.body;

        // Verify webhook signature
        const isValid = shiprocketService.verifyWebhookSignature(payload, signature);

        if (!isValid) {
            console.error('⚠️  SECURITY WARNING: Invalid webhook signature detected');
            console.error('Signature received:', signature);
            console.error('Payload:', JSON.stringify(payload));
            return res.status(403).json({
                success: false,
                message: "Forbidden: Invalid signature"
            });
        }

        console.log('✅ Webhook signature verified successfully');

        // Extract shipment details from payload
        const {
            shipment_id,
            current_status,
            estimated_delivery_date,
            tracking_data
        } = payload;

        if (!shipment_id) {
            console.error('❌ Webhook payload missing shipment_id');
            return res.status(400).json({
                success: false,
                message: "Bad Request: Missing shipment_id"
            });
        }

        console.log(`📦 Processing webhook for shipment ${shipment_id}, status: ${current_status}`);

        // Query Firestore for order with matching shipmentId
        const ordersSnapshot = await db.collection('orders')
            .where('shipmentId', '==', shipment_id.toString())
            .limit(1)
            .get();

        if (ordersSnapshot.empty) {
            console.error(`❌ Order not found for shipment ID: ${shipment_id}`);
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        const orderDoc = ordersSnapshot.docs[0];
        const orderRef = orderDoc.ref;

        // Map Shiprocket status to internal status
        const internalStatus = shiprocketService.mapShiprocketStatus(current_status);
        console.log(`📊 Mapped status: ${current_status} → ${internalStatus}`);

        // Prepare update object
        const updateData = {
            shippingStatus: internalStatus,
            shiprocketUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        // Update estimated delivery if present in payload
        if (estimated_delivery_date) {
            updateData.estimatedDelivery = estimated_delivery_date;
            console.log(`📅 Updated estimated delivery: ${estimated_delivery_date}`);
        }

        // Append tracking events if present in payload
        if (tracking_data && Array.isArray(tracking_data) && tracking_data.length > 0) {
            // Get existing tracking events or initialize empty array
            const currentOrder = orderDoc.data();
            const existingEvents = currentOrder.trackingEvents || [];

            // Append new tracking events
            updateData.trackingEvents = [
                ...existingEvents,
                ...tracking_data.map(event => ({
                    date: event.date,
                    status: event.status,
                    location: event.location,
                    remarks: event.remarks
                }))
            ];

            console.log(`📍 Appended ${tracking_data.length} tracking event(s)`);
        }

        // Update order document
        await orderRef.update(updateData);

        console.log(`✅ Order ${orderRef.id} updated successfully with status ${internalStatus}`);

        return res.status(200).json({
            success: true,
            message: "Webhook processed successfully"
        });

    } catch (error) {
        console.error("❌ Webhook processing error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Wishlist remove endpoint
app.post("/api/user/:uid/wishlist/remove", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const { productId } = req.body;

        console.log(`Removing from wishlist for user ${uid}:`, productId);

        if (!productId) {
            return res.status(400).json({ success: false, message: "Invalid product ID" });
        }

        // Use the same structure as add endpoint: users/{uid}/wishlist/{productId}
        await db.collection("users").doc(uid).collection("wishlist").doc(productId).delete();
        console.log(`✅ Successfully removed ${productId} from wishlist`);

        return res.status(200).json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        return res.status(500).json({ success: false, message: "Failed to remove from wishlist" });
    }
});

// Address save endpoint
app.post("/api/user/:uid/address/save", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const { address } = req.body;

        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        if (!doc.exists) {
            await userRef.set({
                uid,
                addresses: [address],
                createdAt: new Date()
            });
        } else {
            const currentAddresses = doc.data().addresses || [];
            if (address.id !== undefined) {
                // Update existing address
                currentAddresses[address.id] = address;
            } else {
                // Add new address
                currentAddresses.push(address);
            }
            await userRef.update({
                addresses: currentAddresses,
                updatedAt: new Date()
            });
        }

        return res.status(200).json({ success: true, message: "Address saved" });
    } catch (error) {
        console.error("ADDRESS SAVE ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to save address" });
    }
});

// Address delete endpoint
app.post("/api/user/:uid/address/delete", verifyAuth, async (req, res) => {
    try {
        const { uid } = req.params;
        if (req.user.uid !== uid) return res.status(403).json({ success: false, message: "Access denied" });
        const { addressId } = req.body;

        const userRef = db.collection("users").doc(uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const currentAddresses = doc.data().addresses || [];
            currentAddresses.splice(addressId, 1);
            await userRef.update({
                addresses: currentAddresses,
                updatedAt: new Date()
            });
        }

        return res.status(200).json({ success: true, message: "Address deleted" });
    } catch (error) {
        console.error("ADDRESS DELETE ERROR:", error);
        return res.status(500).json({ success: false, message: "Failed to delete address" });
    }
});

const PORT = 5000;

// Shiprocket Integration Configuration Validation
const SHIPROCKET_CONFIG = {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
    apiUrl: process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external',
    webhookSecret: process.env.SHIPROCKET_WEBHOOK_SECRET,
    enabled: process.env.SHIPROCKET_ENABLED !== 'false'
};

// Log Shiprocket integration status on startup
if (SHIPROCKET_CONFIG.enabled) {
    if (!SHIPROCKET_CONFIG.email || !SHIPROCKET_CONFIG.password) {
        console.warn('⚠️  Shiprocket credentials not configured. Shipping integration disabled.');
        SHIPROCKET_CONFIG.enabled = false;
    } else {
        console.log('✅ Shiprocket integration enabled');
        console.log(`   API URL: ${SHIPROCKET_CONFIG.apiUrl}`);
        console.log(`   Email: ${SHIPROCKET_CONFIG.email}`);
        console.log(`   Webhook Secret: ${SHIPROCKET_CONFIG.webhookSecret ? 'Configured' : 'Not configured'}`);
    }
} else {
    console.log('ℹ️  Shiprocket integration disabled via SHIPROCKET_ENABLED flag');
}

app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});