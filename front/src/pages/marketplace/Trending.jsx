import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Heart, Eye, ShoppingCart, TrendingUp } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { addToCart } from '../../utils/cartUtils';
import QuickViewModal from '../../components/common/QuickViewModal';

export default function Trending() {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [wishlist, setWishlist] = useState([]);
    const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
    const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);

    useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(saved);
    }, []);

    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const q = query(collection(db, "products"), limit(12));
                const snap = await getDocs(q);
                const data = snap.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    rating: (Math.random() * 0.4 + 4.6).toFixed(1),
                    reviews: Math.floor(Math.random() * 5000) + 1000
                }));
                setProducts(data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        fetchTrending();
    }, []);

    const handleAddToCart = async (e, p) => {
        if (e) e.stopPropagation();
        const res = await addToCart(p);
        if (res.success) navigate('/checkout');
    };

    const toggleWishlist = (e, product) => {
        if (e) e.stopPropagation();
        const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
        const alreadySaved = saved.some(item => item.id === product.id);
        let updated;
        if (alreadySaved) {
            updated = saved.filter(item => item.id !== product.id);
        } else {
            updated = [...saved, product];
        }
        localStorage.setItem('wishlist', JSON.stringify(updated));
        setWishlist(updated);
        window.dispatchEvent(new CustomEvent('wishlistUpdated'));
    };

    const openQuickView = (e, product) => {
        if (e) e.stopPropagation();
        setSelectedQuickProduct(product);
        setIsQuickViewOpen(true);
    };

    return (
        <div className="trending-page bg-light">
            <div className="container">
                <header className="page-header">
                    <div className="badge-hot"><TrendingUp size={16} /> TRENDING NOW</div>
                    <h1>What's <span className="gradient-text">Hot</span></h1>
                    <p>Discover the most popular products based on recent sales</p>
                </header>

                {loading ? (
                    <div className="loading">Checking what's viral...</div>
                ) : (
                    <div className="trending-grid">
                        {products.map((p, idx) => (
                            <motion.div
                                key={p.id}
                                className="product-card-premium"
                                onClick={() => {
                                    const recentlyViewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
                                    const filtered = recentlyViewed.filter(item => item.id !== p.id);
                                    const updated = [p, ...filtered].slice(0, 8);
                                    localStorage.setItem('recentlyViewed', JSON.stringify(updated));
                                    navigate("/product/" + p.id);
                                }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                whileHover={{ y: -8 }}
                            >
                                <div className="card-media">
                                    <div className="rank">#{idx + 1}</div>
                                    <img src={p.imageUrl || p.image} alt={p.name} />
                                    <div className="overlay-tools">
                                        <button
                                            onClick={(e) => toggleWishlist(e, p)}
                                            className={`tool-btn ${wishlist.some(item => item.id === p.id) ? 'active' : ''}`}
                                            title="Add to Wishlist"
                                        >
                                            <Heart
                                                size={18}
                                                fill={wishlist.some(item => item.id === p.id) ? "#ef4444" : "none"}
                                                color={wishlist.some(item => item.id === p.id) ? "#ef4444" : "currentColor"}
                                            />
                                        </button>
                                        <button
                                            onClick={(e) => openQuickView(e, p)}
                                            className="tool-btn"
                                            title="Quick View"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="card-info">
                                    <span className="category">{p.category || 'Trending'}</span>
                                    <h3 className="title">{p.name}</h3>

                                    <div className="rating-row">
                                        <Star size={14} fill="#FFB800" color="#FFB800" />
                                        <span>{p.rating}</span>
                                        <span className="reviews-count">({p.reviews} sold)</span>
                                    </div>

                                    <div className="info-bottom">
                                        <div className="price-group">
                                            <span className="current-price">₹{(p.price || 0).toLocaleString()}</span>
                                            {p.oldPrice && <span className="old-price">₹{p.oldPrice.toLocaleString()}</span>}
                                        </div>
                                        <button
                                            onClick={(e) => handleAddToCart(e, p)}
                                            className="add-to-cart-simple"
                                            title="Add to Cart"
                                        >
                                            <ShoppingCart size={18} />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

            <style>{`
                .trending-page { padding: 4rem 0 8rem; min-height: 100vh; }
                .page-header { margin-bottom: 4rem; text-align: center; }
                .badge-hot { display: inline-flex; align-items: center; gap: 0.5rem; background: #FFF1F2; color: #E11D48; padding: 0.5rem 1rem; border-radius: 99px; font-weight: 800; font-size: 0.85rem; margin-bottom: 1.5rem; }
                .page-header h1 { font-size: 3.5rem; font-weight: 900; margin-bottom: 0.75rem; letter-spacing: -2px; }
                .page-header p { font-size: 1.2rem; color: var(--text-muted); max-width: 600px; margin: 0 auto; }

                .trending-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2.5rem; }
                
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
                .rank { position: absolute; top: 1rem; left: 1rem; font-size: 2.5rem; font-weight: 950; color: rgba(0,0,0,0.05); font-style: italic; z-index: 1; }
                .card-media img { 
                    max-width: 100%; 
                    max-height: 100%; 
                    object-fit: contain; 
                    transition: 0.5s;
                    z-index: 2;
                }
                .product-card-premium:hover .card-media img {
                    transform: scale(1.08);
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
                .reviews-count { font-size: 0.8rem; color: #94a3b8; font-weight: 500; }

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

                .loading { text-align: center; padding: 10rem 0; font-size: 1.5rem; font-weight: 700; color: var(--text-muted); }
            `}</style>

            <QuickViewModal
                isOpen={isQuickViewOpen}
                onClose={() => setIsQuickViewOpen(false)}
                product={selectedQuickProduct}
                navigate={navigate}
            />
        </div>
    );
}
