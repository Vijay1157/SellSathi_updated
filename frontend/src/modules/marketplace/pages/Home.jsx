import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Heart, Eye, ArrowRight, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { auth } from '@/modules/shared/config/firebase';
import { API_BASE } from '@/modules/shared/utils/api';
import { addToCart } from '@/modules/shared/utils/cartUtils';
import { addToWishlist, removeFromWishlist, listenToWishlist } from '@/modules/shared/utils/wishlistUtils';
import QuickViewModal from '@/modules/shared/components/common/QuickViewModal';
import Rating from '@/modules/shared/components/common/Rating';
import { fetchWithCache } from '@/modules/shared/utils/firestoreCache';
import PriceDisplay from '@/modules/shared/components/common/PriceDisplay';
import { fetchProductReviews } from '@/modules/shared/utils/reviewUtils';

const HERO_SLIDES = [
    {
        id: 1,
        title: "Summer Fashion Collection",
        subtitle: "Explore our curated collection of trending summer fashion pieces",
        badge: "New Season",
        image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=1600&auto=format&fit=crop&q=80",
        btnText: "Shop Now",
        link: "/products?category=Fashion"
    },
    {
        id: 2,
        title: "Premium Electronics",
        subtitle: "Experience cutting-edge technology with our premium electronics",
        badge: "Featured",
        image: "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&auto=format&fit=crop&q=80",
        btnText: "Discover More",
        link: "/products?category=Electronics"
    },
    {
        id: 3,
        title: "Luxury Accessories",
        subtitle: "Complete your look with our premium accessories collection",
        badge: "Limited Edition",
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600&auto=format&fit=crop&q=80",
        btnText: "View Collection",
        link: "/products?category=Accessories"
    }
];

const homeStyles = `
    /* Professional Grid System - 5 columns desktop, compact spacing */
    .product-uniform-grid { 
        display: grid; 
        grid-template-columns: repeat(5, 1fr); 
        gap: 16px; 
    }
    
    @media (max-width: 1024px) {
        .product-uniform-grid {
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }
    }
    
    @media (max-width: 768px) {
        .product-uniform-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
        }
    }
    
    @media (max-width: 480px) {
        .product-uniform-grid {
            grid-template-columns: 1fr;
        }
    }
    
    .product-card-premium { 
        background: #FFFFFF; 
        border-radius: var(--card-border-radius, 10px); 
        padding: 12px; 
        border: 2px solid rgba(0, 0, 0, 0.15); 
        transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1); 
        display: flex; 
        flex-direction: column; 
        height: 100%; 
        cursor: pointer;
        position: relative;
        max-height: 360px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .product-card-premium:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
        border-color: #2563EB;
        background: #FAFBFC;
    }
    .card-media { 
        height: 170px; 
        background: #F9FAFB; 
        border-radius: var(--radius-md, 8px); 
        position: relative; 
        overflow: hidden; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        margin-bottom: 10px; 
        padding: 8px;
        transition: background 300ms cubic-bezier(0.4, 0, 0.2, 1);
        border: 1px solid #E5E7EB;
    }
    .product-card-premium:hover .card-media {
        background: #F3F4F6;
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
        top: 8px; 
        left: 8px; 
        background: var(--error); 
        color: var(--white); 
        padding: 4px 8px; 
        border-radius: var(--radius-sm, 6px); 
        font-weight: var(--font-bold, 700); 
        font-size: 10px; 
        z-index: 2;
    }
    
    .overlay-tools {
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        z-index: 20;
    }
    .tool-btn {
        width: 32px;
        height: 32px;
        background: #FFFFFF;
        backdrop-filter: blur(10px);
        border-radius: var(--radius-md, 8px);
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #E5E7EB;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        color: #6B7280;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }
    .tool-btn:hover {
        background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
        color: #FFFFFF;
        border-color: transparent;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
    }
    .tool-btn.active {
        background: #FEE2E2;
        color: #EF4444;
        border-color: #EF4444;
    }
    .tool-btn.active:hover {
        background: #EF4444;
        color: #FFFFFF;
        border-color: #EF4444;
    }

    .card-info { 
        flex: 1; 
        display: flex; 
        flex-direction: column; 
        padding: var(--space-1, 4px); 
    }
    .card-info .category-row { 
        display: flex; 
        align-items: center; 
        gap: var(--space-2, 8px); 
        margin-bottom: var(--space-1, 4px); 
    }
    .card-info .category { 
        font-size: var(--text-xs, 12px); 
        font-weight: var(--font-bold, 700); 
        text-transform: uppercase; 
        color: var(--text-tertiary); 
        letter-spacing: 0.05em; 
    }
    .card-info .sub-category { 
        font-size: var(--text-sm, 14px); 
        font-weight: var(--font-semibold, 600); 
        color: var(--text-secondary); 
    }
    .card-info .title { 
        font-size: 16px; 
        font-weight: var(--font-bold, 700); 
        margin: 4px 0 6px; 
        color: var(--text-primary); 
        line-height: 1.3; 
        height: 2.6em;
        min-height: 2.6em;
        overflow: hidden; 
        display: -webkit-box; 
        -webkit-line-clamp: 2; 
        -webkit-box-orient: vertical; 
    }
    
    .rating-row { 
        display: flex; 
        align-items: center; 
        gap: 8px; 
        margin-bottom: 6px;
        min-height: 20px;
    }

    .info-bottom { 
        margin-top: auto; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
        gap: 8px;
        padding-top: 8px;
        border-top: 1px solid #E5E7EB;
    }
    .price-group { 
        display: flex; 
        flex-direction: column; 
        gap: 4px;
        flex: 1;
    }
    .current-price { 
        font-size: 18px; 
        font-weight: var(--font-extrabold, 800); 
        color: var(--text-primary); 
    }
    .old-price { 
        font-size: 12px; 
        text-decoration: line-through; 
        color: var(--text-tertiary); 
        font-weight: var(--font-semibold, 600); 
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
        cursor: pointer;
        border: none;
        transition: all var(--transition-base, 200ms);
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
    
    /* Hero Section - Compact */
    .hero-carousel { 
        height: 450px; 
        border-radius: 0 0 16px 16px; 
        overflow: hidden; 
    }
    .hero-slide { 
        height: 100%; 
        background-size: cover; 
        background-position: center; 
        display: flex; 
        align-items: center; 
        color: var(--white); 
    }
    
    /* Section Spacing - Compact */
    .section { 
        padding: 32px 0; 
    }
    
    @media (max-width: 768px) {
        .section {
            padding: 24px 0;
        }
    }
    
    .title-modern { 
        font-size: var(--text-3xl, 30px); 
        font-weight: var(--font-extrabold, 800); 
        color: var(--text-primary); 
        margin-bottom: 24px; 
    }

    .cat-row { 
        display: flex; 
        align-items: center; 
        gap: var(--space-2, 8px); 
        margin-bottom: var(--space-1, 4px); 
    }
    .sub-category { 
        font-size: var(--text-sm, 14px); 
        font-weight: var(--font-semibold, 600); 
        color: var(--text-secondary); 
    }

    /* Category Groups */
    .category-group-wrapper { 
        margin-bottom: var(--section-gap, 64px); 
    }
    .category-group-header { 
        display: flex; 
        justify-content: space-between;
        align-items: center; 
        margin-bottom: var(--space-8, 32px); 
        padding-bottom: var(--space-4, 16px);
        border-bottom: 1px solid var(--border-light);
    }
    .category-group-header h3 { 
        font-size: var(--text-2xl, 24px); 
        font-weight: var(--font-bold, 700); 
        color: var(--text-primary); 
    }
    .category-group-header .view-more { 
        color: #2563EB; 
        font-weight: var(--font-semibold, 600); 
        font-size: var(--text-base, 16px); 
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 8px 16px;
        border-radius: 8px;
        background: transparent;
    }
    .category-group-header .view-more:hover {
        color: #1D4ED8;
        background: rgba(37, 99, 235, 0.05);
        transform: translateX(4px);
    }
    
    /* Container - Max Width 1280px */
    .container {
        max-width: var(--container-max, 1280px);
        margin: 0 auto;
        padding: 0 12px;
    }
    
    @media (max-width: 768px) {
        .container {
            padding: 0 8px;
        }
    }
    
    /* Hero Content Styles */
    .hero-content {
        position: relative;
        z-index: 2;
        max-width: 700px;
        padding: 32px 0;
        text-align: left;
    }
    
    .hero-badge {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2, 8px);
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        padding: var(--space-2, 8px) var(--space-4, 16px);
        border-radius: var(--radius-full, 9999px);
        font-size: var(--text-sm, 14px);
        font-weight: var(--font-semibold, 600);
        margin-bottom: var(--space-6, 24px);
        border: 1px solid rgba(255, 255, 255, 0.3);
    }
    
    .hero-content h1 {
        font-size: var(--text-5xl, 48px);
        font-weight: var(--font-extrabold, 800);
        line-height: var(--leading-tight, 1.25);
        margin-bottom: var(--space-6, 24px);
        color: var(--white);
    }
    
    .hero-content p {
        font-size: var(--text-lg, 18px);
        line-height: var(--leading-relaxed, 1.75);
        margin-bottom: var(--space-8, 32px);
        color: rgba(255, 255, 255, 0.9);
    }
    
    .hero-btns {
        display: flex;
        gap: var(--space-4, 16px);
        flex-wrap: wrap;
    }
    
    .btn-modern {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2, 8px);
        padding: var(--space-4, 16px) var(--space-8, 32px);
        border-radius: var(--radius-lg, 10px);
        font-weight: var(--font-semibold, 600);
        font-size: var(--text-base, 16px);
        transition: all var(--transition-base, 200ms);
        cursor: pointer;
        border: none;
    }
    
    .btn-main {
        background: linear-gradient(135deg, #FFFFFF 0%, #F9FAFB 100%);
        color: #111827;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .btn-main:hover {
        background: #FFFFFF;
        transform: translateY(-3px);
        box-shadow: 0 12px 24px rgba(0, 0, 0, 0.25);
    }
    
    .btn-outline {
        background: rgba(255, 255, 255, 0.15);
        color: #FFFFFF;
        border: 2px solid rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
    }
    
    .btn-outline:hover {
        background: #FFFFFF;
        color: #111827;
        border-color: #FFFFFF;
        transform: translateY(-3px);
        box-shadow: 0 8px 20px rgba(255, 255, 255, 0.3);
    }
    
    /* Carousel Navigation */
    .carousel-nav {
        position: absolute;
        bottom: var(--space-8, 32px);
        right: var(--space-8, 32px);
        display: flex;
        gap: var(--space-3, 12px);
        z-index: 3;
    }
    
    .nav-btn {
        width: 48px;
        height: 48px;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #FFFFFF;
        cursor: pointer;
        transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .nav-btn:hover {
        background: rgba(255, 255, 255, 0.4);
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.15);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    
    /* Carousel Dots */
    .carousel-dots {
        position: absolute;
        bottom: var(--space-8, 32px);
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: var(--space-2, 8px);
        z-index: 3;
    }
    
    .dot {
        width: 10px;
        height: 10px;
        background: rgba(255, 255, 255, 0.4);
        border-radius: 50%;
        cursor: pointer;
        transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .dot:hover {
        background: rgba(255, 255, 255, 0.7);
        transform: scale(1.2);
    }
    
    .dot.active {
        width: 32px;
        border-radius: var(--radius-full, 9999px);
        background: #FFFFFF;
    }
    
    /* Gradient Text */
    .gradient-text {
        background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
    }
    
    /* Section Headers */
    .section-header-compact {
        margin-bottom: 24px;
    }
    
    .header-info h2 {
        font-size: 28px;
        font-weight: var(--font-extrabold, 800);
        margin-bottom: 4px;
    }
    
    .header-info p {
        font-size: var(--text-lg, 18px);
        color: var(--text-secondary);
    }
    
    /* Background Utilities */
    .bg-light {
        background: var(--gray-50);
    }
    
    .bg-white {
        background: var(--white);
    }
    
    /* Home Wrapper */
    .home-wrapper {
        min-height: 100vh;
    }
    
    /* Deals Section */
    .deals-section {
        background: var(--white);
    }
`;

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [latestProducts, setLatestProducts] = useState([]);
    const [dealsProducts, setDealsProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishlist, setWishlist] = useState([]);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
    const [productReviews, setProductReviews] = useState({}); // Cache reviews for all products
    const navigate = useNavigate();

    // Initial wishlist load is handled by the listener below


    useEffect(() => {
        const fetchData = async () => {
            try {
                // Use cache with 5 minute TTL to reduce Firestore reads
                const allProducts = await fetchWithCache(
                    'home_products',
                    async () => {
                        // Use backend API (avoids direct client-side Firestore reads)
                        const res = await fetch(`${API_BASE}/products?limit=100`);
                        if (!res.ok) throw new Error('Products API failed');
                        const apiData = await res.json();
                        return (apiData.products || []).map(p => {
                            if (!p.name && p.title) p.name = p.title;
                            return p;
                        });
                    },
                    5 * 60 * 1000 // 5 minutes localStorage cache
                );

                // If no products in database, show empty state
                if (allProducts.length === 0) {
                    setFeaturedProducts([]);
                    setLatestProducts([]);
                    setDealsProducts([]);
                    setLoading(false);
                    return;
                }

                // Group products by category first
                const groupByCategory = (items) => {
                    return items.reduce((acc, p) => {
                        const cat = p.category || 'Other';
                        if (!acc[cat]) acc[cat] = [];
                        acc[cat].push(p);
                        return acc;
                    }, {});
                };

                // Featured: Group by category, take 4 from each
                const featuredGrouped = groupByCategory(allProducts.slice(0, 50));
                const featured = [];
                Object.values(featuredGrouped).forEach(catProducts => {
                    featured.push(...catProducts.slice(0, 4));
                });
                
                // Latest: Group by category, take 4 from each (reversed)
                const latestGrouped = groupByCategory(allProducts.slice().reverse().slice(0, 50));
                const latest = [];
                Object.values(latestGrouped).forEach(catProducts => {
                    latest.push(...catProducts.slice(0, 4));
                });
                
                // Deals: Products with discount or oldPrice, group by category, take 4 from each
                const dealsFiltered = allProducts.filter(p => p.discount || p.oldPrice);
                const dealsGrouped = groupByCategory(dealsFiltered);
                const deals = [];
                Object.values(dealsGrouped).forEach(catProducts => {
                    deals.push(...catProducts.slice(0, 4));
                });

                setFeaturedProducts(featured);
                setLatestProducts(latest);
                setDealsProducts(deals);
                setLoading(false);

                // Fetch reviews for all loaded products
                fetchReviewsForProducts([...featured, ...latest, ...deals]);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchData();

        const timer = setInterval(() => {
            setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length);
        }, 5000);
        return () => clearInterval(timer);
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

    const handleAddToCart = async (e, product) => {
        if (e) e.stopPropagation();
        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }
        const res = await addToCart(product);
        if (res.success) {
            alert('✅ Product added to cart successfully!');
        }
    };

    // Listen to wishlist changes
    useEffect(() => {
        const unsubscribe = listenToWishlist((items) => {
            setWishlist(items);
        });
        return () => {
            unsubscribe();
        };
    }, []);

    const toggleWishlist = async (e, product) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }

        const alreadySaved = wishlist.some(item => item.id === product.id);

        try {
            if (alreadySaved) {
                await removeFromWishlist(product.id);
            } else {
                await addToWishlist(product);
            }
        } catch (error) {
            console.error('Wishlist error:', error);
        }
    };

    const groupByCategory = (items) => {
        return items.reduce((acc, p) => {
            const cat = p.category || 'Other';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(p);
            return acc;
        }, {});
    };

    const groupedDeals = useMemo(() => groupByCategory(dealsProducts), [dealsProducts]);
    const groupedFeatured = useMemo(() => groupByCategory(featuredProducts), [featuredProducts]);
    const groupedLatest = useMemo(() => groupByCategory(latestProducts), [latestProducts]);

    const openQuickView = (e, product) => {
        if (e) e.stopPropagation();
        setSelectedQuickProduct(product);
        setIsQuickViewOpen(true);
    };

    const ProductCard = ({ product, index }) => {
        if (!product || !product.id) return null;
        const isWishlisted = wishlist.some(item => item.id === product.id);

        return (
            <motion.div
                className="product-card-premium"
                whileHover={{ y: -8 }}
                onClick={() => {
                    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                    const filtered = recentlyViewed.filter(item => item.id !== product.id);
                    const updated = [product, ...filtered].slice(0, 8);
                    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
                    navigate("/product/" + product.id);
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
            >
                <div className="card-media">
                    {product.discount && <span className="discount-badge">{product.discount}</span>}
                    <img src={product.image || product.imageUrl} alt={product.name} />
                    <div className="overlay-tools">
                        <button
                            onClick={(e) => toggleWishlist(e, product)}
                            className={`tool-btn ${isWishlisted ? 'active' : ''}`}
                            title="Add to Wishlist"
                        >
                            <Heart
                                size={18}
                                fill={isWishlisted ? "#ef4444" : "none"}
                                color={isWishlisted ? "#ef4444" : "currentColor"}
                            />
                        </button>
                        <button
                            onClick={(e) => openQuickView(e, product)}
                            className="tool-btn"
                            title="Quick View"
                        >
                            <Eye size={18} />
                        </button>
                    </div>
                </div>
                <div className="card-info">
                    <div className="category-row">
                        <span className="category">{product.category || 'Product'}</span>
                        {product.subCategory && <span className="sub-category">• {product.subCategory}</span>}
                    </div>
                    <h3 className="title">{product.name}</h3>

                    <div className="rating-row">
                        <Rating
                            averageRating={productReviews[product.id]?.stats?.averageRating || 0}
                            totalReviews={productReviews[product.id]?.stats?.totalReviews || 0}
                            size={14}
                            showCount={true}
                            className="home-product-rating"
                        />
                    </div>

                    <div className="info-bottom">
                        <PriceDisplay product={product} size="sm" />
                        <button
                            onClick={(e) => handleAddToCart(e, product)}
                            className="add-to-cart-simple"
                            title="Add to Cart"
                            disabled={product.stock === 0 || product.status === 'Out of Stock'}
                            style={product.stock === 0 || product.status === 'Out of Stock' ? { opacity: 0.5, cursor: 'not-allowed', background: '#94a3b8' } : {}}
                        >
                            <ShoppingCart size={18} />
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="home-wrapper" style={{ background: '#F8F9FA' }}>
            {/* Hero Section */}
            <section className="hero-carousel">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentSlide}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="hero-slide"
                        style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(" + HERO_SLIDES[currentSlide].image + ")" }}
                    >
                        <div className="container hero-content">
                            <motion.span
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="hero-badge"
                            >
                                <Sparkles size={14} /> {HERO_SLIDES[currentSlide].badge}
                            </motion.span>
                            <motion.h1
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                            >
                                {HERO_SLIDES[currentSlide].title}
                            </motion.h1>
                            <motion.p
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.3 }}
                            >
                                {HERO_SLIDES[currentSlide].subtitle}
                            </motion.p>
                            <motion.div
                                initial={{ y: 30, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="hero-btns"
                            >
                                <Link to={HERO_SLIDES[currentSlide].link} className="btn-modern btn-main">
                                    Shop Collection
                                    <ArrowRight size={18} />
                                </Link>
                                <Link to="/products" className="btn-modern btn-outline">Explore Brands</Link>
                            </motion.div>
                        </div>

                        <div className="carousel-nav">
                            <button className="nav-btn" onClick={() => setCurrentSlide(prev => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}>
                                <ChevronLeft size={24} />
                            </button>
                            <button className="nav-btn" onClick={() => setCurrentSlide(prev => (prev + 1) % HERO_SLIDES.length)}>
                                <ChevronRight size={24} />
                            </button>
                        </div>

                        <div className="carousel-dots">
                            {HERO_SLIDES.map((_, i) => (
                                <div
                                    key={i}
                                    className={"dot " + (currentSlide === i ? 'active' : '')}
                                    onClick={() => setCurrentSlide(i)}
                                />
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </section>


            {/* Today's Deals */}
            <section className="section deals-section" style={{ background: '#FFFFFF' }}>
                <div className="container">
                    <div className="section-header-compact">
                        <div className="header-info">
                            <h2 className="title-modern">Flash <span className="gradient-text">Deals</span></h2>
                            <p>Exclusive limited-time offers grouped by category</p>
                        </div>
                    </div>

                    {Object.entries(groupedDeals).map(([cat, items]) => (
                        <div key={cat} className="category-group-wrapper">
                            <div className="category-group-header">
                                <h3>{cat}</h3>
                                <div className="line" />
                                <Link to={`/products?category=${cat}`} className="view-more">
                                    Browse all <ArrowRight size={14} />
                                </Link>
                            </div>
                            <div className="product-uniform-grid">
                                {items.map((deal, idx) => (
                                    <ProductCard key={deal.id} product={deal} index={idx} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Product Sections */}
            {[
                { title: "Featured Products", subtitle: "Our top picks for you", groupedData: groupedFeatured, bg: "#F8F9FA" },
                { title: "Latest Releases", subtitle: "Stay ahead with the newest additions", groupedData: groupedLatest, bg: "#FFFFFF" }
            ].map((sec, idx) => (
                <section key={idx} className="section" style={{ background: sec.bg }}>
                    <div className="container">
                        <div className="section-header-compact">
                            <div className="header-info">
                                <h2 className="title-modern">{sec.title.split(' ')[0]} <span className="gradient-text">{sec.title.split(' ').slice(1).join(' ')}</span></h2>
                                <p>{sec.subtitle}</p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="product-uniform-grid">
                                {[...Array(4)].map((_, i) => <div key={i} className="product-card skeleton" />)}
                            </div>
                        ) : (
                            Object.entries(sec.groupedData).map(([cat, items]) => (
                                <div key={cat} className="category-group-wrapper">
                                    <div className="category-group-header">
                                        <h3>{cat}</h3>
                                        <div className="line" />
                                        <Link to={`/products?category=${cat}`} className="view-more">
                                            View all {cat} <ArrowRight size={14} />
                                        </Link>
                                    </div>
                                    <div className="product-uniform-grid">
                                        {items.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            ))}

            <QuickViewModal
                isOpen={isQuickViewOpen}
                onClose={() => setIsQuickViewOpen(false)}
                product={selectedQuickProduct}
                navigate={navigate}
            />

            <style>{homeStyles}</style>
        </div>
    );
}

// ... the rest of the file contents have been moved up ...
