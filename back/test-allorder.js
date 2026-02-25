/**
 * Test All Orders Script
 * 
 * This script checks all ACTIVE orders in Shiprocket and displays their AWB status
 * (Excludes CANCELED orders)
 * 
 * Usage: node test-allorder.js
 */

const axios = require('axios');
require('dotenv').config();

// Configuration from environment
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_API_URL = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';

const TEST_ORDER_PREFIX = 'TEST_ORDER_';

// Utility functions
const log = {
    info: (msg) => console.log(`\n✅ ${msg}`),
    error: (msg) => console.log(`\n❌ ${msg}`),
    warn: (msg) => console.log(`\n⚠️  ${msg}`),
    step: (msg) => console.log(`\n${'='.repeat(80)}\n📋 ${msg}\n${'='.repeat(80)}`),
};

let authToken = null;

async function authenticateShiprocket() {
    log.step('STEP 1: Authenticating with Shiprocket');
    
    try {
        const response = await axios.post(`${SHIPROCKET_API_URL}/auth/login`, {
            email: SHIPROCKET_EMAIL,
            password: SHIPROCKET_PASSWORD
        });

        if (response.data && response.data.token) {
            authToken = response.data.token;
            log.info('Authentication successful');
            return { success: true };
        } else {
            log.error('Authentication failed - No token received');
            return { success: false };
        }
    } catch (error) {
        log.error(`Authentication failed: ${error.message}`);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return { success: false };
    }
}

async function checkAllOrders() {
    log.step('STEP 2: Fetching Active Orders and Checking AWB Status');
    
    try {
        const response = await axios.get(
            `${SHIPROCKET_API_URL}/orders`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    per_page: 50
                }
            }
        );

        if (response.data && response.data.data) {
            const allOrders = response.data.data;
            
            // Filter out CANCELED orders - show only active orders
            const activeOrders = allOrders.filter(order => order.status !== 'CANCELED');
            const canceledCount = allOrders.length - activeOrders.length;
            
            console.log(`\n📦 Total Orders Found: ${allOrders.length}`);
            console.log(`✅ Active Orders: ${activeOrders.length}`);
            console.log(`❌ Canceled Orders (hidden): ${canceledCount}`);
            console.log('═'.repeat(80));
            
            if (activeOrders.length === 0) {
                log.info('No active orders found');
                console.log('\n💡 All orders are either canceled or deleted\n');
                return { success: true, orders: [] };
            }
            
            let withAWB = 0;
            let withoutAWB = 0;
            let testOrders = 0;
            
            activeOrders.forEach((order, index) => {
                const isTestOrder = order.channel_order_id && order.channel_order_id.startsWith(TEST_ORDER_PREFIX);
                if (isTestOrder) testOrders++;
                
                const hasAWB = order.shipments && order.shipments.length > 0 && order.shipments[0].awb_code;
                
                if (hasAWB) withAWB++;
                else withoutAWB++;
                
                // Display order info
                console.log(`\n${index + 1}. Order ID: ${order.id}`);
                console.log(`   Channel Order ID: ${order.channel_order_id || 'N/A'}`);
                console.log(`   Customer: ${order.customer_name}`);
                console.log(`   Status: ${order.status}`);
                console.log(`   Payment: ${order.payment_method}`);
                console.log(`   Total: ₹${order.total}`);
                console.log(`   Created: ${order.created_at}`);
                
                if (isTestOrder) {
                    console.log(`   🧪 TEST ORDER`);
                }
                
                // AWB Status
                if (order.shipments && order.shipments.length > 0) {
                    const shipment = order.shipments[0];
                    if (shipment.awb_code) {
                        console.log(`   ✅ AWB: ${shipment.awb_code}`);
                        console.log(`   📦 Courier: ${shipment.courier_name || 'N/A'}`);
                        console.log(`   📍 Shipment Status: ${shipment.status || 'N/A'}`);
                    } else {
                        console.log(`   ❌ AWB: Not Generated`);
                        console.log(`   ⏳ Courier: Not Assigned`);
                    }
                } else {
                    console.log(`   ❌ AWB: Not Generated (No shipments)`);
                }
                
                console.log('─'.repeat(80));
            });
            
            // Summary
            console.log('\n' + '═'.repeat(80));
            console.log('📊 SUMMARY (Active Orders Only)');
            console.log('═'.repeat(80));
            console.log(`Active Orders: ${activeOrders.length}`);
            console.log(`✅ Orders with AWB: ${withAWB}`);
            console.log(`❌ Orders without AWB: ${withoutAWB}`);
            console.log(`🧪 Test Orders: ${testOrders}`);
            console.log(`\n🗑️  Canceled Orders (excluded): ${canceledCount}`);
            console.log('═'.repeat(80) + '\n');
            
            return { success: true, orders: activeOrders };
        } else {
            log.error('Failed to fetch orders');
            return { success: false };
        }
    } catch (error) {
        log.error(`Error checking orders: ${error.message}`);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return { success: false };
    }
}

async function main() {
    console.log('\n' + '═'.repeat(80));
    console.log('🔍 SHIPROCKET - CHECK ACTIVE ORDERS AND AWB STATUS');
    console.log('═'.repeat(80));
    console.log('ℹ️  Note: This script shows only ACTIVE orders (excludes CANCELED)');
    
    // Step 1: Authenticate
    const authResult = await authenticateShiprocket();
    if (!authResult.success) {
        log.error('Cannot proceed without authentication');
        process.exit(1);
    }
    
    // Step 2: Check all orders
    const checkResult = await checkAllOrders();
    
    if (!checkResult.success) {
        log.error('Failed to check orders');
        process.exit(1);
    }
    
    console.log('\n✅ Script completed successfully\n');
}

// Run the script
if (require.main === module) {
    // Validate environment variables
    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
        console.error('\n❌ Error: Missing Shiprocket credentials in .env file');
        console.error('   Required: SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD\n');
        process.exit(1);
    }

    main().catch(error => {
        console.error('\n❌ Fatal error:', error);
        console.error(error.stack);
        process.exit(1);
    });
}

module.exports = { authenticateShiprocket, checkAllOrders };
