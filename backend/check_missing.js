const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkMissing() {
    try {
        const sellerId = 'eOttR8lQDxgFsT97kN1Uoix6JAZ2';
        const subSnap = await db.collection('sellers').doc(sellerId).collection('listedproducts').get();
        console.log(`Sub-collection size: ${subSnap.size}`);

        for (const doc of subSnap.docs) {
            const mainSnap = await db.collection('products').doc(doc.id).get();
            if (!mainSnap.exists) {
                console.log(`Product ${doc.id} (${doc.data().title}) is MISSING from main products collection.`);
            } else {
                console.log(`Product ${doc.id} exists in both.`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

checkMissing();
