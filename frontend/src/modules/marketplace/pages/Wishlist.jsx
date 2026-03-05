import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, ShoppingCart, Trash2, ArrowLeft, Star, ShoppingBag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { addToCart } from '@/modules/shared/utils/cartUtils';
import { listenToWishlist, removeFromWishlist as removeFromWishlistAPI } from '@/modules/shared/utils/wishlistUtils';
import PriceDisplay from '@/modules/shared/components/common/PriceDisplay';

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
            alert('✅ Product added to cart successfully!');
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
                                    <img src={item.image || item.imageUrl} alt={item.name || item.title} />
                                </div>
                                <div className="card-info">
                                    <div className="info-top">
                                        <h3 onClick={() => navigate(`/product/${item.id}`)}>{item.name || item.title}</h3>
                                        <button className="remove-btn" onClick={() => removeFromWishlist(item.id)} title="Remove">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="rating">
                                        <Star size={14} fill="#FFB800" color="#FFB800" />
                                        <span>{item.rating || 4.5}</span>
                                    </div>
                                    <div className="price-row">
                                        <PriceDisplay product={item} size="sm" />
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
.wishlist-page { padding: 16px 0 32px; background: #f8fafc; min-height: 100vh; }
.wishlist-page .container { max-width: 1280px; margin: 0 auto; padding: 0 12px; }
.wishlist-header { margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 1.5rem; }
.back-btn { background: white; border: none; width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b; box-shadow: 0 4px 12px rgba(0,0,0,0.05); transition: 0.2s; }
.back-btn:hover { background: #1e293b; color: white; transform: translateX(-4px); }
.wishlist-header h1 { font-size: 2rem; font-weight: 800; color: #1e293b; }
.wishlist-header h1 span { font-size: 1.1rem; color: #94a3b8; font-weight: 500; margin-left: 0.5rem; }

.wishlist-grid { 
    display: grid; 
    grid-template-columns: repeat(4, 1fr); 
    gap: 16px; 
}

@media (max-width: 1024px) {
    .wishlist-grid {
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
    }
}

@media (max-width: 768px) {
    .wishlist-page .container { padding: 0 8px; }
    .wishlist-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }
}

@media (max-width: 480px) {
    .wishlist-grid {
        grid-template-columns: 1fr;
    }
}

.wishlist-card { 
    background: white; 
    border-radius: 10px; 
    overflow: hidden; 
    transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1); 
    position: relative;
    border: 2px solid rgba(0, 0, 0, 0.15);
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    display: flex;
    flex-direction: column;
    height: 100%;
}
.wishlist-card:hover { 
    transform: translateY(-4px); 
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    border-color: #2563EB;
    background: #FAFBFC;
}

.card-media { 
    position: relative; 
    height: 170px; 
    background: #F9FAFB; 
    cursor: pointer; 
    padding: 8px; 
    display: flex; 
    align-items: center; 
    justify-content: center;
    border-radius: 8px;
    margin-bottom: 10px;
    border: 1px solid #E5E7EB;
    transition: background 300ms cubic-bezier(0.4, 0, 0.2, 1);
}
.wishlist-card:hover .card-media { background: #F3F4F6; }
.card-media img { max-width: 100%; max-height: 100%; object-fit: contain; transition: transform 300ms; }
.wishlist-card:hover .card-media img { transform: scale(1.05); }

.discount-badge { position: absolute; top: 8px; left: 8px; background: #E11D48; color: white; padding: 4px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; z-index: 2; }

.card-info { padding: 4px; flex: 1; display: flex; flex-direction: column; }
.info-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 4px; }
.info-top h3 { 
    font-size: 16px; 
    font-weight: 700; 
    color: #1e293b; 
    cursor: pointer; 
    display: -webkit-box; 
    -webkit-line-clamp: 2; 
    -webkit-box-orient: vertical; 
    overflow: hidden; 
    line-height: 1.3;
    height: 2.6em;
    min-height: 2.6em;
    margin: 4px 0 6px;
}
.remove-btn { color: #94a3b8; background: none; border: none; cursor: pointer; transition: 0.2s; padding: 4px; }
.remove-btn:hover { color: #E11D48; transform: scale(1.1); }

.rating { display: flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 0.85rem; font-weight: 600; color: #64748b; min-height: 20px; }

.price-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.current-price { font-size: 18px; font-weight: 800; color: #1e293b; }
.old-price { font-size: 12px; color: #94a3b8; text-decoration: line-through; font-weight: 600; }

.card-actions { border-top: 1px solid #E5E7EB; padding-top: 8px; margin-top: auto; }
.add-cart-btn { 
    width: 100%; 
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); 
    color: white; 
    border: none; 
    padding: 10px; 
    border-radius: 8px; 
    font-weight: 700; 
    font-size: 14px;
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 6px; 
    cursor: pointer; 
    transition: all 200ms;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15);
}
.add-cart-btn:hover { 
    background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%); 
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

.empty-wishlist { padding: 6rem 0; min-height: 80vh; display: flex; align-items: center; }
.empty-content { max-width: 500px; margin: 0 auto; padding: 4rem 2rem; text-center; }
.icon-circle { width: 100px; height: 100px; background: #fff1f2; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; color: #E11D48; }
.empty-content h2 { font-size: 2rem; font-weight: 800; color: #1e293b; margin-bottom: 1rem; }
.empty-content p { color: #64748b; margin-bottom: 2.5rem; line-height: 1.6; }
.btn-explore { display: inline-block; background: #1e293b; color: white; padding: 1rem 2.5rem; border-radius: 16px; font-weight: 800; transition: 0.3s; }
.btn-explore:hover { background: #334155; transform: translateY(-3px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
`;
