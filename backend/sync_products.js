const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function syncProducts() {
    try {
        const sellersSnap = await db.collection('sellers').get();
        console.log(`Found ${sellersSnap.size} sellers.`);

        for (const sellerDoc of sellersSnap.docs) {
            const subSnap = await sellerDoc.ref.collection('listedproducts').get();
            if (subSnap.empty) continue;

            console.log(`Syncing ${subSnap.size} products for seller ${sellerDoc.id}...`);

            for (const pDoc of subSnap.docs) {
                const data = pDoc.data();
                const productId = pDoc.id;

                // Check if exists in main
                const mainRef = db.collection('products').doc(productId);
                const mainSnap = await mainRef.get();

                if (!mainSnap.exists) {
                    console.log(`  Adding ${productId} (${data.title || data.name}) to main collection.`);
                    await mainRef.set({
                        ...data,
                        sellerId: sellerDoc.id,
                        status: data.status || "Active",
                        createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    // Update sellerId if missing or different
                    const mainData = mainSnap.data();
                    if (mainData.sellerId !== sellerDoc.id) {
                        console.log(`  Updating sellerId for ${productId}`);
                        await mainRef.update({ sellerId: sellerDoc.id });
                    }
                }
            }
        }
        console.log('Sync complete.');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

syncProducts();
