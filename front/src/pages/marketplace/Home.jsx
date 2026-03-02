import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Eye, ArrowRight, ChevronLeft, ChevronRight, Clock, Zap, TrendingUp, Sparkles, Award } from 'lucide-react';
import { collection, getDocs, limit, query, where, orderBy } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { addToCart } from '../../utils/cartUtils';
import { addToWishlist, removeFromWishlist, listenToWishlist } from '../../utils/wishlistUtils';
import QuickViewModal from '../../components/common/QuickViewModal';
import Rating from '../../components/common/Rating';
import PriceDisplay from '../../components/common/PriceDisplay';
import { fetchProductReviews } from '../../utils/reviewUtils';

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


const TODAY_DEALS = [
    {
        id: "deal-1",
        name: "MacBook Pro M2 Max",
        category: "Electronics",
        price: 129999,
        oldPrice: 149498,
        discount: "13% OFF",
        image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800",
        rating: 4.8,
        reviews: 1256,
        timer: "7h 56m",
        colors: ["#3D3D3F", "#E3E4E5"]
    },
    {
        id: "deal-2",
        name: "Sony WH-1000XM4 Noise Cancelling",
        category: "Electronics",
        price: 19999,
        oldPrice: 29999,
        discount: "33% OFF",
        image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800",
        rating: 4.9,
        reviews: 892,
        timer: "11h 56m",
        colors: ["#000000", "#C9C4B9"],
        stock: 0,
        status: 'Out of Stock'
    },
    {
        id: "deal-3",
        name: "Apple Watch Series 8",
        category: "Electronics",
        price: 34999,
        oldPrice: 42999,
        discount: "18% OFF",
        image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800",
        rating: 4.8,
        reviews: 567,
        timer: "3h 56m",
        colors: ["#1C1C1C", "#E3E4E5", "#0F1626"]
    },
    {
        id: "deal-4",
        name: "iPad Pro M2 12.9",
        category: "Electronics",
        price: 99999,
        oldPrice: 112999,
        discount: "11% OFF",
        image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800",
        rating: 4.9,
        reviews: 345,
        timer: "5h 56m",
        colors: ["#3D3D3F", "#E3E4E5"],
        stock: 0,
        status: 'Out of Stock'
    },
    {
        id: "deal-special",
        name: "Premium Ultra Pro Max Elite",
        category: "Electronics",
        price: 199999,
        oldPrice: 249999,
        discount: "20% OFF",
        image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800",
        rating: 5.0,
        reviews: 9999,
        timer: "24h 00m",
        colors: ["#000000", "#C0C0C0", "#0000FF"]
    }
];

const homeStyles = `
    .product-uniform-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
    .product-card-premium { 
        background: white; 
        border-radius: 1.25rem; 
        padding: 1rem; 
        border: 1px solid #e2e8f0; 
        transition: 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
        display: flex; 
        flex-direction: column; 
        height: 100%; 
        cursor: pointer;
        position: relative;
    }
    .product-card-premium:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px -8px rgba(0,0,0,0.1);
    }
    .card-media { 
        height: 300px; 
        background: #f1f5f9; 
        border-radius: 0.75rem; 
        position: relative; 
        overflow: hidden; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        margin-bottom: 1rem; 
        padding: 1rem;
    }
    .card-media img { 
        width: 100%; 
        height: 100%; 
        object-fit: contain; 
        transition: 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .product-card-premium:hover .card-media img {
        transform: scale(1.05);
    }
    .discount-badge { 
        position: absolute; 
        top: 0.5rem; 
        left: 0.5rem; 
        background: #ef4444; 
        color: white; 
        padding: 0.25rem 0.6rem; 
        border-radius: 0.5rem; 
        font-weight: 700; 
        font-size: 0.75rem; 
        z-index: 2;
    }
    
    .overlay-tools {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        z-index: 3;
    }
    .tool-btn {
        width: 36px;
        height: 36px;
        background: white;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #e2e8f0;
        cursor: pointer;
        transition: 0.2s;
        color: #64748b;
    }
    .tool-btn:hover {
        background: var(--primary);
        color: white;
        border-color: var(--primary);
    }
    .tool-btn.active {
        color: #ef4444;
        border-color: #ef4444;
    }

    .card-info { flex: 1; display: flex; flex-direction: column; padding: 0.25rem; }
    .card-info .category-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.25rem; }
    .card-info .category { font-size: 0.7rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
    .card-info .sub-category { font-size: 0.75rem; font-weight: 600; color: #64748b; }
    .card-info .title { font-size: 1.125rem; font-weight: 700; margin: 0.25rem 0 0.5rem; color: var(--text); line-height: 1.4; height: 2.8em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    .rating-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }

    .info-bottom { 
        margin-top: auto; 
        display: flex; 
        justify-content: space-between; 
        align-items: center; 
    }
    .price-group { display: flex; flex-direction: column; gap: 0.1rem; }
    .current-price { font-size: 1.4rem; font-weight: 950; color: #0f172a; }
    .old-price { font-size: 0.9rem; text-decoration: line-through; color: #94a3b8; font-weight: 600; }
    
    .add-to-cart-simple { 
        width: 100%; 
        padding: 0.8rem; 
        background: var(--primary); 
        color: white; 
        border-radius: 8px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        gap: 0.5rem; 
        font-weight: 700; 
        cursor: pointer;
        border: none;
    }
    .add-to-cart-simple:hover { 
        opacity: 0.9;
    }
    
    .hero-carousel { height: 600px; border-radius: 0 0 2rem 2rem; overflow: hidden; }
    .hero-slide { height: 100%; background-size: cover; background-position: center; display: flex; align-items: center; color: white; }
    
    .section { padding: 4rem 0; }
    .title-modern { font-size: 2.25rem; font-weight: 850; color: var(--text); margin-bottom: 2rem; }

    .cat-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; }
    .sub-category { font-size: 0.75rem; font-weight: 600; color: #64748b; }

    .category-group-wrapper { margin-bottom: 4rem; }
    .category-group-header { 
        display: flex; 
        justify-content: space-between;
        align-items: center; 
        margin-bottom: 2rem; 
        padding-bottom: 1rem;
        border-bottom: 1px solid #e2e8f0;
    }
    .category-group-header h3 { font-size: 1.25rem; font-weight: 700; color: var(--text); }
    .category-group-header .view-more { color: var(--primary); font-weight: 600; font-size: 0.9rem; }
`;

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [latestProducts, setLatestProducts] = useState([]);
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
                const productsCol = collection(db, "products");

                // Fetch Featured
                const qFeatured = query(productsCol, limit(8));
                const snapFeatured = await getDocs(qFeatured);
                let featured = snapFeatured.docs.map(doc => {
                    const d = { id: doc.id, ...doc.data() };
                    // Seller products store `title` instead of `name` — normalize here
                    if (!d.name && d.title) d.name = d.title;
                    return d;
                });

                // Add fallback mock data if Firestore is empty
                if (featured.length === 0) {
                    featured = [
                        {
                            id: "deal-1", name: "MacBook Pro M2 Max", price: 129999, oldPrice: 149498, rating: 4.8, reviews: 1256, category: "Electronics",
                            image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", discount: "13% OFF",
                            colors: ["#3D3D3F", "#E3E4E5"],
                            storage: [{ label: "512GB", priceOffset: 0 }, { label: "1TB", priceOffset: 20000 }]
                        },
                        {
                            id: "deal-2", name: "Sony WH-1000XM4 Noise Cancelling", price: 19999, oldPrice: 29999, rating: 4.9, reviews: 892, category: "Electronics",
                            image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800", discount: "33% OFF",
                            colors: ["#000000", "#C9C4B9"],
                            stock: 0, status: 'Out of Stock'
                        },
                        {
                            id: "deal-3", name: "Apple Watch Series 8", price: 34999, oldPrice: 42999, rating: 4.8, reviews: 567, category: "Electronics",
                            image: "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=800", discount: "18% OFF",
                            colors: ["#1C1C1C", "#E3E4E5", "#0F1626"]
                        },
                        {
                            id: "deal-4", name: "iPad Pro M2 12.9", price: 99999, oldPrice: 112999, rating: 4.9, reviews: 345, category: "Electronics",
                            image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800", discount: "11% OFF",
                            colors: ["#3D3D3F", "#E3E4E5"],
                            stock: 0, status: 'Out of Stock'
                        }
                    ];
                }

                setFeaturedProducts(featured);
                setLatestProducts(featured.slice().reverse());
                setLoading(false);

                // Fetch reviews for all loaded products
                fetchReviewsForProducts([...featured]);
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
        console.log('🎬 Home: Setting up wishlist listener');
        const unsubscribe = listenToWishlist((items) => {
            console.log('🔄 Home: Received wishlist update with', items.length, 'items:', items.map(i => i.id));
            setWishlist(items);
        });
        return () => {
            console.log('🛑 Home: Cleaning up wishlist listener');
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

        console.log('🎯 toggleWishlist clicked for product:', product.id);

        const alreadySaved = wishlist.some(item => item.id === product.id);

        try {
            if (alreadySaved) {
                const result = await removeFromWishlist(product.id);
                if (result.success) {
                    console.log('✅ Removed successfully');
                }
            } else {
                const result = await addToWishlist(product);
                if (result.success) {
                    console.log('✅ Added successfully');
                }
            }
        } catch (error) {
            console.error('❌ toggleWishlist error:', error);
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

    const groupedDeals = useMemo(() => groupByCategory(TODAY_DEALS), [TODAY_DEALS]);
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
        <div className="home-wrapper">
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
                                <button className="btn-modern btn-outline">Explore Brands</button>
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
            <section className="section deals-section">
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
                { title: "Featured Products", subtitle: "Our top picks for you", groupedData: groupedFeatured, bg: "bg-light" },
                { title: "Latest Releases", subtitle: "Stay ahead with the newest additions", groupedData: groupedLatest, bg: "bg-white" }
            ].map((sec, idx) => (
                <section key={idx} className={"section " + sec.bg}>
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
