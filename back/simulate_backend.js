const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function simulateBackend() {
    try {
        const uid = "Ox8g0aMTa5OX0a6GyvJAFjNsXn53";
        const productIdToFind = "fashion-11";

        // This is a direct copy of the backend logic
        const ordersSnap = await db.collection("orders")
            .where("userId", "==", uid)
            .where("status", "==", "Delivered")
            .get();

        console.log(`Orders found for user ${uid}: ${ordersSnap.size}`);

        const reviewsSnap = await db.collection("reviews")
            .where("userId", "==", uid)
            .get();

        const reviewedProducts = new Set();
        reviewsSnap.forEach(doc => {
            const review = doc.data();
            if (review.productId) reviewedProducts.add(review.productId);
        });

        const reviewableOrders = [];
        ordersSnap.forEach(doc => {
            const order = doc.data();
            if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                    const pid = item.productId || item.id;
                    if (!reviewedProducts.has(pid)) {
                        reviewableOrders.push({
                            productId: pid,
                            productName: item.name
                        });
                    }
                });
            }
        });

        console.log("Reviewable Orders Result:");
        console.log(JSON.stringify(reviewableOrders, null, 2));

        const match = reviewableOrders.find(o => o.productId === productIdToFind);
        if (match) {
            console.log(`✅ MATCH FOUND for ${productIdToFind}`);
        } else {
            console.log(`❌ NO MATCH FOUND for ${productIdToFind}`);
        }

    } catch (e) { console.error(e); }
    finally { process.exit(0); }
}

simulateBackend();
