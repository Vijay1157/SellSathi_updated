const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function fixUserData() {
    try {
        const uids = ["Ox8g0aMTa5OX0a6GyvJAFjNsXn53", "test_919876543210"];
        for (const uid of uids) {
            const userDoc = await db.collection("users").doc(uid).get();
            if (!userDoc.exists) {
                await db.collection("users").doc(uid).set({
                    fullName: uid.startsWith("test") ? "Test Customer" : "Premium Customer",
                    role: "CONSUMER",
                    phoneNumber: uid.includes("919876543210") ? "919876543210" : ""
                });
            } else {
                const data = userDoc.data();
                if (!data.fullName && !data.name) {
                    await db.collection("users").doc(uid).update({
                        fullName: "Premium Customer"
                    });
                }
            }
        }
        console.log("✅ Users data verified.");
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

fixUserData();
