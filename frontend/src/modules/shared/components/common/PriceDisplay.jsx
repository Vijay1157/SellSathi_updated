import React from 'react';
import { getProductPricing, formatPrice } from '@/modules/shared/utils/priceUtils';

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
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                .final-price {
                    font-weight: 700;
                    color: var(--text);
                }
                .old-price {
                    color: var(--text-muted);
                    text-decoration: line-through;
                }
                .discount-badge-standard {
                    background: #ef4444;
                    color: white;
                    border-radius: 4px;
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                }

                /* Size: Small */
                .price-display-sm .final-price { font-size: 1.1rem; }
                .price-display-sm .old-price { font-size: 0.9rem; }
                .price-display-sm .badge-sm { 
                    font-size: 0.7rem; 
                    padding: 0.1rem 0.4rem;
                }

                /* Size: Medium */
                .price-display-md .final-price { font-size: 1.5rem; }
                .price-display-md .old-price { font-size: 1.1rem; }
                .price-display-md .badge-md { 
                    font-size: 0.85rem; 
                    padding: 0.2rem 0.6rem;
                }

                /* Size: Large */
                .price-display-lg .final-price { font-size: 2rem; }
                .price-display-lg .old-price { font-size: 1.25rem; }
                .price-display-lg .badge-lg { 
                    font-size: 1rem; 
                    padding: 0.25rem 0.75rem;
                }
            `}</style>
        </div>
    );
};

export default PriceDisplay;



