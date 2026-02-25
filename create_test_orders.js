const http = require('http');

const TEST_UID = 'test_917483743936';

const createTestOrder = async () => {
    const orderId = 'OD' + Math.floor(Math.random() * 9000000000 + 1000000000);
    
    const orderData = {
        orderId: orderId,
        items: [
            {
                id: 'prod_001',
                productId: 'prod_001',
                name: 'Premium Wireless Headphones',
                price: 2499,
                quantity: 1,
                imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                sellerId: 'seller_001'
            },
            {
                id: 'prod_002',
                productId: 'prod_002',
                name: 'Smart Watch Series 5',
                price: 4999,
                quantity: 2,
                imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
                sellerId: 'seller_002'
            }
        ],
        total: 12497,
        shippingAddress: {
            firstName: 'Rajesh',
            lastName: 'Kumar',
            addressLine: '123 MG Road, Koramangala',
            city: 'Bangalore',
            pincode: '560034'
        },
        paymentMethod: 'razorpay',
        paymentId: 'pay_' + Math.random().toString(36).substring(7),
        status: 'Placed',
        customerName: 'Rajesh Kumar',
        email: 'rajesh.kumar@example.com',
        phone: '+917483743936'
    };

    try {
        const postData = JSON.stringify({
            uid: TEST_UID,
            orderData: orderData
        });

        const options = {
            hostname: 'localhost',
            port: 5000,
            path: '/api/orders/place',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const response = await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => { data += chunk; });
                res.on('end', () => {
                    try {
                        resolve(JSON.parse(data));
                    } catch (e) {
                        reject(e);
                    }
                });
            });
            req.on('error', reject);
            req.write(postData);
            req.end();
        });

        if (response.success) {
            console.log('✅ Order created:', orderId);
            return { success: true, orderId };
        } else {
            console.log('❌ Failed:', response.message);
            return { success: false };
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        return { success: false };
    }
};

const createMultipleOrders = async (count = 3) => {
    console.log(`\n📦 Creating ${count} test orders...\n`);
    
    for (let i = 0; i < count; i++) {
        await createTestOrder();
        if (i < count - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    console.log('\n✅ Test orders created successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Open http://localhost:5173');
    console.log('   2. Login with phone: +917483743936');
    console.log('   3. Navigate to Dashboard');
    console.log('   4. Click on orders to see details\n');
};

createMultipleOrders(3).catch(console.error);
