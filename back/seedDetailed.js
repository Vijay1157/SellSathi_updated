const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const detailedProducts = [
    // --- ELECTRONICS ---
    {
        name: "MacBook Pro M3",
        price: 159999,
        category: "Electronics",
        subCategory: "Laptops",
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
        rating: 4.8,
        reviews: 156,
        specifications: { "Processor": "Apple M3 Chip (8-core CPU)", "Memory": "16GB Unified RAM", "Storage": "512GB SSD", "Display": "14-inch Liquid Retina XDR", "Battery": "Up to 22 hours", "Ports": "HDMI, MagSafe 3, SDXC" },
        status: "Active"
    },
    {
        name: "iPhone 15 Pro Max",
        price: 145000,
        category: "Electronics",
        subCategory: "Mobiles",
        image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800",
        rating: 4.9,
        reviews: 432,
        specifications: { "Chip": "A17 Pro chip", "Camera": "Pro camera system (48MP Main)", "Display": "6.7-inch Super Retina XDR", "Capacity": "256GB", "Charging": "USB-C (Fast charging)", "Material": "Titanium with Textured Matte Glass" },
        status: "Active"
    },
    {
        name: "Sony WH-1000XM5",
        price: 29999,
        category: "Electronics",
        subCategory: "Audio",
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800",
        rating: 4.9,
        reviews: 1240,
        specifications: { "Noise Canceling": "Industry-leading Noise Cancellation", "Driver Unit": "30mm", "Battery Life": "Up to 30 hours", "Charging": "Quick charge (3 min for 3 hours)", "Bluetooth": "Version 5.2", "Weight": "250g" },
        status: "Active"
    },

    // --- MEN'S FASHION ---
    {
        name: "Oxford Button-Down Shirt",
        price: 2499,
        category: "Men's Fashion",
        subCategory: "Apparel",
        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
        rating: 4.5,
        reviews: 124,
        sizes: ["S", "M", "L", "XL", "XXL"],
        specifications: { "Material": "100% Giza Cotton", "Fit": "Slim Fit", "Pattern": "Solid", "Collar": "Button-down", "Sleeve": "Full Sleeve", "Care": "Machine Wash Cold" },
        status: "Active"
    },
    {
        name: "Premium Leather Loafers",
        price: 4500,
        category: "Men's Fashion",
        subCategory: "Footwear",
        image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800",
        rating: 4.6,
        reviews: 56,
        sizes: ["7", "8", "9", "10", "11"],
        specifications: { "Upper Material": "Genuine Calfskin Leather", "Sole": "Handcrafted Leather Sole", "Lining": "Breathable Leather", "Closure": "Slip-on", "Toe Shape": "Round" },
        status: "Active"
    },

    // --- WOMEN'S FASHION ---
    {
        name: "Silk Embroidered Anarkali",
        price: 7500,
        category: "Women's Fashion",
        subCategory: "Ethnic Wear",
        image: "https://images.unsplash.com/photo-1610030469668-93510cb6f43e?w=800",
        rating: 4.8,
        reviews: 92,
        sizes: ["S", "M", "L", "XL"],
        specifications: { "Fabric": "Pure Banarasi Silk", "Work": "Hand-embroidered Zari", "Set Contents": "Kurtar, Dupatta, Palazzo", "Occasion": "Festive/Wedding", "Dry Clean": "Only" },
        status: "Active"
    },
    {
        name: "Wool Blend Oversized Scarf",
        price: 1500,
        category: "Women's Fashion",
        subCategory: "Apparel",
        image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800",
        rating: 4.6,
        reviews: 78,
        specifications: { "Material": "70% Wool, 30% Acrylic", "Dimensions": "70cm x 200cm", "Texture": "Soft Knit", "Pattern": "Herringbone", "Weight": "Medium" },
        status: "Active"
    },

    // --- HOME & LIVING ---
    {
        name: "Cast Iron Dutch Oven",
        price: 6500,
        category: "Home & Living",
        subCategory: "Kitchen",
        image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800",
        rating: 4.9,
        reviews: 112,
        specifications: { "Material": "Enameled Cast Iron", "Capacity": "5.5 Quarts", "Heat Resistance": "Up to 500°F", "Compatability": "Gas, Electric, Induction", "Finish": "Glossy Enamel" },
        status: "Active"
    },

    // --- BEAUTY ---
    {
        name: "Wild Wood Eau de Parfum",
        price: 5500,
        category: "Beauty",
        subCategory: "Fragrance",
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800",
        rating: 4.8,
        reviews: 84,
        specifications: { "Scent Type": "Woody/Earthy", "Top Notes": "Sandalwood, Sandalwood", "Heart Notes": "Amber, Cedar", "Volume": "100ml", "Longevity": "8-10 Hours" },
        status: "Active"
    }
];

async function seedDetailed() {
    console.log("🚀 Seeding detailed products with real specs and sizes...");
    const collectionRef = db.collection("products");

    for (const product of detailedProducts) {
        try {
            // Find existing by name and update or add
            const q = await collectionRef.where("name", "==", product.name).get();
            if (!q.empty) {
                const docId = q.docs[0].id;
                await collectionRef.doc(docId).update({
                    ...product,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`✅ Updated: ${product.name}`);
            } else {
                await collectionRef.add({
                    ...product,
                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                    sellerId: "system_generated",
                    isApproved: true,
                    description: `Detailed ${product.name} with premium category-specific specifications.`
                });
                console.log(`✨ Added: ${product.name}`);
            }
        } catch (error) {
            console.error(`❌ Error with ${product.name}:`, error);
        }
    }

    console.log("\n🎉 Detailed seeding complete!");
    process.exit();
}

seedDetailed().catch(console.error);
