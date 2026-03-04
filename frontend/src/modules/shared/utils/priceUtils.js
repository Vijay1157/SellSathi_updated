/**
 * Centralized utility for price calculations across Sellsathi.
 */

/**
 * Calculates the complete pricing information for a product.
 *
 * Data field conventions:
 *  - AddProduct stores: price (original MRP), discountPrice (selling price, can be null)
 *  - Seller products use `title` instead of `name`
 *  - sizePrices: stored as plain object { "S": 500, "M": 600 } — NOT an array
 *
 * @param {Object} product - The product object from Firestore or mock data.
 * @param {Object} selections - User selections (size, color, storage, memory, purchaseOption).
 * @returns {Object} - { finalPrice, strikethroughPrice, discountTag, showDiscount, baseSellingPrice }
 */
export const getProductPricing = (product, selections = {}) => {
    if (!product) return { finalPrice: 0, strikethroughPrice: 0, discountTag: null, showDiscount: false, baseSellingPrice: 0 };

    // 1. Determine Base Price
    // AddProduct stores: price, discountPrice
    // Due to old UI mapping, some products have price=Selling, discountPrice=MRP (swapped)
    let p1 = Number(product.price) || 0;

    let baseOriginalPrice = p1;
    let baseSellingPrice = p1;
    let hasGlobalDiscount = false;
    let globalDiscountDiff = 0;

    if (product.discountPrice !== null && product.discountPrice !== undefined && product.discountPrice !== '') {
        const p2 = Number(product.discountPrice);
        if (p2 > p1) {
            // Seller swapped them! p1 is Selling, p2 is MRP (e.g. price: 265, discountPrice: 300)
            baseOriginalPrice = p2;
            baseSellingPrice = p1;
            hasGlobalDiscount = true;
            globalDiscountDiff = p2 - p1;
        } else if (p2 < p1) {
            // Standard: p1 is MRP, p2 is Selling (e.g. price: 300, discountPrice: 265)
            baseOriginalPrice = p1;
            baseSellingPrice = p2;
            hasGlobalDiscount = true;
            globalDiscountDiff = p1 - p2;
        }
    }

    // Handle products that only have oldPrice (seed/mock data pattern)
    // e.g.: { price: 50000, oldPrice: 65000 } → oldPrice is MRP, price is selling price
    if (product.oldPrice && Number(product.oldPrice) > baseOriginalPrice) {
        baseOriginalPrice = Number(product.oldPrice);
        // discountPrice overrides; if no discountPrice, 'price' was already the selling price
        if (product.discountPrice === null || product.discountPrice === undefined || product.discountPrice === '') {
            baseSellingPrice = Number(product.price);
            hasGlobalDiscount = true;
            globalDiscountDiff = baseOriginalPrice - baseSellingPrice;
        }
    }

    // 2. Apply Size-Specific Pricing
    // sizePrices is stored as a plain object: { "S": 500, "M": 600 }
    if (product.pricingType === 'varied' && selections.size && product.sizePrices) {
        let sizePrice = null;
        // Handle both array format [{size, price}] and object format {"S": 500}
        if (Array.isArray(product.sizePrices)) {
            const sizeData = product.sizePrices.find(sp => sp.size === selections.size);
            if (sizeData?.price) sizePrice = Number(sizeData.price);
        } else if (typeof product.sizePrices === 'object') {
            const val = product.sizePrices[selections.size];
            if (val) sizePrice = Number(val);
        }

        if (sizePrice !== null) {
            // The seller's inputted sizePrice is explicitly the Selling Price
            baseSellingPrice = sizePrice;

            // Re-apply the global discount diff *upwards* to infer the correct original price
            if (hasGlobalDiscount && globalDiscountDiff > 0) {
                // ALWAYS extrapolate upwards for all explicit numbers to maintain consistent discount percentage
                baseOriginalPrice = sizePrice + globalDiscountDiff;
            } else {
                baseOriginalPrice = sizePrice;
            }
        }
    }

    // 3. Add Variant Offsets (storage, memory)
    const storageOffset = (selections.storage?.priceOffset) || 0;
    const memoryOffset = (selections.memory?.priceOffset) || 0;
    const totalOffset = storageOffset + memoryOffset;

    let finalSellingPrice = baseSellingPrice + totalOffset;
    let finalOriginalPrice = baseOriginalPrice + totalOffset;

    // Store the non-exchange final selling price for use in purchase option buttons
    const baseSellingPriceWithOffsets = finalSellingPrice;

    // 4. Apply Purchase Options (e.g., Exchange = 10% more)
    if (selections.purchaseOption === 'exchange') {
        finalSellingPrice = finalSellingPrice * 1.1;
    }

    // 5. Calculate Discount Display
    const hasDiscount = Math.round(finalSellingPrice) < Math.round(finalOriginalPrice);
    let discountTag = null;

    if (hasDiscount) {
        const diff = finalOriginalPrice - finalSellingPrice;
        const percent = Math.round((diff / finalOriginalPrice) * 100);
        if (percent >= 1) discountTag = `${percent}% OFF`;
    } else if (product.discount) {
        // Fallback to pre-calculated discount tag on the product (mock/seed data)
        discountTag = typeof product.discount === 'string' ? product.discount : `${product.discount}% OFF`;
    }

    // If purchaseOption is exchange, override the tag
    if (selections.purchaseOption === 'exchange') {
        discountTag = 'Exchange Offer Applied';
    }

    return {
        finalPrice: Math.round(finalSellingPrice),
        strikethroughPrice: Math.round(finalOriginalPrice),
        discountTag,
        showDiscount: hasDiscount || !!discountTag,
        // Export base selling price (without exchange) for purchase option button display
        baseSellingPrice: Math.round(baseSellingPriceWithOffsets),
    };
};

/**
 * Formats a number as Indian Rupee currency.
 *
 * @param {number} amount - The amount to format.
 * @returns {string} - The formatted string (e.g., ₹1,29,999).
 */
export const formatPrice = (amount) => {
    return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};
