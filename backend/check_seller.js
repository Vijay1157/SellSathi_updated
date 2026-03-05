const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSeller() {
    try {
        const id = 'Ox8g0aMTa5OX0a6GyvJAFjNsXn53';
        const sellerSnap = await db.collection('sellers').doc(id).get();
        console.log(`Seller ${id} exists search:`, sellerSnap.exists);
        if (sellerSnap.exists) {
            console.log('Seller Status:', sellerSnap.data().sellerStatus);
        }

        const productSnap = await db.collection('products').where('sellerId', '==', id).get();
        console.log(`Products for ${id}:`, productSnap.size);

    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSeller();
