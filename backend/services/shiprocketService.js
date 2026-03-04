const axios = require('axios');

/**
 * Shiprocket Service
 * Handles authentication and API interactions with Shiprocket shipping API
 */
class ShiprocketService {
  constructor() {
    // Configuration from environment variables
    this.email = process.env.SHIPROCKET_EMAIL;
    this.password = process.env.SHIPROCKET_PASSWORD;
    this.apiUrl = process.env.SHIPROCKET_API_URL || 'https://apiv2.shiprocket.in/v1/external';
    this.webhookSecret = process.env.SHIPROCKET_WEBHOOK_SECRET;

    // Token management
    this.authToken = null;
    this.tokenExpiresAt = null;

    // Feature flag
    this.enabled = this.validateConfiguration();

    if (this.enabled) {
      console.log('✅ Shiprocket service initialized successfully');
    } else {
      console.warn('⚠️  Shiprocket credentials not configured. Shipping integration disabled.');
    }
  }

  /**
   * Validate that required environment variables are set
   * @returns {boolean} True if configuration is valid
   */
  validateConfiguration() {
    if (!this.email || !this.password) {
      return false;
    }
    return true;
  }

  /**
   * Authenticate with Shiprocket API and get auth token
   * @returns {Promise<string|null>} Auth token or null on failure
   */
  async authenticate() {
    if (!this.enabled) {
      console.warn('⚠️  Shiprocket authentication skipped - service disabled');
      return null;
    }

    try {
      console.log('🔐 Authenticating with Shiprocket API...');

      const response = await axios.post(
        `${this.apiUrl}/auth/login`,
        {
          email: this.email,
          password: this.password
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      if (response.data && response.data.token) {
        this.authToken = response.data.token;
        // Shiprocket tokens typically expire after 10 days, but we'll refresh after 9 days to be safe
        this.tokenExpiresAt = Date.now() + (9 * 24 * 60 * 60 * 1000);

        console.log('✅ Shiprocket authentication successful');
        return this.authToken;
      } else {
        console.error('❌ Shiprocket authentication failed: No token in response');
        return null;
      }
    } catch (error) {
      console.error('❌ Shiprocket authentication error:', error.message);

      // Log additional details without exposing credentials
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }

      // Disable integration on authentication failure
      this.enabled = false;
      return null;
    }
  }

  /**
   * Get valid auth token with automatic refresh
   * @returns {Promise<string|null>} Valid auth token or null
   */
  async getAuthToken() {
    if (!this.enabled) {
      return null;
    }

    // Check if we have a valid cached token
    if (this.authToken && this.tokenExpiresAt && Date.now() < this.tokenExpiresAt) {
      return this.authToken;
    }

    // Token expired or doesn't exist, authenticate
    console.log('🔄 Token expired or missing, re-authenticating...');
    return await this.authenticate();
  }

  /**
   * Make API request with comprehensive error handling and retry logic
   * @param {string} url - API endpoint URL
   * @param {Object} data - Request payload
   * @param {Object} options - Additional options
   * @param {number} options.retries - Maximum retry attempts (default: 3)
   * @param {boolean} options.requiresAuth - Whether request requires authentication (default: true)
   * @param {string} options.orderId - Order ID for logging context
   * @returns {Promise<Object>} API response data
   */
  async makeApiRequest(url, data, options = {}) {
    const {
      retries = 3,
      requiresAuth = true,
      orderId = 'unknown'
    } = options;

    let lastError = null;
    let attempt = 0;
    let hasReauthenticated = false;

    while (attempt < retries) {
      attempt++;

      try {
        // Get auth token if required
        let headers = {
          'Content-Type': 'application/json'
        };

        if (requiresAuth) {
          const token = await this.getAuthToken();
          if (!token) {
            throw new Error('Failed to obtain authentication token');
          }
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Make the API request
        console.log(`🔄 API ${options.method || 'POST'} request attempt ${attempt}/${retries} for order ${orderId}`);

        const reqConfig = {
          method: options.method || 'POST',
          url: url,
          headers,
          timeout: 10000 // 10 second timeout
        };

        if (reqConfig.method.toUpperCase() !== 'GET') {
          reqConfig.data = data;
        }

        const response = await axios(reqConfig);

        // Success - return response data
        console.log(`✅ API request successful for order ${orderId}`);
        return response.data;

      } catch (error) {
        lastError = error;

        // Extract error details safely
        const statusCode = error.response?.status;
        const errorMessage = error.message;
        const errorData = error.response?.data;

        // Log error with context (without exposing credentials)
        console.error(`❌ API request error (attempt ${attempt}/${retries}) for order ${orderId}:`, {
          status: statusCode,
          message: errorMessage,
          code: error.code,
          details: errorData // Added to see exactly why it's failing (422 validation errors)
        });

        // Handle authentication errors (401)
        if (statusCode === 401 && !hasReauthenticated) {
          console.warn(`⚠️  Authentication error for order ${orderId}, attempting re-authentication...`);

          // Clear cached token and re-authenticate once
          this.authToken = null;
          this.tokenExpiresAt = null;
          hasReauthenticated = true;

          const newToken = await this.authenticate();
          if (newToken) {
            console.log(`✅ Re-authentication successful for order ${orderId}, retrying request...`);
            continue; // Retry with new token
          } else {
            console.error(`❌ Re-authentication failed for order ${orderId}`);
            throw new Error('Authentication failed after retry');
          }
        }

        // Handle rate limit errors (429)
        if (statusCode === 429) {
          console.error(`❌ Rate limit exceeded for order ${orderId}:`, {
            orderId,
            status: statusCode,
            message: 'Shiprocket API rate limit reached'
          });
          throw new Error('Rate limit exceeded - order marked for retry');
        }

        // Handle validation errors (400)
        if (statusCode === 400) {
          console.error(`❌ Validation error for order ${orderId}:`, {
            orderId,
            status: statusCode,
            errorData: errorData,
            message: 'Invalid data sent to Shiprocket API'
          });
          throw new Error('Validation error - check order data');
        }

        // Handle network timeout errors
        const isTimeoutError = error.code === 'ECONNABORTED' ||
          error.code === 'ETIMEDOUT' ||
          errorMessage.includes('timeout');

        if (isTimeoutError) {
          console.warn(`⚠️  Network timeout for order ${orderId} (attempt ${attempt}/${retries})`);

          if (attempt < retries) {
            // Exponential backoff: 1s, 2s, 4s
            const backoffMs = Math.pow(2, attempt - 1) * 1000;
            console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, backoffMs));
            continue; // Retry
          }
        }

        // Handle other network errors (ECONNREFUSED, ENOTFOUND, etc.)
        const isNetworkError = error.code === 'ECONNREFUSED' ||
          error.code === 'ENOTFOUND' ||
          error.code === 'EAI_AGAIN';

        if (isNetworkError && attempt < retries) {
          console.warn(`⚠️  Network error for order ${orderId} (attempt ${attempt}/${retries}):`, error.code);

          // Exponential backoff
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
          continue; // Retry
        }

        // If we've exhausted retries or hit a non-retryable error, break
        if (attempt >= retries || statusCode === 400 || statusCode === 429) {
          break;
        }

        // For other errors, retry with backoff
        if (attempt < retries) {
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          console.log(`⏳ Waiting ${backoffMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }

    // All retries exhausted
    console.error(`❌ All retry attempts exhausted for order ${orderId}`);
    throw lastError;
  }

  /**
   * Create shipment in Shiprocket
   * 
   * MULTI-VENDOR SUPPORT:
   * - Each seller should have their own pickup location registered in Shiprocket
   * - Pass sellerId in orderData to determine pickup_location
   * - Format: pickup_location = "Seller_" + sellerId
   * - Sellers must register their address via Shiprocket API or dashboard first
   * 
   * To add seller pickup address, use:
   * POST /settings/company/addpickup with seller's address details
   * 
   * @param {Object} orderData - Order data to create shipment
   * @param {string} orderData.orderId - Unique order ID
   * @param {string} orderData.customerName - Customer full name
   * @param {string} orderData.customerEmail - Customer email
   * @param {string} orderData.customerPhone - Customer phone number
   * @param {Object} orderData.shippingAddress - Shipping address details
   * @param {string} orderData.shippingAddress.addressLine - Street address
   * @param {string} orderData.shippingAddress.city - City
   * @param {string} orderData.shippingAddress.pincode - Postal code
   * @param {string} [orderData.shippingAddress.state] - State (optional)
   * @param {string} [orderData.shippingAddress.country] - Country (optional, defaults to India)
   * @param {string} [orderData.sellerId] - Seller ID for multi-vendor support (optional)
   * @param {Array} orderData.items - Array of order items
   * @param {number} orderData.total - Order total amount
   * @param {string} orderData.paymentMethod - Payment method (RAZORPAY or COD)
   * @returns {Promise<Object>} Shipment response object
   */
  async createShipment(orderData) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Shiprocket service is disabled'
      };
    }

    try {
      console.log(`📦 Creating shipment for order ${orderData.orderId}...`);

      // Resolve valid pickup location dynamically
      let validPickupLocation = 'Primary'; // default

      if (orderData.sellerId) {
        validPickupLocation = `Seller_${orderData.sellerId}`;
      } else {
        try {
          // Fetch existing pickup locations from Shiprocket API to prevent 422 errors
          const locationsRes = await this.makeApiRequest(
            `${this.apiUrl}/settings/company/pickup`,
            null,
            { retries: 1, requiresAuth: true, method: 'GET' }
          );

          if (locationsRes && locationsRes.data && locationsRes.data.shipping_address && locationsRes.data.shipping_address.length > 0) {
            validPickupLocation = locationsRes.data.shipping_address[0].pickup_location;
            console.log(`📍 Using dynamic pickup location: ${validPickupLocation}`);
          } else {
            // Fallback to the one seen in test scripts if API fails or is empty
            validPickupLocation = 'Seller_Test_1771878730794';
            console.log(`⚠️ No pickup locations found via API, using fallback: ${validPickupLocation}`);
          }
        } catch (pickupErr) {
          console.error('Failed to fetch pickup locations, using fallback.', pickupErr.message);
          validPickupLocation = 'Seller_Test_1771878730794';
        }
      }

      // Split customer name into first and last name
      const nameParts = orderData.customerName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Map order data to Shiprocket API format
      const shiprocketPayload = {
        order_id: orderData.orderId,
        order_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        pickup_location: validPickupLocation,
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_address: orderData.shippingAddress.addressLine,
        billing_city: orderData.shippingAddress.city,
        billing_pincode: orderData.shippingAddress.pincode,
        billing_state: orderData.shippingAddress.state || 'Karnataka', // Fallback to avoid 422 error on missing state
        billing_country: orderData.shippingAddress.country || 'India',
        billing_email: orderData.customerEmail,
        billing_phone: orderData.customerPhone,
        shipping_is_billing: true,
        order_items: orderData.items.map(item => ({
          name: item.name,
          sku: item.sku || item.id || 'SKU-' + item.id,
          units: item.quantity,
          selling_price: item.price.toString(),
          discount: '',
          tax: '',
          hsn: ''
        })),
        payment_method: orderData.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
        sub_total: orderData.total,
        length: 10,
        breadth: 10,
        height: 10,
        weight: 0.5
      };

      // Use makeApiRequest with retry logic and error handling
      const data = await this.makeApiRequest(
        `${this.apiUrl}/orders/create/adhoc`,
        shiprocketPayload,
        {
          retries: 3,
          requiresAuth: true,
          orderId: orderData.orderId
        }
      );

      // Extract shipment details from response
      if (data) {
        console.log('✅ Shipment created successfully:', {
          orderId: data.order_id,
          shipmentId: data.shipment_id,
          awbCode: data.awb_code || 'Pending',
          courierName: data.courier_name || 'Pending'
        });

        return {
          success: true,
          shiprocketOrderId: data.order_id,
          shipmentId: data.shipment_id ? data.shipment_id.toString() : null,
          awbNumber: data.awb_code || null,
          courierName: data.courier_name || null,
          estimatedDelivery: data.estimated_delivery_date || null
        };
      } else {
        console.error(`❌ Shipment creation failed for order ${orderData.orderId}: No data in response`);
        return {
          success: false,
          error: 'No data in Shiprocket response'
        };
      }
    } catch (error) {
      // Log error with context (credentials already filtered by makeApiRequest)
      console.error(`❌ Shipment creation failed for order ${orderData.orderId}:`, {
        orderId: orderData.orderId,
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Map Shiprocket status to internal 5-stage model
   * @param {string} shiprocketStatus - Status from Shiprocket webhook
   * @returns {string} Internal status (ORDERED, PACKING, SHIPPING, OUT_FOR_DELIVERY, DELIVERED)
   */
  mapShiprocketStatus(shiprocketStatus) {
    if (!shiprocketStatus) {
      return 'ORDERED';
    }

    // Normalize status to uppercase for case-insensitive matching
    const status = shiprocketStatus.toUpperCase();

    // Map Shiprocket statuses to internal 5-stage model
    // PACKING stage: Order is being prepared
    if (status === 'NEW' || status === 'PENDING' || status === 'READY_TO_SHIP') {
      return 'PACKING';
    }

    // SHIPPING stage: Package is in transit
    if (status === 'SHIPPED' || status === 'IN_TRANSIT' ||
      status === 'PICKUP_SCHEDULED' || status === 'PICKUP_COMPLETE') {
      return 'SHIPPING';
    }

    // OUT_FOR_DELIVERY stage: Package is out for final delivery
    if (status === 'OUT_FOR_DELIVERY') {
      return 'OUT_FOR_DELIVERY';
    }

    // DELIVERED stage: Package has been delivered
    if (status === 'DELIVERED') {
      return 'DELIVERED';
    }

    // Default to ORDERED for unknown statuses
    console.warn(`⚠️  Unknown Shiprocket status: ${shiprocketStatus}, defaulting to ORDERED`);
    return 'ORDERED';
  }

  /**
   * Verify webhook signature using HMAC SHA256
   * @param {Object} payload - Webhook payload object
   * @param {string} signature - Signature from X-Shiprocket-Signature header
   * @returns {boolean} True if signature is valid, false otherwise
   */
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.error('❌ Webhook secret not configured');
      return false;
    }

    if (!signature) {
      console.error('❌ No signature provided');
      return false;
    }

    try {
      const crypto = require('crypto');

      // Convert payload to string if it's an object
      const payloadString = typeof payload === 'string'
        ? payload
        : JSON.stringify(payload);

      // Create HMAC with SHA256
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(payloadString);
      const expectedSignature = hmac.digest('hex');

      // Use timing-safe comparison to prevent timing attacks
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
      const signatureBuffer = Buffer.from(signature, 'utf8');

      // Ensure buffers are same length before comparison
      if (expectedBuffer.length !== signatureBuffer.length) {
        console.error('❌ Signature length mismatch');
        return false;
      }

      // Timing-safe comparison
      const isValid = crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

      if (!isValid) {
        console.error('❌ Invalid webhook signature');
      }

      return isValid;
    } catch (error) {
      console.error('❌ Error verifying webhook signature:', error.message);
      return false;
    }
  }

  /**
   * Create pickup address for seller in Shiprocket
   * @param {Object} sellerData - Seller address data
   * @param {string} sellerData.pickup_location - Unique pickup location name
   * @param {string} sellerData.name - Contact person name
   * @param {string} sellerData.email - Contact email
   * @param {string} sellerData.phone - Contact phone number
   * @param {string} sellerData.address - Street address
   * @param {string} sellerData.address_2 - Address line 2 (optional)
   * @param {string} sellerData.city - City
   * @param {string} sellerData.state - State
   * @param {string} sellerData.country - Country
   * @param {string} sellerData.pin_code - Postal code
   * @returns {Promise<Object>} Pickup address creation response
   */
  async createPickupAddress(sellerData) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Shiprocket service is disabled'
      };
    }

    try {
      console.log(`📍 Creating pickup address: ${sellerData.pickup_location}...`);

      const data = await this.makeApiRequest(
        `${this.apiUrl}/settings/company/addpickup`,
        sellerData,
        {
          retries: 3,
          requiresAuth: true,
          orderId: sellerData.pickup_location
        }
      );

      if (data && data.success) {
        console.log('✅ Pickup address created successfully:', {
          pickupLocation: sellerData.pickup_location,
          address: `${sellerData.city}, ${sellerData.state}`
        });

        return {
          success: true,
          pickupId: data.pickup_id,
          message: data.message || 'Pickup address created successfully'
        };
      } else {
        console.error(`❌ Pickup address creation failed:`, data);
        return {
          success: false,
          error: data?.message || 'Failed to create pickup address'
        };
      }
    } catch (error) {
      console.error(`❌ Pickup address creation error:`, {
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Cancel order in Shiprocket
   * @param {string} shiprocketOrderId - Shiprocket order ID (NOT shipment ID — the cancel API expects order IDs)
   * @param {string} internalOrderId - Internal order ID for logging
   * @returns {Promise<Object>} Cancellation response
   */
  async cancelOrder(shiprocketOrderId, internalOrderId) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Shiprocket service is disabled'
      };
    }

    try {
      console.log(`❌ Cancelling Shiprocket order ${shiprocketOrderId} (internal: ${internalOrderId})...`);

      const data = await this.makeApiRequest(
        `${this.apiUrl}/orders/cancel`,
        {
          ids: [shiprocketOrderId]
        },
        {
          retries: 3,
          requiresAuth: true,
          orderId: internalOrderId
        }
      );

      if (data) {
        console.log('✅ Order cancelled successfully in Shiprocket:', {
          internalOrderId,
          shiprocketOrderId,
          response: data
        });

        return {
          success: true,
          message: data.message || 'Order cancelled successfully',
          data: data
        };
      } else {
        console.error(`❌ Order cancellation failed:`, data);
        return {
          success: false,
          error: 'Failed to cancel order'
        };
      }
    } catch (error) {
      console.error(`❌ Order cancellation error:`, {
        internalOrderId,
        shiprocketOrderId,
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Get shipment tracking details
   * @param {string} shipmentId - Shiprocket shipment ID
   * @returns {Promise<Object>} Tracking details
   */
  async getShipmentTracking(shipmentId) {
    if (!this.enabled) {
      return {
        success: false,
        error: 'Shiprocket service is disabled'
      };
    }

    try {
      console.log(`🔍 Fetching tracking for shipment ${shipmentId}...`);

      const token = await this.getAuthToken();
      if (!token) {
        throw new Error('Failed to obtain authentication token');
      }

      const response = await axios.get(
        `${this.apiUrl}/courier/track/shipment/${shipmentId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data) {
        console.log('✅ Tracking details fetched successfully');
        return {
          success: true,
          tracking: response.data
        };
      } else {
        return {
          success: false,
          error: 'No tracking data available'
        };
      }
    } catch (error) {
      console.error(`❌ Tracking fetch error:`, {
        shipmentId,
        error: error.message,
        status: error.response?.status
      });

      return {
        success: false,
        error: error.message,
        details: error.response?.data
      };
    }
  }

  /**
   * Fetch available couriers for a Shiprocket order
   * @param {string} orderId - Shiprocket Order ID
   * @returns {Promise<Object>} List of couriers
   */
  async getAvailableCouriers(orderId) {
    if (!this.enabled) return { success: false, error: 'Service disabled' };

    try {
      console.log(`🚚 Fetching couriers for order ${orderId}...`);
      const data = await this.makeApiRequest(
        `${this.apiUrl}/courier/serviceability/?order_id=${orderId}`,
        null,
        { retries: 3, requiresAuth: true, orderId, method: 'GET' }
      );

      if (data && data.data && data.data.available_courier_companies) {
        return {
          success: true,
          couriers: data.data.available_courier_companies
        };
      }
      return { success: false, error: 'No couriers available' };
    } catch (error) {
      console.error(`❌ Courier fetch error for order ${orderId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Select best courier from available options
   * (Priority: Recommended -> Highest Rated -> Cheapest)
   * @param {Array} couriers - List of available couriers
   * @returns {Object} Selected courier
   */
  selectBestCourier(couriers) {
    if (!couriers || couriers.length === 0) return null;

    // Filter out unserviceable ones just in case
    const valid = couriers.filter(c => c.estimated_delivery_days);
    if (valid.length === 0) return couriers[0];

    // ATTEMPT TO SORT:
    // 1. By Rating
    // 2. By lowest rate
    valid.sort((a, b) => {
      // higher rating first
      const ratingDiff = (b.rating || 0) - (a.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      // then lower price
      return (a.rate || 0) - (b.rate || 0);
    });

    return valid[0];
  }

  /**
   * Assign courier to generate AWB
   * @param {string} shipmentId - Shiprocket Shipment ID
   * @param {number} courierId - Courier ID to assign
   * @param {string} orderId - Order ID for logging
   * @returns {Promise<Object>} Assignment result
   */
  async assignCourier(shipmentId, courierId, orderId) {
    if (!this.enabled) return { success: false, error: 'Service disabled' };

    try {
      console.log(`📦 Assigning courier ${courierId} to shipment ${shipmentId}...`);

      const data = await this.makeApiRequest(
        `${this.apiUrl}/courier/assign/awb`,
        {
          shipment_id: shipmentId,
          courier_id: courierId
        },
        { retries: 3, requiresAuth: true, orderId }
      );

      if (data && data.response && data.response.data && data.response.data.awb_assign_status === 1) {
        return {
          success: true,
          awbNumber: data.response.data.awb_code,
          courierName: data.response.data.courier_name
        };
      }
      return { success: false, error: 'Failed to assign AWB', details: data };
    } catch (error) {
      console.error(`❌ Courier assignment error for shipment ${shipmentId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Poll for AWB generation verification
   * @param {string} shipmentId 
   * @param {number} maxAttempts 
   * @param {number} delayMs 
   */
  async verifyAWBGeneration(shipmentId, maxAttempts = 5, delayMs = 3000) {
    if (!this.enabled) return { success: false, error: 'Service disabled' };

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`⏳ Verifying AWB for shipment ${shipmentId} (Attempt ${attempt}/${maxAttempts})...`);

      const tracking = await this.getShipmentTracking(shipmentId);

      if (tracking.success && tracking.tracking) {
        return { success: true, tracking: tracking.tracking };
      }

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    return { success: false, error: 'Timeout verifying AWB' };
  }

  /**
   * Main orchestrator for auto assigning and getting AWB
   */
  async autoAssignCourierAndGenerateAWB(orderId, shipmentId, internalOrderId, initialDelayMs = 3000) {
    if (!this.enabled) return { success: false, error: 'Service disabled' };

    try {
      console.log(`🔄 Starting Auto Courier Assignment for Order ${internalOrderId}...`);

      // Initial delay to let Shiprocket process the newly created shipment
      await new Promise(resolve => setTimeout(resolve, initialDelayMs));

      // 1. Get available couriers
      const couriersRes = await this.getAvailableCouriers(orderId);
      if (!couriersRes.success || !couriersRes.couriers || couriersRes.couriers.length === 0) {
        return { success: false, error: 'No couriers available for this order' };
      }

      // 2. Select best courier
      const bestCourier = this.selectBestCourier(couriersRes.couriers);
      if (!bestCourier) {
        return { success: false, error: 'Failed to select best courier' };
      }

      console.log(`✨ Selected best courier: ${bestCourier.courier_name} (₹${bestCourier.rate}, ${bestCourier.estimated_delivery_days} days)`);

      // 3. Assign courier to generate AWB
      const assignRes = await this.assignCourier(shipmentId, bestCourier.courier_company_id, orderId);
      if (!assignRes.success) {
        return { success: false, error: assignRes.error, details: assignRes.details };
      }

      console.log(`✅ AWB Generated successfully: ${assignRes.awbNumber}`);

      return {
        success: true,
        awbNumber: assignRes.awbNumber,
        courierName: assignRes.courierName || bestCourier.courier_name,
        courierId: bestCourier.courier_company_id,
        courierRate: bestCourier.rate,
        estimatedDeliveryDays: bestCourier.estimated_delivery_days
      };

    } catch (error) {
      console.error(`❌ Auto Assign Error for order ${internalOrderId}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch shipping label from Shiprocket
   * @param {Array<string>} shipmentIds - Array of shipment IDs (e.g., [12345])
   * @returns {Promise<Object>} Label details including URL
   */
  async getShippingLabel(shipmentIds) {
    if (!this.enabled) return { success: false, error: 'Service disabled' };

    try {
      console.log(`📄 Fetching shipping label for shipments: ${shipmentIds.join(', ')}...`);

      const data = await this.makeApiRequest(
        `${this.apiUrl}/courier/generate/label`,
        { shipment_id: shipmentIds },
        { retries: 3, requiresAuth: true, orderId: shipmentIds[0] }
      );

      if (data && data.label_created === 1) {
        return {
          success: true,
          labelUrl: data.label_url,
          message: 'Label generated successfully'
        };
      }

      return { success: false, error: 'Failed to generate label', details: data };
    } catch (error) {
      console.error(`❌ Shipping label fetch error:`, error.message);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new ShiprocketService();
