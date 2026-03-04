/**
 * Maps order status to the 5-stage timeline status
 * Uses shippingStatus from Shiprocket webhook only
 * 
 * @param {Object} order - Order object from Firestore
 * @returns {string} One of: 'ORDERED', 'PACKING', 'SHIPPING', 'OUT_FOR_DELIVERY', 'DELIVERED'
 */
export function mapOrderStatus(order) {
  // Handle null/undefined order
  if (!order) {
    return 'ORDERED';
  }

  // Use shippingStatus if available (from Shiprocket webhook)
  if (order.shippingStatus) {
    return order.shippingStatus;
  }
  
  // Default to ORDERED until Shiprocket webhook updates the status
  // This ensures orders stay at "ORDERED" stage until shipping is confirmed
  return 'ORDERED';
}
