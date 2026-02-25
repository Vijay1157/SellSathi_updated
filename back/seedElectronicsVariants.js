const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const storageOptions = {
    "Laptops": [
        { label: "256GB SSD", priceOffset: -10000 },
        { label: "512GB SSD", priceOffset: 0 },
        { label: "1TB SSD", priceOffset: 15000 },
        { label: "2TB SSD", priceOffset: 45000 }
    ],
    "Mobiles": [
        { label: "128GB", priceOffset: -5000 },
        { label: "256GB", priceOffset: 0 },
        { label: "512GB", priceOffset: 12000 },
        { label: "1TB", priceOffset: 25000 }
    ],
    "Tablets": [
        { label: "64GB", priceOffset: -4000 },
        { label: "128GB", priceOffset: 0 },
        { label: "256GB", priceOffset: 8000 },
        { label: "512GB", priceOffset: 18000 }
    ]
};

const memoryOptions = {
    "Laptops": [
        { label: "8GB RAM", priceOffset: -8000 },
        { label: "16GB RAM", priceOffset: 0 },
        { label: "32GB RAM", priceOffset: 25000 },
        { label: "64GB RAM", priceOffset: 55000 }
    ],
    "Mobiles": [
        { label: "8GB RAM", priceOffset: 0 },
        { label: "12GB RAM", priceOffset: 6000 }
    ],
    "Tablets": [
        { label: "8GB RAM", priceOffset: 0 },
        { label: "16GB RAM", priceOffset: 12000 }
    ]
};

const defaultColors = [
    { name: "Graphite", code: "#383838" },
    { name: "Silver", code: "#E3E4E5" },
    { name: "Space Gray", code: "#53565A" }
];

async function seedElectronicsVariants() {
    console.log("🚀 Seeding storage, memory and colors for Electronics...");
    const snap = await db.collection("products").where("category", "==", "Electronics").get();

    let updatedCount = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        const subCat = data.subCategory || "";
        const name = data.name || "";

        let updates = {};

        // Storage & Memory
        if (subCat.includes("Laptops") || name.toLowerCase().includes("macbook") || name.toLowerCase().includes("laptop")) {
            updates.storage = storageOptions["Laptops"];
            updates.memory = memoryOptions["Laptops"];
        } else if (subCat.includes("Mobiles") || subCat.includes("Smartphones") || name.toLowerCase().includes("iphone") || name.toLowerCase().includes("galaxy")) {
            updates.storage = storageOptions["Mobiles"];
            updates.memory = memoryOptions["Mobiles"];
        } else if (subCat.includes("Tablets") || name.toLowerCase().includes("ipad")) {
            updates.storage = storageOptions["Tablets"];
            updates.memory = memoryOptions["Tablets"];
        }

        // Colors (if missing or simple strings)
        if (!data.colors || data.colors.length === 0 || typeof data.colors[0] === 'string') {
            updates.colors = defaultColors;
        }

        if (Object.keys(updates).length > 0) {
            await doc.ref.update(updates);
            updatedCount++;
            console.log(`✅ Updated: ${name} (${subCat})`);
        }
    }

    console.log(`\n🎉 Successfully updated ${updatedCount} electronics products.`);
    process.exit();
}

seedElectronicsVariants().catch(console.error);
