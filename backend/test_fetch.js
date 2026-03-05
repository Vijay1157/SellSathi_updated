const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function testFetch() {
    const uid = 'eOttR8lQDxgFsT97kN1Uoix6JAZ2';
    try {
        const [productsSnap, subProductsSnap] = await Promise.all([
            db.collection("products").where("sellerId", "==", uid).limit(50).get(),
            db.collection("sellers").doc(uid).collection("listedproducts").limit(50).get()
        ]);

        console.log('Main collection count:', productsSnap.size);
        console.log('Sub-collection count:', subProductsSnap.size);

        const mainIds = productsSnap.docs.map(d => d.id);
        const subIds = subProductsSnap.docs.map(d => d.id);

        const productsMap = new Map();
        productsSnap.docs.forEach(doc => productsMap.set(doc.id, doc.data()));
        subProductsSnap.docs.forEach(doc => productsMap.set(doc.id, doc.data()));

        console.log('Merged unique count:', productsMap.size);
        if (productsMap.size > 0) {
            console.log('First product title:', Array.from(productsMap.values())[0].title);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}

testFetch();
