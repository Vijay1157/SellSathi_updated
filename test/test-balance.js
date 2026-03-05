require('dotenv').config({ path: '../backend/.env' });
const axios = require('axios');

/**
 * Test script to check Shiprocket wallet balance
 * This script authenticates with Shiprocket API and fetches the current wallet balance
 */

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_API_URL = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';

/**
 * Authenticate with Shiprocket API
 * @returns {Promise<string|null>} Auth token or null on failure
 */
async function authenticate() {
  try {
    console.log('🔐 Authenticating with Shiprocket API...');
    console.log(`📧 Email: ${SHIPROCKET_EMAIL}`);

    const response = await axios.post(
      `${SHIPROCKET_API_URL}/auth/login`,
      {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
      },
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data && response.data.token) {
      console.log('✅ Authentication successful');
      return response.data.token;
    } else {
      console.error('❌ Authentication failed: No token in response');
      return null;
    }
  } catch (error) {
    console.error('❌ Authentication error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Get wallet balance from Shiprocket
 * @param {string} token - Auth token
 * @returns {Promise<Object|null>} Balance data or null on failure
 */
async function getWalletBalance(token) {
  try {
    console.log('\n💰 Fetching wallet balance...');

    const response = await axios.get(
      `${SHIPROCKET_API_URL}/account/details/wallet-balance`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    if (response.data) {
      return response.data;
    } else {
      console.error('❌ Failed to fetch balance: No data in response');
      return null;
    }
  } catch (error) {
    console.error('❌ Balance fetch error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

/**
 * Main function to run the balance check
 */
async function main() {
  console.log('🚀 Starting Shiprocket Balance Check\n');
  console.log('='.repeat(50));

  // Validate environment variables
  if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
    console.error('❌ Missing Shiprocket credentials in environment variables');
    console.error('Please ensure SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD are set in backend/.env');
    process.exit(1);
  }

  // Step 1: Authenticate
  const token = await authenticate();
  if (!token) {
    console.error('\n❌ Failed to authenticate. Exiting...');
    process.exit(1);
  }

  // Step 2: Get wallet balance
  const balanceData = await getWalletBalance(token);
  if (!balanceData) {
    console.error('\n❌ Failed to fetch wallet balance. Exiting...');
    process.exit(1);
  }

  // Step 3: Display results
  console.log('\n' + '='.repeat(50));
  console.log('✅ WALLET BALANCE DETAILS');
  console.log('='.repeat(50));
  console.log(JSON.stringify(balanceData, null, 2));
  console.log('='.repeat(50));

  // Extract and display key information if available
  if (balanceData.data) {
    const data = balanceData.data;
    console.log('\n📊 Summary:');
    if (data.balance !== undefined) {
      console.log(`   Current Balance: ₹${data.balance}`);
    }
    if (data.cod_balance !== undefined) {
      console.log(`   COD Balance: ₹${data.cod_balance}`);
    }
    if (data.credit_limit !== undefined) {
      console.log(`   Credit Limit: ₹${data.credit_limit}`);
    }
  }

  console.log('\n✅ Balance check completed successfully!');
}

// Run the script
main().catch(error => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
