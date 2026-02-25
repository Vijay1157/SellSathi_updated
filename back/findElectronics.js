const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const ELECTRONICS_KEYWORDS = ['laptop', 'phone', 'watch', 'camera', 'earbud', 'headphone', 'macbook', 'iphone', 'samsung', 'canon', 'sony', 'tv', 'television', 'monitor', 'keyboard', 'mouse', 'charger', 'battery'];

async function findMisplacedElectronics() {
    console.log("🔍 Searching for misplaced electronics...");
    const snap = await db.collection("products").get();
    const misplaced = [];

    snap.forEach(doc => {
        const data = doc.data();
        const name = data.name.toLowerCase();
        const category = data.category;

        const isElectronicsKeyword = ELECTRONICS_KEYWORDS.some(kw => name.includes(kw));

        if (isElectronicsKeyword && category !== 'Electronics') {
            misplaced.push({ id: doc.id, name: data.name, category: category, subCategory: data.subCategory });
        }
    });

    if (misplaced.length > 0) {
        console.log(`Found ${misplaced.length} misplaced electronics products:`);
        console.table(misplaced);
    } else {
        console.log("No misplaced electronics found with the current keywords.");
    }
    process.exit();
}

findMisplacedElectronics().catch(console.error);
