const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function audit() {
    console.log("🔍 Auditing product categories...");
    const snap = await db.collection("products").get();

    const categories = new Set();
    const subCategories = new Set();
    const items = [];

    snap.forEach(doc => {
        const data = doc.data();
        categories.add(data.category);
        subCategories.add(data.subCategory);
        items.push({ id: doc.id, name: data.name, cat: data.category, sub: data.subCategory });
    });

    console.log("\nUnique Categories in DB:", Array.from(categories));
    console.log("Unique SubCategories in DB:", Array.from(subCategories));
    console.log("\nFirst 10 products:");
    console.table(items.slice(0, 10));

    process.exit();
}

audit();
