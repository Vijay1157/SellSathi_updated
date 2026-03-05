const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listSubcollections() {
    try {
        const sellerId = 'Ox8g0aMTa5OX0a6GyvJAFjNsXn53';
        const sellerRef = db.collection('sellers').doc(sellerId);
        const collections = await sellerRef.listCollections();
        console.log(`Sub-collections for seller ${sellerId}:`);
        collections.forEach(collection => {
            console.log(collection.id);
        });

        // Also check if products collection has any products with this sellerId (double check)
        const productsSnap = await db.collection('products').where('sellerId', '==', sellerId).get();
        console.log(`Verified products in 'products' collection: ${productsSnap.size}`);
        if (productsSnap.size > 0) {
            console.log('Sample product:', productsSnap.docs[0].data().title);
        }

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

listSubcollections();
