const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixEligibility() {
    try {
        const testUserId = "test_919876543210";
        const productId = "fashion-11";
        const productName = "Slim Fit Casual Shirt";

        console.log(`Ensuring delivered order for ${testUserId} and ${productId}`);

        // 1. Check if order already exists for this user/product
        const ordersSnap = await db.collection("orders")
            .where("userId", "==", testUserId)
            .get();

        let orderExists = false;
        for (const doc of ordersSnap.docs) {
            const data = doc.data();
            if (data.items?.some(item => (item.productId || item.id) === productId)) {
                console.log(`Found existing order ${data.orderId}. Marking as Delivered.`);
                await doc.ref.update({ status: "Delivered" });
                orderExists = true;
                break;
            }
        }

        if (!orderExists) {
            const orderId = "ORD_TEST_" + Math.random().toString(36).substring(2, 9).toUpperCase();
            await db.collection("orders").add({
                userId: testUserId,
                status: "Delivered",
                orderId: orderId,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                items: [
                    {
                        productId: productId,
                        name: productName,
                        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
                        price: 1899,
                        quantity: 1
                    }
                ]
            });
            console.log(`✅ SUCCESS: Created new delivered order for ${productName}`);
        } else {
            console.log("✅ SUCCESS: Updated existing order.");
        }

    } catch (error) {
        console.error("error:", error);
    } finally {
        process.exit(0);
    }
}

fixEligibility();
