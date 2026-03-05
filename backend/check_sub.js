const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkSubproducts() {
    try {
        const sellerId = 'eOttR8lQDxgFsT97kN1Uoix6JAZ2';
        const subSnap = await db.collection('sellers').doc(sellerId).collection('listedproducts').get();
        console.log(`Sub-collection 'listedproducts' size for ${sellerId}:`, subSnap.size);
        if (subSnap.size > 0) {
            console.log('Sample sub-product title:', subSnap.docs[0].data().title || subSnap.docs[0].data().name);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkSubproducts();
