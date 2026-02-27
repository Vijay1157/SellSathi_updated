import { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Filter, Star, Search, LayoutGrid, List, SlidersHorizontal, ChevronDown, Check, ShoppingCart, Heart, Eye } from 'lucide-react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addToCart } from '../../utils/cartUtils';
import { addToWishlist, removeFromWishlist, listenToWishlist } from '../../utils/wishlistUtils';
import ReviewModal from '../../components/common/ReviewModal';
import QuickViewModal from '../../components/common/QuickViewModal';

const CATEGORIES = ['Electronics', "Men's Fashion", "Women's Fashion", "Home & Living", "Beauty", "Sports", "Accessories"];

export default function ProductListing() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState('grid');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [priceRange, setPriceRange] = useState(200000);
    const [sortBy, setSortBy] = useState('newest');
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
    const [wishlist, setWishlist] = useState([]);

    const location = useLocation();
    const navigate = useNavigate();

    // Parse query params
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const cat = params.get('category');
        if (cat) {
            setSelectedCategory(cat);
        } else {
            setSelectedCategory('All');
        }
    }, [location.search]);

    useEffect(() => {
        const fetchProducts = async () => {
            setLoading(true);

            // Define mockData outside try block for scope accessibility
            const mockData = [
                // Electronics
                {
                    id: "deal-1", name: "MacBook Pro M2 Max", price: 129999, oldPrice: 149498, rating: 4.8, reviews: 1256, category: "Electronics", subCategory: "Laptops",
                    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", discount: "13% OFF",
                    colors: ['Space Gray', 'Silver'],
                    storage: [
                        { label: '512GB', priceOffset: 0 },
                        { label: '1TB', priceOffset: 20000 },
                        { label: '2TB', priceOffset: 60000 }
                    ],
                    memory: [
                        { label: '16GB', priceOffset: 0 },
                        { label: '32GB', priceOffset: 40000 },
                        { label: '64GB', priceOffset: 80000 }
                    ],
                    specifications: { "Processor": "Apple M2 Max chip", "Memory": "32GB Unified Memory", "Storage": "1TB SSD", "Display": "14.2-inch Liquid Retina XDR", "Battery": "Up to 18 hours", "Weight": "1.63 kg" }
                },
                {
                    id: "deal-2", name: "Sony WH-1000XM4 Noise Cancelling", price: 19999, oldPrice: 29999, rating: 4.9, reviews: 892, category: "Electronics", subCategory: "Wearables & Accessories",
                    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800", discount: "33% OFF",
                    colors: ['Black', 'Silver', 'Midnight Blue'],
                    stock: 0, status: 'Out of Stock',
                    specifications: { "Driver Unit": "40mm, dome type", "Frequency Response": "4Hz-40,000Hz", "Bluetooth": "Version 5.0", "Battery Life": "Max. 30 hours", "Weight": "254g" }
                },
                {
                    id: "deal-3", name: "Apple Watch Series 8", price: 34999, oldPrice: 42999, rating: 4.8, reviews: 567, category: "Electronics", subCategory: "Wearables & Accessories",
                    image: "https://images.unsplash.com/photo-1434494878577-86c23bddad0f?w=800",
                    colors: ['Midnight', 'Starlight', 'Silver', 'Red'],
                    specifications: { "Display": "Always-On Retina", "Sensor": "Blood Oxygen, ECG", "Water Resistance": "WR50", "Dust Resistance": "IP6X", "Battery": "Up to 18 hours" }
                },
                {
                    id: "deal-4", name: "iPad Pro M2 12.9", price: 99999, oldPrice: 112999, rating: 4.9, reviews: 345, category: "Electronics", subCategory: "Smartphones & Tablets", image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",
                    stock: 0, status: 'Out of Stock',
                    colors: ['Space Gray', 'Silver'],
                    storage: [
                        { label: '128GB', priceOffset: 0 },
                        { label: '256GB', priceOffset: 10000 },
                        { label: '512GB', priceOffset: 30000 }
                    ],
                    memory: [
                        { label: '8GB RAM', priceOffset: 0 },
                        { label: '16GB RAM', priceOffset: 15000 }
                    ]
                },

                // Men's Fashion
                {
                    id: "fashion-1", name: "Premium Cotton Formal Shirt", price: 2499, oldPrice: 3499, rating: 4.5, reviews: 456, category: "Men's Fashion", subCategory: "Topwear",
                    image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800", discount: "28% OFF",
                    stock: 0, status: 'Out of Stock',
                    colors: ['White', 'Light Blue', 'Pink'],
                    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                    specifications: { "Fit": "Slim Fit", "Pattern": "Solid", "Sleeve": "Full Sleeve", "Collar": "Spread Collar", "Occasion": "Formal" }
                },
                { id: "fashion-11", name: "Slim Fit Casual Shirt", price: 1899, oldPrice: 2499, rating: 4.4, reviews: 128, category: "Men's Fashion", subCategory: "Topwear", image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800", sizes: ['M', 'L', 'XL'] },
                {
                    id: "fashion-2", name: "Midnight Blue Textured Blazer", price: 5999, oldPrice: 7999, rating: 4.6, reviews: 231, category: "Men's Fashion", subCategory: "Topwear",
                    image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800",
                    colors: ['Midnight Blue', 'Charcoal', 'Black'],
                    sizes: ['38', '40', '42', '44'],
                    specifications: { "Lining": "Satin", "Pockets": "3 Outer, 2 Inner", "Closure": "Button", "Vents": "Double", "Lapel": "Notch" }
                },
                { id: "fashion-12", name: "Straight Fit Denim Jeans", price: 2999, oldPrice: 3999, rating: 4.5, reviews: 890, category: "Men's Fashion", subCategory: "Bottomwear", image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800", sizes: ['30', '32', '34', '36'], stock: 0, status: 'Out of Stock' },

                // Women's Fashion
                {
                    id: "fashion-3", name: "Floral Print Chiffon Dress", price: 3999, oldPrice: 4999, rating: 4.7, reviews: 124, category: "Women's Fashion", subCategory: "Western Wear",
                    image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800", discount: "20% OFF",
                    colors: ['Floral Pink', 'Summer Yellow', 'Blue Bloom'],
                    sizes: ['XS', 'S', 'M', 'L', 'XL'],
                    specifications: { "Style": "Maxi", "Neck": "V-Neck", "Sleeve": "Short", "Length": "Full", "Closure": "Zipper" }
                },
                { id: "fashion-13", name: "White Embroidered Top", price: 1599, oldPrice: 1999, rating: 4.6, reviews: 67, category: "Women's Fashion", subCategory: "Western Wear", image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800", sizes: ['S', 'M', 'L'], stock: 0, status: 'Out of Stock' },
                {
                    id: "fashion-4", name: "Banarasi Silk Saree", price: 8499, oldPrice: 12999, rating: 4.8, reviews: 342, category: "Women's Fashion", subCategory: "Ethnic Wear",
                    image: "https://images.unsplash.com/photo-1610030469668-93510cb6f43e?w=800",
                    colors: ['Royal Red', 'Golden Mustard', 'Emerald'],
                    sizes: ['One Size'],
                    specifications: { "Work": "Zari Weaving", "Blouse Piece": "Included", "Saree Length": "5.5m", "Blouse Length": "0.8m", "Occasion": "Wedding" }
                },
                { id: "fashion-14", name: "Designer Kurta Set", price: 3499, oldPrice: 4599, rating: 4.7, reviews: 215, category: "Women's Fashion", subCategory: "Ethnic Wear", image: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800", sizes: ['S', 'M', 'L', 'XL'], stock: 0, status: 'Out of Stock' }
            ];

            try {
                const q = query(collection(db, "products"), limit(20));
                const snap = await getDocs(q);
                let data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Merge and ensure all mock products are added even if database has items
                const existingIds = new Set(data.map(p => p.id));
                const newMocks = mockData.filter(m => !existingIds.has(m.id));
                data = [...newMocks, ...data]; // Put mocks at the start for visibility

                setProducts(data);
                setLoading(false);
            } catch (err) {
                console.error("Fetch Products Error:", err);
                // Fallback to purely mock data if quota hit or other error
                setProducts([...mockData]);
                setLoading(false);
            }
        };
        fetchProducts();

        // Load wishlist
        const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(saved);
    }, []);

    useEffect(() => {
        let result = [...products];
        const params = new URLSearchParams(location.search);
        const searchQuery = params.get('search')?.toLowerCase();
        const subCategory = params.get('sub');
        const itemName = params.get('item');

        // Search Filter
        if (searchQuery) {
            result = result.filter(p =>
                p.name.toLowerCase().includes(searchQuery) ||
                p.category.toLowerCase().includes(searchQuery)
            );
        }

        // Category Filter
        if (selectedCategory !== 'All') {
            result = result.filter(p => p.category === selectedCategory);
        }

        // Sub Category Filter
        if (subCategory) {
            result = result.filter(p => p.subCategory === subCategory || p.category === subCategory);
        }

        // Specific Item Filter
        if (itemName) {
            result = result.filter(p => p.name.includes(itemName) || p.tags?.includes(itemName));
        }

        // Price Filter
        result = result.filter(p => p.price <= priceRange);

        // Sorting
        if (sortBy === 'priceLow') result.sort((a, b) => a.price - b.price);
        else if (sortBy === 'priceHigh') result.sort((a, b) => b.price - a.price);

        setFilteredProducts(result);
    }, [products, selectedCategory, priceRange, sortBy, location.search]);

    // Listen to wishlist changes
    useEffect(() => {
        console.log('🎬 ProductListing: Setting up wishlist listener');
        const unsubscribe = listenToWishlist((items) => {
            console.log('🔄 ProductListing: Received wishlist update with', items.length, 'items:', items.map(i => i.id));
            setWishlist(items);
        });
        return () => {
            console.log('🛑 ProductListing: Cleaning up wishlist listener');
            unsubscribe();
        };
    }, []);

    const toggleWishlist = async (e, p) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        console.log('🎯 toggleWishlist clicked for product:', p.id);
        console.log('🎯 Current wishlist state:', wishlist.map(i => i.id));

        const isSaved = wishlist.some(item => item.id === p.id);
        console.log('🎯 Already in wishlist?', isSaved);

        try {
            if (isSaved) {
                console.log('🎯 Removing from wishlist...');
                const result = await removeFromWishlist(p.id);
                if (result.success) {
                    console.log('✅ Removed successfully');
                } else {
                    console.error('❌ Remove failed:', result.message);
                }
            } else {
                console.log('🎯 Adding to wishlist...');
                const result = await addToWishlist(p);
                if (result.success) {
                    console.log('✅ Added successfully');
                } else {
                    console.error('❌ Add failed:', result.message);
                }
            }
        } catch (error) {
            console.error('❌ toggleWishlist error:', error);
        }
    };

    const handleAddToCart = async (p) => {
        const res = await addToCart(p);
        if (res.success) navigate('/checkout');
    };

    return (
        <div className="listing-wrapper bg-light">
            <div className="container">
                {/* Header with Breadcrumbs & Breadth Controls */}
                <div className="listing-header">
                    <div className="breadcrumb">
                        <Link to="/">Home</Link> / <span>Products</span>
                    </div>
                    <div className="listing-title-row">
                        <h1>{selectedCategory === 'All' ? 'All Products' : selectedCategory} <span className="count">({filteredProducts.length})</span></h1>
                        <div className="listing-controls">
                            <div className="control-group">
                                <span className="label">Sort by:</span>
                                <div className="custom-select">
                                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                                        <option value="newest">Newest First</option>
                                        <option value="priceLow">Price: Low to High</option>
                                        <option value="priceHigh">Price: High to Low</option>
                                    </select>
                                    <ChevronDown size={14} />
                                </div>
                            </div>
                            <div className="view-toggle">
                                <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')}><LayoutGrid size={18} /></button>
                                <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><List size={18} /></button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="listing-layout">
                    {/* Sidebar Filters */}


                    {/* Product Grid Area */}
                    <main className="product-main">
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
                                    <p>Try adjusting your filters or search query to find what you're looking for.</p>
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
                                                    <Star size={14} fill="#FFB800" color="#FFB800" />
                                                    <span>{p.rating || 4.8}</span>
                                                    <span className="p-reviews">({p.reviews || 0})</span>
                                                </div>
                                                <div className="p-footer">
                                                    <span className="p-price">₹{(p.price || 0).toLocaleString()}</span>
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
.listing-wrapper { min-height: 100vh; padding: 2rem 0 6rem; }
.listing-header { margin-bottom: 3rem; }
.breadcrumb { font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1rem; }
.breadcrumb a { color: var(--text-muted); text-decoration: none; }
.breadcrumb span { color: var(--text); font-weight: 600; }
.listing-title-row { display: flex; justify-content: space-between; align-items: flex-end; }
.listing-title-row h1 { font-size: 3rem; font-weight: 950; letter-spacing: -2px; line-height: 1; }
.count { font-size: 1.1rem; color: var(--text-muted); font-weight: 500; margin-left: 0.5rem; }

.listing-controls { display: flex; align-items: center; gap: 2rem; }
.control-group { display: flex; align-items: center; gap: 0.75rem; }
.control-group .label { font-size: 0.95rem; font-weight: 700; color: var(--text-muted); }
.custom-select { position: relative; background: white; border-radius: 14px; border: 1px solid var(--border); padding: 0.6rem 2.8rem 0.6rem 1.2rem; display: flex; align-items: center; }
.custom-select select { border: none; background: transparent; font-weight: 800; font-size: 0.95rem; outline: none; cursor: pointer; -webkit-appearance: none; }
.custom-select svg { position: absolute; right: 1rem; pointer-events: none; }

.view-toggle { display: flex; background: white; border-radius: 14px; border: 1px solid var(--border); padding: 0.25rem; }
.view-toggle button { width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 10px; color: var(--text-muted); transition: 0.3s; }
.view-toggle button.active { background: var(--primary); color: white; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3); }

.listing-layout { display: block; margin-top: 3rem; }

.filters-sidebar { height: fit-content; padding: 2.5rem; position: sticky; top: 120px; border-radius: 32px; }
.sidebar-section { margin-bottom: 3rem; }
.sidebar-section h3 { font-size: 1.25rem; font-weight: 850; margin-bottom: 1.5rem; color: var(--text); }

.category-list { display: flex; flex-direction: column; gap: 0.6rem; }
.category-list button { 
    text-align: left; padding: 0.9rem 1.2rem; border-radius: 16px; font-weight: 700; font-size: 1rem;
    color: var(--text-muted); transition: 0.2s; display: flex; justify-content: space-between; align-items: center;
}
.category-list button:hover { background: rgba(99, 102, 241, 0.05); color: var(--primary); }
.category-list button.active { background: var(--primary); color: white; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.2); }

.price-filter input { width: 100%; margin: 1rem 0; accent-color: var(--primary); }
.price-labels { display: flex; justify-content: space-between; font-weight: 800; font-size: 0.95rem; color: var(--text); }

.rating-filters { display: flex; flex-direction: column; gap: 1.2rem; }
.rating-opt { display: flex; align-items: center; gap: 1rem; font-weight: 700; font-size: 0.95rem; cursor: pointer; color: var(--text-muted); }
.rating-opt:hover { color: var(--text); }
.rating-opt input { width: 22px; height: 22px; border-radius: 6px; cursor: pointer; accent-color: var(--primary); }

/* PRODUCT CARD PREMIUM (Shared with Home) */
.products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2.5rem; }
.product-card-premium { background: white; border-radius: 32px; padding: 1.25rem; border: 1px solid var(--border); transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); display: flex; flex-direction: column; height: 100%; cursor: pointer; }
.product-card-premium:hover { transform: translateY(-10px); box-shadow: 0 20px 50px rgba(0,0,0,0.08); }

.card-media { height: 280px; background: #f8f8f8; border-radius: 24px; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; padding: 2rem; margin-bottom: 1.5rem; }
.card-media img { max-width: 100%; max-height: 100%; object-fit: contain; transition: 0.5s; }
.product-card-premium:hover .card-media img { transform: scale(1.1) rotate(2deg); }

.discount-badge { position: absolute; top: 1.25rem; left: 1.25rem; background: #E11D48; color: white; padding: 0.4rem 0.8rem; border-radius: 12px; font-weight: 800; font-size: 0.8rem; z-index: 2; }

.overlay-tools { position: absolute; top: 1.25rem; right: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; opacity: 0; transform: translateX(10px); transition: 0.3s; z-index: 10; }
.product-card-premium:hover .overlay-tools { opacity: 1; transform: translateX(0); }
.tool-btn { width: 44px; height: 44px; background: white; border-radius: 14px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.08); color: var(--text); transition: 0.2s; cursor: pointer; border: none; }
.tool-btn:hover { background: var(--primary); color: white; }
.tool-btn.active { color: #E11D48; }

.p-cat { font-size: 0.8rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; }
.p-name { font-size: 1.25rem; font-weight: 850; margin-bottom: 1rem; color: var(--text); line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.p-rating { display: flex; align-items: center; gap: 0.4rem; font-size: 0.95rem; font-weight: 700; margin-bottom: 1.5rem; }
.p-reviews { opacity: 0.5; font-weight: 600; }
.p-footer { margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
.p-price { font-size: 1.8rem; font-weight: 900; color: var(--text); }
.add-to-cart-simple { width: 56px; height: 56px; background: #1E293B; color: white; border-radius: 18px; display: flex; align-items: center; justify-content: center; transition: 0.3s; }
.add-to-cart-simple:hover { background: var(--primary); transform: scale(1.1); box-shadow: 0 8px 15px rgba(99, 102, 241, 0.3); }

.loading-state { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10rem 0; gap: 2rem; }
.spinner { width: 50px; height: 50px; border: 5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { grid-column: 1 / -1; padding: 6rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 2rem; }
.empty-state h2 { font-size: 2.5rem; font-weight: 900; }

@media (max-width: 1024px) {
    .listing-layout { grid-template-columns: 1fr; gap: 3rem; }
    .filters-sidebar { display: none; }
}
`;
