const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAllItems() {
    try {
        const userId = "Ox8g0aMTa5OX0a6GyvJAFjNsXn53";
        const ordersSnap = await db.collection("orders").where("userId", "==", userId).get();
        console.log(`User has ${ordersSnap.size} orders.`);
        ordersSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Order: ${data.orderId || doc.id}, Status: ${data.status}`);
            data.items?.forEach(item => {
                console.log(`  - Item: ${item.name}, ID: ${item.id}, ProductID: ${item.productId}`);
            });
        });
    } catch (e) { console.error(e); }
    finally { process.exit(0); }
}

checkAllItems();
