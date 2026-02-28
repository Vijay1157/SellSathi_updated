const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testBackendQueries() {
    console.log("--- Testing Admin Query ---");
    try {
        const snap = await db.collection("reviews")
            .where("status", "==", "active")
            .orderBy("createdAt", "desc")
            .get();
        console.log(`✅ Success: Found ${snap.size} active reviews (admin)`);
    } catch (e) {
        console.error("❌ Admin query FAILED (likely missing index):", e.message);
    }

    console.log("\n--- Testing Product Query ---");
    try {
        const productId = "fashion-11";
        const snap = await db.collection("reviews")
            .where("productId", "==", productId)
            .where("status", "==", "active")
            .orderBy("createdAt", "desc")
            .get();
        console.log(`✅ Success: Found ${snap.size} reviews for ${productId}`);
    } catch (e) {
        console.error("❌ Product query FAILED (likely missing index):", e.message);
    }

    console.log("\n--- Testing fallback ---");
    try {
        const snap = await db.collection("reviews")
            .where("status", "==", "active")
            .get();
        console.log(`✅ Success: Found ${snap.size} reviews without orderBy`);
    } catch (e) {
        console.error("❌ Fallback query FAILED:", e.message);
    }
}

testBackendQueries();
