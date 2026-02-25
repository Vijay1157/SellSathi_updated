const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const MAPPING = {
    'Home Decor': { cat: 'Home & Living', sub: 'Decor' },
    'Wall Art': { cat: 'Home & Living', sub: 'Decor' },
    'Woodcraft': { cat: 'Home & Living', sub: 'Furniture' },
    'Metal Craft': { cat: 'Home & Living', sub: 'Decor' },
    'Textiles': { cat: 'Home & Living', sub: 'Furnishings' },
    'Beauty & Personal Care': { cat: 'Beauty', sub: 'Skincare' },
    'Clothing': { cat: 'Men\'s Fashion', sub: 'Apparel' },
    'Fashion': { cat: 'Men\'s Fashion', sub: 'Apparel' }
};

async function normalize() {
    console.log("🛠️ Normalizing product categories...");
    const snap = await db.collection("products").get();

    let updatedCount = 0;

    for (const doc of snap.docs) {
        const data = doc.data();
        const originalCat = data.category;
        const mapping = MAPPING[originalCat];
        let newCat = null;
        let newSub = data.subCategory;

        if (mapping) {
            newCat = mapping.cat;
            newSub = data.subCategory || mapping.sub;
        } else if (originalCat === "Fashion" || originalCat === "Clothing" || originalCat === "Men's Fashion" || originalCat === "Women's Fashion") {
            const name = data.name.toLowerCase();
            const isWomen = name.includes('women') || name.includes('saree') || name.includes('kurti') || name.includes('dress') || name.includes('top') || name.includes('floral');
            newCat = isWomen ? "Women's Fashion" : "Men's Fashion";
        }

        if (newCat && (newCat !== data.category || newSub !== data.subCategory)) {
            console.log(`Updating ${data.name}: ${data.category} -> ${newCat}`);
            await doc.ref.update({
                category: newCat,
                subCategory: newSub
            });
            updatedCount++;
        }
    }

    console.log(`\n✅ Normalization complete! Updated ${updatedCount} products.`);
    process.exit();
}

normalize();
