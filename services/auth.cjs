const express = require("express");
const admin = require("firebase-admin");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

const db = admin.firestore();

// TEST CREDENTIALS - For development/testing purposes only
const TEST_CREDENTIALS = {
    '+917483743936': { otp: '123456', role: 'ADMIN' },
    '+919876543210': { otp: '123456', role: 'CONSUMER' }, // Test consumer number
    '+917676879059': { otp: '123456', role: 'CONSUMER' }, // Real phone - Test as consumer
    // Add more test numbers here as needed
};

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

        if (!userSnap.exists) {
            await userRef.set({
                uid,
                phone: phoneNumber,
                role: "CONSUMER",
                isActive: true,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            return res.status(200).json({
                success: true,
                uid,
                role: "CONSUMER",
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

        // STRICT SECURITY CHECK: Only specific phone number can be ADMIN
        const ADMIN_PHONE = "+917483743936";

        let userRole = userData.role;

        // If database says ADMIN but phone doesn't match, force CONSUMER
        if (userData.role === "ADMIN" && phoneNumber !== ADMIN_PHONE) {
            console.warn(`Security Alert: Non-admin phone ${phoneNumber} tried to login as ADMIN. Downgrading to CONSUMER.`);
            userRole = "CONSUMER";
        }

        // Only allow ADMIN role if phone matches exactly
        if (userRole === "ADMIN") {
            if (phoneNumber !== ADMIN_PHONE) {
                console.error(`SECURITY BREACH ATTEMPT: User with phone ${phoneNumber} trying to access admin with role ADMIN`);
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized admin access",
                });
            }
            return res.status(200).json({
                success: true,
                uid,
                role: "ADMIN",
                status: "AUTHORIZED",
                message: "Admin login successful",
            });
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
                return res.status(403).json({
                    success: false,
                    role: "SELLER",
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

        // STRICT SECURITY CHECK: Only specific phone number can have ADMIN role
        const ADMIN_PHONE = "+917483743936";
        let userRole = userData.role;

        if (userData.role === "ADMIN" && phoneNumber !== ADMIN_PHONE) {
            console.warn(`Security Alert: Non-admin phone ${phoneNumber} tried to login as ADMIN. Downgrading to CONSUMER.`);
            userRole = "CONSUMER";
        }

        // Only allow ADMIN role if phone matches exactly
        if (userRole === "ADMIN") {
            if (phoneNumber !== ADMIN_PHONE) {
                console.error(`SECURITY BREACH ATTEMPT: User with phone ${phoneNumber} trying to access admin with role ADMIN`);
                return res.status(403).json({
                    success: false,
                    message: "Unauthorized admin access",
                });
            }
            return res.status(200).json({
                success: true,
                uid,
                role: "ADMIN",
                status: "AUTHORIZED",
                message: "Admin login successful",
            });
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
app.get("/admin/stats", async (req, res) => {
    try {
        const usersSnap = await db.collection("users").get();
        const sellersSnap = await db.collection("sellers").get();
        const productsSnap = await db.collection("products").get();
        const ordersSnap = await db.collection("orders").get();

        const totalSellers = usersSnap.docs.filter(doc => doc.data().role === "SELLER").length;
        const pendingSellers = sellersSnap.docs.filter(doc => doc.data().sellerStatus === "PENDING").length;
        const totalProducts = productsSnap.size;
        const totalOrders = ordersSnap.size;

        return res.status(200).json({
            success: true,
            stats: {
                totalSellers,
                totalProducts,
                todayOrders: Math.floor(totalOrders * 0.3), // Estimate
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
app.get("/admin/sellers", async (req, res) => {
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
                joined: sellerData.appliedAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
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
app.get("/admin/products", async (req, res) => {
    try {
        const productsSnap = await db.collection("products").get();

        const products = [];
        for (const doc of productsSnap.docs) {
            const productData = doc.data();
            const sellerSnap = await db.collection("users").doc(productData.sellerId).get();
            const sellerData = sellerSnap.data();

            products.push({
                id: doc.id,
                title: productData.title,
                seller: sellerData?.phone || "Unknown",
                price: productData.price,
                category: productData.category,
                status: productData.status || "Active"
            });
        }

        return res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch products"
        });
    }
});

// GET /admin/orders - All orders
app.get("/admin/orders", async (req, res) => {
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
                date: orderData.createdAt?.toDate().toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
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

// POST /admin/seller/:uid/approve - Approve seller
app.post("/admin/seller/:uid/approve", async (req, res) => {
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
app.post("/admin/seller/:uid/reject", async (req, res) => {
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
app.get("/seller/:uid/stats", async (req, res) => {
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
app.get("/seller/:uid/products", async (req, res) => {
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
app.post("/seller/product/add", async (req, res) => {
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
app.delete("/seller/product/:id", async (req, res) => {
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
app.get("/seller/:uid/orders", async (req, res) => {
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

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Auth service running on port ${PORT}`);
});