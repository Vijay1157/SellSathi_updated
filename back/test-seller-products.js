const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(require("./serviceAccountKey.json")),
});

const db = admin.firestore();

async function testSellerProducts() {
    try {
        console.log("🔍 Testing seller products query...\n");
        
        // Get all sellers
        const sellersSnap = await db.collection("sellers").get();
        console.log(`📊 Total sellers in database: ${sellersSnap.size}\n`);
        
        // Find Rahul
        let rahulSeller = null;
        sellersSnap.forEach(doc => {
            const data = doc.data();
            if (data.shopName && data.shopName.toLowerCase().includes('rahul')) {
                rahulSeller = { uid: doc.id, ...data };
                console.log(`✅ Found seller: ${data.shopName}`);
                console.log(`   UID: ${doc.id}`);
                console.log(`   Status: ${data.sellerStatus}`);
                console.log(`   Category: ${data.category}\n`);
            }
        });
        
        if (!rahulSeller) {
            console.log("❌ Seller 'Rahul' not found in database");
            console.log("\n📋 Available sellers:");
            sellersSnap.forEach(doc => {
                const data = doc.data();
                console.log(`   - ${data.shopName} (${doc.id})`);
            });
            return;
        }
        
        // Query products for Rahul
        console.log(`🔍 Querying products for seller UID: ${rahulSeller.uid}\n`);
        const productsSnap = await db.collection("products").where("sellerId", "==", rahulSeller.uid).get();
        
        console.log(`📦 Products found: ${productsSnap.size}\n`);
        
        if (productsSnap.size > 0) {
            console.log("📋 Product details:");
            productsSnap.forEach(doc => {
                const data = doc.data();
                console.log(`   - ${data.title || data.name}`);
                console.log(`     ID: ${doc.id}`);
                console.log(`     Seller ID: ${data.sellerId}`);
                console.log(`     Price: Rs.${data.price}`);
                console.log(`     Category: ${data.category}`);
                console.log(`     Status: ${data.status || 'N/A'}`);
                console.log("");
            });
        } else {
            console.log("❌ No products found for this seller");
            console.log("\n🔍 Checking all products to see if any match...");
            
            const allProductsSnap = await db.collection("products").get();
            console.log(`   Total products in database: ${allProductsSnap.size}`);
            
            let matchingProducts = [];
            allProductsSnap.forEach(doc => {
                const data = doc.data();
                if (data.sellerId && data.sellerId.includes(rahulSeller.uid.substring(0, 10))) {
                    matchingProducts.push({
                        id: doc.id,
                        title: data.title || data.name,
                        sellerId: data.sellerId
                    });
                }
            });
            
            if (matchingProducts.length > 0) {
                console.log(`\n   ⚠️  Found ${matchingProducts.length} products with similar seller ID:`);
                matchingProducts.forEach(p => {
                    console.log(`      - ${p.title}`);
                    console.log(`        Seller ID: ${p.sellerId}`);
                    console.log(`        Expected: ${rahulSeller.uid}`);
                    console.log("");
                });
            }
        }
        
        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

testSellerProducts();
