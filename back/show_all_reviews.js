const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function showAllReviews() {
    try {
        const prodReviewsSnap = await db.collection("reviews").where("productId", "==", "fashion-11").get();
        console.log(`Reviews found for fashion-11: ${prodReviewsSnap.size}`);

        prodReviewsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Review ID: ${doc.id}`);
            console.log(`User: ${data.userId}`);
            console.log(`Customer: ${data.customerName}`);
            console.log(`Status: ${data.status}`);
            console.log(`Verified: ${data.verified}`);
            console.log(`Rating: ${data.rating}`);
            console.log(`CreatedAt: ${data.createdAt?.toDate()}`);
            console.log('---');
        });

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

showAllReviews();
