/**
 * Assign Courier to Active Orders Script
 * 
 * This script automatically assigns couriers to active orders without AWB
 * - Fetches available couriers for each order
 * - Displays courier options with rates and delivery times
 * - Assigns the recommended or cheapest courier
 * - Generates AWB number automatically
 * - Verifies AWB generation
 * 
 * Usage: 
 *   node test-assign-courier.js              (Interactive mode - shows options)
 *   node test-assign-courier.js auto         (Auto mode - assigns best courier)
 */

const axios = require('axios');
require('dotenv').config();

// Configuration from environment
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_API_URL = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';

// Utility functions
const log = {
    info: (msg) => console.log(`\n✅ ${msg}`),
    error: (msg) => console.log(`\n❌ ${msg}`),
    warn: (msg) => console.log(`\n⚠️  ${msg}`),
    step: (msg) => console.log(`\n${'='.repeat(80)}\n📋 ${msg}\n${'='.repeat(80)}`),
    data: (label, data) => {
        console.log(`\n📊 ${label}:`);
        if (typeof data === 'object') {
            console.log(JSON.stringify(data, null, 2));
        } else {
            console.log(data);
        }
    }
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

async function getActiveOrdersWithoutAWB() {
    log.step('STEP 2: Fetching Active Orders Without AWB');
    
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
            
            // Filter: Active orders (not canceled) without AWB
            const ordersWithoutAWB = allOrders.filter(order => {
                const isActive = order.status !== 'CANCELED';
                const hasShipment = order.shipments && order.shipments.length > 0;
                const hasAWB = hasShipment && order.shipments[0].awb_code;
                
                return isActive && hasShipment && !hasAWB;
            });
            
            log.info(`Found ${ordersWithoutAWB.length} active orders without AWB`);
            
            if (ordersWithoutAWB.length === 0) {
                console.log('\n💡 All active orders already have AWB assigned');
                console.log('   Run: node test-create-order.js to create a new order\n');
                return { success: true, orders: [] };
            }
            
            // Display orders
            console.log('\n' + '─'.repeat(80));
            ordersWithoutAWB.forEach((order, index) => {
                console.log(`\n${index + 1}. Order ID: ${order.id}`);
                console.log(`   Shipment ID: ${order.shipments[0].id}`);
                console.log(`   Channel Order ID: ${order.channel_order_id || 'N/A'}`);
                console.log(`   Customer: ${order.customer_name}`);
                console.log(`   Destination: ${order.customer_city}, ${order.customer_state} - ${order.customer_pincode}`);
                console.log(`   Status: ${order.status}`);
                console.log(`   Total: ₹${order.total}`);
            });
            console.log('─'.repeat(80));
            
            return { success: true, orders: ordersWithoutAWB };
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

async function getAvailableCouriers(orderId, shipmentId) {
    try {
        console.log(`\n🔍 Fetching available couriers for order ${orderId} (shipment ${shipmentId})...`);
        
        const response = await axios.get(
            `${SHIPROCKET_API_URL}/courier/serviceability`,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                params: {
                    order_id: orderId  // Changed from shipment_id to order_id
                }
            }
        );

        if (response.data && response.data.data && response.data.data.available_courier_companies) {
            const couriers = response.data.data.available_courier_companies;
            log.info(`Found ${couriers.length} available couriers`);
            
            return { success: true, couriers: couriers };
        } else {
            log.error('No couriers available for this order');
            return { success: false, couriers: [] };
        }
    } catch (error) {
        log.error(`Error fetching couriers: ${error.message}`);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        return { success: false, couriers: [] };
    }
}

function displayCourierOptions(couriers) {
    console.log('\n' + '═'.repeat(80));
    console.log('📦 AVAILABLE COURIER OPTIONS');
    console.log('═'.repeat(80));
    
    couriers.forEach((courier, index) => {
        console.log(`\n${index + 1}. ${courier.courier_name}`);
        console.log(`   Courier ID: ${courier.courier_company_id}`);
        console.log(`   Rate: ₹${courier.rate}`);
        console.log(`   Estimated Delivery: ${courier.etd} days`);
        console.log(`   COD Available: ${courier.cod === 1 ? 'Yes' : 'No'}`);
        console.log(`   Rating: ${courier.rating || 'N/A'}`);
        console.log(`   Recommended: ${courier.is_recommended === 1 ? '⭐ YES' : 'No'}`);
        console.log(`   Pickup Available: ${courier.pickup_availability || 'N/A'}`);
        console.log('─'.repeat(80));
    });
}

function selectBestCourier(couriers) {
    // Priority 1: Recommended courier
    const recommended = couriers.find(c => c.is_recommended === 1);
    if (recommended) {
        console.log(`\n✨ Selected RECOMMENDED courier: ${recommended.courier_name}`);
        return recommended;
    }
    
    // Priority 2: Highest rated courier
    const sortedByRating = [...couriers].sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortedByRating[0] && sortedByRating[0].rating) {
        console.log(`\n⭐ Selected HIGHEST RATED courier: ${sortedByRating[0].courier_name}`);
        return sortedByRating[0];
    }
    
    // Priority 3: Cheapest courier
    const sortedByPrice = [...couriers].sort((a, b) => parseFloat(a.rate) - parseFloat(b.rate));
    console.log(`\n💰 Selected CHEAPEST courier: ${sortedByPrice[0].courier_name}`);
    return sortedByPrice[0];
}

async function assignCourier(shipmentId, courierId) {
    try {
        console.log(`\n📦 Assigning courier ${courierId} to shipment ${shipmentId}...`);
        
        const response = await axios.post(
            `${SHIPROCKET_API_URL}/courier/assign/awb`,
            {
                shipment_id: shipmentId,
                courier_id: courierId
            },
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.awb_assign_status === 1) {
            log.info('Courier assigned successfully!');
            
            const awbCode = response.data.response?.data?.awb_code;
            const courierName = response.data.response?.data?.courier_name;
            
            console.log('\n' + '═'.repeat(80));
            console.log('✅ COURIER ASSIGNMENT SUCCESSFUL');
            console.log('═'.repeat(80));
            console.log(`Shipment ID: ${shipmentId}`);
            console.log(`AWB Code: ${awbCode || 'Generating...'}`);
            console.log(`Courier: ${courierName || 'N/A'}`);
            console.log('═'.repeat(80));
            
            return { 
                success: true, 
                awbCode: awbCode,
                courierName: courierName
            };
        } else {
            log.error('Courier assignment failed');
            log.data('Response', response.data);
            return { success: false };
        }
    } catch (error) {
        log.error(`Error assigning courier: ${error.message}`);
        if (error.response) {
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        return { success: false, error: error.message };
    }
}

async function verifyAWBGeneration(shipmentId, maxAttempts = 5) {
    console.log(`\n🔄 Verifying AWB generation (max ${maxAttempts} attempts)...`);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            console.log(`\n   Attempt ${attempt}/${maxAttempts}...`);
            
            const response = await axios.get(
                `${SHIPROCKET_API_URL}/courier/track/shipment/${shipmentId}`,
                {
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.tracking_data) {
                const trackingData = response.data.tracking_data;
                
                if (trackingData.awb_code) {
                    log.info(`AWB verified: ${trackingData.awb_code}`);
                    console.log(`   Courier: ${trackingData.courier_name || 'N/A'}`);
                    console.log(`   Status: ${trackingData.shipment_status || 'N/A'}`);
                    return { success: true, awbCode: trackingData.awb_code };
                }
            }
            
            if (attempt < maxAttempts) {
                console.log('   AWB not yet generated, waiting 3 seconds...');
                await sleep(3000);
            }
        } catch (error) {
            console.error(`   Error: ${error.message}`);
        }
    }
    
    log.warn('AWB verification timeout - check manually in dashboard');
    return { success: false };
}

async function processOrder(order, autoMode = false) {
    const orderId = order.id;
    const shipmentId = order.shipments[0].id;
    
    console.log('\n' + '═'.repeat(80));
    console.log(`📦 PROCESSING ORDER: ${orderId}`);
    console.log('═'.repeat(80));
    console.log(`Shipment ID: ${shipmentId}`);
    console.log(`Customer: ${order.customer_name}`);
    console.log(`Destination: ${order.customer_city}, ${order.customer_state}`);
    
    // Step 1: Get available couriers (pass order_id instead of shipment_id)
    const couriersResult = await getAvailableCouriers(orderId, shipmentId);
    if (!couriersResult.success || couriersResult.couriers.length === 0) {
        log.error('No couriers available for this order');
        return { success: false };
    }
    
    // Step 2: Display courier options
    displayCourierOptions(couriersResult.couriers);
    
    // Step 3: Select best courier
    const selectedCourier = selectBestCourier(couriersResult.couriers);
    
    console.log('\n' + '─'.repeat(80));
    console.log('📋 SELECTED COURIER DETAILS');
    console.log('─'.repeat(80));
    console.log(`Name: ${selectedCourier.courier_name}`);
    console.log(`ID: ${selectedCourier.courier_company_id}`);
    console.log(`Rate: ₹${selectedCourier.rate}`);
    console.log(`Delivery: ${selectedCourier.etd} days`);
    console.log('─'.repeat(80));
    
    if (!autoMode) {
        // In interactive mode, wait for user confirmation
        log.warn('Run with "auto" parameter to assign automatically');
        return { success: false, message: 'Manual confirmation required' };
    }
    
    // Step 4: Assign courier
    const assignResult = await assignCourier(shipmentId, selectedCourier.courier_company_id);
    if (!assignResult.success) {
        return { success: false };
    }
    
    // Step 5: Verify AWB generation
    await sleep(2000); // Wait 2 seconds before verification
    const verifyResult = await verifyAWBGeneration(shipmentId);
    
    return { 
        success: true, 
        awbCode: verifyResult.awbCode || assignResult.awbCode 
    };
}

async function main() {
    console.log('\n' + '═'.repeat(80));
    console.log('🚚 SHIPROCKET - ASSIGN COURIER TO ACTIVE ORDERS');
    console.log('═'.repeat(80));
    
    const args = process.argv.slice(2);
    const autoMode = args.includes('auto');
    
    if (autoMode) {
        console.log('ℹ️  Running in AUTO mode - will assign couriers automatically');
    } else {
        console.log('ℹ️  Running in INTERACTIVE mode - will show options only');
        console.log('💡 Use "node test-assign-courier.js auto" to assign automatically');
    }
    
    // Step 1: Authenticate
    const authResult = await authenticateShiprocket();
    if (!authResult.success) {
        log.error('Cannot proceed without authentication');
        process.exit(1);
    }
    
    // Step 2: Get orders without AWB
    const ordersResult = await getActiveOrdersWithoutAWB();
    if (!ordersResult.success || ordersResult.orders.length === 0) {
        process.exit(0);
    }
    
    // Step 3: Process orders
    let successCount = 0;
    let failCount = 0;
    
    for (const order of ordersResult.orders) {
        const result = await processOrder(order, autoMode);
        
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // Small delay between orders
        if (ordersResult.orders.length > 1) {
            await sleep(2000);
        }
    }
    
    // Summary
    console.log('\n' + '═'.repeat(80));
    console.log('📊 SUMMARY');
    console.log('═'.repeat(80));
    console.log(`Total Orders Processed: ${ordersResult.orders.length}`);
    console.log(`✅ Successfully Assigned: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log('═'.repeat(80) + '\n');
    
    if (!autoMode && failCount > 0) {
        console.log('💡 Run with "auto" parameter to assign couriers automatically\n');
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

module.exports = { authenticateShiprocket, getAvailableCouriers, assignCourier };
