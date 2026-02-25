const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const expandedColors = [
    'Midnight Black', 'Pearl White', 'Silver Metallic', 'Rose Gold',
    'Royal Blue', 'Emerald Green', 'Deep Crimson', 'Space Gray',
    'Starlight', 'Ocean Teal'
];

async function updateProducts() {
    console.log("🚀 Updating all products: Expanding colors and removing old variants...");
    const snap = await db.collection("products").get();

    let updatedCount = 0;
    for (const doc of snap.docs) {
        const data = doc.data();

        const updates = {
            materials: admin.firestore.FieldValue.delete(),
            types: admin.firestore.FieldValue.delete(),
            colors: expandedColors.slice(0, 5 + Math.floor(Math.random() * 5)) // Random selection of 5-10 colors
        };

        await doc.ref.update(updates);
        updatedCount++;
        console.log(`✅ Updated: ${data.name}`);
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} products.`);
    process.exit();
}

updateProducts().catch(console.error);
