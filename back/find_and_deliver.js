const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function findProductAndDeliver() {
    try {
        const orderId = "OD1772192641134";
        const ordersSnap = await db.collection("orders").where("orderId", "==", orderId).get();

        if (ordersSnap.empty) {
            console.log("❌ Could not find order " + orderId);
            return;
        }

        const orderDoc = ordersSnap.docs[0];
        const orderData = orderDoc.data();
        const productId = orderData.items?.[0]?.productId || orderData.items?.[0]?.id;
        const userId = orderData.userId;

        console.log(`Found Order: ${orderId}`);
        console.log(`User ID: ${userId}`);
        console.log(`Product ID: ${productId}`);
        console.log(`Product Name: ${orderData.items?.[0]?.name}`);

        // Mark as Delivered
        await orderDoc.ref.update({ status: "Delivered" });
        console.log("✅ Marked as Delivered.");

    } catch (error) {
        console.error("error:", error);
    } finally {
        process.exit(0);
    }
}

findProductAndDeliver();
