import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star, ShoppingCart, Heart, Clock } from 'lucide-react';
import { addToCart } from '../../utils/cartUtils';

export default function QuickViewModal({ isOpen, onClose, product, navigate }) {
    if (!product) return null;

    const [wishlist, setWishlist] = React.useState([]);
    const [isSaved, setIsSaved] = React.useState(false);
    const [selectedStorage, setSelectedStorage] = React.useState(null);
    const [selectedMemory, setSelectedMemory] = React.useState(null);
    const [purchaseOption, setPurchaseOption] = React.useState('standard');
    const [selectedColor, setSelectedColor] = React.useState(null);
    const [selectedSize, setSelectedSize] = React.useState(null);

    React.useEffect(() => {
        const saved = JSON.parse(localStorage.getItem('wishlist') || '[]');
        setWishlist(saved);
        setIsSaved(saved.some(item => item.id === product.id));

        if (product.storage && product.storage.length > 0) setSelectedStorage(product.storage[0]);
        if (product.memory && product.memory.length > 0) setSelectedMemory(product.memory[0]);
        if (product.colors && product.colors.length > 0) setSelectedColor(product.colors[0]);
        if (product.sizes && product.sizes.length > 0) setSelectedSize(product.sizes[0]);
    }, [product.id]);

    const toggleWishlist = (e) => {
        e.stopPropagation();
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
        setIsSaved(!alreadySaved);
    };

    const handleAddToCart = async (e) => {
        if (e) e.stopPropagation();
        if (!product) return;
        const inStock = product.stock !== 0 && product.status !== 'Out of Stock';
        if (!inStock) return;

        const selections = {
            color: selectedColor,
            size: selectedSize,
            storage: selectedStorage,
            memory: selectedMemory,
            purchaseOption: purchaseOption
        };
        const res = await addToCart(product, selections);
        if (res.success) {
            onClose();
            navigate('/checkout');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="quick-view-overlay" onClick={onClose}>
                    <motion.div
                        className="quick-view-container glass-card"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="close-btn" onClick={onClose}>
                            <X size={24} />
                        </button>

                        <div className="quick-view-content">
                            <div className="qv-media">
                                <img src={product.imageUrl || product.image} alt={product.name} />
                                {product.discount && <span className="qv-discount">{product.discount}</span>}
                            </div>

                            <div className="qv-info">
                                <h2 className="qv-title">{product.name}</h2>

                                <div className="qv-rating">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            size={18}
                                            fill={i < Math.floor(product.rating || 4) ? "#FFB800" : "none"}
                                            color="#FFB800"
                                        />
                                    ))}
                                    <span className="qv-review-count">({product.reviews || 0} reviews)</span>
                                </div>

                                <div className="qv-price-row">
                                    <span className="qv-price">
                                        ₹{(purchaseOption === 'exchange' ? (product.price || 0) * 0.9 : (product.price || 0)).toLocaleString()}
                                    </span>
                                    {product.oldPrice && <span className="qv-old-price">₹{(product.oldPrice || 0).toLocaleString()}</span>}
                                    <span className="qv-discount-text">
                                        ({purchaseOption === 'exchange' ? '23% off' : (product.discount || '13% off')})
                                    </span>
                                </div>

                                <div className={`stock-status ${(product.stock === 0 || product.status === 'Out of Stock') ? 'out' : 'in'}`}>
                                    {(product.stock === 0 || product.status === 'Out of Stock') ? 'Out of Stock' : 'In Stock'}
                                </div>

                                <p className="qv-description">
                                    {product.description || `Experience the best in category with the ${product.name}. Premium quality and exceptional performance guaranteed.`}
                                </p>

                                <div className="qv-deal-timer">
                                    <Clock size={18} />
                                    <span>Deal ends in 11h 24m</span>
                                </div>

                                <div className="qv-variant-section">
                                    <h4>Purchase Options</h4>
                                    <div className="qv-purchase-options">
                                        <div
                                            className={`qv-opt-card ${purchaseOption === 'standard' ? 'active' : ''}`}
                                            onClick={() => setPurchaseOption('standard')}
                                        >
                                            <span className="p">₹{(product.price || 0).toLocaleString()}</span>
                                            <span className="l">Standard</span>
                                        </div>
                                        <div
                                            className={`qv-opt-card ${purchaseOption === 'exchange' ? 'active' : ''}`}
                                            onClick={() => setPurchaseOption('exchange')}
                                        >
                                            <span className="p">₹{((product.price || 0) * 0.9).toLocaleString()}</span>
                                            <span className="l">Exchange</span>
                                        </div>
                                    </div>
                                </div>

                                {product.colors && product.colors.length > 0 && (
                                    <div className="qv-variant-section">
                                        <h4>Color: <span className="qv-selected-val">{selectedColor?.name || selectedColor}</span></h4>
                                        <div className="qv-pill-group">
                                            {product.colors.map(color => (
                                                <button
                                                    key={color.name || color}
                                                    className={`qv-pill ${selectedColor === color ? 'active' : ''}`}
                                                    onClick={() => setSelectedColor(color)}
                                                >
                                                    {color.name || color}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {product.sizes && product.sizes.length > 0 && (
                                    <div className="qv-variant-section">
                                        <h4>Size: <span className="qv-selected-val">{selectedSize}</span></h4>
                                        <div className="qv-pill-group">
                                            {product.sizes.map(size => (
                                                <button
                                                    key={size}
                                                    className={`qv-pill ${selectedSize === size ? 'active' : ''}`}
                                                    onClick={() => setSelectedSize(size)}
                                                >
                                                    {size}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {product.storage && product.storage.length > 0 && (
                                    <div className="qv-variant-section">
                                        <h4>Storage: <span className="qv-selected-val">{selectedStorage?.label || selectedStorage}</span></h4>
                                        <div className="qv-pill-group">
                                            {product.storage.map(s => (
                                                <button
                                                    key={s.label || s}
                                                    className={`qv-pill variant-pill ${selectedStorage === s ? 'active' : ''}`}
                                                    onClick={() => setSelectedStorage(s)}
                                                >
                                                    <span className="v-label">{s.label || s}</span>
                                                    <span className="v-price">{s.priceOffset ? (s.priceOffset > 0 ? `+₹${s.priceOffset.toLocaleString()}` : `-₹${Math.abs(s.priceOffset).toLocaleString()}`) : 'Included'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {product.memory && product.memory.length > 0 && (
                                    <div className="qv-variant-section">
                                        <h4>Memory: <span className="qv-selected-val">{selectedMemory?.label || selectedMemory}</span></h4>
                                        <div className="qv-pill-group">
                                            {product.memory.map(m => (
                                                <button
                                                    key={m.label || m}
                                                    className={`qv-pill variant-pill ${selectedMemory === m ? 'active' : ''}`}
                                                    onClick={() => setSelectedMemory(m)}
                                                >
                                                    <span className="v-label">{m.label || m}</span>
                                                    <span className="v-price">{m.priceOffset ? (m.priceOffset > 0 ? `+₹${m.priceOffset.toLocaleString()}` : `-₹${Math.abs(m.priceOffset).toLocaleString()}`) : 'Included'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <div className="qv-actions">
                                    <button
                                        className="qv-add-btn"
                                        onClick={handleAddToCart}
                                        disabled={product.stock === 0 || product.status === 'Out of Stock'}
                                        style={product.stock === 0 || product.status === 'Out of Stock' ? { background: '#94a3b8', cursor: 'not-allowed' } : {}}
                                    >
                                        Add to Cart
                                    </button>
                                    <button
                                        className={`qv-wishlist-btn ${isSaved ? 'active' : ''}`}
                                        onClick={toggleWishlist}
                                    >
                                        <Heart
                                            size={20}
                                            fill={isSaved ? "#ef4444" : "none"}
                                            color={isSaved ? "#ef4444" : "currentColor"}
                                        />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    <style>{`
                        .quick-view-overlay {
                            position: fixed;
                            inset: 0;
                            background: rgba(0, 0, 0, 0.4);
                            backdrop-filter: blur(8px);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            z-index: 9999;
                            padding: 2rem;
                        }
                        .quick-view-container {
                            background: white;
                            width: 100%;
                            max-width: 900px;
                            border-radius: 24px;
                            position: relative;
                            overflow: hidden;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                        }
                        .close-btn {
                            position: absolute;
                            top: 1.5rem;
                            right: 1.5rem;
                            background: #f1f5f9;
                            border: none;
                            width: 40px;
                            height: 40px;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            z-index: 10;
                            transition: 0.2s;
                            color: #64748b;
                        }
                        .close-btn:hover {
                            background: #e2e8f0;
                            color: #0f172a;
                            transform: rotate(90deg);
                        }
                        .quick-view-content {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 0;
                        }
                        .qv-media {
                            background: #f8fafc;
                            position: relative;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            padding: 2rem;
                        }
                        .qv-media img {
                            width: 100%;
                            height: 100%;
                            object-fit: contain;
                            border-radius: 12px;
                        }
                        .qv-discount {
                            position: absolute;
                            top: 1rem;
                            left: 1rem;
                            background: #f97316;
                            color: white;
                            padding: 0.4rem 0.8rem;
                            border-radius: 99px;
                            font-weight: 700;
                            font-size: 0.85rem;
                        }
                        .qv-info {
                            padding: 3rem;
                            display: flex;
                            flex-direction: column;
                            gap: 1.5rem;
                            justify-content: center;
                        }
                        .qv-title {
                            font-size: 1.75rem;
                            font-weight: 850;
                            line-height: 1.2;
                            color: #1a1a1a;
                            letter-spacing: -0.5px;
                        }
                        .qv-rating {
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        }
                        .qv-review-count {
                            font-size: 0.9rem;
                            color: #64748b;
                            font-weight: 500;
                        }
                        .qv-price-row {
                            display: flex;
                            align-items: center;
                            gap: 1rem;
                        }
                        .qv-variant-section h4 {
                            font-size: 0.9rem;
                            font-weight: 800;
                            color: #1e293b;
                            margin-bottom: 0.75rem;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            display: flex;
                            align-items: center;
                            gap: 0.4rem;
                        }
                        .qv-variant-section h4 .qv-selected-val {
                            color: #64748b;
                            font-weight: 500;
                            text-transform: none;
                        }
                        .qv-price {
                            font-size: 2rem;
                            font-weight: 800;
                            color: #0f172a;
                        }
                        .qv-old-price { font-size: 1.1rem; color: #94a3b8; text-decoration: line-through; margin-top: 0.25rem; }
                        .qv-discount-text { color: #E11D48; font-weight: 700; font-size: 0.95rem; margin-top: 0.25rem; }

                        .stock-status { font-size: 0.9rem; font-weight: 800; margin-top: 0.75rem; }
                        .stock-status.in { color: #10b981; }
                        .stock-status.out { color: #ef4444; }

                        .qv-description { color: #64748b; line-height: 1.6; font-size: 0.95rem; margin: 1.5rem 0; }
                        .qv-deal-timer {
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                            color: #64748b;
                            font-weight: 500;
                            font-size: 0.9rem;
                            margin-bottom: 0.5rem;
                        }
                        
                        .qv-purchase-options { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1.5rem; }
                        .qv-opt-card { border: 2px solid #e2e8f0; border-radius: 12px; padding: 0.75rem; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; }
                        .qv-opt-card.active { border-color: #4f46e5; background: #f5f3ff; }
                        .qv-opt-card .p { font-size: 1.1rem; font-weight: 800; color: #1e293b; }
                        .qv-opt-card .l { font-size: 0.75rem; color: #64748b; }
                        .qv-opt-card.active .p { color: #4f46e5; }

                        .qv-pill-group {
                            display: flex;
                            flex-wrap: wrap;
                            gap: 0.75rem;
                        }
                        .qv-pill {
                            padding: 0.8rem 1.2rem;
                            border-radius: 12px;
                            border: 1px solid #e2e8f0;
                            background: white;
                            font-weight: 600;
                            font-size: 0.9rem;
                            cursor: pointer;
                            transition: 0.2s;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                        }
                        .qv-pill:hover {
                            border-color: #4f46e5;
                            color: #4f46e5;
                        }
                        .qv-pill.active {
                            background: #EEF2FF;
                            color: #4f46e5;
                            border-color: #4f46e5;
                            box-shadow: 0 0 0 1px #4f46e5;
                        }
                        .variant-pill {
                            flex-direction: column;
                            align-items: flex-start;
                            min-width: 100px;
                        }
                        .variant-pill .v-label {
                            font-size: 0.9rem;
                            font-weight: 700;
                            margin-bottom: 2px;
                        }
                        .variant-pill .v-price {
                            font-size: 0.75rem;
                            font-weight: 500;
                            opacity: 0.6;
                        }
                        .qv-actions {
                            display: flex;
                            gap: 1rem;
                            margin-top: 1rem;
                        }
                        .qv-add-btn {
                            flex: 1;
                            background: #4f46e5;
                            color: white;
                            border: none;
                            padding: 1.25rem;
                            border-radius: 16px;
                            font-weight: 700;
                            font-size: 1.1rem;
                            cursor: pointer;
                            transition: 0.2s;
                        }
                        .qv-add-btn:hover:not(:disabled) { 
                            background: #0f172a; 
                            transform: translateY(-2px); 
                            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
                        }
                        .qv-add-btn:disabled {
                            opacity: 0.5;
                            cursor: not-allowed;
                        }
                        .qv-wishlist-btn {
                            width: 60px;
                            height: 60px;
                            border-radius: 16px;
                            border: 2px solid #e2e8f0;
                            background: white;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            cursor: pointer;
                            transition: 0.2s;
                            color: #64748b;
                        }
                        .qv-wishlist-btn:hover {
                            border-color: #ef4444;
                            color: #ef4444;
                            background: #fef2f2;
                        }
                        .qv-wishlist-btn.active {
                            border-color: #ef4444;
                            background: #fef2f2;
                            color: #ef4444;
                        }

                        @media (max-width: 768px) {
                            .quick-view-content {
                                grid-template-columns: 1fr;
                            }
                            .qv-info {
                                padding: 2rem;
                            }
                            .qv-media {
                                height: 300px;
                            }
                        }
                    `}</style>
                </div>
            )}
        </AnimatePresence>
    );
}
