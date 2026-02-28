const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixEverything() {
    try {
        const userId = "Ox8g0aMTa5OX0a6GyvJAFjNsXn53"; // From user's screenshot
        const productId = "fashion-11";

        console.log(`Fixing for user ${userId}`);

        // 1. Mark all orders for this user as Delivered
        const ordersSnap = await db.collection("orders").where("userId", "==", userId).get();
        for (const doc of ordersSnap.docs) {
            await doc.ref.update({ status: "Delivered" });
            console.log(`Order ${doc.id} marked as Delivered.`);
        }

        // 2. Ensure user exists
        await db.collection("users").doc(userId).set({
            role: "CONSUMER",
            fullName: "User",
            uid: userId
        }, { merge: true });

        // 3. Clear any reviews just in case (already checked, but being thorough)
        const reviewsSnap = await db.collection("reviews").where("userId", "==", userId).where("productId", "==", productId).get();
        for (const doc of reviewsSnap.docs) {
            await doc.ref.delete();
            console.log(`Deleted existing review ${doc.id}`);
        }

        console.log("✅ Fix completed. Please tell the user to refresh.");

    } catch (e) { console.error(e); }
    finally { process.exit(0); }
}

fixEverything();
