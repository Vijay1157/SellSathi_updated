/**
 * Create Single Order Script
 * 
 * This script creates ONE clean, realistic order in Shiprocket with proper values
 * Uses realistic Indian address data for better courier acceptance
 * 
 * Usage: node test-create-order.js
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

let authToken = null;

// Realistic order data with proper Indian address
const ORDER_DATA = {
    order_id: `ORDER_${Date.now()}`,
    order_date: new Date().toISOString().split('T')[0],
    pickup_location: 'Seller_Test_1771878730794', // Your registered pickup location
    channel_id: '',
    comment: 'Realistic test order for AWB generation',
    
    // Billing details - Realistic Bangalore address
    billing_customer_name: 'Rajesh',
    billing_last_name: 'Kumar',
    billing_address: '123 MG Road',
    billing_address_2: 'Near Trinity Metro Station',
    billing_city: 'Bangalore',
    billing_pincode: '560001',
    billing_state: 'Karnataka',
    billing_country: 'India',
    billing_email: 'rajesh.kumar@example.com',
    billing_phone: '9876543210',
    
    // Shipping same as billing
    shipping_is_billing: true,
    shipping_customer_name: '',
    shipping_last_name: '',
    shipping_address: '',
    shipping_address_2: '',
    shipping_city: '',
    shipping_pincode: '',
    shipping_country: '',
    shipping_state: '',
    shipping_email: '',
    shipping_phone: '',
    
    // Order items - Realistic product
    order_items: [
        {
            name: 'Cotton T-Shirt',
            sku: 'TSHIRT-BLK-M',
            units: 1,
            selling_price: '499',
            discount: '0',
            tax: '0',
            hsn: '6109'
        }
    ],
    
    // Payment and charges
    payment_method: 'Prepaid',
    shipping_charges: 0,
    giftwrap_charges: 0,
    transaction_charges: 0,
    total_discount: 0,
    sub_total: 499,
    
    // Package dimensions (in cm) and weight (in kg)
    length: 25,
    breadth: 20,
    height: 5,
    weight: 0.3
};

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

async function createOrder() {
    log.step('STEP 2: Creating Realistic Order');
    
    try {
        log.data('Order Details', {
            order_id: ORDER_DATA.order_id,
            customer: `${ORDER_DATA.billing_customer_name} ${ORDER_DATA.billing_last_name}`,
            address: `${ORDER_DATA.billing_address}, ${ORDER_DATA.billing_city}, ${ORDER_DATA.billing_state} - ${ORDER_DATA.billing_pincode}`,
            product: ORDER_DATA.order_items[0].name,
            amount: `₹${ORDER_DATA.sub_total}`,
            payment: ORDER_DATA.payment_method,
            weight: `${ORDER_DATA.weight} kg`,
            dimensions: `${ORDER_DATA.length}x${ORDER_DATA.breadth}x${ORDER_DATA.height} cm`
        });
        
        const response = await axios.post(
            `${SHIPROCKET_API_URL}/orders/create/adhoc`,
            ORDER_DATA,
            {
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (response.data && response.data.order_id) {
            log.info('Order created successfully!');
            
            console.log('\n' + '═'.repeat(80));
            console.log('📦 ORDER CREATED SUCCESSFULLY');
            console.log('═'.repeat(80));
            console.log(`Order ID: ${response.data.order_id}`);
            console.log(`Shipment ID: ${response.data.shipment_id || 'N/A'}`);
            console.log(`Channel Order ID: ${ORDER_DATA.order_id}`);
            console.log(`Status: ${response.data.status || 'NEW'}`);
            console.log(`AWB Code: ${response.data.awb_code || 'Not yet assigned'}`);
            console.log(`Courier: ${response.data.courier_name || 'Not yet assigned'}`);
            console.log('═'.repeat(80));
            
            console.log('\n💡 Next Steps:');
            console.log('   1. Wait 2-5 minutes for Shiprocket to process the order');
            console.log('   2. Check Shiprocket dashboard to assign courier');
            console.log('   3. Run: node test-allorder.js to check AWB status');
            console.log('   4. Or manually assign courier via dashboard\n');
            
            return {
                success: true,
                orderId: response.data.order_id,
                shipmentId: response.data.shipment_id,
                channelOrderId: ORDER_DATA.order_id
            };
        } else {
            log.error('Order creation failed');
            log.data('Response', response.data);
            return { success: false };
        }
    } catch (error) {
        log.error('Error creating order');
        console.error('\nError Details:');
        console.error('Message:', error.message);
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', JSON.stringify(error.response.data, null, 2));
        }
        return { success: false, error: error.message };
    }
}

async function main() {
    console.log('\n' + '═'.repeat(80));
    console.log('🛒 SHIPROCKET - CREATE SINGLE REALISTIC ORDER');
    console.log('═'.repeat(80));
    console.log('ℹ️  This script creates ONE clean order with realistic data');
    
    // Step 1: Authenticate
    const authResult = await authenticateShiprocket();
    if (!authResult.success) {
        log.error('Cannot proceed without authentication');
        process.exit(1);
    }
    
    // Step 2: Create order
    const createResult = await createOrder();
    
    if (!createResult.success) {
        log.error('Failed to create order');
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

module.exports = { authenticateShiprocket, createOrder };
