const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function checkReviews() {
    try {
        const userId = "Ox8g0aMTa5OX0a6GyvJAFjNsXn53";
        const reviewsSnap = await db.collection("reviews").where("userId", "==", userId).get();
        console.log(`Found ${reviewsSnap.size} reviews for user ${userId}`);

        reviewsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Review ID: ${doc.id}`);
            console.log(`Product: ${data.productName} (${data.productId})`);
            console.log(`Status: ${data.status}`);
            console.log(`Verified: ${data.verified}`);
            console.log(`Rating: ${data.rating}`);
            console.log(`Created At: ${data.createdAt?.toDate()}`);
            console.log('---');
        });

        // Also check reviews for the product itself to see if they are active
        const productId = "fashion-11";
        const prodReviewsSnap = await db.collection("reviews").where("productId", "==", productId).get();
        console.log(`Total reviews for ${productId}: ${prodReviewsSnap.size}`);
        prodReviewsSnap.forEach(doc => {
            console.log(`- Review ${doc.id}, Status: ${doc.data().status}`);
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

checkReviews();
