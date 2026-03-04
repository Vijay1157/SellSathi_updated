// Wishlist Debug Test Script
// Run this in browser console to diagnose wishlist issues

console.log('=== WISHLIST DEBUG TEST ===');

// 1. Check if user is logged in
import { auth } from './front/src/config/firebase.js';

const checkAuth = () => {
    const user = auth.currentUser;
    console.log('1. AUTH CHECK:');
    console.log('   User logged in:', !!user);
    if (user) {
        console.log('   User ID:', user.uid);
        console.log('   User Email:', user.email);
    } else {
        console.log('   ❌ NO USER LOGGED IN - This is the problem!');
        console.log('   Please login first before testing wishlist');
        return false;
    }
    return true;
};

// 2. Test backend API endpoints
const testBackendAPI = async () => {
    const user = auth.currentUser;
    if (!user) {
        console.log('2. BACKEND API TEST: Skipped (no user)');
        return;
    }

    console.log('\n2. BACKEND API TEST:');
    
    // Test GET wishlist
    try {
        console.log('   Testing GET /api/user/:uid/wishlist...');
        const response = await fetch(`http://localhost:5000/api/user/${user.uid}/wishlist`);
        const data = await response.json();
        console.log('   ✓ GET Response:', data);
    } catch (error) {
        console.log('   ❌ GET Error:', error.message);
    }

    // Test ADD to wishlist
    try {
        console.log('   Testing POST /api/user/:uid/wishlist/add...');
        const testProduct = {
            id: 'test-123',
            name: 'Test Product',
            price: 999,
            image: 'https://via.placeholder.com/150',
            category: 'Test'
        };
        const response = await fetch(`http://localhost:5000/api/user/${user.uid}/wishlist/add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product: testProduct })
        });
        const data = await response.json();
        console.log('   ✓ ADD Response:', data);
    } catch (error) {
        console.log('   ❌ ADD Error:', error.message);
    }
};

// 3. Check if backend server is running
const checkBackendServer = async () => {
    console.log('\n3. BACKEND SERVER CHECK:');
    try {
        const response = await fetch('http://localhost:5000/');
        console.log('   ✓ Backend server is running');
        console.log('   Status:', response.status);
    } catch (error) {
        console.log('   ❌ Backend server is NOT running!');
        console.log('   Error:', error.message);
        console.log('   Please start backend: cd back && npm start');
    }
};

// 4. Check localStorage wishlist (old method)
const checkLocalStorage = () => {
    console.log('\n4. LOCALSTORAGE CHECK (old method):');
    const localWishlist = localStorage.getItem('wishlist');
    if (localWishlist) {
        console.log('   Found old localStorage wishlist:', JSON.parse(localWishlist));
        console.log('   ⚠️ This should be migrated to backend');
    } else {
        console.log('   No localStorage wishlist found');
    }
};

// Run all tests
const runAllTests = async () => {
    const isLoggedIn = checkAuth();
    await checkBackendServer();
    if (isLoggedIn) {
        await testBackendAPI();
    }
    checkLocalStorage();
    console.log('\n=== TEST COMPLETE ===');
};

// Export for use
export { runAllTests, checkAuth, testBackendAPI, checkBackendServer, checkLocalStorage };

// Auto-run if in browser
if (typeof window !== 'undefined') {
    runAllTests();
}
