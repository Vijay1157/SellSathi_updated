const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const products = [
    // --- HOME & LIVING ---
    {
        name: "Modern Ergonomic Office Chair",
        price: 8999,
        oldPrice: 12999,
        rating: 4.6,
        reviews: 324,
        category: "Home & Living",
        subCategory: "Furniture",
        image: "https://images.unsplash.com/photo-1505797149-43b0069ec26b?w=800",
        description: "High-back mesh ergonomic chair with adjustable headrest and lumbar support for ultimate comfort during long work hours.",
        colors: ["Jet Black", "Space Gray"],
        materials: ["Breathable Mesh", "Heavy-duty Nylon"],
        types: ["Standard", "Plus-size"],
        specifications: { "Back Type": "High Back", "Base": "Chrome Steel", "Wheels": "360-degree Swivel", "Weight Capacity": "150kg" },
        status: "Active",
        featured: true
    },
    {
        name: "Minimalist Ceramic Vase Set",
        price: 1499,
        oldPrice: 2499,
        rating: 4.8,
        reviews: 156,
        category: "Home & Living",
        subCategory: "Decor",
        image: "https://images.unsplash.com/photo-1581783898377-1c85bf937427?w=800",
        description: "Set of 3 matte finish ceramic vases in neutral tones. Perfect for pampas grass or fresh flowers to add a touch of elegance to any room.",
        colors: ["Beige", "Cream", "Terra Cotta"],
        materials: ["Premium Ceramic"],
        types: ["Small", "Large"],
        specifications: { "Finish": "Matte", "Count": "3 Pieces", "Style": "Nordic Minimalist" },
        status: "Active"
    },

    // --- BEAUTY ---
    {
        name: "Revitalizing Glow Face Serum",
        price: 1299,
        oldPrice: 1999,
        rating: 4.7,
        reviews: 1245,
        category: "Beauty",
        subCategory: "Skincare",
        image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800",
        description: "Enriched with Vitamin C and Hyaluronic Acid, this serum brightens skin tone and reduces signs of aging.",
        colors: ["Clear"],
        materials: ["Natural Ingredients"],
        types: ["30ml Bottle", "50ml Bottle"],
        specifications: { "Key Ingredient": "15% Vitamin C", "Skin Type": "All Skin Types", "Paraben Free": "Yes", "Cruelty Free": "Yes" },
        status: "Active",
        featured: true
    },
    {
        name: "Sunset Oud Luxe Fragrance",
        price: 4999,
        oldPrice: 6500,
        rating: 4.9,
        reviews: 89,
        category: "Beauty",
        subCategory: "Fragrance",
        image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800",
        description: "A deep, mysterious blend of oud, amber, and spiced rose that lasts all day and night.",
        types: ["50ml EDP", "100ml EDP"],
        specifications: { "Fragrance Note": "Woody Oriental", "Intensity": "Strong", "Gender": "Unisex" },
        status: "Active"
    },

    // --- SPORTS & OUTDOOR ---
    {
        name: "Professional Yoga Mat - Ultra Grip",
        price: 1899,
        oldPrice: 2999,
        rating: 4.5,
        reviews: 567,
        category: "Sports",
        subCategory: "Fitness",
        image: "https://images.unsplash.com/photo-1592432678899-354966601f0c?w=800",
        description: "Extra thick 6mm TPE mat with non-slip texture for yoga, pilates, and floor exercises.",
        colors: ["Teal", "Deep Purple", "Slate Blue"],
        materials: ["Eco-friendly TPE"],
        specifications: { "Thickness": "6mm", "Dimensions": "183 x 61 cm", "Washable": "Yes" },
        status: "Active"
    },
    {
        name: "Quick-Dry Training Shorts",
        price: 799,
        oldPrice: 1299,
        rating: 4.4,
        reviews: 231,
        category: "Sports",
        subCategory: "Apparel",
        image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800",
        description: "Lightweight, breathable, and moisture-wicking shorts designed for high-intensity workouts.",
        colors: ["Black", "Neon Lime"],
        sizes: ["S", "M", "L", "XL"],
        materials: ["Polyester Blend"],
        specifications: { "Pockets": "Side Zipper", "Inseam": "7 inch", "Fit": "Athletic" },
        status: "Active"
    },

    // --- ACCESSORIES ---
    {
        name: "Leather Minimalist Wallet",
        price: 999,
        oldPrice: 1899,
        rating: 4.6,
        reviews: 742,
        category: "Accessories",
        subCategory: "Wallets",
        image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800",
        description: "Genuine top-grain leather wallet with RFID blocking technology and slim profile design.",
        colors: ["Cognac Brown", "Classic Black", "Navy Blue"],
        materials: ["Genuine Leather"],
        specifications: { "Card Slots": "8 Slots", "Currency Compartment": "1 Full Length", "RFID Blocking": "Yes" },
        status: "Active"
    },
    {
        name: "Urban Explorer Laptop Backpack",
        price: 2499,
        oldPrice: 3999,
        rating: 4.7,
        reviews: 432,
        category: "Accessories",
        subCategory: "Bags",
        image: "https://images.unsplash.com/photo-1553062407-98eebce4c6a7?w=800",
        description: "Water-resistant backpack with dedicated 15.6-inch laptop compartment and USB charging port.",
        colors: ["Charcoal Grey", "Olive Green"],
        materials: ["Waterproof Oxford Fabric"],
        specifications: { "Capacity": "22 Liters", "Laptop Size": "Up to 15.6 inch", "Weight": "0.8 kg" },
        status: "Active",
        featured: true
    },

    // --- MORE FASHION ---
    {
        name: "Vintage Oversized Denim Jacket",
        price: 3499,
        oldPrice: 4999,
        rating: 4.8,
        reviews: 215,
        category: "Women's Fashion",
        subCategory: "Western Wear",
        image: "https://images.unsplash.com/photo-1544441893-675973e31985?w=800",
        description: "Classic blue denim jacket with a relaxed, oversized fit. Featuring silver-tone buttons and four pockets.",
        colors: ["Light Wash", "Medium Wash"],
        sizes: ["S", "M", "L"],
        materials: ["100% Cotton Denim"],
        specifications: { "Style": "Oversized", "Length": "Standard", "Closure": "Buttons" },
        status: "Active"
    },
    {
        name: "Leather Chelsea Boots",
        price: 4999,
        oldPrice: 6999,
        rating: 4.5,
        reviews: 189,
        category: "Men's Fashion",
        subCategory: "Footwear",
        image: "https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=800",
        description: "Sleek and versatile Chelsea boots made from high-quality suede leather with comfortable elastic side panels.",
        colors: ["Tan", "Dark Brown"],
        sizes: ["7", "8", "9", "10", "11"],
        materials: ["Suede Leather", "TPR Sole"],
        specifications: { "Toe Shape": "Round", "Heel Height": "1 inch", "Grip": "Non-slip" },
        status: "Active"
    },

    // --- ELECTRONICS ---
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
    console.log("🚀 Starting database seeding...");
    const collectionRef = db.collection("products");

    for (const product of products) {
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

    console.log("\n🎉 Seeding complete! Check your Marketplace to see the new products.");
    process.exit();
}

seed();
