const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function setup() {
    try {
        const userId = "test_919876543210";
        const productId = "deal-1";
        const productName = "MacBook Pro M2 Max";

        console.log(`Setting up test order for user: ${userId}, product: ${productId}`);

        // 1. Ensure user exists
        await db.collection("users").doc(userId).set({
            uid: userId,
            phone: "+919876543210",
            role: "CONSUMER",
            isActive: true,
            fullName: "Test Customer",
            email: "testcustomer@example.com"
        }, { merge: true });

        // 2. Create a delivered order
        const orderId = "ORD_TEST_" + Math.random().toString(36).substring(2, 9).toUpperCase();
        const orderData = {
            userId: userId,
            status: "Delivered",
            orderId: orderId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            totalAmount: 129999,
            paymentStatus: "Paid",
            items: [
                {
                    productId: productId,
                    name: productName,
                    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
                    price: 129999,
                    quantity: 1
                }
            ]
        };

        await db.collection("orders").add(orderData);

        console.log(`✅ SUCCESS: Created delivered order ${orderId} for "${productName}"`);
        console.log(`Login as Customer with phone: 9876543210 and OTP: 123456 to test reviews!`);

    } catch (error) {
        console.error("❌ ERROR setting up test data:", error);
    } finally {
        process.exit(0);
    }
}

setup();
