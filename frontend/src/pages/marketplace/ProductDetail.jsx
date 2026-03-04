import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, auth } from '../../config/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { addToCart } from '../../utils/cartUtils';
import { authFetch, API_BASE } from '../../utils/api';
import { addToWishlist, removeFromWishlist, isInWishlist, listenToWishlist } from '../../utils/wishlistUtils';
import { Ruler, ShoppingCart, Heart, Shield, Truck, RotateCcw, ArrowLeft, ArrowRight, Star, Share2, ZoomIn, ChevronLeft, ChevronRight, Bookmark, Image as ImageIcon, Plus, Minus, Send, Upload, X, MessageCircle, Facebook, Twitter, Mail, Rss, AlertOctagon, ShieldCheck, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SizeChartModal from '../../components/common/SizeChartModal';
import Rating from '../../components/common/Rating';
import PriceDisplay from '../../components/common/PriceDisplay';
import { getProductPricing } from '../../utils/priceUtils';
import { fetchProductReviews, calculateRatingStats, clearProductReviewCache } from '../../utils/reviewUtils';
import { getFrequentlyBoughtTogether, getSimilarProducts } from '../../utils/recommendationUtils';
import { useTranslation } from 'react-i18next';

const ExpandableText = ({ text, maxLength = 180 }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!text || text.length <= maxLength) {
        return <p className="rb">{text}</p>;
    }

    return (
        <p className="rb">
            {isExpanded ? text : `${text.slice(0, maxLength)}...`}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="show-more-btn-text"
            >
                {isExpanded ? 'Show less' : 'Show more'}
            </button>
        </p>
    );
};

export default function ProductDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('description');
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState('M');
    const [selectedStorage, setSelectedStorage] = useState(null);
    const [selectedMemory, setSelectedMemory] = useState(null);
    const [selectedVariant, setSelectedVariant] = useState({});
    const [purchaseOption, setPurchaseOption] = useState('standard');
    const [isZoomed, setIsZoomed] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [showZoomPreview, setShowZoomPreview] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
    const [fbtSelections, setFbtSelections] = useState({ 0: true, 1: false, 2: false });
    const [fbtProducts, setFbtProducts] = useState([]);
    const [similarProducts, setSimilarProducts] = useState([]);
    const [recentlyViewed, setRecentlyViewed] = useState([]);
    const [isSaved, setIsSaved] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);
    const [reviews, setReviews] = useState([]);
    const [reviewStats, setReviewStats] = useState({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
    const [copyStatus, setCopyStatus] = useState('Copy Link');
    const [reviewsLimit, setReviewsLimit] = useState(2);
    const [newReview, setNewReview] = useState({ rating: 5, title: '', body: '', images: [] });
    const [uploading, setUploading] = useState(false);
    const [seller, setSeller] = useState(null);
    const [isEligibleForReview, setIsEligibleForReview] = useState(false);
    const [eligibleOrder, setEligibleOrder] = useState(null);

    // Consolidated Price Calculation
    const productPriceInfo = useMemo(() => {
        return getProductPricing(product, {
            size: selectedSize,
            storage: selectedStorage,
            memory: selectedMemory,
            purchaseOption: purchaseOption
        });
    }, [product, selectedSize, selectedStorage, selectedMemory, purchaseOption]);

    // Build comprehensive images array including main image, additional images, and variant images
    const images = useMemo(() => {
        if (!product) return [];
        
        const imageSet = new Set();
        
        // Add main image
        if (product.image) imageSet.add(product.image);
        if (product.imageUrl) imageSet.add(product.imageUrl);
        
        // Add additional images array
        if (product.images && Array.isArray(product.images)) {
            product.images.forEach(img => {
                if (img && typeof img === 'string') imageSet.add(img);
            });
        }
        
        // Add variant images
        if (product.variantImages && typeof product.variantImages === 'object') {
            Object.values(product.variantImages).forEach(img => {
                if (img && typeof img === 'string') imageSet.add(img);
            });
        }
        
        const imagesArray = Array.from(imageSet).filter(Boolean);
        return imagesArray.length > 0 ? imagesArray : ['/placeholder-image.jpg'];
    }, [product]);

    const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);

    // Reset active image index when product changes
    useEffect(() => {
        setActiveImageIndex(0);
    }, [product?.id]);

    useEffect(() => {
        const setupSellerListener = async (sellerId) => {
            if (!sellerId || sellerId === "system_generated" || sellerId === "official") {
                setSeller(null);
                return;
            }

            // Primary: Fetch seller via public backend API (no auth needed, avoids Firestore quota)
            try {
                const response = await fetch(`${API_BASE}/api/seller/${sellerId}/public-profile`);
                const data = await response.json();

                if (data.success && data.seller) {
                    const s = data.seller;
                    setSeller({
                        name: s.name || "Verified Seller",
                        shopName: s.shopName || "SellSathi Partner",
                        companyName: s.shopName || "Registered Hub",
                        city: s.city || "India",
                        category: s.category || "General",
                        joinedAt: s.joinedAt ? new Date(s.joinedAt) : null
                    });
                    return;
                }
            } catch (apiErr) {
                // Fallback to Firestore if API fails
            }

            // Fallback: Firestore direct - Use one-time read instead of onSnapshot to reduce quota
            try {
                const sellerSnap = await getDoc(doc(db, "sellers", sellerId));
                if (sellerSnap.exists()) {
                    const sData = sellerSnap.data();
                    if (sData.sellerStatus !== 'APPROVED') { 
                        setSeller(null); 
                        return; 
                    }

                    const userSnap = await getDoc(doc(db, "users", sellerId));
                    const uData = userSnap.exists() ? userSnap.data() : {};
                    let city = "India";
                    if (sData.address) {
                        const parts = sData.address.split(',').map(p => p.trim());
                        const vtcPart = parts.find(p => p.startsWith('VTC:'));
                        if (vtcPart) city = vtcPart.replace('VTC:', '').trim();
                        else if (parts.length >= 2) city = parts[1];
                        else city = parts[0];
                    }
                    setSeller({
                        name: uData.fullName || sData.extractedName || "Verified Seller",
                        shopName: sData.shopName || "SellSathi Partner",
                        companyName: sData.shopName || "Registered Hub",
                        city, category: sData.category || "General",
                        joinedAt: sData.approvedAt ?
                            (sData.approvedAt.toDate ? sData.approvedAt.toDate() : new Date(sData.approvedAt._seconds * 1000)) :
                            (sData.appliedAt ? (sData.appliedAt.toDate ? sData.appliedAt.toDate() : new Date(sData.appliedAt._seconds * 1000)) : null)
                    });
                } else { 
                    setSeller(null); 
                }
            } catch (err) {
                console.error("All seller fetch methods failed:", err);
                setSeller(null);
            }
        };

        const fetchProduct = async () => {
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);
                
                if (!docSnap.exists()) {
                    setProduct(null);
                    setLoading(false);
                    return;
                }

                let data = { id: docSnap.id, ...docSnap.data() };

                // Normalize: seller products store `title` not `name`
                if (!data.name && data.title) data.name = data.title;
                
                // Ensure description exists
                if (!data.description) {
                    data.description = `Premium ${data.name || "Product"} with cutting-edge features.`;
                }

                setProduct(data);
                
                // Initialize variant selections
                if (data.colors && data.colors.length > 0) {
                    setSelectedColor(data.colors[0]);
                }
                if (data.sizes && data.sizes.length > 0) {
                    setSelectedSize(data.sizes[1] || data.sizes[0]);
                }
                if (data.storage && data.storage.length > 0) {
                    setSelectedStorage(data.storage[0]);
                }
                if (data.memory && data.memory.length > 0) {
                    setSelectedMemory(data.memory[0]);
                }
                
                updateRecentlyViewed(data);
                setupSellerListener(data.sellerId);
                
                // Load dynamic recommendations
                loadDynamicRecommendations(data);
                
                setLoading(false);
            } catch (err) {
                console.error("Error fetching product:", err);
                setProduct(null);
                setLoading(false);
            }
        };

        const loadDynamicRecommendations = async (productData) => {
            try {
                // Load frequently bought together
                const fbt = await getFrequentlyBoughtTogether(productData.id);
                if (fbt.length > 0) {
                    setFbtProducts(fbt);
                    // Initialize selections with first product selected
                    const selections = { 0: true };
                    fbt.forEach((_, idx) => {
                        if (idx > 0) selections[idx] = false;
                    });
                    setFbtSelections(selections);
                }
                
                // Load similar products
                const similar = await getSimilarProducts(productData);
                setSimilarProducts(similar);
            } catch (err) {
                console.error('Error loading recommendations:', err);
            }
        };

        const setupReviewsListener = () => {
            const loadReviews = async () => {
                try {
                    const { reviews, stats } = await fetchProductReviews(id);
                    setReviews(reviews);
                    setReviewStats(stats);
                } catch (err) {
                    console.error("Failed to load reviews:", err);
                }
            };

            const checkEligibility = async (retryCount = 0) => {
                let currentUid = auth.currentUser?.uid;

                if (!currentUid) {
                    try {
                        const localUser = JSON.parse(localStorage.getItem('user'));
                        currentUid = localUser?.uid;
                    } catch (e) { }
                }

                if (!currentUid) {
                    // If no user yet, retry in 1s (Firebase auth might still be initializing)
                    if (retryCount < 3) {
                        setTimeout(() => checkEligibility(retryCount + 1), 1000);
                    }
                    return;
                }

                try {
                    const res = await authFetch(`/api/user/${currentUid}/reviewable-orders`);
                    if (!res.ok) throw new Error('Failed to fetch eligibility');

                    const data = await res.json();
                    if (data.success && data.orders) {
                        // Match by ID or ProductID, trimmed and case-insensitive
                        const order = data.orders.find(o =>
                            String(o.productId).trim().toLowerCase() === String(id).trim().toLowerCase()
                        );

                        if (order) {
                            setIsEligibleForReview(true);
                            setEligibleOrder(order);
                            return; // Success
                        }
                    }
                    setIsEligibleForReview(false);
                    setEligibleOrder(null);
                } catch (err) {
                    console.error("Eligibility check error:", err);
                    // Silently ignore, but maybe retry once
                    if (retryCount < 1) {
                        setTimeout(() => checkEligibility(retryCount + 1), 2000);
                    }
                }
            };

            loadReviews();
            checkEligibility();

            const handleUserChange = () => checkEligibility();
            window.addEventListener('userDataChanged', handleUserChange);
            window.addEventListener('reviewsUpdate', loadReviews);

            return () => {
                window.removeEventListener('reviewsUpdate', loadReviews);
                window.removeEventListener('userDataChanged', handleUserChange);
            };
        };

        fetchProduct();
        loadRecentlyViewed();
        // Sync wishlist status
        const unsubscribeWishlist = listenToWishlist((items) => {
            const saved = items.some(item => String(item.id).trim().toLowerCase() === String(id).trim().toLowerCase());
            setIsSaved(saved);
        });
        const cleanupReviews = setupReviewsListener();
        window.scrollTo(0, 0);
        return () => {
            if (cleanupReviews) cleanupReviews();
            if (unsubscribeWishlist) unsubscribeWishlist();
        };
    }, [id]);


    const calculateStats = (revs) => {
        const stats = calculateRatingStats(revs);
        setReviewStats({
            average: stats.averageRating,
            total: stats.totalReviews,
            distribution: stats.distribution
        });
    };


    const toggleWishlist = async () => {
        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }
        if (!product) return;
        try {
            if (isSaved) {
                const res = await removeFromWishlist(id);
                if (res.success) {
                    setIsSaved(false);
                } else {
                    alert('Wishlist error: ' + (res.message || 'Failed to remove'));
                }
            } else {
                const res = await addToWishlist(product);
                if (res.success) {
                    setIsSaved(true);
                } else {
                    alert('Wishlist error: ' + (res.message || 'Failed to add'));
                }
            }
        } catch (err) {
            alert('Wishlist connection error. Please ensure the backend is running.');
        }
    };

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!newReview.title || !newReview.body) return;
        if (!isEligibleForReview) {
            alert('❌ You can only review products that have been delivered to you.');
            return;
        }

        try {
            const response = await authFetch('/api/reviews', {
                method: 'POST',
                body: JSON.stringify({
                    productId: id,
                    orderId: eligibleOrder?.orderId,
                    rating: newReview.rating,
                    title: newReview.title,
                    body: newReview.body,
                    images: newReview.images
                })
            });

            const data = await response.json();

            if (data.success) {
                setNewReview({ rating: 5, title: '', body: '', images: [] });
                setIsEligibleForReview(false); // Can't review twice for same order
                setEligibleOrder(null);

                // Clear cache for this product to force refresh
                clearProductReviewCache(id);

                // Dispatch event to update UI across components
                window.dispatchEvent(new CustomEvent('reviewsUpdate', {
                    detail: { productId: id, review: data.review }
                }));

                alert('✅ Review submitted successfully! It will be visible after a short processing time.');
            } else {
                alert('❌ Failed to submit review: ' + data.message);
            }
        } catch (err) {
            alert('❌ Connection error. Failed to submit review.');
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (newReview.images.length >= 4) {
            alert('Maximum 4 images allowed');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await authFetch('/seller/upload-image', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                setNewReview(prev => ({ ...prev, images: [...prev.images, data.url] }));
            }
        } catch (err) {
            console.error('Error submitting review:', err);
        } finally {
            setUploading(false);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: product.name,
                    text: product.description,
                    url: window.location.href,
                });
            } catch (err) {
                setIsShareModalOpen(true);
            }
        } else {
            setIsShareModalOpen(true);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopyStatus('Copied!');
        setTimeout(() => setCopyStatus('Copy Link'), 2000);
    };

    const updateRecentlyViewed = (p) => {
        if (!p) return;
        const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        const filtered = viewed.filter(item => item.id !== p.id);
        const updated = [p, ...filtered].slice(0, 8);
        localStorage.setItem('recentlyViewed', JSON.stringify(updated));
        setRecentlyViewed(updated);
    };

    const loadRecentlyViewed = () => {
        const viewed = JSON.parse(localStorage.getItem('recentlyViewed') || '[]');
        setRecentlyViewed(viewed);
    };

    const handleAddToCart = async () => {
        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }
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
        const productWithNumPrice = { ...product, price: Number(product.price) };
        const res = await addToCart(productWithNumPrice, selections);
        if (res.success) {
            alert('✅ Product added to cart successfully!');
            window.dispatchEvent(new Event('cartUpdate'));
        } else {
            alert('❌ Failed to add product to cart: ' + (res.message || 'Please try again.'));
        }
    };

    const handleBuyNow = async () => {
        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }
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
        const productWithNumPrice = { ...product, price: Number(product.price) };
        const res = await addToCart(productWithNumPrice, selections);
        if (res.success) {
            navigate('/checkout');
        } else {
            alert('❌ Failed to process. Please try again.');
        }
    };

    const toggleFbt = (index) => {
        setFbtSelections(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const fbtTotalPrice = fbtProducts.reduce((sum, p, i) => fbtSelections[i] ? sum + p.price : sum, 0);
    const fbtTotalCount = Object.values(fbtSelections).filter(Boolean).length;

    if (loading) return <div className="loading-fullscreen"><div className="spinner"></div></div>;
    if (!product) return <div className="error-fullscreen"><h2>Oops! Product not found.</h2><button onClick={() => navigate('/')}>Go Home</button></div>;

    return (
        <div className="pd-wrapper bg-white">
            <div className="container">
                {/* Breadcrumb */}
                <div className="pd-breadcrumb">
                    <button onClick={() => navigate('/')}>Home</button> /
                    <button onClick={() => navigate(`/products?category=${product.category}`)}>{product.category || 'Electronics'}</button>
                    {product.subCategory && (
                        <> / <button onClick={() => navigate(`/products?category=${product.category}&sub=${product.subCategory}`)}>{product.subCategory}</button></>
                    )} /
                    <span className="current">{product.name}</span>
                </div>

                <div className="pd-main-grid">
                    {/* Left: Interactive Media */}
                    <div className="pd-media">
                        <div className="media-container">
                            <div 
                                className="media-stage glass-card"
                                onMouseMove={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                                    setZoomPosition({ x, y });
                                    setShowZoomPreview(true);
                                }}
                                onMouseLeave={() => setShowZoomPreview(false)}
                                onClick={() => setIsZoomed(true)}
                            >
                                <AnimatePresence mode="wait">
                                    <motion.img
                                        key={activeImageIndex}
                                        src={images[activeImageIndex]}
                                        alt={product.name}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="product-main-image"
                                    />
                                </AnimatePresence>
                                <div className="media-controls-bottom">
                                    <button className="ctrl-btn-bottom" onClick={(e) => { e.stopPropagation(); prevImage(); }}><ChevronLeft size={20} /></button>
                                    <button className="ctrl-btn-bottom" onClick={(e) => { e.stopPropagation(); nextImage(); }}><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            {/* Zoom Preview - Shows to the right on hover */}
                            <AnimatePresence>
                                {showZoomPreview && (
                                    <motion.div
                                        className="zoom-preview-panel"
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <div 
                                            className="zoom-preview-image"
                                            style={{
                                                backgroundImage: `url(${images[activeImageIndex]})`,
                                                backgroundPosition: `${zoomPosition.x}% ${zoomPosition.y}%`,
                                                backgroundSize: '250%'
                                            }}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Zoom Modal - Click to open full image */}
                        <AnimatePresence>
                            {isZoomed && (
                                <motion.div
                                    className="zoom-overlay"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsZoomed(false)}
                                >
                                    <motion.div
                                        className="zoom-modal-content"
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.9, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <img src={images[activeImageIndex]} alt="Full size" />
                                        <button className="close-zoom-btn" onClick={() => setIsZoomed(false)}>
                                            <X size={24} />
                                        </button>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        
                        <div className="thumbnail-track">
                            {images.map((img, i) => (
                                <div
                                    key={i}
                                    className={`thumb-item ${i === activeImageIndex ? 'active' : ''}`}
                                    onClick={() => setActiveImageIndex(i)}
                                >
                                    <img src={img} alt="" />
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right: Info & Config */}
                    <div className="pd-info">
                        <div className="info-header">
                            <h1 className="main-title">{product.name || product.title}</h1>
                            <div className="rating-row">
                                <Rating
                                    averageRating={reviewStats.average || 0}
                                    totalReviews={reviewStats.total || 0}
                                    size={16}
                                    showCount={true}
                                    className="product-detail-rating"
                                />
                                <div className="actions-meta">
                                    <button onClick={toggleWishlist} className={isSaved ? 'active' : ''}>
                                        <Heart size={18} fill={isSaved ? "#E11D48" : "none"} color={isSaved ? "#E11D48" : "currentColor"} />
                                        {isSaved ? 'Saved' : 'Save'}
                                    </button>
                                    <button onClick={handleShare}><Share2 size={18} /> Share</button>
                                </div>
                            </div>
                        </div>
                        <div className="price-box glass-card">
                            <PriceDisplay
                                product={product}
                                selections={{
                                    size: selectedSize,
                                    storage: selectedStorage,
                                    memory: selectedMemory,
                                    purchaseOption: purchaseOption
                                }}
                                size="lg"
                            />
                            <div className={`stock-status ${(product.stock === 0 || product.status === 'Out of Stock') ? 'out' : 'in'}`}>
                                {(product.stock === 0 || product.status === 'Out of Stock') ? 'Out of Stock' : `In Stock${product.stock ? ` (${product.stock} units)` : ''}`}
                            </div>
                        </div>

                        <div className="pd-section">
                            <h3>Delivery Options</h3>
                            <div className="pincode-check">
                                <input type="text" placeholder="Enter delivery pincode" />
                                <button>Check</button>
                            </div>
                        </div>

                        {/* Dynamic Variant Sections - Colors */}
                        {product.colors && product.colors.length > 0 && (
                            <div className="pd-section">
                                <h3>{t('product.color')}: <span className="selected-val">{typeof selectedColor === 'object' ? selectedColor.name : selectedColor}</span></h3>
                                <div className="pill-group">
                                    {product.colors.map((c, idx) => {
                                        const colorName = typeof c === 'object' ? c.name : c;
                                        const colorKey = typeof c === 'object' ? c.name : c;
                                        return (
                                            <button
                                                key={idx}
                                                type="button"
                                                className={`pill ${selectedColor === c ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedColor(c);
                                                    // Update image if variant image exists
                                                    if (product.variantImages && product.variantImages[colorKey]) {
                                                        const variantImageUrl = product.variantImages[colorKey];
                                                        const variantImageIndex = images.indexOf(variantImageUrl);
                                                        if (variantImageIndex !== -1) {
                                                            setActiveImageIndex(variantImageIndex);
                                                        }
                                                    }
                                                }}
                                            >
                                                {colorName}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {product.sizes && product.sizes.length > 0 && (
                            <div className="pd-section">
                                <div className="section-header-row">
                                    <h3>Select Size: <span className="selected-val">{selectedSize}</span></h3>
                                    <button className="size-guide-btn" onClick={() => setIsSizeChartOpen(true)} type="button">Size Guide</button>
                                </div>
                                <div className="size-grid">
                                    {product.sizes.map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            className={`size-pill ${selectedSize === size ? 'active' : ''}`}
                                            onClick={() => setSelectedSize(size)}
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {product.storage && product.storage.length > 0 && (
                            <div className="pd-section">
                                <h3>{t('product.storage')}: <span className="selected-val">{selectedStorage?.label || selectedStorage}</span></h3>
                                <div className="pill-group">
                                    {product.storage.map((s, idx) => {
                                        const isActive = selectedStorage && (
                                            (typeof s === 'object' && typeof selectedStorage === 'object' && s.label === selectedStorage.label) ||
                                            s === selectedStorage
                                        );
                                        return (
                                            <button
                                                key={s.label || s || idx}
                                                type="button"
                                                className={`pill variant-pill ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedStorage(s);
                                                    // Update image if variant image exists
                                                    if (product.variantImages && product.variantImages[s.label || s]) {
                                                        const variantImageIndex = images.indexOf(product.variantImages[s.label || s]);
                                                        if (variantImageIndex !== -1) {
                                                            setActiveImageIndex(variantImageIndex);
                                                        }
                                                    }
                                                }}
                                            >
                                                <span className="v-label">{s.label || s}</span>
                                                <span className="v-price">{s.priceOffset ? (s.priceOffset > 0 ? `+₹${s.priceOffset.toLocaleString()}` : `-₹${Math.abs(s.priceOffset).toLocaleString()}`) : 'Included'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {product.memory && product.memory.length > 0 && (
                            <div className="pd-section">
                                <h3>{t('product.memory')}: <span className="selected-val">{selectedMemory?.label || selectedMemory}</span></h3>
                                <div className="pill-group">
                                    {product.memory.map((m, idx) => {
                                        const isActive = selectedMemory && (
                                            (typeof m === 'object' && typeof selectedMemory === 'object' && m.label === selectedMemory.label) ||
                                            m === selectedMemory
                                        );
                                        return (
                                            <button
                                                key={m.label || m || idx}
                                                type="button"
                                                className={`pill variant-pill ${isActive ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedMemory(m);
                                                    // Update image if variant image exists
                                                    if (product.variantImages && product.variantImages[m.label || m]) {
                                                        const variantImageIndex = images.indexOf(product.variantImages[m.label || m]);
                                                        if (variantImageIndex !== -1) {
                                                            setActiveImageIndex(variantImageIndex);
                                                        }
                                                    }
                                                }}
                                            >
                                                <span className="v-label">{m.label || m}</span>
                                                <span className="v-price">{m.priceOffset ? (m.priceOffset > 0 ? `+₹${m.priceOffset.toLocaleString()}` : `-₹${Math.abs(m.priceOffset).toLocaleString()}`) : 'Included'}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}


                        <div className="pd-section">
                            <div className="trust-card glass-card">
                                <div className="badge"><Truck size={20} /> <div><strong>Free Express Shipping</strong><span>On orders above ₹500</span></div></div>
                                <div className="badge"><Shield size={20} /> <div><strong>Secure Multi-layer Packaging</strong><span>Damage-free delivery guaranteed</span></div></div>
                                <div className="badge"><RotateCcw size={20} /> <div><strong>7 Days Replacement</strong><span>Easy returns & exchanges</span></div></div>
                            </div>
                        </div>

                        <div className="pd-actions">
                            <button
                                className="btn-add-cart"
                                onClick={handleAddToCart}
                                disabled={product.stock === 0 || product.status === 'Out of Stock'}
                                style={product.stock === 0 || product.status === 'Out of Stock' ? { background: '#94a3b8', cursor: 'not-allowed' } : {}}
                            >
                                <ShoppingCart size={20} />
                                Add to Cart
                            </button>
                            <button
                                className="btn-buy-now"
                                onClick={handleBuyNow}
                                disabled={product.stock === 0 || product.status === 'Out of Stock'}
                                style={product.stock === 0 || product.status === 'Out of Stock' ? { background: '#cbd5e1', cursor: 'not-allowed', color: '#64748b' } : {}}
                            >
                                Buy Now
                            </button>
                        </div>
                    </div>
                </div>

                {/* Details Section */}
                <div className="pd-details-scroller">
                    <section className="pd-desc-block">
                        <div className="block-header">
                            <h2>Description</h2>
                        </div>
                        <div className="desc-content-modern">
                            <ExpandableText text={product.description} maxLength={150} />
                        </div>
                    </section>

                    <section className="pd-reviews-block">
                        <div className="block-header">
                            <h2>Customer Reviews</h2>
                            <div className="header-stats">
                                <Rating
                                    averageRating={reviewStats.average || 0}
                                    totalReviews={reviewStats.total || 0}
                                    size={16}
                                    showCount={true}
                                    className="reviews-header-rating"
                                />
                            </div>
                        </div>

                        {/* Review Input Box */}
                        <div className="review-write-box glass-card">
                            <div className="write-rev-header">
                                <h3>Write a Review</h3>
                                {!isEligibleForReview && (
                                    <div className="review-eligibility-badge">
                                        <AlertOctagon size={14} />
                                        <span>Available only after delivery</span>
                                    </div>
                                )}
                            </div>

                            {isEligibleForReview ? (
                                <form onSubmit={handleReviewSubmit} className="rev-inline-form">
                                    <div className="star-rating-input">
                                        {[1, 2, 3, 4, 5].map(num => (
                                            <button
                                                key={num}
                                                type="button"
                                                className={newReview.rating >= num ? 'active' : ''}
                                                onClick={() => setNewReview(prev => ({ ...prev, rating: num }))}
                                            >
                                                <Star size={24} fill={newReview.rating >= num ? "#FFB800" : "none"} color="#FFB800" />
                                            </button>
                                        ))}
                                    </div>
                                    <div className="input-group">
                                        <input
                                            type="text"
                                            placeholder="Headline for your review"
                                            value={newReview.title}
                                            onChange={e => setNewReview(prev => ({ ...prev, title: e.target.value }))}
                                            required
                                        />
                                        <textarea
                                            placeholder="What did you like or dislike? How was the quality?"
                                            value={newReview.body}
                                            onChange={e => setNewReview(prev => ({ ...prev, body: e.target.value }))}
                                            rows="3"
                                            required
                                        />
                                    </div>

                                    <div className="rev-upload-section">
                                        <div className="upload-meta">
                                            <label className="image-upload-trigger">
                                                <Upload size={18} />
                                                <span>Add Photos</span>
                                                <input type="file" accept="image/*" onChange={handleImageUpload} hidden disabled={uploading} />
                                            </label>
                                            <span className="upload-hint">Max 4 photos</span>
                                        </div>
                                        <div className="rev-preview-grid">
                                            {newReview.images.map((img, idx) => (
                                                <div key={idx} className="preview-item">
                                                    <img src={img} alt="" />
                                                    <button type="button" onClick={() => setNewReview(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}><X size={12} /></button>
                                                </div>
                                            ))}
                                            {uploading && <div className="rev-loader"></div>}
                                        </div>
                                    </div>

                                    <button type="submit" className="rev-submit-btn">Post Review</button>
                                </form>
                            ) : (
                                <div className="not-eligible-msg">
                                    <ShieldCheck size={40} className="text-muted mb-3" />
                                    <h4>Have you bought this item?</h4>
                                    <p>You can only write a review for this product after it has been delivered to you. This helps us maintain authentic, high-quality feedback from our community.</p>
                                    <button className="btn-secondary mt-3" onClick={() => navigate('/consumer/dashboard')}>View My Orders</button>
                                </div>
                            )}
                        </div>

                        <div className="rev-list-modern">
                            {reviews.length > 0 ? (
                                <>
                                    {reviews.slice(0, reviewsLimit).map((rev, i) => (
                                        <div key={rev.id || i} className="rev-card-vertical">
                                            <div className="rev-top">
                                                <div className="rev-user-id">
                                                    <div className="u-circ">{rev.author?.charAt(0)}</div>
                                                    <div className="u-meta">
                                                        <div className="flex items-center gap-2">
                                                            <span className="un">{rev.author}</span>
                                                            {rev.verified && (
                                                                <span className="verified-badge" title="Verified Purchase">
                                                                    <Check size={12} /> Verified
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="ud">
                                                            {rev.createdAt ? (
                                                                rev.createdAt._seconds
                                                                    ? new Date(rev.createdAt._seconds * 1000).toLocaleDateString()
                                                                    : (rev.createdAt.toDate ? rev.createdAt.toDate().toLocaleDateString() : new Date(rev.createdAt).toLocaleDateString())
                                                            ) : 'Verified Purchase'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="rs">
                                                    {[...Array(5)].map((_, j) => <Star key={j} size={14} fill={j < rev.rating ? "#FFB800" : "none"} color="#FFB800" />)}
                                                </div>
                                            </div>
                                            <h4 className="rt">{rev.title}</h4>
                                            <ExpandableText text={rev.body} />
                                            {rev.images && rev.images.length > 0 && (
                                                <div className="ri">
                                                    {rev.images.map((img, idx) => <img key={idx} src={img} alt="Review" onClick={() => window.open(img)} />)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <div className="reviews-expand-actions">
                                        {reviews.length > reviewsLimit && (
                                            <button className="show-more-reviews-blue-btn" onClick={() => setReviewsLimit(prev => prev + 5)}>
                                                Show More Reviews
                                            </button>
                                        )}
                                        {reviewsLimit > 2 && (
                                            <button className="show-more-reviews-blue-btn show-less" onClick={() => setReviewsLimit(2)}>
                                                Show Less Reviews
                                            </button>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="no-rev-yet">
                                    <p>No reviews yet. Share your experience with others!</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>

                {/* About the Seller */}
                {seller && (
                    <div className="about-seller-section">
                        <div className="block-header">
                            <h2>About the Seller</h2>
                        </div>
                        <div className="seller-card glass-card">
                            <div className="seller-main-info">
                                <div className="seller-avatar">
                                    {seller.shopName?.charAt(0) || 'S'}
                                </div>
                                <div className="seller-text">
                                    <h3 className="shop-name">{seller.shopName}</h3>
                                    <div className="seller-badges">
                                        <span className="badge-item verified">
                                            <Shield size={14} fill="#22c55e" color="#22c55e" />
                                            Verified Seller
                                        </span>
                                        <span className="badge-item category">{seller.category}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="seller-details-grid">
                                <div className="detail-item">
                                    <span className="label">Seller Name</span>
                                    <span className="value">{seller.name}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Company</span>
                                    <span className="value">{seller.companyName}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Location</span>
                                    <span className="value">{seller.city}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="label">Member Since</span>
                                    <span className="value">
                                        {seller.joinedAt ? new Date(seller.joinedAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }) : '2023'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Frequently Bought Together */}
                {fbtProducts.length > 0 ? (
                    <div className="fbt-section">
                        <h2>Frequently Bought Together</h2>
                        <div className="fbt-container glass-card">
                            <div className="fbt-visual">
                                {fbtProducts.map((p, i) => (
                                    <div key={i} className="fbt-item-wrapper">
                                        <div className={`fbt-img-card ${fbtSelections[i] ? 'selected' : ''}`}>
                                            <img src={p.image} alt={p.name} />
                                            <input type="checkbox" checked={fbtSelections[i]} onChange={() => toggleFbt(i)} />
                                        </div>
                                        {i < fbtProducts.length - 1 && <span className="plus">+</span>}
                                    </div>
                                ))}
                            </div>
                            <div className="fbt-details">
                                {fbtProducts.map((p, i) => (
                                    <div key={i} className={`fbt-row ${fbtSelections[i] ? '' : 'disabled'}`}>
                                        <div className="fbt-info">
                                            <span className="p-name">{p.name}</span>
                                            <div className="rating">
                                                <span className="no-rating">No reviews</span>
                                            </div>
                                        </div>
                                        <span className="p-price">₹{(p.price || 0).toLocaleString()}</span>
                                    </div>
                                ))}
                                <div className="fbt-total-row">
                                    <div className="total-meta">
                                        <span>Total price for {fbtTotalCount} items</span>
                                        <span className="total-price">₹{fbtTotalPrice.toLocaleString()}</span>
                                    </div>
                                    <button className="fbt-add-btn">Add {fbtTotalCount} to Cart</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="fbt-section">
                        <h2>Frequently Bought Together</h2>
                        <div className="empty-recommendations glass-card">
                            <div className="empty-icon">📦</div>
                            <h3>No Bundle Recommendations Yet</h3>
                            <p>Products frequently bought together will appear here once we have more order data from customers.</p>
                        </div>
                    </div>
                )}

                {/* Similar Products */}
                {similarProducts.length > 0 ? (
                    <div className="similar-section">
                        <h2>Similar Products</h2>
                        <p>You might also like these products</p>
                        <div className="similar-grid">
                            {similarProducts.map(p => (
                                <div key={p.id} className="similar-card glass-card" onClick={() => navigate('/product/' + p.id)}>
                                    <img src={p.image} alt={p.name} />
                                    <h3>{p.name}</h3>
                                    <div className="rating">
                                        <span className="no-rating">No reviews</span>
                                    </div>
                                    <span className="price">₹{(p.price || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="similar-section">
                        <h2>Similar Products</h2>
                        <div className="empty-recommendations glass-card">
                            <div className="empty-icon">🔍</div>
                            <h3>No Similar Products Found</h3>
                            <p>Similar products in this category will appear here as more items are added to our catalog.</p>
                        </div>
                    </div>
                )}

                {/* Recently Viewed */}
                {recentlyViewed.length > 1 && (
                    <div className="recently-viewed-section">
                        <h2>Recently Viewed</h2>
                        <p>Products you've viewed</p>
                        <div className="similar-grid">
                            {recentlyViewed.filter(p => p.id !== id).slice(0, 4).map(p => (
                                <div key={p.id} className="similar-card glass-card" onClick={() => navigate('/product/' + p.id)}>
                                    <img src={p.imageUrl || p.image} alt={p.name} />
                                    <h3>{p.name}</h3>
                                    <div className="rating">
                                        <span className="no-rating">No reviews</span>
                                    </div>
                                    <span className="price">₹{(p.price || 0).toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <style>{pdStyles}</style>

            {/* Share Modal */}
            <AnimatePresence>
                {isShareModalOpen && (
                    <div className="share-modal-overlay" onClick={() => setIsShareModalOpen(false)}>
                        <motion.div
                            className="share-modal glass-card"
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="share-header">
                                <h3>Share</h3>
                                <button className="close-btn" onClick={() => setIsShareModalOpen(false)}><ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
                            </div>

                            <div className="share-link-section">
                                <div className="link-box">
                                    <div className="link-info">
                                        <span className="domain">Sellsathi.com</span>
                                        <span className="full-url">{window.location.href}</span>
                                    </div>
                                    <button className="copy-btn" onClick={copyToClipboard}>
                                        <Share2 size={18} />
                                        <span>{copyStatus}</span>
                                    </button>
                                </div>
                            </div>

                            <div className="share-grid">
                                <div className="share-option">
                                    <div className="icon-box whatsapp"><MessageCircle size={20} /></div>
                                    <span>WhatsApp</span>
                                </div>
                                <div className="share-option">
                                    <div className="icon-box facebook"><Facebook size={20} /></div>
                                    <span>Facebook</span>
                                </div>
                                <div className="share-option">
                                    <div className="icon-box twitter"><Twitter size={20} /></div>
                                    <span>X (Twitter)</span>
                                </div>
                                <div className="share-option">
                                    <div className="icon-box email"><Mail size={20} /></div>
                                    <span>Email</span>
                                </div>
                            </div>

                            <div className="share-footer">
                                <button className="nearby-btn">
                                    <div className="icon-box"><Rss size={20} /></div>
                                    <span>Nearby Share</span>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Size Chart Modal */}
            <SizeChartModal
                isOpen={isSizeChartOpen}
                onClose={() => setIsSizeChartOpen(false)}
                category={product?.category}
            />
        </div >
    );
}

const pdStyles = `
.pd-details-scroller { display: flex; flex-direction: column; gap: 1.5rem; margin-top: 1.5rem; border-top: 1px solid var(--border); padding-top: 1.5rem; }
.block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.block-header h2 { font-size: 1.3rem; font-weight: 700; }
.header-stats { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.85rem; }

.desc-content-modern { position: relative; }
.clamped-desc { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.show-more-blue-btn { color: #2563eb; font-weight: 600; font-size: 0.9rem; margin-top: 0.5rem; transition: 0.2s; background: none; border: none; cursor: pointer; padding: 0; }
.show-more-blue-btn:hover { text-decoration: underline; color: #1d4ed8; }

.review-write-box { padding: 1.5rem; border-radius: 16px; margin-bottom: 2rem; background: #fafafa; border: 1px solid #eee; }
.rev-inline-form { display: flex; flex-direction: column; gap: 1rem; }
.star-rating-input { display: flex; gap: 0.4rem; }
.star-rating-input button { opacity: 0.3; transition: 0.2s; background: none; border: none; cursor: pointer; padding: 0; }
.star-rating-input button.active { opacity: 1; transform: scale(1.05); }
.input-group { display: flex; flex-direction: column; gap: 0.75rem; width: 100%; }
.rev-inline-form input, .rev-inline-form textarea { width: 100%; padding: 0.75rem; border-radius: 8px; border: 1px solid #ddd; background: white; font-size: 0.9rem; box-sizing: border-box; }
.rev-inline-form textarea { resize: vertical; min-height: 80px; font-family: inherit; }
.rev-upload-section { display: flex; flex-direction: column; gap: 0.75rem; }
.upload-meta { display: flex; align-items: center; justify-content: space-between; }
.image-upload-trigger { display: flex; align-items: center; gap: 0.4rem; color: #2563eb; font-weight: 600; cursor: pointer; width: fit-content; padding: 0.4rem 0.8rem; background: #eff6ff; border-radius: 6px; font-size: 0.85rem; transition: 0.2s; }
.image-upload-trigger:hover { background: #dbeafe; }
.upload-hint { font-size: 0.8rem; color: #666; }
.rev-preview-grid { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.preview-item { position: relative; width: 60px; height: 60px; border-radius: 6px; overflow: hidden; border: 1px solid #ddd; }
.preview-item img { width: 100%; height: 100%; object-fit: cover; }
.preview-item button { position: absolute; top: 2px; right: 2px; width: 18px; height: 18px; border-radius: 50%; background: rgba(0,0,0,0.7); color: white; display: flex; align-items: center; justify-content: center; border: none; cursor: pointer; padding: 0; }
.rev-submit-btn { width: 100%; padding: 0.9rem; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: white; border-radius: 8px; font-weight: 700; font-size: 1rem; border: none; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(37, 99, 235, 0.15); }
.rev-submit-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 16px rgba(37, 99, 235, 0.25); }
.rev-submit-btn:active { transform: translateY(0); }
.rev-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.write-rev-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.write-rev-header h3 { font-size: 1.2rem; font-weight: 700; margin: 0; }
.review-eligibility-badge { display: flex; align-items: center; gap: 0.4rem; padding: 0.4rem 0.8rem; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }

.rev-list-modern { display: flex; flex-direction: column; gap: 1.25rem; }
.rev-card-vertical { padding: 1.5rem; background: white; border: 1px solid #f1f5f9; border-radius: 12px; }
.rev-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.75rem; }
.rev-user-id { display: flex; align-items: center; gap: 0.75rem; }
.u-circ { width: 36px; height: 36px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1rem; }
.u-meta { display: flex; flex-direction: column; }
.un { font-weight: 700; font-size: 0.95rem; }
.ud { font-size: 0.75rem; color: #64748b; font-weight: 600; }
.rt { font-size: 1rem; font-weight: 700; margin-bottom: 0.4rem; }
.rb { color: #4b5563; line-height: 1.5; font-size: 0.9rem; position: relative; }
.show-more-btn-text { color: #3b82f6; font-weight: 600; font-size: 0.85rem; background: none; border: none; padding: 0; cursor: pointer; margin-left: 5px; transition: 0.2s; }
.show-more-btn-text:hover { color: #2563eb; text-decoration: underline; }
.ri { display: flex; gap: 0.75rem; margin-top: 1rem; }
.ri img { width: 90px; height: 90px; border-radius: 8px; object-fit: cover; cursor: pointer; border: 1px solid #eee; }
.reviews-expand-actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
.show-more-reviews-blue-btn { flex: 1; padding: 1rem; background: #eff6ff; color: #2563eb; border: 2px dashed #bfdbfe; border-radius: 12px; font-weight: 700; transition: 0.2s; cursor: pointer; font-size: 0.9rem; }
.show-more-reviews-blue-btn:hover { background: #dbeafe; }
.show-more-reviews-blue-btn.show-less { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
.show-more-reviews-blue-btn.show-less:hover { background: #fee2e2; }

.pd-wrapper { padding-bottom: 3rem; }
.pd-breadcrumb { padding: 0.75rem 0; font-size: 0.8rem; color: var(--text-muted); display: flex; gap: 0.5rem; }
.pd-breadcrumb button { color: var(--text-muted); transition: 0.2s; background: none; border: none; cursor: pointer; padding: 0; font-size: inherit; }
.pd-breadcrumb button:hover { color: var(--primary); }
.pd-breadcrumb .current { color: var(--text); font-weight: 700; }

.pd-main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-top: 0.5rem; }

.pd-media { position: sticky; top: 70px; height: fit-content; }
.media-container { 
    display: flex; 
    gap: 1rem; 
    position: relative;
}
.media-stage { 
    flex: 1;
    height: 350px; background: white; border-radius: 8px; 
    display: flex; align-items: center; justify-content: center;
    padding: 1rem; position: relative; overflow: hidden;
    border: 1px solid var(--border);
    cursor: pointer;
}

.product-main-image {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-width: 100%;
    max-height: 100%;
}

.thumbnail-track { display: flex; gap: 0.75rem; margin-top: 1rem; overflow-x: auto; padding-bottom: 0.5rem; }
.thumb-item { 
    width: 70px; height: 70px; border-radius: 6px; border: 2px solid transparent; 
    padding: 4px; flex-shrink: 0; cursor: pointer; transition: 0.2s; overflow: hidden;
    background: white;
}
.thumb-item.active { border-color: #f59e0b; }
.thumb-item img { width: 100%; height: 100%; object-fit: contain; }

.pd-info { display: flex; flex-direction: column; gap: 1rem; }
.main-title { font-size: 1.4rem; font-weight: 700; line-height: 1.3; margin-bottom: 0.25rem; color: #1a1a1a; }
.rating-row { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
.actions-meta { display: flex; gap: 0.75rem; margin-left: auto; }
.actions-meta button { display: flex; align-items: center; gap: 0.3rem; font-weight: 500; color: #666; font-size: 0.85rem; }

.price-box { padding: 1rem 1.25rem; border-radius: 12px; background: #f8f8fa; border: none; }
.price-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem; }
.final-price { font-size: 1.8rem; font-weight: 800; }
.original-price { font-size: 1.1rem; color: #888; text-decoration: line-through; }
.discount-tag { background: #f97316; color: white; padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 700; font-size: 0.75rem; }
.emi-info { color: #666; font-size: 0.85rem; }
.stock-status { font-size: 0.85rem; font-weight: 700; margin-top: 0.25rem; }
.stock-status.in { color: #10b981; }
.stock-status.out { color: #ef4444; }

.pd-section { margin-bottom: 1rem; }
.pd-section h3 { font-size: 0.95rem; font-weight: 700; margin-bottom: 0.75rem; color: #1a1a1a; display: flex; align-items: center; gap: 0.5rem; }
.pd-section h3 .selected-val { color: #64748b; font-weight: 500; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.size-guide-btn { color: var(--primary); font-weight: 600; font-size: 0.85rem; text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; transition: 0.2s; }

.size-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(60px, 1fr)); gap: 0.75rem; }
.size-pill { 
    height: 42px; border: 1px solid #e2e8f0; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 600; color: #475569; background: white; transition: 0.2s;
    cursor: pointer; font-size: 0.9rem;
}
.size-pill:hover { border-color: #4f46e5; color: #4f46e5; }
.size-pill.active { background: #EEF2FF; color: #4f46e5; border-color: #4f46e5; box-shadow: 0 0 0 1px #4f46e5; }

.pincode-check { display: flex; gap: 0.5rem; max-width: 100%; }
.pincode-check input { 
    flex: 1; padding: 0.6rem 1rem; border-radius: 8px; 
    border: 1px solid var(--border); background: #f1f5f9; font-size: 0.9rem;
}
.pincode-check button { background: var(--primary); color: white; padding: 0 1.5rem; border-radius: 8px; font-weight: 600; font-size: 0.9rem; }

.pill-group { display: flex; flex-wrap: wrap; gap: 0.6rem; }
.pill {
    padding: 0.6rem 1.2rem; border-radius: 8px; border: 1px solid #e2e8f0;
    background: white; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: 0.2s;
}
.pill:hover { border-color: #4f46e5; color: #4f46e5; }
.pill.active { background: #EEF2FF; color: #4f46e5; border-color: #4f46e5; box-shadow: 0 0 0 1px #4f46e5; }

.variant-pill { 
    display: flex; flex-direction: column; align-items: flex-start; min-width: 100px;
    padding: 0.6rem 1rem !important; border-radius: 8px !important;
}
.variant-pill .v-label { font-size: 0.9rem; font-weight: 600; margin-bottom: 2px; }
.variant-pill .v-price { font-size: 0.75rem; font-weight: 500; opacity: 0.6; }

.trust-card { display: flex; flex-direction: column; gap: 1rem; background: #f8f8f9; padding: 1rem; border-radius: 12px; }
.badge { display: flex; align-items: flex-start; gap: 0.75rem; }
.badge svg { color: var(--primary); margin-top: 2px; flex-shrink: 0; }
.badge div { display: flex; flex-direction: column; }
.badge strong { font-size: 0.9rem; }
.badge span { font-size: 0.8rem; color: #666; }

.pd-actions { 
    display: grid !important; 
    grid-template-columns: 1fr 1fr !important; 
    gap: 0.75rem !important; 
    margin-top: 0.75rem !important;
    width: 100% !important;
    min-height: 50px !important;
}
.btn-add-cart { 
    padding: 0.9rem !important; 
    background: #2563EB !important; 
    color: white !important; 
    border-radius: 8px !important; 
    font-weight: 700 !important; 
    font-size: 1rem !important; 
    border: none !important; 
    cursor: pointer !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 0.5rem !important;
    transition: all 0.2s !important;
    min-height: 48px !important;
    width: 100% !important;
}
.btn-add-cart:hover { background: #1D4ED8 !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); }
.btn-buy-now { 
    padding: 0.9rem !important; 
    background: #f97316 !important; 
    color: white !important; 
    border-radius: 8px !important; 
    font-weight: 700 !important; 
    font-size: 1rem !important; 
    border: none !important; 
    cursor: pointer !important;
    transition: all 0.2s !important;
    min-height: 48px !important;
    width: 100% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
}
.btn-buy-now:hover { background: #ea580c !important; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3); }

.pincode-check input { 
    flex: 1; padding: 0.8rem 1.2rem; border-radius: 12px; 
    border: 1px solid var(--border); background: #f1f5f9;
}
.pincode-check button { background: var(--primary); color: white; padding: 0 2rem; border-radius: 12px; font-weight: 700; }

.options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.opt-card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 1.25rem; cursor: pointer; transition: 0.3s; display: flex; flex-direction: column; }
.opt-card.active { border-color: #4f46e5; background: #f5f3ff; }
.opt-card .p { font-size: 1.25rem; font-weight: 800; color: #1e293b; }
.opt-card .l { font-size: 0.85rem; color: #64748b; margin-top: 0.25rem; }
.opt-card.active .p { color: #4f46e5; }

.pill-group { display: flex; flex-wrap: wrap; gap: 0.75rem; }
.pill {
    padding: 0.8rem 1.5rem; border-radius: 12px; border: 1px solid #e2e8f0;
    background: white; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: 0.2s;
}
.pill:hover { border-color: #4f46e5; color: #4f46e5; }
.pill.active { background: #EEF2FF; color: #4f46e5; border-color: #4f46e5; box-shadow: 0 0 0 1px #4f46e5; }

.variant-pill { 
    display: flex; flex-direction: column; align-items: flex-start; min-width: 120px;
    padding: 0.8rem 1.2rem !important; border-radius: 12px !important;
}
.variant-pill .v-label { font-size: 0.95rem; font-weight: 700; margin-bottom: 2px; }
.variant-pill .v-price { font-size: 0.8rem; font-weight: 500; opacity: 0.6; }

.trust-card { display: flex; flex-direction: column; gap: 1.5rem; background: #f8f8f9; padding: 1.5rem; }
.badge { display: flex; align-items: flex-start; gap: 1rem; }
.badge svg { color: var(--primary); margin-top: 3px; }
.badge div { display: flex; flex-direction: column; }
.badge strong { font-size: 1rem; }
.badge span { font-size: 0.85rem; color: #666; }

.pd-tabs-container { margin-top: 4rem; border-top: 1px solid var(--border); padding-top: 2rem; }
.tabs-header { display: flex; gap: 2rem; margin-bottom: 2rem; border-bottom: none; }
.tab-btn { font-size: 1.1rem; padding-bottom: 0.5rem; transition: 0.2s; border: none; background: none; cursor: pointer; position: relative; color: var(--text-muted); }
.tab-btn.active { color: #f97316; }
.tab-btn.active::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 3px; background: #f97316; border-radius: 99px; }
.tab-content { border: none; padding: 0; }

.specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem 4rem; padding: 1.5rem 0; }
.spec-item { display: flex; flex-direction: column; gap: 0.25rem; border-bottom: 1px solid #eee; padding-bottom: 1rem; }
.spec-key { font-size: 0.9rem; color: #666; font-weight: 500; }
.spec-val { font-size: 1.05rem; color: #1a1a1a; font-weight: 600; }

.reviews-tab-content { display: flex; flex-direction: column; gap: 2.5rem; }
.reviews-header { display: flex; justify-content: space-between; align-items: flex-start; }
.write-review-btn { background: #f97316; color: white; padding: 0.8rem 1.8rem; border-radius: 8px; font-weight: 700; transition: 0.2s; }
.write-review-btn:hover { background: #ea580c; transform: translateY(-2px); }

.review-card { display: flex; flex-direction: column; gap: 0.75rem; border-bottom: 1px solid #eee; padding-bottom: 2rem; }
.rev-stars { display: flex; align-items: center; gap: 0.75rem; }
.rev-title { font-weight: 800; font-size: 1.1rem; color: #1a1a1a; }
.rev-body { color: #444; line-height: 1.6; font-size: 1rem; }
.rev-footer { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; color: #666; font-weight: 500; }
.rev-author { color: #1a1a1a; font-weight: 700; }
.rev-verified { color: #f97316; }
.rev-divider { opacity: 0.5; }

/* Modern Reviews UI */
.ratings-overview { display: grid; grid-template-columns: 1fr 1.5fr; gap: 3rem; margin-bottom: 2.5rem; }
.summary-card { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; background: #f8f8fa; border-radius: 20px; }
.big-rating { display: flex; align-items: baseline; gap: 0.2rem; margin-bottom: 0.75rem; }
.big-rating .avg { font-size: 3.5rem; font-weight: 900; color: #1a1a1a; }
.big-rating .max { font-size: 1.5rem; color: #666; font-weight: 700; }
.stars-row { display: flex; gap: 4px; margin-bottom: 1rem; }
.total-rev { font-size: 0.9rem; color: #666; font-weight: 600; }

.distribution-card { display: flex; flex-direction: column; gap: 0.8rem; justify-content: center; }
.dist-row { display: flex; align-items: center; gap: 1rem; }
.dist-row .num { font-size: 0.9rem; font-weight: 700; color: #1a1a1a; width: 30px; }
.bar-bg { flex: 1; height: 10px; background: #eee; border-radius: 5px; overflow: hidden; }
.bar-fill { height: 100%; background: #22c55e; border-radius: 5px; transition: 0.6s cubic-bezier(0.16, 1, 0.3, 1); }
.dist-row .count { font-size: 0.9rem; color: #666; font-weight: 600; width: 30px; text-align: right; }

.review-prompt { padding: 2.5rem; text-align: center; margin-bottom: 3rem; border: 1px dashed var(--border); }
.review-prompt h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
.review-prompt p { color: #666; margin-bottom: 1.5rem; }
.write-review-btn-large { 
    width: 100%; max-width: 400px; padding: 1.25rem; border-radius: 16px; 
    border: 2px solid #e2e8f0; font-weight: 800; color: var(--primary);
    background: white; transition: 0.2s;
}
.write-review-btn-large:hover { border-color: var(--primary); background: hsla(230, 85%, 60%, 0.05); }

.customer-reviews-section h3 { font-size: 1.5rem; font-weight: 800; margin-bottom: 2rem; }
.review-card-modern { padding: 2rem; border-radius: 24px; background: white; border: 1px solid var(--border); margin-bottom: 1.5rem; transition: 0.3s; }
.review-card-modern:hover { transform: translateY(-3px); box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
.rev-header { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; }
.author-avatar { width: 50px; height: 50px; border-radius: 50%; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.2rem; color: var(--primary); }
.author-info { display: flex; flex-direction: column; }
.author-info .name { font-weight: 800; font-size: 1.1rem; }
.author-info .meta { display: flex; align-items: center; gap: 1rem; font-size: 0.85rem; color: #666; font-weight: 600; }
.verified-badge { color: #22c55e; display: flex; align-items: center; gap: 3px; }

.rev-content { margin-bottom: 1.5rem; }
.rev-content .rev-title { font-size: 1.2rem; font-weight: 850; margin-bottom: 0.5rem; letter-spacing: -0.5px; }
.rev-rating { display: flex; gap: 2px; margin-bottom: 0.75rem; }
.rev-body { line-height: 1.6; color: #444; font-size: 1rem; font-weight: 500; }

.rev-actions { border-top: 1px solid #f1f5f9; padding-top: 1rem; }
.helpful-btn { display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; font-weight: 700; color: #666; transition: 0.2s; }
.helpful-btn:hover { color: var(--primary); }

/* Review Modal specific */
.review-modal { width: 500px; }
.review-form { display: flex; flex-direction: column; gap: 1.5rem; padding-top: 1rem; }
.form-group { display: flex; flex-direction: column; gap: 0.75rem; }
.form-group label { font-weight: 800; font-size: 0.95rem; color: #1a1a1a; }
.rating-selector { display: flex; gap: 0.5rem; }
.rating-selector button { opacity: 0.3; transition: 0.2s; }
.rating-selector button.active { opacity: 1; transform: scale(1.1); }
.form-group input, .form-group textarea { padding: 1rem; border-radius: 12px; border: 1px solid var(--border); font-size: 1rem; background: #f8fafc; }
.submit-review-btn { background: var(--primary); color: white; padding: 1.2rem; border-radius: 12px; font-weight: 800; font-size: 1.1rem; margin-top: 1rem; transition: 0.3s; }
.submit-review-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 10px 20px hsla(230, 85%, 60%, 0.2); }
.submit-review-btn:disabled { opacity: 0.7; cursor: not-allowed; }

/* About the Seller Section */
.about-seller-section { margin-top: 2.5rem; border-top: 1px solid var(--border); padding-top: 2rem; }
.seller-card { padding: 1.5rem; border-radius: 16px; position: relative; overflow: hidden; background: white; }
.seller-main-info { display: flex; align-items: center; gap: 1.5rem; margin-bottom: 1.5rem; }
.seller-avatar { 
    width: 60px; 
    height: 60px; 
    border-radius: 12px; 
    background: linear-gradient(135deg, #4f46e5, #818cf8); 
    color: white; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 1.8rem; 
    font-weight: 700; 
    box-shadow: 0 8px 16px rgba(79, 70, 229, 0.2);
    flex-shrink: 0;
}
.seller-text { flex: 1; }
.shop-name { font-size: 1.3rem; font-weight: 700; margin-bottom: 0.4rem; color: #1a1a1a; line-height: 1.2; }
.seller-badges { display: flex; gap: 0.75rem; flex-wrap: wrap; }
.badge-item { 
    padding: 0.3rem 0.6rem; 
    border-radius: 99px; 
    font-size: 0.8rem; 
    font-weight: 600; 
    display: inline-flex; 
    align-items: center; 
    gap: 0.3rem;
    white-space: nowrap;
}
.badge-item.verified { background: #ecfdf5; color: #059669; }
.badge-item.category { background: #f1f5f9; color: #475569; }
.seller-details-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
    gap: 1.5rem; 
    border-top: 1px solid #f1f5f9; 
    padding-top: 1.5rem; 
}
.detail-item { display: flex; flex-direction: column; gap: 0.4rem; }
.detail-item .label { 
    font-size: 0.8rem; 
    color: #64748b; 
    font-weight: 600; 
    text-transform: uppercase; 
    letter-spacing: 0.3px; 
}
.detail-item .value { 
    font-size: 1rem; 
    color: #1a1a1a; 
    font-weight: 700; 
    word-break: break-word;
}

.fbt-section { margin-top: 2.5rem; }
.fbt-section h2 { margin-bottom: 1.25rem; font-size: 1.3rem; font-weight: 700; }
.fbt-container { display: grid; grid-template-columns: 1.5fr 1fr; gap: 2rem; padding: 1.5rem; border-radius: 12px; }
.fbt-visual { display: flex; align-items: center; gap: 1rem; }
.fbt-item-wrapper { display: flex; align-items: center; gap: 1rem; }
.fbt-img-card { 
    width: 110px; height: 110px; border-radius: 8px; background: white; 
    border: 1px solid var(--border); position: relative; padding: 8px;
}
.fbt-img-card.selected { border-color: #f97316; }
.fbt-img-card img { width: 100%; height: 100%; object-fit: contain; }
.fbt-img-card input { position: absolute; top: 6px; right: 6px; border-radius: 3px; }
.plus { font-size: 1.5rem; color: #999; }
.fbt-details { display: flex; flex-direction: column; gap: 0.75rem; border-left: 1px solid var(--border); padding-left: 2rem; }
.fbt-row { display: flex; justify-content: space-between; align-items: center; }
.fbt-row.disabled { opacity: 0.5; }
.fbt-info { display: flex; flex-direction: column; }
.fbt-info .p-name { font-weight: 600; font-size: 0.9rem; }
.fbt-row .rating { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #666; }
.fbt-total-row { border-top: 1px solid var(--border); padding-top: 1rem; margin-top: 0.75rem; display: flex; justify-content: space-between; align-items: center; }
.total-meta { display: flex; flex-direction: column; }
.total-price { font-size: 1.3rem; font-weight: 700; }
.fbt-add-btn { background: #f97316; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem; border: none; cursor: pointer; }

.similar-section { margin-top: 2.5rem; padding-bottom: 2.5rem; }
.similar-section h2 { margin-bottom: 0.4rem; font-size: 1.3rem; font-weight: 700; }
.similar-section p { color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }
.similar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
.similar-card { padding: 1rem; transition: 0.3s; cursor: pointer; border-radius: 12px; }
.similar-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
.similar-card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem; }
.similar-card h3 { font-size: 0.9rem; margin-bottom: 0.4rem; font-weight: 600; }
.similar-card .rating { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; color: #666; margin-bottom: 0.4rem; }
.similar-card .price { font-size: 1rem; font-weight: 700; }

.empty-recommendations {
    padding: 2.5rem 2rem;
    text-align: center;
    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
    border-radius: 16px;
    border: 2px dashed #cbd5e1;
}
.empty-recommendations .empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.6;
}
.empty-recommendations h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #1e293b;
    margin-bottom: 0.5rem;
}
.empty-recommendations p {
    color: #64748b;
    font-size: 0.9rem;
    line-height: 1.5;
    max-width: 450px;
    margin: 0 auto;
}

.recently-viewed-section { margin-top: 2.5rem; padding-bottom: 1.5rem; }
.recently-viewed-section h2 { margin-bottom: 0.4rem; font-size: 1.3rem; font-weight: 700; }
.recently-viewed-section p { color: #666; margin-bottom: 1.5rem; font-size: 0.9rem; }

/* Misc Styles */
.no-rating { color: #64748b; font-size: 0.85rem; font-weight: 500; font-style: italic; }
.rating .no-rating { display: flex; align-items: center; height: 18px; }
.actions-meta button.active { color: #E11D48 !important; }

/* Zoom Preview Panel */
.zoom-preview-panel {
    position: absolute;
    right: -320px;
    top: 0;
    width: 300px;
    height: 350px;
    background: white;
    border-radius: 8px;
    border: 2px solid var(--border);
    overflow: hidden;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15);
    z-index: 100;
}
.zoom-preview-image {
    width: 100%;
    height: 100%;
    background-repeat: no-repeat;
}
.media-controls-bottom {
    position: absolute;
    bottom: 12px;
    right: 12px;
    display: flex;
    gap: 6px;
    pointer-events: auto;
    z-index: 10;
}
.ctrl-btn-bottom {
    width: 32px;
    height: 32px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1a1a;
    transition: all 0.2s;
    border: none;
    cursor: pointer;
    backdrop-filter: blur(10px);
}
.ctrl-btn-bottom:hover {
    background: var(--primary);
    color: white;
    transform: scale(1.05);
}

/* Zoom Modal Styles */
.zoom-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.9);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 2rem;
}
.zoom-modal-content {
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    background: transparent;
}
.zoom-modal-content img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    max-height: 90vh;
}
.close-zoom-btn {
    position: absolute;
    top: -50px;
    right: 0;
    width: 40px;
    height: 40px;
    background: white;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #1a1a1a;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.close-zoom-btn:hover {
    background: #f1f5f9;
    transform: scale(1.1);
}

@media (max-width: 1200px) {
    .pd-main-grid { grid-template-columns: 1fr; gap: 4rem; }
    .fbt-container { grid-template-columns: 1fr; gap: 2rem; }
    .fbt-details { border-left: none; padding-left: 0; border-top: 1px solid var(--border); padding-top: 2rem; }
    .similar-grid { grid-template-columns: 1fr 1fr; }
    .media-container { flex-direction: column; }
    .zoom-preview-panel { 
        position: relative;
        right: auto;
        width: 100%;
        margin-top: 1rem;
    }
}
@media (max-width: 768px) {
    .main-title { font-size: 2rem; }
    .pd-actions { grid-template-columns: 1fr; }
    .similar-grid { grid-template-columns: 1fr; }
    .fbt-visual { flex-direction: column; }
    .plus { transform: rotate(90deg); }
}
`;
