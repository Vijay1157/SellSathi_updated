const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const electronics = [
    {
        name: "MacBook Pro M2 Max",
        price: 129999,
        oldPrice: 149498,
        rating: 4.8,
        reviews: 1256,
        category: "Electronics",
        subCategory: "Laptops",
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
        description: "The most powerful MacBook ever. Supercharged by the M2 Max chip, featuring a stunning Liquid Retina XDR display.",
        colors: ["Space Gray", "Silver"],
        materials: ["Aluminium"],
        types: ["14-inch", "16-inch"],
        specifications: { "Processor": "Apple M2 Max", "RAM": "32GB", "Storage": "1TB SSD", "Display": "XDR Retina" },
        status: "Active",
        featured: true
    },
    {
        name: "iPhone 15 Pro",
        price: 119999,
        oldPrice: 134900,
        rating: 4.9,
        reviews: 2450,
        category: "Electronics",
        subCategory: "Mobiles",
        image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800",
        description: "Titanium design, A17 Pro chip, and a pro camera system that redefines what a phone can do.",
        colors: ["Natural Titanium", "Blue Titanium"],
        specifications: { "Chip": "A17 Pro", "Camera": "48MP Main", "Battery": "All-day life" },
        status: "Active",
        featured: true
    },
    {
        name: "Sony WH-1000XM4 Wireless Headphones",
        price: 19999,
        oldPrice: 29999,
        rating: 4.8,
        reviews: 3200,
        category: "Electronics",
        subCategory: "Audio",
        image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800",
        description: "Industry-leading noise canceling with Dual Noise Sensor technology and premium sound quality.",
        colors: ["Black", "Midnight Blue"],
        specifications: { "Battery": "30 Hours", "Bluetooth": "v5.0", "Noise Canceling": "Yes" },
        status: "Active"
    },
    {
        name: "Apple Watch Series 9",
        price: 41900,
        oldPrice: 45900,
        rating: 4.7,
        reviews: 890,
        category: "Electronics",
        subCategory: "Wearables",
        image: "https://images.unsplash.com/photo-1434494878577-86c23bddad0f?w=800",
        description: "Smarten up your wrist. Faster SiP, brighter display, and more health insights.",
        colors: ["Midnight", "Starlight", "Silver"],
        materials: ["Aluminium"],
        specifications: { "Chip": "S9 SiP", "Heart Rate": "Optical Sensor", "Water Resistance": "50m" },
        status: "Active"
    }
];

async function seed() {
    console.log("🚀 Seeding Electronics products...");
    const collectionRef = db.collection("products");

    for (const product of electronics) {
        try {
            const docRef = await collectionRef.add({
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                sellerId: "system_generated",
                isApproved: true
            });
            console.log(`✅ Added: ${product.name} (ID: ${docRef.id})`);
        } catch (error) {
            console.error(`❌ Error adding ${product.name}:`, error);
        }
    }

    console.log("\n🎉 Electronics seeding complete!");
    process.exit();
}

seed();
