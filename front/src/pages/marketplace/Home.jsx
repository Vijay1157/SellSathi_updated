import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Star, Heart, Eye, ArrowRight, ChevronLeft, ChevronRight, Clock, Zap, TrendingUp, Sparkles, Award } from 'lucide-react';
import { collection, getDocs, limit, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addToCart } from '../../utils/cartUtils';
import { addToWishlist, removeFromWishlist, listenToWishlist } from '../../utils/wishlistUtils';
import QuickViewModal from '../../components/common/QuickViewModal';

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
    .product-uniform-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2.5rem; }
    .product-card-premium { 
        background: white; 
        border-radius: 28px; 
        padding: 1.25rem; 
        border: 1px solid #f1f5f9; 
        transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); 
        display: flex; 
        flex-direction: column; 
        height: 100%; 
        cursor: pointer;
        position: relative;
    }
    .product-card-premium:hover {
        transform: translateY(-8px);
        box-shadow: 0 20px 40px rgba(0,0,0,0.06);
    }
    .card-media { 
        height: 280px; 
        background: #f8fafc; 
        border-radius: 20px; 
        position: relative; 
        overflow: hidden; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        margin-bottom: 1.25rem; 
        padding: 2rem;
    }
    .card-media img { 
        max-width: 100%; 
        max-height: 100%; 
        object-fit: contain; 
        transition: 0.5s;
    }
    .product-card-premium:hover .card-media img {
        transform: scale(1.08);
    }
    .discount-badge { 
        position: absolute; 
        top: 1rem; 
        left: 1rem; 
        background: #E11D48; 
        color: white; 
        padding: 0.4rem 0.75rem; 
        border-radius: 10px; 
        font-weight: 800; 
        font-size: 0.75rem; 
        z-index: 2;
    }
    
    .overlay-tools {
        position: absolute;
        top: 1rem;
        right: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
        z-index: 3;
    }
    .tool-btn {
        width: 42px;
        height: 42px;
        background: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        border: none;
        cursor: pointer;
        transition: 0.3s;
        color: #64748b;
    }
    .tool-btn:hover {
        background: white;
        transform: scale(1.1);
        color: var(--primary);
    }
    .tool-btn.active {
        color: #ef4444;
    }

    .card-info { flex: 1; display: flex; flex-direction: column; }
    .card-info .category { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px; }
    .card-info .title { font-size: 1.15rem; font-weight: 800; margin: 0.5rem 0 0.75rem; color: #1e293b; line-height: 1.4; height: 3.2em; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    
    .rating-row { display: flex; align-items: center; gap: 0.4rem; margin-bottom: 1rem; }
    .rating-row span { font-size: 0.85rem; font-weight: 700; color: #64748b; }

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
        width: 48px; 
        height: 48px; 
        background: #4f46e5; 
        color: white; 
        border-radius: 14px; 
        display: flex; 
        align-items: center; 
        justify-content: center; 
        transition: 0.3s; 
        border: none;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
    }
    .add-to-cart-simple:hover { 
        background: #4338ca; 
        transform: scale(1.05); 
        box-shadow: 0 6px 16px rgba(79, 70, 229, 0.3);
    }
    
    .hero-carousel { height: 700px; }
    .hero-slide { height: 100%; background-size: cover; background-position: center; display: flex; align-items: center; color: white; }
    
    .section { padding: 5rem 0; }
    .section-header-compact { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3rem; }
    .title-modern { font-size: 2.5rem; font-weight: 900; }

    .cat-row { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.2rem; }
    .sub-category { font-size: 0.75rem; font-weight: 600; color: #64748b; }

    .category-group-wrapper { margin-bottom: 4rem; }
    .category-group-header { 
        display: flex; 
        align-items: center; 
        gap: 1rem; 
        margin-bottom: 2rem; 
        padding-bottom: 0.5rem; 
        border-bottom: 2px solid #f1f5f9;
        width: 100%;
    }
    .category-group-header h3 { 
        font-size: 1.25rem; 
        font-weight: 850; 
        color: #1e293b; 
        letter-spacing: -0.5px;
    }
    .category-group-header .line { flex: 1; height: 1px; background: #e2e8f0; }
    .category-group-header .view-more { 
        font-size: 0.85rem; 
        font-weight: 700; 
        color: var(--primary); 
        text-decoration: none; 
        display: flex; 
        align-items: center; 
        gap: 0.4rem;
        transition: 0.2s;
    }
    .category-group-header .view-more:hover { gap: 0.6rem; }
`;

export default function Home() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [latestProducts, setLatestProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishlist, setWishlist] = useState([]);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
    const navigate = useNavigate();

    // Initial wishlist load is handled by the listener below


    useEffect(() => {
        const fetchData = async () => {
            try {
                const productsCol = collection(db, "products");

                // Fetch Featured
                const qFeatured = query(productsCol, limit(8));
                const snapFeatured = await getDocs(qFeatured);
                let featured = snapFeatured.docs.map(doc => ({ id: doc.id, ...doc.data() }));

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

    const handleAddToCart = async (e, product) => {
        if (e) e.stopPropagation();
        const res = await addToCart(product);
        if (res.success) navigate('/checkout');
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
                    <div className="cat-row">
                        <span className="category">{product.category || 'Product'}</span>
                        {product.subCategory && <span className="sub-category">• {product.subCategory}</span>}
                    </div>
                    <h3 className="title">{product.name}</h3>

                    <div className="rating-row">
                        <Star size={14} fill="#FFB800" color="#FFB800" />
                        <span>{product.rating || 4.5}</span>
                        {(product.stock === 0 || product.status === 'Out of Stock') && (
                            <span style={{ color: '#ef4444', marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 800 }}>OUT OF STOCK</span>
                        )}
                    </div>

                    <div className="info-bottom">
                        <div className="price-group">
                            <span className="current-price">₹{(product.price || 0).toLocaleString()}</span>
                            {product.oldPrice && <span className="old-price">₹{product.oldPrice.toLocaleString()}</span>}
                        </div>
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
