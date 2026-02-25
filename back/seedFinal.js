const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

const allProducts = [
    // --- ELECTRONICS ---
    { name: "MacBook Pro M3", price: 159999, category: "Electronics", subCategory: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", rating: 4.8, reviews: 156, status: "Active" },
    { name: "Dell XPS 15", price: 135000, category: "Electronics", subCategory: "Laptops", image: "https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800", rating: 4.7, reviews: 89, status: "Active" },
    { name: "iPhone 15 Pro Max", price: 145000, category: "Electronics", subCategory: "Mobiles", image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=800", rating: 4.9, reviews: 432, status: "Active" },
    { name: "Samsung Galaxy S24 Ultra", price: 124999, category: "Electronics", subCategory: "Mobiles", image: "https://images.unsplash.com/photo-1610945415295-d9baf060e79f?w=800", rating: 4.8, reviews: 267, status: "Active" },
    { name: "Sony WH-1000XM5", price: 29999, category: "Electronics", subCategory: "Audio", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800", rating: 4.9, reviews: 1240, status: "Active" },
    { name: "Bose QuietComfort Ultra", price: 35900, category: "Electronics", subCategory: "Audio", image: "https://images.unsplash.com/photo-1546435770-a3e426ff472b?w=800", rating: 4.8, reviews: 542, status: "Active" },
    { name: "Apple Watch Ultra 2", price: 89900, category: "Electronics", subCategory: "Wearables", image: "https://images.unsplash.com/photo-1434494878577-86c23bddad0f?w=800", rating: 4.9, reviews: 156, status: "Active" },
    { name: "Google Pixel Watch 2", price: 32900, category: "Electronics", subCategory: "Wearables", image: "https://images.unsplash.com/photo-1544117519-31a4b719223d?w=800", rating: 4.4, reviews: 89, status: "Active" },

    // --- MEN'S FASHION ---
    { name: "Oxford Button-Down Shirt", price: 2499, category: "Men's Fashion", subCategory: "Apparel", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", rating: 4.5, reviews: 124, status: "Active" },
    { name: "Slim Fit Chinos", price: 1999, category: "Men's Fashion", subCategory: "Apparel", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800", rating: 4.3, reviews: 88, status: "Active" },
    { name: "Premium Leather Loafers", price: 4500, category: "Men's Fashion", subCategory: "Footwear", image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800", rating: 4.6, reviews: 56, status: "Active" },
    { name: "Classic White Sneakers", price: 3200, category: "Men's Fashion", subCategory: "Footwear", image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800", rating: 4.7, reviews: 231, status: "Active" },
    { name: "Water-Resistant Windbreaker", price: 3999, category: "Men's Fashion", subCategory: "Western Wear", image: "https://images.unsplash.com/photo-1591047139829-d91aec16adcd?w=800", rating: 4.5, reviews: 45, status: "Active" },

    // --- WOMEN'S FASHION ---
    { name: "Silk Embroidered Anarkali", price: 7500, category: "Women's Fashion", subCategory: "Ethnic Wear", image: "https://images.unsplash.com/photo-1610030469668-93510cb6f43e?w=800", rating: 4.8, reviews: 92, status: "Active" },
    { name: "Handcrafted Phulkari Dupatta", price: 1200, category: "Women's Fashion", subCategory: "Ethnic Wear", image: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800", rating: 4.7, reviews: 156, status: "Active" },
    { name: "Linen Wide-Leg Trousers", price: 2800, category: "Women's Fashion", subCategory: "Western Wear", image: "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=800", rating: 4.4, reviews: 65, status: "Active" },
    { name: "Designer Floral Midi Dress", price: 4200, category: "Women's Fashion", subCategory: "Western Wear", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800", rating: 4.7, reviews: 112, status: "Active" },
    { name: "Wool Blend Oversized Scarf", price: 1500, category: "Women's Fashion", subCategory: "Apparel", image: "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800", rating: 4.6, reviews: 78, status: "Active" },

    // --- HOME & LIVING ---
    { name: "Ceramic Minimalist Table Lamp", price: 3500, category: "Home & Living", subCategory: "Decor", image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800", rating: 4.7, reviews: 43, status: "Active" },
    { name: "Hand-Knotted Wool Rug", price: 12000, category: "Home & Living", subCategory: "Furnishings", image: "https://images.unsplash.com/photo-1534349762230-e0cadf78f5db?w=800", rating: 4.9, reviews: 28, status: "Active" },
    { name: "Mid-Century Modern Coffee Table", price: 18500, category: "Home & Living", subCategory: "Furniture", image: "https://images.unsplash.com/photo-1532372320572-cda25653a26d?w=800", rating: 4.8, reviews: 15, status: "Active" },
    { name: "Cast Iron Dutch Oven", price: 6500, category: "Home & Living", subCategory: "Kitchen", image: "https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=800", rating: 4.9, reviews: 112, status: "Active" },

    // --- BEAUTY ---
    { name: "Luxe Rose Face Oil", price: 2100, category: "Beauty", subCategory: "Skincare", image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800", rating: 4.7, reviews: 345, status: "Active" },
    { name: "Vitamin C Brightening Mask", price: 1200, category: "Beauty", subCategory: "Skincare", image: "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800", rating: 4.5, reviews: 221, status: "Active" },
    { name: "Wild Wood Eau de Parfum", price: 5500, category: "Beauty", subCategory: "Fragrance", image: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=800", rating: 4.8, reviews: 84, status: "Active" },
    { name: "Matte Velvet Lipstick Set", price: 1800, category: "Beauty", subCategory: "Makeup", image: "https://images.unsplash.com/photo-1586776977607-310e9c725c37?w=800", rating: 4.6, reviews: 567, status: "Active" },

    // --- SPORTS ---
    { name: "Adjustable Dumbbell Set", price: 14500, category: "Sports", subCategory: "Fitness", image: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800", rating: 4.8, reviews: 89, status: "Active" },
    { name: "Yoga Starter Kit", price: 2500, category: "Sports", subCategory: "Fitness", image: "https://images.unsplash.com/photo-1592432678899-354966601f0c?w=800", rating: 4.6, reviews: 142, status: "Active" },
    { name: "Waterproof Hiking Boots", price: 5800, category: "Sports", subCategory: "Outdoor", image: "https://images.unsplash.com/photo-1520639889313-7272fd9e3682?w=800", rating: 4.7, reviews: 56, status: "Active" },
    { name: "Performance Compression Tee", price: 999, category: "Sports", subCategory: "Apparel", image: "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800", rating: 4.4, reviews: 231, status: "Active" },

    // --- ACCESSORIES ---
    { name: "Automatic Open/Close Umbrella", price: 850, category: "Accessories", subCategory: "General", image: "https://images.unsplash.com/photo-1521193089946-7aa29d1fe334?w=800", rating: 4.3, reviews: 156, status: "Active" },
    { name: "Laptop Protective Sleeve", price: 1200, category: "Accessories", subCategory: "Bags", image: "https://images.unsplash.com/photo-1553062407-98eebce4c6a7?w=800", rating: 4.6, reviews: 82, status: "Active" },
    { name: "RFID Blocking Card Holder", price: 650, category: "Accessories", subCategory: "Wallets", image: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=800", rating: 4.5, reviews: 124, status: "Active" },
    { name: "Canvas Tote Bag - Eco Friendly", price: 450, category: "Accessories", subCategory: "Bags", image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=800", rating: 4.7, reviews: 345, status: "Active" }
];

async function seedEverything() {
    console.log("🚀 Starting massive database seeding...");
    const collectionRef = db.collection("products");

    for (const product of allProducts) {
        try {
            const docRef = await collectionRef.add({
                ...product,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                sellerId: "system_generated",
                isApproved: true,
                description: `High-quality ${product.name} with premium features and excellent durability. Perfect for your daily needs.`,
                featured: Math.random() > 0.8
            });
            console.log(`✅ Added: ${product.name} (ID: ${docRef.id})`);
        } catch (error) {
            console.error(`❌ Error adding ${product.name}:`, error);
        }
    }

    console.log("\n🎉 Seeding complete!");
    process.exit();
}

seedEverything().catch(console.error);
