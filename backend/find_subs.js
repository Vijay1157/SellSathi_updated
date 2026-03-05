const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function findSubcollections() {
    try {
        const sellersSnap = await db.collection('sellers').limit(10).get();
        for (const doc of sellersSnap.docs) {
            const collections = await doc.ref.listCollections();
            if (collections.length > 0) {
                console.log(`Seller ${doc.id} has sub-collections:`, collections.map(c => c.id));
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

findSubcollections();
