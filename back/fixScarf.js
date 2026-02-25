const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixProduct() {
    console.log("🔍 Searching for 'Handwoven Cotton Scarf'...");
    const snap = await db.collection("products").where("name", "==", "Handwoven Cotton Scarf").get();

    if (snap.empty) {
        // Try case-insensitive search or partial match if exact fails
        console.log("Exact match failed, trying partial match...");
        const all = await db.collection("products").get();
        all.forEach(async (doc) => {
            if (doc.data().name.toLowerCase().includes("handwoven cotton scarf")) {
                console.log(`Found: ${doc.data().name} (${doc.id}) in ${doc.data().category}`);
                await doc.ref.update({
                    category: "Women's Fashion",
                    subCategory: "Ethnic Wear" // or Accessories
                });
                console.log("Successfully moved to Women's Fashion");
            }
        });
    } else {
        snap.forEach(async (doc) => {
            console.log(`Found: ${doc.id} in ${doc.data().category}`);
            await doc.ref.update({
                category: "Women's Fashion",
                subCategory: "Ethnic Wear"
            });
            console.log("Successfully moved to Women's Fashion");
        });
    }
}

fixProduct().catch(console.error);
