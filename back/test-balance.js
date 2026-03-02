/**
 * Test Shiprocket Wallet Balance
 * Run: node test-balance.js
 */

require('dotenv').config();
const axios = require('axios');

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const API_URL = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';

async function checkBalance() {
  try {
    console.log('🔐 Authenticating with Shiprocket...');

    // Step 1: Get auth token
    const authRes = await axios.post(`${API_URL}/auth/login`, {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    });

    const token = authRes.data.token;
    if (!token) {
      console.error('❌ Authentication failed: No token received');
      return;
    }
    console.log('✅ Authenticated successfully\n');

    // Step 2: Fetch wallet balance
    console.log('💰 Fetching wallet balance...');
    const balanceRes = await axios.get(`${API_URL}/account/details/wallet-balance`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    const data = balanceRes.data;
    console.log('✅ Wallet Balance Response:');
    console.log(JSON.stringify(data, null, 2));

    // Display balance summary
    if (data.data) {
      const wallet = data.data;
      console.log('\n========== BALANCE SUMMARY ==========');
      console.log(`  Balance Amount : ₹${wallet.balance_amount ?? 'N/A'}`);
      console.log(`  Credit Amount  : ₹${wallet.credit_amount ?? 'N/A'}`);
      console.log(`  COD Amount     : ₹${wallet.cod_amount ?? 'N/A'}`);
      console.log('======================================');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkBalance();
