// Firestore Cache Utility to Reduce Quota Usage
// This prevents excessive reads by caching data in localStorage with TTL

const CACHE_PREFIX = 'fs_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached data if available and not expired
 * @param {string} key - Cache key
 * @returns {any|null} - Cached data or null if expired/not found
 */
export const getCachedData = (key) => {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const cached = localStorage.getItem(cacheKey);
        
        if (!cached) return null;
        
        const { data, timestamp, ttl } = JSON.parse(cached);
        const now = Date.now();
        
        // Check if cache is still valid
        if (now - timestamp < ttl) {
            return data;
        }
        
        // Cache expired, remove it
        localStorage.removeItem(cacheKey);
        return null;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
};

/**
 * Set data in cache with TTL
 * @param {string} key - Cache key
 * @param {any} data - Data to cache
 * @param {number} ttl - Time to live in milliseconds (default: 5 minutes)
 */
export const setCachedData = (key, data, ttl = DEFAULT_TTL) => {
    try {
        const cacheKey = CACHE_PREFIX + key;
        const cacheData = {
            data,
            timestamp: Date.now(),
            ttl
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
        console.error('Error setting cache:', error);
    }
};

/**
 * Clear specific cache entry
 * @param {string} key - Cache key to clear
 */
export const clearCache = (key) => {
    try {
        const cacheKey = CACHE_PREFIX + key;
        localStorage.removeItem(cacheKey);
    } catch (error) {
        console.error('Error clearing cache:', error);
    }
};

/**
 * Clear all Firestore caches
 */
export const clearAllCaches = () => {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(CACHE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error('Error clearing all caches:', error);
    }
};

/**
 * Fetch data with caching
 * @param {string} cacheKey - Cache key
 * @param {Function} fetchFn - Async function to fetch data
 * @param {number} ttl - Cache TTL in milliseconds
 * @returns {Promise<any>} - Cached or fresh data
 */
export const fetchWithCache = async (cacheKey, fetchFn, ttl = DEFAULT_TTL) => {
    // Try to get from cache first
    const cached = getCachedData(cacheKey);
    if (cached !== null) {
        return cached;
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache the result
    setCachedData(cacheKey, data, ttl);
    
    return data;
};
