const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectProducts() {
    try {
        const snap = await db.collection('products').limit(5).get();
        if (snap.empty) {
            console.log('No products found in the collection.');
            return;
        }

        console.log('Found', snap.size, 'products. Sample fields:');
        snap.forEach(doc => {
            const data = doc.data();
            console.log(`ID: ${doc.id}`);
            console.log('Fields:', Object.keys(data));
            if (data.sellerId) console.log('sellerId:', data.sellerId);
            if (data.sellerUID) console.log('sellerUID:', data.sellerUID);
            if (data.userId) console.log('userId:', data.userId);
            console.log('---');
        });

        // Also check if any products have a specific sellerId if we can find one in the sellers collection
        const sellerSnap = await db.collection('sellers').limit(1).get();
        if (!sellerSnap.empty) {
            const sellerId = sellerSnap.docs[0].id;
            console.log('Testing query for sellerId:', sellerId);
            const pSnap = await db.collection('products').where('sellerId', '==', sellerId).get();
            console.log('Query result size:', pSnap.size);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

inspectProducts();
