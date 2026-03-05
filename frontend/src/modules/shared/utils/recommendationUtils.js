import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '@/modules/shared/config/firebase';

/**
 * Get frequently bought together products based on actual order data
 * @param {string} productId - Current product ID
 * @returns {Promise<Array>} - Array of frequently bought together products
 */
export async function getFrequentlyBoughtTogether(productId) {
  try {
    // Query orders that contain this product
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('status', '==', 'delivered'), limit(100));
    const ordersSnapshot = await getDocs(q);
    
    // Count co-purchased products
    const productFrequency = {};
    
    ordersSnapshot.forEach(doc => {
      const order = doc.data();
      const items = order.items || [];
      
      // Check if this order contains our product
      const hasProduct = items.some(item => 
        String(item.productId).trim().toLowerCase() === String(productId).trim().toLowerCase()
      );
      
      if (hasProduct) {
        // Count other products in this order
        items.forEach(item => {
          const itemId = String(item.productId).trim().toLowerCase();
          if (itemId !== String(productId).trim().toLowerCase()) {
            productFrequency[item.productId] = (productFrequency[item.productId] || 0) + 1;
          }
        });
      }
    });
    
    // Sort by frequency and get top 3
    const sortedProducts = Object.entries(productFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);
    
    // Fetch product details
    if (sortedProducts.length === 0) {
      return [];
    }
    
    const productsRef = collection(db, 'products');
    const products = [];
    
    for (const id of sortedProducts) {
      try {
        const productQuery = query(productsRef, where('__name__', '==', id), limit(1));
        const productSnapshot = await getDocs(productQuery);
        
        if (!productSnapshot.empty) {
          const productData = productSnapshot.docs[0].data();
          products.push({
            id: productSnapshot.docs[0].id,
            ...productData
          });
        }
      } catch (err) {
        console.error('Error fetching product:', id, err);
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error getting frequently bought together:', error);
    return [];
  }
}

/**
 * Get similar products based on category, subcategory, and price range
 * @param {Object} product - Current product object
 * @returns {Promise<Array>} - Array of similar products
 */
export async function getSimilarProducts(product) {
  try {
    if (!product) return [];
    
    const productsRef = collection(db, 'products');
    const priceMin = product.price * 0.7; // 30% lower
    const priceMax = product.price * 1.3; // 30% higher
    
    // Try to find products with same subcategory first
    let q = query(
      productsRef,
      where('category', '==', product.category),
      where('subCategory', '==', product.subCategory || ''),
      limit(8)
    );
    
    let snapshot = await getDocs(q);
    let products = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(p => p.id !== product.id);
    
    // If not enough products, try same category
    if (products.length < 4) {
      q = query(
        productsRef,
        where('category', '==', product.category),
        limit(8)
      );
      
      snapshot = await getDocs(q);
      products = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(p => p.id !== product.id);
    }
    
    // Filter by price range and sort by rating
    products = products
      .filter(p => {
        const price = p.price || 0;
        return price >= priceMin && price <= priceMax;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 4);
    
    return products;
  } catch (error) {
    console.error('Error getting similar products:', error);
    return [];
  }
}

/**
 * Calculate bundle discount for frequently bought together
 * @param {Array} products - Array of products
 * @returns {Object} - Original total and discounted total
 */
export function calculateBundleDiscount(products) {
  const originalTotal = products.reduce((sum, p) => sum + (p.price || 0), 0);
  const discountPercent = 0.05; // 5% bundle discount
  const discountedTotal = Math.round(originalTotal * (1 - discountPercent));
  
  return {
    originalTotal,
    discountedTotal,
    savings: originalTotal - discountedTotal,
    discountPercent: discountPercent * 100
  };
}
