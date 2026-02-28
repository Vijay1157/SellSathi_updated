const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function inspectWishlist() {
    try {
        const uid = "Ox8g0aMTa5OX0a6GyvJAFjNsXn53";
        const wishlistSnap = await db.collection("users").doc(uid).collection("wishlist").get();
        console.log(`User: ${uid}, Wishlist size: ${wishlistSnap.size}`);
        wishlistSnap.forEach(doc => {
            console.log(`Document ID: ${doc.id}`);
            console.log(`Data:`, JSON.stringify(doc.data(), null, 2));
        });
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

inspectWishlist();
