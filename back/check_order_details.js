const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkOrder() {
    try {
        const orderId = "OD1772192641134";
        const ordersSnap = await db.collection("orders").where("orderId", "==", orderId).get();
        if (ordersSnap.empty) {
            console.log("No order found with ID " + orderId);
            return;
        }

        const data = ordersSnap.docs[0].data();
        console.log(`Order ID: ${data.orderId}`);
        console.log(`User ID: ${data.userId}`);
        console.log(`Status: ${data.status}`);
        console.log(`Items: ${JSON.stringify(data.items, null, 2)}`);

        // Force to Delivered just in case
        await ordersSnap.docs[0].ref.update({ status: "Delivered" });
        console.log("✅ Forced to Delivered.");

    } catch (e) { console.error(e); }
    finally { process.exit(0); }
}

checkOrder();
