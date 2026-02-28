const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function seedWishlist() {
    try {
        const uid = "test_919876543210";
        const product = {
            id: "fashion-11",
            name: "Slim Fit Casual Shirt",
            price: 1899,
            image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
            category: "Men's Fashion",
            rating: 4.4,
            reviews: 128,
            addedAt: Date.now()
        };
        await db.collection("users").doc(uid).collection("wishlist").doc(product.id).set(product);
        console.log(`✅ Seeded wishlist item for ${uid}`);
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

seedWishlist();
