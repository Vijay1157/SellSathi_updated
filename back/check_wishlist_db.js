const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkWishlist() {
    try {
        const uids = ["Ox8g0aMTa5OX0a6GyvJAFjNsXn53", "test_919876543210"];
        for (const uid of uids) {
            const wishlistSnap = await db.collection("users").doc(uid).collection("wishlist").get();
            console.log(`User: ${uid}, Wishlist size: ${wishlistSnap.size}`);
            wishlistSnap.forEach(doc => {
                console.log(`- Item: ${doc.id}, Name: ${doc.data().name}`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkWishlist();
