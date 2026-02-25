const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const getTemplate = (product) => {
    const cat = product.category || "";
    const name = product.name || "";

    if (cat.includes("Electronics")) {
        return {
            specifications: {
                "Brand": name.split(' ')[0],
                "Model": name,
                "Warranty": "1 Year Manufacturer Warranty",
                "Condition": "Brand New",
                "Shipping": "Express Delivery Available"
            },
            sizes: null
        };
    } else if (cat.includes("Fashion")) {
        return {
            specifications: {
                "Material": "Premium Hybrid Fabric",
                "Fit": "Standard Fit",
                "Care": "Machine Washable",
                "Occasion": "Casual/Formal",
                "Origin": "India"
            },
            sizes: ["S", "M", "L", "XL", "XXL"]
        };
    } else if (cat.includes("Home & Living")) {
        return {
            specifications: {
                "Material": "Eco-friendly Material",
                "Dimensions": "Standard Size",
                "Care": "Wipe with damp cloth",
                "Warranty": "6 Months"
            },
            sizes: null
        };
    } else if (cat.includes("Beauty")) {
        return {
            specifications: {
                "Skin Type": "All Skin Types",
                "Volume": "100ml",
                "Ingredients": "Natural Extracts",
                "Expiry": "24 Months from MFG"
            },
            sizes: ["50ml", "100ml", "200ml"]
        };
    }
    return {
        specifications: {
            "Category": cat,
            "Quality": "Premium",
            "Condition": "Brand New",
            "Support": "24/7 Customer Care"
        },
        sizes: null
    };
};

async function fixAll() {
    console.log("🚀 Harmonizing all products with specs and sizes...");
    const snap = await db.collection("products").get();

    let updatedCount = 0;
    for (const doc of snap.docs) {
        const data = doc.data();
        const template = getTemplate(data);

        const updates = {};
        if (!data.specifications || Object.keys(data.specifications).length <= 3) {
            updates.specifications = { ...template.specifications, ...data.specifications };
        }
        if ((data.category?.includes("Fashion") || data.category?.includes("Beauty")) && (!data.sizes || data.sizes.length === 0)) {
            updates.sizes = template.sizes;
        }

        if (Object.keys(updates).length > 0) {
            await doc.ref.update(updates);
            updatedCount++;
            console.log(`✅ Fixed: ${data.name}`);
        }
    }

    console.log(`\n🎉 Task complete! Updated ${updatedCount} products.`);
    process.exit();
}

fixAll().catch(console.error);
