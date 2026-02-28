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
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('description');
    const [selectedColor, setSelectedColor] = useState(null);
    const [selectedSize, setSelectedSize] = useState('M');
    const [selectedStorage, setSelectedStorage] = useState(null);
    const [selectedMemory, setSelectedMemory] = useState(null);
    const [purchaseOption, setPurchaseOption] = useState('standard');
    const [isZoomed, setIsZoomed] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [fbtSelections, setFbtSelections] = useState({ 0: true, 1: false, 2: false });
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
    const images = product?.images || [product?.image || product?.imageUrl];

    const nextImage = () => setActiveImageIndex((prev) => (prev + 1) % images.length);
    const prevImage = () => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);

    useEffect(() => {
        let unsubscribeSeller = null;
        let unsubscribeUser = null;

        const setupSellerListener = (sellerId) => {
            if (!sellerId) {
                setSeller({
                    name: "SellSathi Verified Hub",
                    shopName: "SellSathi Official Store",
                    companyName: "Antigravity Solutions Pvt Ltd",
                    city: "New Delhi, India",
                    category: "Verified Retailer",
                    joinedAt: new Date('2023-01-01')
                });
                return;
            }

            unsubscribeSeller = onSnapshot(doc(db, "sellers", sellerId), (sSnap) => {
                if (sSnap.exists()) {
                    const sData = sSnap.data();

                    unsubscribeUser = onSnapshot(doc(db, "users", sellerId), (uSnap) => {
                        const uData = uSnap.exists() ? uSnap.data() : {};

                        let city = "N/A";
                        if (sData.address) {
                            const parts = sData.address.split(',');
                            city = parts.length > 1 ? parts[parts.length - 2].trim() : parts[0].trim();
                        }

                        setSeller({
                            name: uData.fullName || sData.extractedName || "Professional Seller",
                            shopName: sData.shopName || "SellSathi Partner",
                            companyName: sData.shopName || "SellSathi Registered Hub",
                            city: city,
                            category: sData.category || "General",
                            joinedAt: sData.appliedAt ? (sData.appliedAt.toDate ? sData.appliedAt.toDate() : new Date(sData.appliedAt._seconds * 1000)) : null
                        });
                    });
                } else {
                    setSeller({
                        name: "SellSathi Verified Hub",
                        shopName: "SellSathi Official Store",
                        companyName: "Antigravity Solutions Pvt Ltd",
                        city: "New Delhi, India",
                        category: "Verified Retailer",
                        joinedAt: new Date('2023-01-01')
                    });
                }
            });
        };

        const fetchProduct = async () => {
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);
                let data = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;

                const mock = deals[id] || (id.includes('fashion') ? deals["fashion-1"] : (id.includes('deal') ? deals["deal-1"] : deals["generic"]));
                if (mock) {
                    data = {
                        ...mock,
                        ...data,
                        colors: (data?.colors && data.colors.length > 0) ? data.colors : mock.colors,
                        materials: (data?.materials && data.materials.length > 0) ? data.materials : mock.materials,
                        types: (data?.types && data.types.length > 0) ? data.types : mock.types,
                        specifications: (data?.specifications && Object.keys(data.specifications).length > 0) ? data.specifications : mock.specifications,
                        description: data?.description || mock.description || ("Premium " + (data?.name || mock.name || "Product") + " with cutting-edge features.")
                    };
                }

                if (data) {
                    data.id = data.id || id;
                    setProduct(data);
                    if (data.colors && data.colors.length > 0) setSelectedColor(data.colors[0]);
                    if (data.sizes && data.sizes.length > 0) setSelectedSize(data.sizes[1] || data.sizes[0]);
                    if (data.storage && data.storage.length > 0) setSelectedStorage(data.storage[0]);
                    if (data.memory && data.memory.length > 0) setSelectedMemory(data.memory[0]);
                    updateRecentlyViewed(data);
                    setupSellerListener(data.sellerId);
                }
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        const setupReviewsListener = () => {
            const loadReviews = async () => {
                try {
                    const res = await fetch(`${API_BASE}/api/products/${id}/reviews`);
                    const data = await res.json();
                    if (data.success) {
                        setReviews(data.reviews);
                        calculateStats(data.reviews);
                    }
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
            if (unsubscribeSeller) unsubscribeSeller();
            if (unsubscribeUser) unsubscribeUser();
            if (unsubscribeWishlist) unsubscribeWishlist();
        };
    }, [id]);


    const calculateStats = (revs) => {
        if (revs.length === 0) {
            setReviewStats({ average: product?.rating || 0, total: product?.reviews || 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
            return;
        }
        const total = revs.length;
        const sum = revs.reduce((acc, r) => acc + r.rating, 0);
        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        revs.forEach(r => { if (dist[r.rating] !== undefined) dist[r.rating]++; });
        setReviewStats({ average: (sum / total).toFixed(1), total, distribution: dist });
    };


    const toggleWishlist = async () => {
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
                window.dispatchEvent(new Event('reviewsUpdate'));
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
            // console.error(err);
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

    const deals = {
        "deal-1": {
            id: "deal-1", name: "MacBook Pro M2 Max", price: 129999, oldPrice: 149498, rating: 4.8, reviews: 1256, category: "Electronics",
            image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800", discount: "13%",
            colors: ['Space Gray', 'Silver'], materials: ['Aluminium', 'Recycled Plastics'], types: ['Standard', 'Custom Config'],
            specifications: { "Processor": "Apple M2 Max chip", "Memory": "32GB Unified Memory", "Storage": "1TB SSD", "Display": "14.2-inch Liquid Retina XDR", "Battery": "Up to 18 hours", "Weight": "1.63 kg" }
        },
        "deal-2": {
            id: "deal-2", name: "Sony WH-1000XM4 Noise Cancelling", price: 19999, oldPrice: 29999, rating: 4.9, reviews: 892, category: "Electronics",
            image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800", discount: "33%",
            stock: 0, status: 'Out of Stock',
            colors: ['Black', 'Silver', 'Midnight Blue'], materials: ['Premium Plastic', 'Synthetic Leather'], types: ['Wireless', 'Wired'],
            specifications: { "Driver Unit": "40mm, dome type", "Frequency Response": "4Hz-40,000Hz", "Bluetooth": "Version 5.0", "Battery Life": "Max. 30 hours", "Weight": "254g" }
        },
        "deal-3": {
            id: "deal-3", name: "Apple Watch Series 8", price: 34999, oldPrice: 42999, rating: 4.8, reviews: 567, category: "Electronics",
            image: "https://images.unsplash.com/photo-1434494878577-86c23bddad0f?w=800", discount: "18%",
            colors: ['Midnight', 'Starlight', 'Silver', 'Red'], materials: ['Aluminium', 'Stainless Steel'], types: ['GPS', 'GPS + Cellular'],
            specifications: { "Display": "Always-On Retina", "Sensor": "Blood Oxygen, ECG", "Water Resistance": "WR50", "Dust Resistance": "IP6X", "Battery": "Up to 18 hours" }
        },
        "deal-4": {
            id: "deal-4", name: "iPad Pro M2 12.9", price: 99999, oldPrice: 112999, rating: 4.9, reviews: 345, category: "Electronics",
            image: "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800", discount: "11%",
            stock: 0, status: 'Out of Stock',
            colors: ['Space Gray', 'Silver'], materials: ['Aluminium'], types: ['WiFi', 'WiFi + Cellular'],
            specifications: { "Processor": "Apple M2 chip", "Camera": "12MP Wide, 10MP Ultra Wide", "Face ID": "Enabled", "Apple Pencil": "Gen 2 Support" }
        },
        "fashion-1": {
            id: "fashion-1", name: "Premium Cotton Formal Shirt", price: 2499, oldPrice: 3499, rating: 4.5, reviews: 456, category: "Men's Fashion",
            image: "https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?w=800", discount: "28%",
            stock: 0, status: 'Out of Stock',
            colors: ['White', 'Light Blue', 'Pink'], materials: ['100% Cotton'], types: ['Slim Fit', 'Regular Fit'],
            sizes: ['S', 'M', 'L', 'XL', 'XXL'],
            specifications: { "Fit": "Slim Fit", "Pattern": "Solid", "Sleeve": "Full Sleeve", "Collar": "Spread Collar", "Occasion": "Formal" }
        },
        "fashion-11": {
            id: "fashion-11", name: "Slim Fit Casual Shirt", price: 1899, oldPrice: 2499, rating: 4.4, reviews: 128, category: "Men's Fashion",
            image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800",
            colors: ['Blue', 'Grey'], materials: ['Cotton Blend'], types: ['Casual'],
            sizes: ['M', 'L', 'XL']
        },
        "fashion-2": {
            id: "fashion-2", name: "Midnight Blue Textured Blazer", price: 5999, oldPrice: 7999, rating: 4.6, reviews: 231, category: "Men's Fashion",
            image: "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?w=800",
            colors: ['Midnight Blue', 'Charcoal', 'Black'], materials: ['Wool Blend'], types: ['Single Breasted'],
            sizes: ['38', '40', '42', '44'],
            specifications: { "Lining": "Satin", "Pockets": "3 Outer, 2 Inner", "Closure": "Button", "Vents": "Double", "Lapel": "Notch" }
        },
        "fashion-12": {
            id: "fashion-12", name: "Straight Fit Denim Jeans", price: 2999, oldPrice: 3999, rating: 4.5, reviews: 890, category: "Men's Fashion",
            image: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=800",
            stock: 0, status: 'Out of Stock',
            colors: ['Indigo', 'Light Blue'], materials: ['Denim'], types: ['Straight Fit'],
            sizes: ['30', '32', '34', '36']
        },
        "fashion-3": {
            id: "fashion-3", name: "Floral Print Chiffon Dress", price: 3999, oldPrice: 4999, rating: 4.7, reviews: 124, category: "Women's Fashion",
            image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=800", discount: "20%",
            colors: ['Floral Pink', 'Summer Yellow', 'Blue Bloom'], materials: ['Chiffon'], types: ['Maxi', 'Midi'],
            sizes: ['XS', 'S', 'M', 'L', 'XL'],
            specifications: { "Style": "Maxi", "Neck": "V-Neck", "Sleeve": "Short", "Length": "Full", "Closure": "Zipper" }
        },
        "fashion-13": {
            id: "fashion-13", name: "White Embroidered Top", price: 1599, oldPrice: 1999, rating: 4.6, reviews: 67, category: "Women's Fashion",
            image: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800",
            stock: 0, status: 'Out of Stock',
            colors: ['White'], materials: ['Georgette'], types: ['Regular Fit'],
            sizes: ['S', 'M', 'L']
        },
        "fashion-4": {
            id: "fashion-4", name: "Banarasi Silk Saree", price: 8499, oldPrice: 12999, rating: 4.8, reviews: 342, category: "Women's Fashion",
            image: "https://images.unsplash.com/photo-1610030469668-93510cb6f43e?w=800",
            colors: ['Royal Red', 'Golden Mustard', 'Emerald'], materials: ['Banarasi Silk'], types: ['Ethnic'],
            sizes: ['One Size'],
            specifications: { "Work": "Zari Weaving", "Blouse Piece": "Included", "Saree Length": "5.5m", "Blouse Length": "0.8m", "Occasion": "Wedding" }
        },
        "fashion-14": {
            id: "fashion-14", name: "Designer Kurta Set", price: 3499, oldPrice: 4599, rating: 4.7, reviews: 215, category: "Women's Fashion",
            image: "https://images.unsplash.com/photo-1582533561751-ef6f6ab93a2e?w=800",
            stock: 0, status: 'Out of Stock',
            colors: ['Maroon', 'Teal'], materials: ['Cotton Silk'], types: ['Anarkali'],
            sizes: ['S', 'M', 'L', 'XL']
        },
        "e1": { id: "e1", name: "Smart Watch X", price: 12999, category: "Electronics", image: "https://images.unsplash.com/photo-1546868871-70ca48370731", rating: 4.5, reviews: 88, description: "Advanced smart watch with health tracking.", specifications: { "Screen": "OLED", "Battery": "48 Hours" } },
        "e2": { id: "e2", name: "Noise Buds", price: 2999, category: "Electronics", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df", rating: 4.2, reviews: 156, description: "High-quality wireless earbuds." },
        "e3": { id: "e3", name: "Elite Laptop", price: 89999, category: "Electronics", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853", rating: 4.9, reviews: 42, description: "Powerful laptop for professionals." },
        "m1": { id: "m1", name: "Classic Polo", price: 1499, category: "Men's Fashion", image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518", rating: 4.3, reviews: 210, description: "Comfortable cotton polo shirt." },
        "m2": { id: "m2", name: "Denim Jacket", price: 3999, category: "Men's Fashion", image: "https://images.unsplash.com/photo-1523205771623-e0faa4d2813d", rating: 4.6, reviews: 75 },
        "m3": { id: "m3", name: "Slim Fit Chinos", price: 2499, category: "Men's Fashion", image: "https://images.unsplash.com/photo-1473966968600-fa801b869a1a", rating: 4.4, reviews: 112 },
        "w1": { id: "w1", name: "Silk Saree", price: 4999, category: "Women's Fashion", image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c", rating: 4.8, reviews: 94 },
        "w2": { id: "w2", name: "Floral Maxi Dress", price: 2999, category: "Women's Fashion", image: "https://images.unsplash.com/photo-1496747611176-843222e1e57c", rating: 4.7, reviews: 63 },
        "w3": { id: "w3", name: "Silver Handbag", price: 1599, category: "Women's Fashion", image: "https://images.unsplash.com/photo-1584917865442-de89df76afd3", rating: 4.5, reviews: 48 },
        "h1": { id: "h1", name: "Wall Art", price: 899, category: "Home & Living", image: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38", rating: 4.1, reviews: 35 },
        "h2": { id: "h2", name: "Velvet Cushion", price: 499, category: "Home & Living", image: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7", rating: 4.4, reviews: 120 },
        "h3": { id: "h3", name: "Ceramic Vase", price: 1299, category: "Home & Living", image: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d", rating: 4.6, reviews: 28 },
        "b1": { id: "b1", name: "Matte Lipstick", price: 799, category: "Beauty", image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3", rating: 4.5, reviews: 200 },
        "b2": { id: "b2", name: "Night Cream", price: 1499, category: "Beauty", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03", rating: 4.7, reviews: 85 },
        "b3": { id: "b3", name: "Perfume Gold", price: 3499, category: "Beauty", image: "https://images.unsplash.com/photo-1544467328-345179a4573b", rating: 4.9, reviews: 15 },
        "s1": { id: "s1", name: "Yoga Mat", price: 999, category: "Sports", image: "https://images.unsplash.com/photo-1592431594448-ddc91c038f38", rating: 4.3, reviews: 310 },
        "s2": { id: "s2", name: "Running Shoes", price: 4999, category: "Sports", image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff", rating: 4.8, reviews: 1500 },
        "s3": { id: "s3", name: "Dumbbell Set", price: 2999, category: "Sports", image: "https://images.unsplash.com/photo-1586401100295-7a8096fd231a", rating: 4.6, reviews: 420 },
        "a1": { id: "a1", name: "Leather Wallet", price: 1299, category: "Accessories", image: "https://images.unsplash.com/photo-1627123424574-724758594e93", rating: 4.4, reviews: 95 },
        "a2": { id: "a2", name: "Sunglasses", price: 1999, category: "Accessories", image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f", rating: 4.7, reviews: 120 },
        "a3": { id: "a3", name: "Belt Black", price: 899, category: "Accessories", image: "https://images.unsplash.com/photo-1624222247344-550fb8ec505d", rating: 4.2, reviews: 55 },
        "generic": { id: "generic", name: "Premium Product", price: 999, category: "Other", image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30", rating: 4.5, reviews: 10, description: "A high-quality product from Sellsathi." },
        "deal-special": {
            id: "deal-special", name: "Premium Ultra Pro Max Elite", price: 199999, oldPrice: 249999, rating: 5.0, reviews: 9999, category: "Electronics",
            image: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?w=800", discount: "20%",
            colors: ['Mystic Black', 'Phantom Silver', 'Nebula Blue'], materials: ['Aerospace Titanium', 'Sapphire Glass'], types: ['Standard', 'Luxury Edition'],
            specifications: { "Processor": "Quantum X1 chip", "Memory": "128GB Unified Memory", "Storage": "4TB Superfast SSD", "Display": "8K Ultra Motion OLED", "Battery": "Up to 48 hours", "Weight": "1.2 kg" },
            description: "The Premium Ultra Pro Max Elite is not just a device; it is a masterpiece of engineering and design. Crafted from aerospace-grade titanium and protected by sapphire glass, this flagship product redefines luxury and performance in the modern era. With the revolutionary Quantum X1 chip, it delivers speeds that were previously thought impossible, handling complex tasks with ease while maintaining exceptional battery efficiency. The 8K Ultra Motion OLED display provides a visual experience that is truly breathtaking, with colors so vibrant and blacks so deep that every frame feels alive. Whether you are a professional creator needing extreme power, a gaming enthusiast seeking the ultimate performance, or someone who simply appreciates the finest technology, the Ultra Pro Max Elite is the definitive choice. Its multi-layer secure communication system ensures your data stays private, while its integrated AI assistant learns your habits to make every interaction seamless. Experience the future today with the one device that truly has it all. This product includes worldwide express shipping, a lifetime warranty, and 24/7 dedicated concierge support to ensure your satisfaction is always guaranteed."
        }
    };

    const allDeals = React.useMemo(() => Object.values(deals), [deals]);

    const similarProducts = React.useMemo(() => {
        if (!product) return [];
        let matches = allDeals.filter(p => p.id !== product.id);

        // Priority 1: Same Sub-Category
        const subCatMatches = matches.filter(p => p.subCategory === product.subCategory);
        if (subCatMatches.length >= 4) return subCatMatches.slice(0, 4);

        // Priority 2: Same Category
        const catMatches = matches.filter(p => p.category === product.category);
        const combined = [...new Set([...subCatMatches, ...catMatches])];

        return combined.slice(0, 4);
    }, [product, allDeals]);

    const fbtProducts = React.useMemo(() => {
        if (!product) return [];
        // Intelligently pick FBT based on category
        let pool = allDeals.filter(p => p.id !== product.id);

        if (product.category === "Electronics") {
            // Pick other electronics or accessories
            return pool.filter(p => p.category === "Electronics").slice(0, 3);
        } else if (product.category?.includes("Fashion")) {
            // Pick other fashion items
            return pool.filter(p => p.category?.includes("Fashion")).slice(0, 3);
        }

        return pool.slice(0, 3);
    }, [product, allDeals]);

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
                        <div className="media-stage glass-card">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={activeImageIndex}
                                    src={images[activeImageIndex]}
                                    alt={product.name}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    transition={{ duration: 0.3 }}
                                />
                            </AnimatePresence>
                            <div className="media-controls">
                                <button className="ctrl-btn left" onClick={prevImage}><ChevronLeft size={24} /></button>
                                <button className="ctrl-btn right" onClick={nextImage}><ChevronRight size={24} /></button>
                                <button className="ctrl-btn zoom" onClick={() => setIsZoomed(true)}><ZoomIn size={20} /></button>
                            </div>
                        </div>

                        {/* Zoom Overlay */}
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
                                        className="zoom-content"
                                        initial={{ scale: 0.8 }}
                                        animate={{ scale: 1 }}
                                        exit={{ scale: 0.8 }}
                                        onClick={e => e.stopPropagation()}
                                    >
                                        <img src={images[activeImageIndex]} alt="Zoomed" />
                                        <button className="close-zoom" onClick={() => setIsZoomed(false)}><ArrowLeft size={24} /> Back</button>
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
                            <h1 className="main-title">{product.name}</h1>
                            <div className="rating-row">
                                <div className="stars">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < Math.floor(product.rating || 4.5) ? "#FFB800" : "none"} color="#FFB800" />)}
                                </div>
                                <span className="review-meta">{product.rating || 4.8} ({product.reviews || 0} reviews)</span>
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
                            <div className="price-row">
                                <span className="final-price">
                                    ₹{(() => {
                                        let basePrice = product.price || 0;
                                        // Size-varied pricing
                                        if (product.pricingType === 'varied' && product.sizePrices && selectedSize && product.sizePrices[selectedSize]) {
                                            basePrice = Number(product.sizePrices[selectedSize]);
                                        }
                                        // Variant price offsets (storage, memory)
                                        if (selectedStorage && typeof selectedStorage === 'object' && selectedStorage.priceOffset) {
                                            basePrice += Number(selectedStorage.priceOffset);
                                        }
                                        if (selectedMemory && typeof selectedMemory === 'object' && selectedMemory.priceOffset) {
                                            basePrice += Number(selectedMemory.priceOffset);
                                        }
                                        if (purchaseOption === 'exchange') basePrice *= 0.9;
                                        return basePrice.toLocaleString();
                                    })()}
                                </span>
                                {product.oldPrice && (
                                    <span className="original-price">
                                        ₹{Number(product.oldPrice).toLocaleString()}
                                    </span>
                                )}
                                {product.discountPrice && !product.oldPrice && (
                                    <span className="original-price">
                                        ₹{Number(product.discountPrice).toLocaleString()}
                                    </span>
                                )}
                                <span className="discount-tag">
                                    {purchaseOption === 'exchange' ? '23% off' : (product.discount || (product.oldPrice ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) + '%' : (product.discountPrice ? Math.round(((product.price - product.discountPrice) / product.price) * 100) + '% off' : '')))}
                                </span>
                            </div>
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

                        <div className="pd-section">
                            <h3>Purchase Options</h3>
                            <div className="options-grid">
                                <div
                                    className={`opt-card ${purchaseOption === 'standard' ? 'active' : ''}`}
                                    onClick={() => setPurchaseOption('standard')}
                                >
                                    <span className="p">₹{(product.price || 0).toLocaleString()}</span>
                                    <span className="l">Buy without exchange</span>
                                </div>
                                <div
                                    className={`opt-card ${purchaseOption === 'exchange' ? 'active' : ''}`}
                                    onClick={() => setPurchaseOption('exchange')}
                                >
                                    <span className="p">₹{((product.price || 0) * 0.9).toLocaleString()}</span>
                                    <span className="l">Buy with exchange</span>
                                </div>
                            </div>
                        </div>

                        {product.colors && product.colors.length > 0 && (
                            <div className="pd-section">
                                <h3>Color: <span className="selected-val">{selectedColor?.name || selectedColor}</span></h3>
                                <div className="pill-group">
                                    {product.colors.map(c => (
                                        <button
                                            key={c.name || c}
                                            type="button"
                                            className={`pill ${selectedColor === c ? 'active' : ''}`}
                                            onClick={() => setSelectedColor(c)}
                                        >
                                            {c.name || c}
                                        </button>
                                    ))}
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
                                <h3>Storage: <span className="selected-val">{selectedStorage?.label || selectedStorage}</span></h3>
                                <div className="pill-group">
                                    {product.storage.map((s) => (
                                        <button
                                            key={s.label || s}
                                            type="button"
                                            className={`pill variant-pill ${selectedStorage === s ? 'active' : ''}`}
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
                            <div className="pd-section">
                                <h3>Memory: <span className="selected-val">{selectedMemory?.label || selectedMemory}</span></h3>
                                <div className="pill-group">
                                    {product.memory.map((m) => (
                                        <button
                                            key={m.label || m}
                                            type="button"
                                            className={`pill variant-pill ${selectedMemory === m ? 'active' : ''}`}
                                            onClick={() => setSelectedMemory(m)}
                                        >
                                            <span className="v-label">{m.label || m}</span>
                                            <span className="v-price">{m.priceOffset ? (m.priceOffset > 0 ? `+₹${m.priceOffset.toLocaleString()}` : `-₹${Math.abs(m.priceOffset).toLocaleString()}`) : 'Included'}</span>
                                        </button>
                                    ))}
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
                                <Star size={16} fill="#FFB800" color="#FFB800" />
                                <span>{reviewStats.average} ({reviewStats.total} reviews)</span>
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
                                            {[...Array(5)].map((_, j) => <Star key={j} size={14} fill={j < Math.floor(p.rating) ? "#FFB800" : "none"} color="#FFB800" />)}
                                            <span>({p.reviews})</span>
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

                {/* Similar Products */}
                <div className="similar-section">
                    <h2>Similar Products</h2>
                    <p>You might also like these products</p>
                    <div className="similar-grid">
                        {similarProducts.map(p => (
                            <div key={p.id} className="similar-card glass-card">
                                <img src={p.image} alt={p.name} />
                                <h3>{p.name}</h3>
                                <div className="rating">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < Math.floor(p.rating) ? "#FFB800" : "none"} color="#FFB800" />)}
                                    <span>({p.reviews})</span>
                                </div>
                                <span className="price">₹{(p.price || 0).toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>

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
                                        {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < Math.floor(p.rating || 4.8) ? "#FFB800" : "none"} color="#FFB800" />)}
                                        <span>({p.reviews || 0})</span>
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
.pd-details-scroller { display: flex; flex-direction: column; gap: 3rem; margin-top: 4rem; border-top: 1px solid var(--border); padding-top: 3rem; }
.block-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.block-header h2 { font-size: 1.8rem; font-weight: 800; }
.header-stats { display: flex; align-items: center; gap: 0.5rem; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 0.5rem 1rem; border-radius: 99px; }

.desc-content-modern { position: relative; }
.clamped-desc { display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.show-more-blue-btn { color: #2563eb; font-weight: 700; font-size: 0.95rem; margin-top: 0.75rem; transition: 0.2s; background: none; border: none; cursor: pointer; padding: 0; }
.show-more-blue-btn:hover { text-decoration: underline; color: #1d4ed8; }

.review-write-box { padding: 2.5rem; border-radius: 24px; margin-bottom: 3rem; background: #fafafa; border: 1px solid #eee; }
.rev-inline-form { display: flex; flex-direction: column; gap: 1.5rem; }
.star-rating-input { display: flex; gap: 0.5rem; }
.star-rating-input button { opacity: 0.3; transition: 0.2s; }
.star-rating-input button.active { opacity: 1; transform: scale(1.1); }
.rev-inline-form input, .rev-inline-form textarea { width: 100%; padding: 1rem; border-radius: 12px; border: 1px solid #ddd; background: white; font-size: 1rem; }
.rev-upload-section { display: flex; flex-direction: column; gap: 1rem; }
.image-upload-trigger { display: flex; align-items: center; gap: 0.5rem; color: #2563eb; font-weight: 700; cursor: pointer; width: fit-content; padding: 0.5rem 1rem; background: #eff6ff; border-radius: 8px; font-size: 0.9rem; }
.rev-preview-grid { display: flex; gap: 1rem; flex-wrap: wrap; }
.preview-item { width: 80px; height: 80px; border-radius: 8px; position: relative; border: 1px solid #ddd; }
.preview-item img { width: 100%; height: 100%; object-fit: cover; border-radius: 8px; }
.preview-item button { position: absolute; -10px; -10px; background: #ef4444; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; }
.rev-submit-btn { background: #1a1a1a; color: white; padding: 1.25rem; border-radius: 12px; font-weight: 800; font-size: 1.1rem; transition: 0.3s; }
.rev-submit-btn:hover { background: #333; transform: translateY(-2px); }

.rev-list-modern { display: flex; flex-direction: column; gap: 1.5rem; }
.rev-card-vertical { padding: 2rem; background: white; border: 1px solid #f1f5f9; border-radius: 20px; }
.rev-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem; }
.rev-user-id { display: flex; align-items: center; gap: 1rem; }
.u-circ { width: 44px; height: 44px; border-radius: 50%; background: #eff6ff; color: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.1rem; }
.u-meta { display: flex; flex-direction: column; }
.un { font-weight: 800; font-size: 1rem; }
.ud { font-size: 0.8rem; color: #64748b; font-weight: 600; }
.rt { font-size: 1.15rem; font-weight: 800; margin-bottom: 0.5rem; }
.rb { color: #4b5563; line-height: 1.6; font-size: 1rem; position: relative; }
.show-more-btn-text { color: #3b82f6; font-weight: 700; font-size: 0.9rem; background: none; border: none; padding: 0; cursor: pointer; margin-left: 5px; transition: 0.2s; }
.show-more-btn-text:hover { color: #2563eb; text-decoration: underline; }
.ri { display: flex; gap: 1rem; margin-top: 1.5rem; }
.ri img { width: 120px; height: 120px; border-radius: 12px; object-fit: cover; cursor: pointer; border: 1px solid #eee; }
.reviews-expand-actions { display: flex; gap: 1rem; margin-top: 1.5rem; }
.show-more-reviews-blue-btn { flex: 1; padding: 1.25rem; background: #eff6ff; color: #2563eb; border: 2px dashed #bfdbfe; border-radius: 16px; font-weight: 800; transition: 0.2s; cursor: pointer; }
.show-more-reviews-blue-btn:hover { background: #dbeafe; }
.show-more-reviews-blue-btn.show-less { background: #fef2f2; color: #ef4444; border-color: #fecaca; }
.show-more-reviews-blue-btn.show-less:hover { background: #fee2e2; }
.rev-loader { width: 30px; height: 30px; border: 3px solid #f3f3f3; border-top: 3px solid #2563eb; border-radius: 50%; animation: spin 1s linear infinite; }

.about-seller-section { margin-top: 4rem; border-top: 1px solid var(--border); padding-top: 3rem; }
.seller-card { padding: 2.5rem; border-radius: 24px; position: relative; overflow: hidden; }
.seller-main-info { display: flex; align-items: center; gap: 2rem; margin-bottom: 2.5rem; }
.seller-avatar { width: 80px; height: 80px; border-radius: 20px; background: linear-gradient(135deg, #4f46e5, #818cf8); color: white; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 800; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2); }
.seller-text { flex: 1; }
.shop-name { font-size: 1.8rem; font-weight: 850; margin-bottom: 0.5rem; color: #1a1a1a; }
.seller-badges { display: flex; gap: 1rem; }
.badge-item { padding: 0.4rem 0.8rem; border-radius: 99px; font-size: 0.85rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; }
.badge-item.verified { background: #ecfdf5; color: #059669; }
.badge-item.category { background: #f1f5f9; color: #475569; }
.visit-store-btn { padding: 1rem 1.8rem; background: #1a1a1a; color: white; border-radius: 12px; font-weight: 750; display: flex; align-items: center; gap: 0.75rem; transition: 0.3s; }
.visit-store-btn:hover { background: #333; transform: translateX(5px); }

.seller-details-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; border-top: 1px solid #f1f5f9; padding-top: 2rem; }
.detail-item { display: flex; flex-direction: column; gap: 0.5rem; }
.detail-item .label { font-size: 0.85rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
.detail-item .value { font-size: 1.1rem; color: #1a1a1a; font-weight: 750; }

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.pd-wrapper { padding-bottom: 8rem; }
.pd-breadcrumb { padding: 1.5rem 0; font-size: 0.9rem; color: var(--text-muted); display: flex; gap: 0.5rem; }
.pd-breadcrumb button { color: var(--text-muted); transition: 0.2s; background: none; border: none; cursor: pointer; padding: 0; font-size: inherit; }
.pd-breadcrumb button:hover { color: var(--primary); }
.pd-breadcrumb .current { color: var(--text); font-weight: 700; }

.actions-meta button.active { color: #E11D48 !important; }

/* Share Modal Styles */
.share-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
}
.share-modal {
    width: 400px;
    background: rgba(255, 255, 255, 0.95);
    border-radius: 16px;
    padding: 1.5rem;
    box-shadow: 0 20px 50px rgba(0,0,0,0.2);
    border: 1px solid rgba(255,255,255,0.4);
}
.share-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}
.share-header h3 { font-size: 1.2rem; font-weight: 800; }
.close-btn { background: none; border: none; cursor: pointer; color: #666; }
.stock-status { font-size: 0.95rem; font-weight: 700; margin-top: 0.5rem; }
.stock-status.in { color: #10b981; }
.stock-status.out { color: #ef4444; }

.pd-section { margin-bottom: 2.5rem; }
.link-box {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f1f5f9;
    padding: 0.75rem 1rem;
    border-radius: 12px;
    border: 1px solid var(--border);
}
.link-info { display: flex; flex-direction: column; overflow: hidden; }
.link-info .domain { font-size: 0.85rem; font-weight: 700; }
.link-info .full-url { font-size: 0.75rem; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.copy-btn { 
    display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
    background: white; border: 1px solid var(--border); padding: 0.5rem; border-radius: 8px;
    font-size: 0.7rem; font-weight: 700; min-width: 70px;
}

.share-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    margin-bottom: 2rem;
}
.share-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
}
.share-option .icon-box {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: white;
}
.share-option span { font-size: 0.75rem; font-weight: 600; text-align: center; }
.icon-box.whatsapp { background: #25D366; }
.icon-box.facebook { background: #1877F2; }
.icon-box.twitter { background: #000000; }
.icon-box.email { background: #EA4335; }

.share-footer { border-top: 1px solid var(--border); padding-top: 1.5rem; }
.nearby-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0.75rem;
    border-radius: 8px;
    background: #f8fafc;
    border: 1px solid var(--border);
    font-weight: 700;
    transition: 0.2s;
}
.nearby-btn:hover { background: #f1f5f9; }

.pd-main-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 5rem; margin-top: 1rem; }

.pd-media { position: sticky; top: 100px; height: fit-content; }
.media-stage { 
    height: 550px; background: white; border-radius: 12px; 
    display: flex; align-items: center; justify-content: center;
    padding: 0; position: relative; overflow: hidden;
    border: 1px solid var(--border);
}
.media-stage img { width: 100%; height: 100%; object-fit: cover; }
.media-controls { position: absolute; inset: 0; pointer-events: none; }
.ctrl-btn { 
    position: absolute; pointer-events: auto; width: 44px; height: 44px; 
    background: white; border-radius: 50%; box-shadow: 0 4px 15px rgba(0,0,0,0.08);
    display: flex; align-items: center; justify: center; color: var(--text); transition: 0.2s;
    border: none; cursor: pointer;
}
.ctrl-btn:hover { background: var(--primary); color: white; }
.ctrl-btn.left { left: 1rem; top: 50%; transform: translateY(-50%); }
.ctrl-btn.right { right: 1rem; top: 50%; transform: translateY(-50%); }
.ctrl-btn.zoom { top: 1rem; right: 1rem; }

.thumbnail-track { display: flex; gap: 1rem; margin-top: 1.5rem; overflow-x: auto; padding-bottom: 0.5rem; }
.thumb-item { 
    width: 100px; height: 100px; border-radius: 8px; border: 2px solid transparent; 
    padding: 0; flex-shrink: 0; cursor: pointer; transition: 0.2s; overflow: hidden;
}
.thumb-item.active { border-color: #f59e0b; }
.thumb-item img { width: 100%; height: 100%; object-fit: cover; }

.pd-info { display: flex; flex-direction: column; gap: 2rem; }
.main-title { font-size: 2.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 0.5rem; color: #1a1a1a; }
.rating-row { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
.stars { display: flex; gap: 2px; }
.review-meta { font-weight: 600; color: #666; font-size: 0.95rem; }
.actions-meta { display: flex; gap: 1rem; margin-left: auto; }
.actions-meta button { display: flex; align-items: center; gap: 0.4rem; font-weight: 500; color: #666; font-size: 0.9rem; }

.price-box { padding: 1.5rem 2rem; border-radius: 24px; background: #f8f8fa; border: none; }
.price-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 0.5rem; }
.final-price { font-size: 2.8rem; font-weight: 800; }
.original-price { font-size: 1.4rem; color: #888; text-decoration: line-through; }
.discount-tag { background: #f97316; color: white; padding: 0.2rem 0.6rem; border-radius: 99px; font-weight: 700; font-size: 0.85rem; }
.emi-info { color: #666; font-size: 0.9rem; }

.pd-section h3 { font-size: 1.1rem; font-weight: 700; margin-bottom: 1.25rem; color: #1a1a1a; display: flex; align-items: center; gap: 0.5rem; }
.pd-section h3 .selected-val { color: #64748b; font-weight: 500; }
.section-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; }
.size-guide-btn { color: var(--primary); font-weight: 700; font-size: 0.9rem; text-decoration: underline; background: none; border: none; padding: 0; cursor: pointer; transition: 0.2s; }
.size-guide-btn:hover { color: #4338ca; }

.size-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 1rem; }
.size-pill { 
    height: 52px; border: 1px solid #e2e8f0; border-radius: 12px;
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; color: #475569; background: white; transition: 0.2s;
    cursor: pointer; font-size: 0.95rem;
}
.size-pill:hover { border-color: #4f46e5; color: #4f46e5; }
.size-pill.active { background: #EEF2FF; color: #4f46e5; border-color: #4f46e5; box-shadow: 0 0 0 1px #4f46e5; }

.pincode-check { display: flex; gap: 0.5rem; max-width: 400px; }
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

.pd-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.btn-add-cart { padding: 1.2rem; background: var(--primary); color: white; border-radius: 99px; font-weight: 700; font-size: 1.1rem; }
.btn-buy-now { padding: 1.2rem; background: #f97316; color: white; border-radius: 99px; font-weight: 700; font-size: 1.1rem; }

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

.fbt-section { margin-top: 5rem; }
.fbt-section h2 { margin-bottom: 2rem; }
.fbt-container { display: grid; grid-template-columns: 1.5fr 1fr; gap: 3rem; padding: 2.5rem; }
.fbt-visual { display: flex; align-items: center; gap: 1.5rem; }
.fbt-item-wrapper { display: flex; align-items: center; gap: 1.5rem; }
.fbt-img-card { 
    width: 150px; height: 150px; border-radius: 12px; background: white; 
    border: 1px solid var(--border); position: relative; padding: 10px;
}
.fbt-img-card.selected { border-color: #f97316; }
.fbt-img-card img { width: 100%; height: 100%; object-fit: contain; }
.fbt-img-card input { position: absolute; top: 8px; right: 8px; border-radius: 4px; }
.plus { font-size: 2rem; color: #999; }
.fbt-details { display: flex; flex-direction: column; gap: 1rem; border-left: 1px solid var(--border); padding-left: 3rem; }
.fbt-row { display: flex; justify-content: space-between; align-items: center; }
.fbt-row.disabled { opacity: 0.5; }
.fbt-info { display: flex; flex-direction: column; }
.fbt-info .p-name { font-weight: 700; }
.fbt-row .rating { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #666; }
.fbt-total-row { border-top: 1px solid var(--border); padding-top: 1.5rem; margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; }
.total-meta { display: flex; flex-direction: column; }
.total-price { font-size: 1.5rem; font-weight: 800; }
.fbt-add-btn { background: #f97316; color: white; padding: 1rem 2rem; border-radius: 8px; font-weight: 700; }

.similar-section { margin-top: 5rem; padding-bottom: 5rem; }
.similar-section h2 { margin-bottom: 0.5rem; }
.similar-section p { color: #666; margin-bottom: 2.5rem; }
.similar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; }
.similar-card { padding: 1.5rem; transition: 0.3s; }
.similar-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-lg); }
.similar-card img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 1rem; }
.similar-card h3 { font-size: 1rem; margin-bottom: 0.5rem; }
.similar-card .rating { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; }
.similar-card .price { font-size: 1.1rem; font-weight: 700; }

.recently-viewed-section { margin-top: 5rem; padding-bottom: 2rem; }
.recently-viewed-section h2 { margin-bottom: 0.5rem; }
.recently-viewed-section p { color: #666; margin-bottom: 2.5rem; }

@media (max-width: 1200px) {
    .pd-main-grid { grid-template-columns: 1fr; gap: 4rem; }
    .fbt-container { grid-template-columns: 1fr; gap: 2rem; }
    .fbt-details { border-left: none; padding-left: 0; border-top: 1px solid var(--border); padding-top: 2rem; }
    .similar-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 768px) {
    .main-title { font-size: 2rem; }
    .pd-actions { grid-template-columns: 1fr; }
    .similar-grid { grid-template-columns: 1fr; }
    .fbt-visual { flex-direction: column; }
    .plus { transform: rotate(90deg); }
}
`;
