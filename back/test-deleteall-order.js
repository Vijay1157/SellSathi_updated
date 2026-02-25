/**
 * Delete All Orders Script
 * 
 * This script deletes ALL orders from Shiprocket account
 * USE WITH CAUTION - This will delete all orders!
 * 
 * Usage: node test-deleteall-order.js
 */

const axios = require('axios');
const readline = require('readline');
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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

async function fetchAllOrders() {
    log.step('STEP 2: Fetching All Orders');
    
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
            const orders = response.data.data;
            log.info(`Found ${orders.length} orders`);
            
            // Display all orders
            console.log('\n' + '─'.repeat(80));
            orders.forEach((order, index) => {
                const isTestOrder = order.channel_order_id && order.channel_order_id.startsWith(TEST_ORDER_PREFIX);
                console.log(`\n${index + 1}. Order ID: ${order.id}`);
                console.log(`   Channel Order ID: ${order.channel_order_id || 'N/A'}`);
                console.log(`   Customer: ${order.customer_name}`);
                console.log(`   Status: ${order.status}`);
                console.log(`   Total: ₹${order.total}`);
                console.log(`   Created: ${order.created_at}`);
                if (isTestOrder) {
                    console.log(`   🧪 TEST ORDER`);
                }
            });
            console.log('─'.repeat(80));
            
            return { success: true, orders: orders };
        } else {
            log.error('Failed to fetch orders');
            return { success: false, orders: [] };
        }
    } catch (error) {
        log.error(`Error fetching orders: ${error.message}`);
        if (error.response) {
            console.error('Response:', error.response.data);
        }
        return { success: false, orders: [] };
    }
}

async function deleteOrder(orderId) {
    try {
        const response = await axios.post(
            `${SHIPROCKET_API_URL}/orders/cancel`,
            { ids: [orderId] },
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data) {
            return { success: true, data: response.data };
        } else {
            return { success: false, error: 'Cancellation failed' };
        }
    } catch (error) {
        return { success: false, error: error.message };
    }
}

async function deleteAllOrders(orders) {
    log.step('STEP 3: Deleting All Orders');
    
    if (orders.length === 0) {
        log.info('No orders to delete');
        return { success: true, deleted: 0, failed: 0 };
    }
    
    log.warn(`⚠️  About to delete ${orders.length} orders!`);
    
    let deleted = 0;
    let failed = 0;
    
    for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        console.log(`\n[${i + 1}/${orders.length}] Deleting Order ID: ${order.id} (${order.channel_order_id || 'N/A'})...`);
        
        const result = await deleteOrder(order.id);
        
        if (result.success) {
            console.log(`✅ Deleted successfully`);
            deleted++;
        } else {
            console.log(`❌ Failed: ${result.error}`);
            failed++;
        }
        
        // Small delay between deletions to avoid rate limiting
        await sleep(500);
    }
    
    console.log('\n' + '═'.repeat(80));
    console.log('📊 DELETION SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Orders: ${orders.length}`);
    console.log(`✅ Successfully Deleted: ${deleted}`);
    console.log(`❌ Failed to Delete: ${failed}`);
    console.log('═'.repeat(80) + '\n');
    
    return { success: true, deleted: deleted, failed: failed };
}

async function confirmDeletion() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question('\n⚠️  WARNING: This will DELETE ALL ORDERS from Shiprocket!\nType "DELETE ALL" to confirm: ', (answer) => {
            rl.close();
            resolve(answer.trim() === 'DELETE ALL');
        });
    });
}

async function main() {
    console.log('\n' + '═'.repeat(80));
    console.log('🗑️  SHIPROCKET - DELETE ALL ORDERS');
    console.log('═'.repeat(80));
    console.log('\n⚠️  WARNING: This script will delete ALL orders from your Shiprocket account!');
    console.log('⚠️  This action CANNOT be undone!');
    
    // Step 1: Authenticate
    const authResult = await authenticateShiprocket();
    if (!authResult.success) {
        log.error('Cannot proceed without authentication');
        process.exit(1);
    }
    
    // Step 2: Fetch all orders
    const fetchResult = await fetchAllOrders();
    if (!fetchResult.success) {
        log.error('Failed to fetch orders');
        process.exit(1);
    }
    
    if (fetchResult.orders.length === 0) {
        log.info('No orders found to delete');
        process.exit(0);
    }
    
    // Step 3: Confirm deletion
    const confirmed = await confirmDeletion();
    
    if (!confirmed) {
        log.warn('Deletion cancelled by user');
        console.log('\n✅ No orders were deleted\n');
        process.exit(0);
    }
    
    // Step 4: Delete all orders
    const deleteResult = await deleteAllOrders(fetchResult.orders);
    
    if (deleteResult.success) {
        console.log('\n✅ Script completed successfully\n');
    } else {
        log.error('Script completed with errors');
        process.exit(1);
    }
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

module.exports = { authenticateShiprocket, fetchAllOrders, deleteAllOrders };
