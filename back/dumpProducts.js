const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function dumpAll() {
    const snap = await db.collection("products").get();
    const data = snap.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
        category: doc.data().category,
        sub: doc.data().subCategory
    }));
    console.log(JSON.stringify(data, null, 2));
    process.exit();
}

dumpAll().catch(console.error);
