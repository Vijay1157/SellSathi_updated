import React from 'react';
import { getProductPricing, formatPrice } from '../../utils/priceUtils';

const PriceDisplay = ({
    product,
    selections = {},
    size = 'md',
    showBadge = true,
    className = ''
}) => {
    const { finalPrice, strikethroughPrice, discountTag, showDiscount } = getProductPricing(product, selections);

    const sizeClasses = {
        sm: {
            container: 'price-display-sm',
            row: 'price-row-sm',
            final: 'final-price-sm',
            old: 'old-price-sm',
            badge: 'badge-sm'
        },
        md: {
            container: 'price-display-md',
            row: 'price-row-md',
            final: 'final-price-md',
            old: 'old-price-md',
            badge: 'badge-md'
        },
        lg: {
            container: 'price-display-lg',
            row: 'price-row-lg',
            final: 'final-price-lg',
            old: 'old-price-lg',
            badge: 'badge-lg'
        }
    };

    const styles = sizeClasses[size] || sizeClasses.md;
    // The image shows just "13%", so strip off " OFF" if present
    const cleanDiscountTag = discountTag ? discountTag.replace(' OFF', '') : '';

    return (
        <div className={`price-display-container ${styles.container} ${className}`}>
            <div className={`price-row ${styles.row}`}>
                <span className={`final-price ${styles.final}`}>
                    {formatPrice(finalPrice)}
                </span>

                {showDiscount && strikethroughPrice > finalPrice && (
                    <>
                        <span className={`old-price ${styles.old}`}>
                            {formatPrice(strikethroughPrice)}
                        </span>

                        {showBadge && cleanDiscountTag && (
                            <span className={`discount-badge-standard ${styles.badge}`}>
                                {cleanDiscountTag}
                            </span>
                        )}
                    </>
                )}
            </div>

            <style>{`
                .price-display-container {
                    display: flex;
                    flex-direction: column;
                    font-family: inherit;
                }
                .price-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .final-price {
                    font-weight: 950;
                    color: #1e293b;
                }
                .old-price {
                    color: #94a3b8;
                    text-decoration: line-through;
                    font-weight: 500;
                }
                .discount-badge-standard {
                    background: #f97316;
                    color: white;
                    border-radius: 12px;
                    font-weight: 800;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Size: Small (Listings, Cards) */
                .price-display-sm .final-price { font-size: 1.6rem; letter-spacing: -0.5px; }
                .price-display-sm .old-price { font-size: 0.9rem; margin-top: 0.25rem; }
                .price-display-sm .badge-sm { 
                    font-size: 0.8rem; 
                    padding: 0.2rem 0.6rem;
                    margin-top: 0.25rem;
                }

                /* Size: Medium (Modals, Wishlist) */
                .price-display-md .final-price { font-size: 1.8rem; letter-spacing: -0.5px; }
                .price-display-md .old-price { font-size: 1rem; margin-top: 0.3rem; }
                .price-display-md .badge-md { 
                    font-size: 0.85rem; 
                    padding: 0.25rem 0.7rem;
                    margin-top: 0.3rem;
                }

                /* Size: Large (Product Detail) */
                .price-display-lg .final-price { font-size: 2.5rem; letter-spacing: -1px; }
                .price-display-lg .old-price { font-size: 1.25rem; margin-top: 0.5rem; }
                .price-display-lg .badge-lg { 
                    font-size: 1rem; 
                    padding: 0.3rem 0.8rem;
                    margin-top: 0.5rem;
                }
            `}</style>
        </div>
    );
};

export default PriceDisplay;
