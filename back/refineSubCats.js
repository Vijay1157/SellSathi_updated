const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function refineCategories() {
    console.log("🛠️ Refining product sub-categories...");
    const snap = await db.collection("products").get();
    let updatedCount = 0;

    for (const doc of snap.docs) {
        const data = doc.data();
        const name = data.name.toLowerCase();
        let newSub = null;

        if (name.includes('saree')) {
            newSub = "Ethnic Wear";
        } else if (name.includes('scarf')) {
            newSub = "Apparel";
        }

        if (newSub && data.subCategory !== newSub) {
            console.log(`Updating ${data.name}: ${data.subCategory} -> ${newSub}`);
            await doc.ref.update({
                subCategory: newSub
            });
            updatedCount++;
        }
    }

    console.log(`\n✅ Refinement complete! Updated ${updatedCount} products.`);
    process.exit();
}

refineCategories().catch(console.error);
