const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();
const sellerId = "eOttR8lQDxgFsT97kN1Uoix6JAZ2";

async function applyDiscounts() {
    console.log(`🚀 Applying discounts for seller ${sellerId}...`);
    const snap = await db.collection("products").where("sellerId", "==", sellerId).get();

    let updatedCount = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        let p1 = parseFloat(data.price) || 0;
        let p2 = parseFloat(data.discountPrice) || 0;

        let needsUpdate = false;
        let updates = {};

        // 1. Handle Swapped Prices (detected if discountPrice > price)
        if (p2 > p1) {
            console.log(`🔄 Swapping for ${data.title} (MRP: ${p2}, Sale: ${p1})`);
            // We'll keep them as is since my priceUtils handle the swap,
            // but let's ensure there is AT LEAST a 10% gap if it's too close.
        }

        // 2. Add 10% discount if missing OR if they are too close/identical
        const hasNoDiscount = !data.discountPrice || p1 === p2 || p2 === 0;

        if (hasNoDiscount) {
            const originalMRP = p1;
            const newSellingPrice = Math.round(originalMRP * 0.9); // 10% OFF

            updates.discountPrice = newSellingPrice;
            needsUpdate = true;
            console.log(`🏷️ Added 10% discount to ${data.title}: MRP ${originalMRP} -> Sale ${newSellingPrice}`);
        }

        if (needsUpdate) {
            await doc.ref.update(updates);
            updatedCount++;
        }
    }

    console.log(`\n🎉 Done! Updated ${updatedCount} products with discounts.`);
    process.exit();
}

applyDiscounts().catch(console.error);
