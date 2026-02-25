import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Star, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addToCart } from '../../utils/cartUtils';
import { listenToWishlist, removeFromWishlist as removeFromWishlistAPI } from '../../utils/wishlistUtils';

export default function Wishlist() {
    const [wishlist, setWishlist] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = listenToWishlist((items) => {
            setWishlist(items);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const removeFromWishlist = async (id) => {
        const result = await removeFromWishlistAPI(id);
        if (result.success) {
            // Wishlist will update automatically via listener
        } else {
            alert(result.message || 'Failed to remove from wishlist');
        }
    };

    const handleAddToCart = async (product) => {
        const res = await addToCart(product);
        if (res.success) {
            navigate('/checkout');
        }
    };

    if (loading) {
        return (
            <div className="wishlist-page">
                <div className="container">
                    <div className="loading-state">Loading wishlist...</div>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    if (wishlist.length === 0) {
        return (
            <div className="empty-wishlist animate-fade-in">
                <div className="container">
                    <div className="empty-content glass-card">
                        <div className="icon-circle">
                            <Heart size={48} className="heart-icon" />
                        </div>
                        <h2>Your wishlist is empty</h2>
                        <p>Seems like you haven't added any favorites yet. Explore our latest deals and find something you love!</p>
                        <Link to="/" className="btn-explore">Explore Marketplace</Link>
                    </div>
                </div>
                <style>{styles}</style>
            </div>
        );
    }

    return (
        <div className="wishlist-page">
            <div className="container">
                <header className="wishlist-header">
                    <div className="header-left">
                        <button onClick={() => navigate(-1)} className="back-btn">
                            <ArrowLeft size={20} />
                        </button>
                        <h1>My Wishlist <span>({wishlist.length} items)</span></h1>
                    </div>
                </header>

                <div className="wishlist-grid">
                    <AnimatePresence>
                        {wishlist.map((item) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="wishlist-card glass-card"
                            >
                                <div className="card-media" onClick={() => navigate(`/product/${item.id}`)}>
                                    <img src={item.image || item.imageUrl} alt={item.name} />
                                </div>
                                <div className="card-info">
                                    <div className="info-top">
                                        <h3 onClick={() => navigate(`/product/${item.id}`)}>{item.name}</h3>
                                        <button className="remove-btn" onClick={() => removeFromWishlist(item.id)} title="Remove">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="rating">
                                        <Star size={14} fill="#FFB800" color="#FFB800" />
                                        <span>{item.rating || 4.5}</span>
                                    </div>
                                    <div className="price-row">
                                        <span className="current-price">₹{item.price?.toLocaleString()}</span>
                                        {item.oldPrice && <span className="old-price">₹{item.oldPrice.toLocaleString()}</span>}
                                    </div>
                                    <div className="card-actions">
                                        <button className="add-cart-btn" onClick={() => handleAddToCart(item)}>
                                            <ShoppingCart size={18} /> Add to Cart
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
            <style>{styles}</style>
        </div>
    );
}

const styles = `
.wishlist-page { padding: 4rem 0; background: #f8fafc; min-height: 100vh; }
.wishlist-header { margin-bottom: 3rem; display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 1.5rem; }
.back-btn { background: white; border: none; width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: 0.2s; }
.back-btn:hover { background: #1e293b; color: white; transform: translateX(-4px); }
.wishlist-header h1 { font-size: 2rem; font-weight: 800; color: #1e293b; }
.wishlist-header h1 span { font-size: 1.1rem; color: #94a3b8; font-weight: 500; margin-left: 0.5rem; }

.wishlist-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 2rem; }
.wishlist-card { background: white; border-radius: 24px; overflow: hidden; transition: 0.3s; position: relative; }
.wishlist-card:hover { transform: translateY(-8px); box-shadow: 0 20px 40px rgba(0,0,0,0.06); }

.card-media { position: relative; height: 220px; background: #f1f5f9; cursor: pointer; padding: 2rem; display: flex; align-items: center; justify-content: center; }
.card-media img { max-width: 100%; max-height: 100%; object-fit: contain; transition: 0.5s; }
.wishlist-card:hover .card-media img { transform: scale(1.08); }

.discount-badge { position: absolute; top: 1rem; left: 1rem; background: #E11D48; color: white; padding: 0.4rem 0.8rem; border-radius: 10px; font-size: 0.75rem; font-weight: 800; }

.card-info { padding: 1.5rem; }
.info-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
.info-top h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; cursor: pointer; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4; }
.remove-btn { color: #94a3b8; background: none; border: none; cursor: pointer; transition: 0.2s; padding: 4px; }
.remove-btn:hover { color: #E11D48; transform: scale(1.1); }

.rating { display: flex; align-items: center; gap: 4px; margin-bottom: 1rem; font-size: 0.85rem; font-weight: 600; color: #64748b; }

.price-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.5rem; }
.current-price { font-size: 1.35rem; font-weight: 800; color: #1e293b; }
.old-price { font-size: 0.95rem; color: #94a3b8; text-decoration: line-through; }

.card-actions { border-top: 1px solid #f1f5f9; padding-top: 1.25rem; }
.add-cart-btn { width: 100%; background: #1e293b; color: white; border: none; padding: 0.8rem; border-radius: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 0.6rem; cursor: pointer; transition: 0.3s; }
.add-cart-btn:hover { background: #334155; transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.1); }

.empty-wishlist { padding: 6rem 0; min-height: 80vh; display: flex; align-items: center; }
.empty-content { max-width: 500px; margin: 0 auto; padding: 4rem 2rem; text-align: center; }
.icon-circle { width: 100px; height: 100px; background: #fff1f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; color: #E11D48; }
.empty-content h2 { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem; }
.empty-content p { color: #64748b; margin-bottom: 2.5rem; line-height: 1.6; }
.btn-explore { display: inline-block; background: #1e293b; color: white; padding: 1rem 2.5rem; border-radius: 16px; font-weight: 800; transition: 0.3s; }
.btn-explore:hover { background: #334155; transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
`;
