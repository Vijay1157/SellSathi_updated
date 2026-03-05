const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkAll() {
    try {
        const productsSnap = await db.collection('products').get();
        console.log(`Total products in main collection: ${productsSnap.size}`);

        const sellersWithProducts = new Set();
        productsSnap.forEach(doc => {
            const data = doc.data();
            if (data.sellerId) sellersWithProducts.add(data.sellerId);
        });

        console.log('Sellers with products in main collection:', Array.from(sellersWithProducts));

        const sellersSnap = await db.collection('sellers').get();
        for (const doc of sellersSnap.docs) {
            const subSnap = await doc.ref.collection('listedproducts').get();
            if (subSnap.size > 0) {
                console.log(`Seller ${doc.id} (${doc.data().shopName}) has ${subSnap.size} products in sub-collection.`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkAll();
