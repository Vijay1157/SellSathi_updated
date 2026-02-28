const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkReviews() {
    try {
        const uids = ["Ox8g0aMTa5OX0a6GyvJAFjNsXn53", "test_919876543210"];
        for (const uid of uids) {
            const rx = await db.collection("reviews").where("userId", "==", uid).where("productId", "==", "fashion-11").get();
            console.log(`User: ${uid}, Reviews for fashion-11: ${rx.size}`);
        }
    } catch (e) { console.error(e); }
    finally { process.exit(0); }
}

checkReviews();
