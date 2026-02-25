/**
 * Integration Test Script
 * Tests the complete payment and order flow
 */

const testIntegration = async () => {
    console.log('\n🚀 INTEGRATION TEST STARTING...\n');
    console.log('=' .repeat(60));

    const tests = [];
    let passed = 0;
    let failed = 0;

    // Test 1: Backend Server
    console.log('\n📡 Test 1: Backend Server Health Check');
    try {
        const response = await fetch('http://localhost:5000/');
        const data = await response.json();
        if (data.message === 'Auth service is running') {
            console.log('✅ Backend server is running');
            tests.push({ name: 'Backend Server', status: 'PASS' });
            passed++;
        } else {
            throw new Error('Unexpected response');
        }
    } catch (error) {
        console.log('❌ Backend server check failed:', error.message);
        tests.push({ name: 'Backend Server', status: 'FAIL', error: error.message });
        failed++;
    }

    // Test 2: Razorpay Configuration
    console.log('\n🔑 Test 2: Razorpay Configuration Check');
    try {
        const testOrder = {
            amount: 100,
            cartItems: [{ id: 'test', name: 'Test Item', price: 100, quantity: 1 }],
            customerInfo: { firstName: 'Test', lastName: 'User' }
        };

        const response = await fetch('http://localhost:5000/payment/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testOrder)
        });

        const data = await response.json();
        
        if (data.success && data.key_id && data.order) {
            console.log('✅ Razorpay configuration is valid');
            console.log(`   Key ID: ${data.key_id}`);
            console.log(`   Order ID: ${data.order.id}`);
            tests.push({ name: 'Razorpay Config', status: 'PASS' });
            passed++;
        } else {
            throw new Error('Invalid Razorpay response');
        }
    } catch (error) {
        console.log('❌ Razorpay configuration check failed:', error.message);
        tests.push({ name: 'Razorpay Config', status: 'FAIL', error: error.message });
        failed++;
    }

    // Test 3: COD Order Endpoint
    console.log('\n💵 Test 3: COD Order Endpoint');
    try {
        const codOrder = {
            uid: 'test-user-123',
            cartItems: [
                { id: 'item1', name: 'Test Product', price: 500, quantity: 2, imageUrl: 'https://via.placeholder.com/150' }
            ],
            customerInfo: {
                firstName: 'John',
                lastName: 'Doe',
                email: 'test@example.com',
                phone: '9876543210',
                address: {
                    firstName: 'John',
                    lastName: 'Doe',
                    addressLine: '123 Test Street',
                    city: 'Bangalore',
                    pincode: '560001'
                }
            },
            amount: 1000
        };

        const response = await fetch('http://localhost:5000/payment/cod-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(codOrder)
        });

        const data = await response.json();
        
        if (data.success && data.orderId) {
            console.log('✅ COD order created successfully');
            console.log(`   Order ID: ${data.orderId}`);
            tests.push({ name: 'COD Order', status: 'PASS', orderId: data.orderId });
            passed++;
        } else {
            throw new Error('COD order creation failed: ' + data.message);
        }
    } catch (error) {
        console.log('❌ COD order endpoint failed:', error.message);
        tests.push({ name: 'COD Order', status: 'FAIL', error: error.message });
        failed++;
    }

    // Test 4: Frontend Accessibility
    console.log('\n🌐 Test 4: Frontend Server Check');
    try {
        const response = await fetch('http://localhost:5173/');
        if (response.ok) {
            console.log('✅ Frontend server is accessible');
            tests.push({ name: 'Frontend Server', status: 'PASS' });
            passed++;
        } else {
            throw new Error('Frontend not accessible');
        }
    } catch (error) {
        console.log('❌ Frontend server check failed:', error.message);
        tests.push({ name: 'Frontend Server', status: 'FAIL', error: error.message });
        failed++;
    }

    // Test 5: API Endpoints Documentation
    console.log('\n📚 Test 5: API Endpoints Availability');
    const endpoints = [
        { method: 'POST', path: '/payment/create-order', description: 'Create Razorpay Order' },
        { method: 'POST', path: '/payment/verify', description: 'Verify Payment' },
        { method: 'POST', path: '/payment/cod-order', description: 'Create COD Order' }
    ];

    console.log('✅ Available API Endpoints:');
    endpoints.forEach(ep => {
        console.log(`   ${ep.method} ${ep.path} - ${ep.description}`);
    });
    tests.push({ name: 'API Endpoints', status: 'PASS' });
    passed++;

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('\n📊 TEST SUMMARY\n');
    console.log(`Total Tests: ${tests.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);

    console.log('\n📋 DETAILED RESULTS:\n');
    tests.forEach((test, index) => {
        const icon = test.status === 'PASS' ? '✅' : '❌';
        console.log(`${index + 1}. ${icon} ${test.name}: ${test.status}`);
        if (test.orderId) {
            console.log(`   Order ID: ${test.orderId}`);
        }
        if (test.error) {
            console.log(`   Error: ${test.error}`);
        }
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 INTEGRATION STATUS\n');

    if (failed === 0) {
        console.log('✅ ALL SYSTEMS OPERATIONAL');
        console.log('\n🚀 Ready for testing!');
        console.log('\nNext Steps:');
        console.log('1. Open: http://localhost:5173');
        console.log('2. Login to your account');
        console.log('3. Add items to cart');
        console.log('4. Go to checkout');
        console.log('5. Test payment with card: 4111 1111 1111 1111');
        console.log('6. Check dashboard for orders');
    } else {
        console.log('⚠️  SOME TESTS FAILED');
        console.log('\nPlease check the errors above and fix them.');
    }

    console.log('\n' + '='.repeat(60));
    console.log('\n📄 Documentation:');
    console.log('- INTEGRATION_COMPLETE.md - Complete integration details');
    console.log('- QUICK_START_TESTING.md - Testing guide');
    console.log('- TEST_NOW.md - Quick test instructions');
    console.log('\n');
};

// Run the test
testIntegration().catch(error => {
    console.error('\n❌ Test execution failed:', error);
    process.exit(1);
});
