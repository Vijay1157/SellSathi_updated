import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Search, LayoutGrid, List, SlidersHorizontal, ShoppingCart, Heart, Eye } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db, auth } from '@/modules/shared/config/firebase';
import { addToCart } from '@/modules/shared/utils/cartUtils';
import { addToWishlist, removeFromWishlist, listenToWishlist } from '@/modules/shared/utils/wishlistUtils';
import ReviewModal from '@/modules/shared/components/common/ReviewModal';
import QuickViewModal from '@/modules/shared/components/common/QuickViewModal';
import Rating from '@/modules/shared/components/common/Rating';
import { fetchProductReviews } from '@/modules/shared/utils/reviewUtils';
import PriceDisplay from '@/modules/shared/components/common/PriceDisplay';
import { MAIN_CATEGORIES, getSubcategories } from '@/modules/shared/config/categories';

export default function ProductListing() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubcategories, setSelectedSubcategories] = useState([]);
    const [priceRange, setPriceRange] = useState(200000);
    const [sortBy, setSortBy] = useState('newest');
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
    const [wishlist, setWishlist] = useState([]);
    const [productReviews, setProductReviews] = useState({}); // Cache reviews for all products

    const location = useLocation();
    const navigate = useNavigate();

    // Parse query params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const cat = params.get('category');

        if (cat) {
            setSelectedCategory(cat.trim());
        } else {
            setSelectedCategory('All');
        }
    }, [location.search]);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);

            try {
                const q = query(collection(db, "products"), limit(50));
                const snap = await getDocs(q);
                let data = snap.docs.map(doc => {
                    const d = { id: doc.id, ...doc.data() };
                    // Seller products store `title` instead of `name` — normalize here
                    if (!d.name && d.title) d.name = d.title;
                    return d;
                });

                setProducts(data);
                setLoading(false);

                // Fetch reviews for all loaded products
                fetchReviewsForProducts(data);
            } catch (err) {
                console.error("Fetch Products Error:", err);
                // Show empty state on error
                setProducts([]);
                setLoading(false);
            }
        };
        fetchProducts();

        // Load wishlist
        const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(saved);
    }, []);

    // Fetch reviews for products
    const fetchReviewsForProducts = async (productsToFetch) => {
        const reviewPromises = productsToFetch.map(async (product) => {
            try {
                const { reviews, stats } = await fetchProductReviews(product.id);
                return { productId: product.id, reviews, stats };
            } catch (error) {
                console.error(`Failed to fetch reviews for product ${product.id}:`, error);
                return { productId: product.id, reviews: [], stats: { averageRating: 0, totalReviews: 0 } };
            }
        });

        try {
            const reviewResults = await Promise.all(reviewPromises);
            const reviewsMap = {};
            reviewResults.forEach(result => {
                reviewsMap[result.productId] = result;
            });
            setProductReviews(reviewsMap);
        } catch (error) {
            console.error('Error fetching product reviews:', error);
        }
    };

    useEffect(() => {
        let result = [...products];
        const params = new URLSearchParams(location.search);
        const searchQuery = params.get('search')?.toLowerCase();
        const subCategory = params.get('sub');
        const subcategory = params.get('subcategory');
        const itemName = params.get('item');

        // Search Filter
        if (searchQuery) {
            result = result.filter(p =>
                (p.name && p.name.toLowerCase().includes(searchQuery)) ||
                (p.category && p.category.toLowerCase().includes(searchQuery)) ||
                (p.subCategory && p.subCategory.toLowerCase().includes(searchQuery))
            );
        }

        // Category Filter - with proper normalization
        if (selectedCategory !== 'All') {
            result = result.filter(p =>
                p.category?.toLowerCase()?.trim() === selectedCategory.toLowerCase().trim()
            );
        }

        // Subcategory Filter - with proper normalization and both field names
        if (subCategory) {
            const normalizedSubCategory = subCategory.toLowerCase().trim();
            result = result.filter(p =>
                p.subCategory?.toLowerCase()?.trim() === normalizedSubCategory ||
                p.category?.toLowerCase()?.trim() === normalizedSubCategory
            );
        } else if (subcategory) {
            const normalizedSubcategory = subcategory.toLowerCase().trim();
            result = result.filter(p =>
                p.subCategory?.toLowerCase()?.trim() === normalizedSubcategory ||
                p.category?.toLowerCase()?.trim() === normalizedSubcategory
            );
        } else if (selectedSubcategories.length > 0) {
            // Filter by selected subcategories from sidebar
            result = result.filter(p =>
                selectedSubcategories.some(sub =>
                    p.subCategory?.toLowerCase()?.trim() === sub.toLowerCase().trim()
                )
            );
        }

        // Specific Item Filter
        if (itemName) {
            const queryName = itemName.toLowerCase();
            result = result.filter(p =>
                (p.name && p.name.toLowerCase().includes(queryName)) ||
                (p.tags && p.tags.some(tag => tag.toLowerCase().includes(queryName)))
            );
        }

        // Price Filter
        result = result.filter(p => p.price <= priceRange);

        // Sorting
        if (sortBy === 'priceLow') result.sort((a, b) => a.price - b.price);
        else if (sortBy === 'priceHigh') result.sort((a, b) => b.price - a.price);

        setFilteredProducts(result);
    }, [products, selectedCategory, selectedSubcategories, priceRange, sortBy, location.search]);

    // Listen to wishlist changes
    useEffect(() => {
        const unsubscribe = listenToWishlist((items) => {
            setWishlist(items);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const toggleWishlist = async (e, p) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }

        const isSaved = wishlist.some(item => item.id === p.id);

        try {
            if (isSaved) {
                await removeFromWishlist(p.id);
            } else {
                await addToWishlist(p);
            }
        } catch (error) {
            console.error('Wishlist error:', error);
        }
    };

    const handleAddToCart = async (p) => {
        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }
        const res = await addToCart(p);
        if (res.success) {
            alert('✅ Product added to cart successfully!');
        }
    };

    const toggleSubcategory = (subcategory) => {
        setSelectedSubcategories(prev => {
            if (prev.includes(subcategory)) {
                return prev.filter(s => s !== subcategory);
            } else {
                return [...prev, subcategory];
            }
        });
    };

    const clearAllFilters = () => {
        setSelectedCategory('All');
        setSelectedSubcategories([]);
        setPriceRange(200000);
        setSortBy('newest');
        navigate('/products');
    };

    // Get subcategories for current category
    const availableSubcategories = selectedCategory !== 'All' ? getSubcategories(selectedCategory) : [];

    return (
        <div className="listing-wrapper" style={{ background: '#F8F9FA' }}>
            <div className="container">
                <div className="listing-layout">
                    {/* Professional Filter Sidebar - LEFT SIDE */}
                    <aside className="filters-sidebar-pro glass-card">
                        <div className="sidebar-header">
                            <div className="sidebar-title">
                                <SlidersHorizontal size={20} />
                                <h3>Filters</h3>
                            </div>
                            {(selectedCategory !== 'All' || selectedSubcategories.length > 0 || priceRange < 200000) && (
                                <button className="clear-filters-btn" onClick={clearAllFilters}>
                                    Clear All
                                </button>
                            )}
                        </div>

                        {/* Categories Section */}
                        <div className="filter-section">
                            <h4 className="filter-section-title">Categories</h4>
                            <div className="category-list-pro">
                                <button
                                    className={selectedCategory === 'All' ? 'active' : ''}
                                    onClick={() => {
                                        setSelectedCategory('All');
                                        setSelectedSubcategories([]);
                                    }}
                                >
                                    All Products
                                </button>
                                {MAIN_CATEGORIES.map(cat => (
                                    <button
                                        key={cat}
                                        className={selectedCategory === cat ? 'active' : ''}
                                        onClick={() => {
                                            setSelectedCategory(cat);
                                            setSelectedSubcategories([]);
                                        }}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Subcategories Section - Only show when category is selected */}
                        {selectedCategory !== 'All' && availableSubcategories.length > 0 && (
                            <div className="filter-section">
                                <h4 className="filter-section-title">Subcategories</h4>
                                <div className="subcategory-list-pro">
                                    {availableSubcategories.map(sub => (
                                        <label key={sub} className="checkbox-label">
                                            <input
                                                type="checkbox"
                                                checked={selectedSubcategories.includes(sub)}
                                                onChange={() => toggleSubcategory(sub)}
                                            />
                                            <span>{sub}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Price Range Section */}
                        <div className="filter-section">
                            <h4 className="filter-section-title">Price Range</h4>
                            <div className="price-filter-pro">
                                <input
                                    type="range"
                                    min="0"
                                    max="200000"
                                    step="1000"
                                    value={priceRange}
                                    onChange={(e) => setPriceRange(Number(e.target.value))}
                                />
                                <div className="price-labels">
                                    <span>₹0</span>
                                    <span className="current-price">₹{priceRange.toLocaleString()}</span>
                                    <span>₹2,00,000</span>
                                </div>
                            </div>
                        </div>

                        {/* Sort By Section */}
                        <div className="filter-section">
                            <h4 className="filter-section-title">Sort By</h4>
                            <div className="sort-options-pro">
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="sort"
                                        value="newest"
                                        checked={sortBy === 'newest'}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    />
                                    <span>Newest First</span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="sort"
                                        value="priceLow"
                                        checked={sortBy === 'priceLow'}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    />
                                    <span>Price: Low to High</span>
                                </label>
                                <label className="radio-label">
                                    <input
                                        type="radio"
                                        name="sort"
                                        value="priceHigh"
                                        checked={sortBy === 'priceHigh'}
                                        onChange={(e) => setSortBy(e.target.value)}
                                    />
                                    <span>Price: High to Low</span>
                                </label>
                            </div>
                        </div>
                    </aside>

                    {/* Product Grid Area */}
                    <main className="product-main">
                        {/* Header with Breadcrumbs - Aligned with content */}
                        <div className="listing-header-inline">
                            <div className="breadcrumb">
                                <Link to="/">Home</Link> / <span>Products</span>
                            </div>
                            <div className="listing-title-row">
                                <h1>{selectedCategory === 'All' ? 'All Products' : selectedCategory} <span className="count">({filteredProducts.length})</span></h1>
                            </div>
                        </div>

                        <div className="product-main-header">
                            <div className="view-toggle">
                                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={18} /></button>
                                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={18} /></button>
                            </div>
                        </div>
                        <AnimatePresence mode="popLayout">
                            {loading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Discovering best products for you...</p>
                                </div>
                            ) : filteredProducts.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="empty-state glass-card"
                                >
                                    <Search size={48} className="text-muted" />
                                    <h2>No products found</h2>
                                    <p>
                                        {location.search.includes('subcategory')
                                            ? 'No products found for this selection. Try browsing other categories or subcategories.'
                                            : 'Try adjusting your filters or search query to find what you\'re looking for.'
                                        }
                                    </p>
                                    <button onClick={() => { setSelectedCategory('All'); setPriceRange(100000); navigate('/products') }} className="btn btn-primary">Clear All Filters</button>
                                </motion.div>
                            ) : (
                                <div className={`products-${viewMode}`}>
                                    {filteredProducts.map((p, idx) => (
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={p.id}
                                            className="product-card-premium glass-card"
                                            onClick={() => {
                                                const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                                                const filtered = recentlyViewed.filter(item => item.id !== p.id);
                                                const updated = [p, ...filtered].slice(0, 8);
                                                localStorage.setItem('recentlyViewed', JSON.stringify(updated));
                                                navigate("/product/" + p.id);
                                            }}
                                            onDoubleClick={() => navigate("/product/" + p.id)}
                                        >
                                            <div className="card-media">
                                                {p.discount && <span className="discount-badge">{p.discount}</span>}
                                                <img src={p.imageUrl || p.image} alt={p.name} />
                                                <div className="overlay-tools">
                                                    <button
                                                        onClick={(e) => toggleWishlist(e, p)}
                                                        className={`tool-btn ${wishlist.some(item => item.id === p.id) ? 'active' : ''}`}
                                                        title="Save to Wishlist"
                                                    >
                                                        <Heart
                                                            size={18}
                                                            fill={wishlist.some(item => item.id === p.id) ? "#E11D48" : "none"}
                                                            color={wishlist.some(item => item.id === p.id) ? "#E11D48" : "currentColor"}
                                                        />
                                                    </button>
                                                    <button onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedProduct(p);
                                                        setIsReviewModalOpen(true);
                                                    }} className="tool-btn" title="Write a Review"><Star size={18} /></button>
                                                    <button className="tool-btn" title="View Details" onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedQuickProduct(p);
                                                        setIsQuickViewOpen(true);
                                                    }}><Eye size={18} /></button>
                                                </div>
                                            </div>
                                            <div className="product-details">
                                                <p className="p-cat">{p.category}</p>
                                                <h3 className="p-name">{p.name}</h3>
                                                <div className="p-rating">
                                                    <Rating
                                                        averageRating={productReviews[p.id]?.stats?.averageRating || 0}
                                                        totalReviews={productReviews[p.id]?.stats?.totalReviews || 0}
                                                        size={14}
                                                        showCount={true}
                                                        className="product-card-rating"
                                                    />
                                                </div>
                                                <div className="p-footer">
                                                    <div className="p-price-group">
                                                        <PriceDisplay product={p} size="sm" />
                                                    </div>
                                                    {(p.stock === 0 || p.status === 'Out of Stock') && (
                                                        <span style={{ color: '#ef4444', fontSize: '0.65rem', fontWeight: 900, marginRight: '0.5rem', textTransform: 'uppercase' }}>OUT OF STOCK</span>
                                                    )}
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                                                        className="add-to-cart-simple"
                                                        disabled={p.stock === 0 || p.status === 'Out of Stock'}
                                                        style={p.stock === 0 || p.status === 'Out of Stock' ? { background: '#94a3b8', cursor: 'not-allowed', opacity: 0.7 } : {}}
                                                    >
                                                        <ShoppingCart size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            )}
                        </AnimatePresence>
                    </main>
                </div>
            </div>

            <ReviewModal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                productId={selectedProduct?.id}
                productName={selectedProduct?.name}
            />

            <QuickViewModal
                isOpen={isQuickViewOpen}
                onClose={() => setIsQuickViewOpen(false)}
                product={selectedQuickProduct}
                navigate={navigate}
            />

            <style>{listingStyles}</style>
        </div>
    );
}

const listingStyles = `
/* Professional Listing Layout */
.listing-wrapper { 
    min-height: 100vh; 
    padding: 16px 0 32px; 
}
.listing-wrapper .container {
    padding-left: 12px;
    padding-right: 12px;
}
@media (max-width: 768px) {
    .listing-wrapper .container {
        padding-left: 8px;
        padding-right: 8px;
    }
}

/* Inline Header - Inside product-main */
.listing-header-inline { 
    margin-bottom: 16px;
    padding: 16px 16px 12px 16px;
    border-bottom: 2px solid var(--border-light);
}
.breadcrumb { 
    font-size: var(--text-sm, 14px); 
    color: var(--text-secondary); 
    margin-bottom: 8px; 
}
.breadcrumb a { 
    color: var(--text-secondary); 
    text-decoration: none; 
    transition: color var(--transition-base, 200ms);
}
.breadcrumb a:hover {
    color: var(--primary);
}
.breadcrumb span { 
    color: var(--text-primary); 
    font-weight: var(--font-semibold, 600); 
}
.listing-title-row { 
    display: flex; 
    justify-content: space-between; 
    align-items: flex-end; 
}
.listing-title-row h1 { 
    font-size: 28px; 
    font-weight: var(--font-bold, 700); 
    color: var(--text-primary); 
}
.count { 
    font-size: var(--text-base, 16px); 
    color: var(--text-secondary); 
    margin-left: var(--space-2, 8px); 
}

.view-toggle { 
    display: flex; 
    background: var(--white); 
    border-radius: var(--radius-md, 8px); 
    border: 2px solid var(--border-medium); 
    overflow: hidden;
    box-shadow: var(--shadow-xs);
}
.view-toggle button { 
    width: 40px; 
    height: 40px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    color: var(--text-secondary); 
    transition: all var(--transition-base, 200ms);
    border: none;
    background: transparent;
}
.view-toggle button.active { 
    background: var(--primary); 
    color: var(--white); 
}
.view-toggle button:hover:not(.active) {
    background: var(--gray-50);
    color: var(--primary);
}

/* Professional Layout with Sidebar */
.listing-layout { 
    display: grid; 
    grid-template-columns: 280px 1fr; 
    gap: 16px; 
    margin-top: 16px;
    width: 100%;
}

/* Professional Filter Sidebar */
.filters-sidebar-pro {
    background: var(--white);
    border-radius: var(--radius-xl, 12px);
    padding: 16px;
    height: fit-content;
    position: sticky;
    top: 100px;
    border: 2px solid rgba(0, 0, 0, 0.15);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
}

.sidebar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 10px;
    border-bottom: 2px solid var(--border-medium);
}

.sidebar-title {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
}

.sidebar-title h3 {
    font-size: var(--text-lg, 18px);
    font-weight: var(--font-bold, 700);
    color: var(--text-primary);
    margin: 0;
}

.clear-filters-btn {
    font-size: var(--text-xs, 12px);
    font-weight: var(--font-semibold, 600);
    color: var(--primary);
    background: transparent;
    border: 1.5px solid var(--primary-light);
    cursor: pointer;
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-sm, 6px);
    transition: all var(--transition-base, 200ms);
}

.clear-filters-btn:hover {
    background: var(--primary);
    color: var(--white);
    border-color: var(--primary);
}

.filter-section {
    margin-bottom: 16px;
    padding-bottom: 16px;
    border-bottom: 2px solid var(--gray-100);
}

.filter-section:last-child {
    border-bottom: none;
    margin-bottom: 0;
    padding-bottom: 0;
}

.filter-section-title {
    font-size: var(--text-sm, 14px);
    font-weight: var(--font-bold, 700);
    color: var(--text-primary);
    margin-bottom: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* Category List */
.category-list-pro {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.category-list-pro button {
    text-align: left;
    padding: 8px 12px;
    border-radius: var(--radius-md, 8px);
    font-weight: var(--font-semibold, 600);
    font-size: var(--text-sm, 14px);
    color: var(--text-secondary);
    background: transparent;
    border: 1.5px solid var(--border-light);
    transition: all var(--transition-base, 200ms);
    cursor: pointer;
}

.category-list-pro button:hover {
    background: var(--gray-50);
    color: var(--primary);
    border-color: var(--primary-light);
}

.category-list-pro button.active {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: var(--white);
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

/* Subcategory List */
.subcategory-list-pro {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    font-size: var(--text-sm, 14px);
    font-weight: var(--font-medium, 500);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px 8px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid transparent;
    transition: all var(--transition-base, 200ms);
}

.checkbox-label:hover {
    color: var(--text-primary);
    background: var(--gray-50);
    border-color: var(--border-medium);
}

.checkbox-label input[type="checkbox"] {
    width: 18px;
    height: 18px;
    border-radius: var(--radius-sm, 6px);
    cursor: pointer;
    accent-color: var(--primary);
}

/* Price Filter */
.price-filter-pro {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 12px;
    background: var(--gray-50);
    border-radius: var(--radius-md, 8px);
    border: 1px solid var(--border-light);
}

.price-filter-pro input[type="range"] {
    width: 100%;
    height: 6px;
    border-radius: var(--radius-full, 9999px);
    background: var(--gray-200);
    outline: none;
    accent-color: var(--primary);
    cursor: pointer;
}

.price-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--text-xs, 12px);
    font-weight: var(--font-semibold, 600);
    color: var(--text-secondary);
}

.price-labels .current-price {
    color: var(--primary);
    font-size: var(--text-sm, 14px);
    font-weight: var(--font-bold, 700);
}

/* Sort Options */
.sort-options-pro {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.radio-label {
    display: flex;
    align-items: center;
    gap: var(--space-3, 12px);
    font-size: var(--text-sm, 14px);
    font-weight: var(--font-medium, 500);
    color: var(--text-secondary);
    cursor: pointer;
    padding: 6px 8px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid transparent;
    transition: all var(--transition-base, 200ms);
}

.radio-label:hover {
    color: var(--text-primary);
    background: var(--gray-50);
    border-color: var(--border-medium);
}

.radio-label input[type="radio"] {
    width: 18px;
    height: 18px;
    cursor: pointer;
    accent-color: var(--primary);
}

/* OLD STYLES - REMOVED */
.listing-controls { display: none; }
.control-group { display: none; }
.custom-select { display: none; }

.filters-sidebar { display: none; }
.sidebar-section { display: none; }
.category-list { display: none; }
.rating-filters { display: none; }
.rating-opt { display: none; }

.product-main {
    min-height: 600px;
    padding: 0;
    background: var(--white);
    border-radius: var(--radius-xl, 12px);
    border: 2px solid var(--border-light);
    width: 100%;
}

.product-main-header {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px;
    border-bottom: 2px solid var(--border-light);
    background: var(--gray-50);
}

/* Professional Product Grid - 4 columns, compact for 8 products visible */
.products-grid { 
    display: grid; 
    grid-template-columns: repeat(4, 1fr); 
    gap: var(--space-4, 16px);
    align-items: start;
    padding: 12px;
    width: 100%;
}

@media (max-width: 1024px) {
    .products-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}

@media (max-width: 768px) {
    .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--grid-gap-mobile, 16px);
    }
}

@media (max-width: 480px) {
    .products-grid {
        grid-template-columns: 1fr;
    }
}

.product-card-premium { 
    background: var(--white); 
    border-radius: var(--card-border-radius, 10px); 
    padding: var(--space-3, 12px); 
    border: 2px solid rgba(0, 0, 0, 0.15); 
    transition: all var(--transition-base, 200ms); 
    display: flex; 
    flex-direction: column; 
    height: 100%; 
    cursor: pointer;
    max-height: 360px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.product-card-premium:hover { 
    transform: translateY(-4px); 
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    border-color: var(--primary);
}

.card-media { 
    height: 170px;
    background: var(--gray-50); 
    border-radius: var(--radius-md, 8px); 
    position: relative; 
    overflow: hidden; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    padding: var(--space-2, 8px); 
    margin-bottom: 10px;
    border: 1px solid var(--border-light);
}
.card-media img { 
    width: 100%; 
    height: 100%; 
    object-fit: contain; 
    transition: transform var(--transition-slow, 300ms); 
}
.product-card-premium:hover .card-media img { 
    transform: scale(1.05); 
}

.discount-badge { 
    position: absolute; 
    top: var(--space-2, 8px); 
    left: var(--space-2, 8px); 
    background: var(--error); 
    color: var(--white); 
    padding: var(--space-1, 4px) var(--space-2, 8px); 
    border-radius: var(--radius-sm, 6px); 
    font-weight: var(--font-bold, 700); 
    font-size: 10px; 
    z-index: 2; 
}

.overlay-tools { 
    position: absolute; 
    top: var(--space-2, 8px); 
    right: var(--space-2, 8px); 
    display: flex; 
    flex-direction: column; 
    gap: var(--space-1, 4px); 
    z-index: 20; 
}
.tool-btn { 
    width: 32px; 
    height: 32px; 
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-md, 8px); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    border: 1px solid rgba(229, 231, 235, 0.8);
    color: var(--text-secondary); 
    transition: all var(--transition-base, 200ms); 
    cursor: pointer; 
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.tool-btn:hover { 
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: var(--white); 
    border-color: transparent;
    transform: scale(1.05); 
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}
.tool-btn.active { 
    background: rgba(239, 68, 68, 0.1);
    color: var(--error); 
    border-color: var(--error);
}
.tool-btn.active:hover {
    background: var(--error);
    color: var(--white);
}

.product-details {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.p-cat { 
    font-size: var(--text-xs, 12px); 
    color: var(--text-tertiary); 
    font-weight: var(--font-bold, 700); 
    text-transform: uppercase; 
    margin-bottom: var(--space-1, 4px); 
    letter-spacing: 0.05em;
    line-height: 1;
}
.p-name { 
    font-size: var(--text-base, 16px); 
    font-weight: var(--font-bold, 700); 
    margin-bottom: 6px; 
    color: var(--text-primary); 
    line-height: 1.3; 
    display: -webkit-box; 
    -webkit-line-clamp: 2; 
    -webkit-box-orient: vertical; 
    overflow: hidden; 
    height: 2.6em;
    min-height: 2.6em;
}
.p-rating { 
    display: flex; 
    align-items: center; 
    gap: var(--space-2, 8px); 
    margin-bottom: 6px;
    min-height: 20px;
}
.p-footer { 
    margin-top: auto; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    gap: var(--space-2, 8px); 
    padding-top: var(--space-2, 8px);
    border-top: 1px solid var(--border-light);
}
.p-price-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-1, 4px);
    flex: 1;
}
.p-price { 
    font-size: var(--text-lg, 18px); 
    font-weight: var(--font-extrabold, 800); 
    color: var(--text-primary); 
    line-height: 1; 
}
.p-old-price { 
    font-size: var(--text-xs, 12px); 
    font-weight: var(--font-medium, 500); 
    color: var(--text-tertiary); 
    text-decoration: line-through; 
}
.add-to-cart-simple { 
    width: 40px;
    height: 40px;
    min-width: 40px;
    padding: 0;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: var(--white); 
    border-radius: var(--radius-md, 8px); 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-weight: var(--font-bold, 700); 
    transition: all var(--transition-base, 200ms);
    cursor: pointer;
    border: none;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}
.add-to-cart-simple:hover { 
    background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}
.add-to-cart-simple:active {
    transform: scale(0.98);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}
.add-to-cart-simple:disabled {
    background: #94A3B8;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    opacity: 0.6;
}

.loading-state { 
    grid-column: 1 / -1; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center; 
    padding: 10rem 0; 
    gap: 2rem;
}
.spinner { width: 50px; height: 50px; border: 5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { 
    grid-column: 1 / -1; 
    padding: 6rem; 
    text-align: center; 
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    gap: 2rem; 
    border: 2px dashed var(--border-medium); 
    border-radius: var(--radius-xl, 12px); 
    background: var(--gray-50); 
}
.empty-state h2 { font-size: 2.5rem; font-weight: 900; }

@media (max-width: 1024px) {
    .products-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: var(--space-3, 12px);
    }
    .listing-layout { 
        grid-template-columns: 1fr; 
        gap: 16px; 
    }
    .filters-sidebar-pro { 
        position: relative;
        top: 0;
    }
    .filter-section {
        margin-bottom: 12px;
        padding-bottom: 12px;
    }
}

@media (max-width: 768px) {
    .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: var(--space-2, 8px);
    }
    .listing-title-row {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    .filters-sidebar-pro {
        padding: 12px;
    }
    .category-list-pro button {
        padding: var(--space-2, 8px) var(--space-3, 12px);
        font-size: var(--text-xs, 12px);
    }
    .card-media {
        height: 140px;
    }
    .product-card-premium {
        max-height: 320px;
    }
    .listing-wrapper {
        padding: 12px 0 24px;
    }
    .listing-header-inline {
        margin-bottom: 12px;
        padding-bottom: 10px;
    }
    .listing-title-row h1 {
        font-size: 24px;
    }
}

@media (max-width: 480px) {
    .products-grid {
        grid-template-columns: 1fr;
    }
}
`;
