const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function updateOrderStatus() {
    try {
        const orderIds = ["OD1772192641134", "OD1772191252467", "OD1772196860508"];

        for (const orderId of orderIds) {
            const ordersSnap = await db.collection("orders").where("orderId", "==", orderId).get();
            if (!ordersSnap.empty) {
                const orderDoc = ordersSnap.docs[0];
                await orderDoc.ref.update({
                    status: "Delivered",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`✅ SUCCESS: Order ${orderId} marked as Delivered.`);

                // Get the product name to tell the user
                const orderData = orderDoc.data();
                const productName = orderData.items?.[0]?.name || "Product";
                console.log(`You can now review: ${productName}`);
                break; // Just do one
            }
        }
    } catch (error) {
        console.error("❌ ERROR updating order:", error);
    } finally {
        process.exit(0);
    }
}

updateOrderStatus();
