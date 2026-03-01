import { authFetch, API_BASE } from './api';

/**
 * Review Data Management Utility
 * 
 * Handles fetching, caching, and managing product reviews
 * across the entire application
 */

// Review cache to avoid repeated API calls
const reviewCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch reviews for a product with caching
 */
export const fetchProductReviews = async (productId) => {
    const cacheKey = `reviews_${productId}`;
    const cached = reviewCache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    try {
        const response = await authFetch(`/api/products/${productId}/reviews`);
        const data = await response.json();
        
        if (data.success) {
            const reviews = data.reviews || [];
            const stats = calculateRatingStats(reviews);
            
            // Cache the results
            reviewCache.set(cacheKey, {
                data: { reviews, stats },
                timestamp: Date.now()
            });
            
            return { reviews, stats };
        }
        
        return { reviews: [], stats: getEmptyStats() };
    } catch (error) {
        console.error(`Failed to fetch reviews for product ${productId}:`, error);
        return { reviews: [], stats: getEmptyStats() };
    }
};

/**
 * Calculate rating statistics from reviews array
 */
export const calculateRatingStats = (reviews) => {
    if (!reviews || reviews.length === 0) {
        return getEmptyStats();
    }
    
    const totalReviews = reviews.length;
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    const averageRating = totalRating / totalReviews;
    
    // Calculate distribution
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
        const rating = Math.round(review.rating);
        if (distribution[rating] !== undefined) {
            distribution[rating]++;
        }
    });
    
    return {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews,
        distribution
    };
};

/**
 * Get empty stats for products with no reviews
 */
const getEmptyStats = () => ({
    averageRating: 0,
    totalReviews: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
});

/**
 * Clear review cache for a specific product
 */
export const clearProductReviewCache = (productId) => {
    const cacheKey = `reviews_${productId}`;
    reviewCache.delete(cacheKey);
};

/**
 * Clear all review cache
 */
export const clearAllReviewCache = () => {
    reviewCache.clear();
};

/**
 * Submit a new review
 */
export const submitReview = async (productId, reviewData) => {
    try {
        const response = await authFetch('/api/reviews', {
            method: 'POST',
            body: JSON.stringify({
                productId,
                ...reviewData
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Clear cache for this product to force refresh
            clearProductReviewCache(productId);
            
            // Dispatch event to update UI across components
            window.dispatchEvent(new CustomEvent('reviewsUpdate', { 
                detail: { productId, review: data.review } 
            }));
        }
        
        return data;
    } catch (error) {
        console.error('Failed to submit review:', error);
        throw error;
    }
};

/**
 * Check if user is eligible to review a product
 */
export const checkReviewEligibility = async (productId) => {
    try {
        const response = await authFetch(`/api/check-review-eligibility/${productId}`);
        const data = await response.json();
        return data.success ? data : { eligible: false, reason: 'Failed to check eligibility' };
    } catch (error) {
        console.error('Failed to check review eligibility:', error);
        return { eligible: false, reason: 'Network error' };
    }
};
