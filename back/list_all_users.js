const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function listUsers() {
    try {
        const snap = await db.collection("users").get();
        console.log(`Total users: ${snap.size}`);
        snap.forEach(doc => {
            console.log(`- ${doc.id} (name: ${doc.data().fullName || doc.data().name})`);
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

listUsers();
