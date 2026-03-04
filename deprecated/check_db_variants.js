const admin = require('firebase-admin');
const serviceAccount = require('./back/serviceAccountKey.json');
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function check() {
    const snap = await db.collection('products').get();
    let found = 0;
    snap.forEach(doc => {
        const data = doc.data();
        if (data.variantImages || (data.colors && data.colors.length > 0) || (data.storage && data.storage.length > 0)) {
            console.log(`Product ${doc.id} - ${data.title}`);
            console.log(`Colors:`, data.colors);
            console.log(`Storage:`, data.storage);
            console.log(`variantImages:`, data.variantImages);
            console.log('---------------------------');
            found++;
        }
    });
    console.log(`Found ${found} products with variants.`);
}
check();
