import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/modules/shared/config/firebase';
import { fetchWithCache } from './firestoreCache';

/**
 * Get frequently bought together products based on actual order data.
 * Results are cached for 15 minutes per product to avoid hammering Firestore.
 */
export async function getFrequentlyBoughtTogether(productId) {
  return fetchWithCache(
    `fbt_${productId}`,
    async () => {
      try {
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where('status', '==', 'delivered'), limit(100));
        const ordersSnapshot = await getDocs(q);

        const productFrequency = {};
        ordersSnapshot.forEach(doc => {
          const order = doc.data();
          const items = order.items || [];
          const hasProduct = items.some(item =>
            String(item.productId).trim().toLowerCase() === String(productId).trim().toLowerCase()
          );
          if (hasProduct) {
            items.forEach(item => {
              const itemId = String(item.productId).trim().toLowerCase();
              if (itemId !== String(productId).trim().toLowerCase()) {
                productFrequency[item.productId] = (productFrequency[item.productId] || 0) + 1;
              }
            });
          }
        });

        const sortedProducts = Object.entries(productFrequency)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id]) => id);

        if (sortedProducts.length === 0) return [];

        const productsRef = collection(db, 'products');
        const products = [];
        for (const id of sortedProducts) {
          try {
            const productQuery = query(productsRef, where('__name__', '==', id), limit(1));
            const productSnapshot = await getDocs(productQuery);
            if (!productSnapshot.empty) {
              products.push({ id: productSnapshot.docs[0].id, ...productSnapshot.docs[0].data() });
            }
          } catch (err) {
            console.error('Error fetching FBT product:', id, err);
          }
        }
        return products;
      } catch (error) {
        console.error('Error getting frequently bought together:', error);
        return [];
      }
    },
    15 * 60 * 1000 // 15 minutes cache
  );
}

/**
 * Get similar products based on category, subcategory, and price range.
 * Results are cached for 10 minutes per product.
 */
export async function getSimilarProducts(product) {
  if (!product) return [];
  return fetchWithCache(
    `similar_${product.id}`,
    async () => {
      try {
        const productsRef = collection(db, 'products');
        const priceMin = product.price * 0.7;
        const priceMax = product.price * 1.3;

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

        if (products.length < 4) {
          q = query(productsRef, where('category', '==', product.category), limit(8));
          snapshot = await getDocs(q);
          products = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(p => p.id !== product.id);
        }

        return products
          .filter(p => { const price = p.price || 0; return price >= priceMin && price <= priceMax; })
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 4);
      } catch (error) {
        console.error('Error getting similar products:', error);
        return [];
      }
    },
    10 * 60 * 1000 // 10 minutes cache
  );
}

/**
 * Calculate bundle discount for frequently bought together
 */
export function calculateBundleDiscount(products) {
  const originalTotal = products.reduce((sum, p) => sum + (p.price || 0), 0);
  const discountPercent = 0.05;
  const discountedTotal = Math.round(originalTotal * (1 - discountPercent));
  return {
    originalTotal,
    discountedTotal,
    savings: originalTotal - discountedTotal,
    discountPercent: discountPercent * 100
  };
}
