import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, LogOut, ChevronDown, ArrowRight, MapPin, Languages, IndianRupee, DollarSign, Heart, ShoppingBag } from 'lucide-react';
import AuthModal from '../common/AuthModal';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { listenToCart } from '../../utils/cartUtils';
import { listenToWishlist } from '../../utils/wishlistUtils';

const MAIN_CATEGORIES = ['Electronics', "Men's Fashion", "Women's Fashion", "Home & Living", "Beauty", "Sports", "Accessories", "Today's Deals", "New Arrivals", "Trending"];

const LANGUAGES = [
    { code: 'en', name: 'English', native: 'English' },
    { code: 'hi', name: 'Hindi', native: 'हिंदी' },
    { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
    { code: 'te', name: 'Telugu', native: 'తెలుగు' },
    { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
    { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'bn', name: 'Bengali', native: 'বাংলা' },
    { code: 'mr', name: 'Marathi', native: 'मराठी' }
];

const CURRENCIES = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' }
];

export default function Navbar() {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeMegaMenu, setActiveMegaMenu] = useState(null);
    const [activeSubCategory, setActiveSubCategory] = useState(0);
    const [user, setUser] = useState(null);
    const [cartCount, setCartCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [dynamicMegaData, setDynamicMegaData] = useState({});
    const [locationName, setLocationName] = useState('Select location');
    const [isLangOpen, setIsLangOpen] = useState(false);
    const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
    const [selectedLang, setSelectedLang] = useState(LANGUAGES[0]);
    const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);

    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef(null);

    useEffect(() => {
        const fetchMegaData = async () => {
            try {
                const snap = await getDocs(collection(db, "products"));
                let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Fallback demo data if DB is empty to ensure mega menu is visible
                if (products.length < 5) {
                    const demoItems = [
                        { id: 'e1', name: 'Smart Watch X', price: 12999, category: 'Electronics', subCategory: 'Gadgets', tags: ['Tech', 'Wearable'], image: 'https://images.unsplash.com/photo-1546868871-70ca48370731' },
                        { id: 'e2', name: 'Noise Buds', price: 2999, category: 'Electronics', subCategory: 'Audio', tags: ['Music'], image: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df' },
                        { id: 'm1', name: 'Classic Polo', price: 1499, category: "Men's Fashion", subCategory: 'Apparel', tags: ['Summer'], image: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518' },
                        { id: 'w1', name: 'Silk Saree', price: 4999, category: "Women's Fashion", subCategory: 'Traditional', tags: ['Ethnic'], image: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c' },
                        { id: 'h1', name: 'Wall Art', price: 899, category: 'Home & Living', subCategory: 'Decor', tags: ['Home'], image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38' }
                    ];
                    products = [...products, ...demoItems];
                }

                const mega = {};
                MAIN_CATEGORIES.forEach(cat => {
                    let catProducts;
                    if (cat === "Today's Deals") {
                        catProducts = products.filter(p => p.discount || p.oldPrice || p.id === 'e2');
                    } else if (cat === "New Arrivals") {
                        catProducts = [...products].reverse().slice(0, 10);
                    } else if (cat === "Trending") {
                        catProducts = products.filter(p => (p.rating || 0) >= 4.5 || p.id === 'e1');
                    } else {
                        catProducts = products.filter(p => p.category === cat);
                    }

                    const subGroups = {};
                    catProducts.forEach(p => {
                        const sub = p.subCategory || 'Featured';
                        if (!subGroups[sub]) subGroups[sub] = [];
                        subGroups[sub].push(p);
                    });

                    if (catProducts.length > 0) {
                        mega[cat] = {
                            categories: Object.keys(subGroups).map(sub => ({
                                id: sub.toLowerCase().replace(/\s+/g, '-'),
                                name: sub,
                                items: subGroups[sub].slice(0, 4)
                            })),
                            popular: Array.from(new Set(catProducts.flatMap(p => p.tags || []))).slice(0, 4)
                        };
                    }
                });
                setDynamicMegaData(mega);
            } catch (err) {
                console.error("Error fetching mega menu data:", err);
            }
        };
        fetchMegaData();
    }, []);

    useEffect(() => {
        const unsubscribeCart = listenToCart((items) => {
            const count = items.reduce((acc, item) => acc + (item.quantity || 1), 0);
            setCartCount(count);
        });

        const unsubscribeWishlist = listenToWishlist((items) => {
            setWishlistCount(items.length);
        });

        return () => {
            unsubscribeCart();
            unsubscribeWishlist();
        };
    }, []);

    useEffect(() => {
        const checkUser = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        checkUser();
        const handleUserChange = () => checkUser();
        window.addEventListener('userDataChanged', handleUserChange);

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setActiveMegaMenu(null);
                setIsLangOpen(false);
                setIsCurrencyOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            window.removeEventListener('userDataChanged', handleUserChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSignOut = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsProfileOpen(false);
        window.dispatchEvent(new CustomEvent('userDataChanged'));
        navigate('/');
    };

    const handleLoginSuccess = () => {
        setIsLoginModalOpen(false);
        setIsProfileOpen(false);
    };

    const handleMegaMenuToggle = (cat) => {
        if (activeMegaMenu === cat) {
            setActiveMegaMenu(null);
        } else {
            setActiveMegaMenu(cat);
            setActiveSubCategory(0);
        }
    };

    const handleItemClick = (category, subCategory, item) => {
        setActiveMegaMenu(null);
        navigate(`/products?category=${category}&sub=${subCategory}&item=${item}`);
    };

    return (
        <>
            <nav className="navbar-container" ref={menuRef}>
                <div className="main-nav-wrapper">
                    <div className="container main-nav">
                        <Link to="/" className="brand-logo gradient-text">
                            SELLSATHI
                        </Link>

                        {!location.pathname.startsWith('/checkout') && (
                            <>
                                <div className="nav-location" onClick={() => {
                                    const newLoc = prompt("Enter your PIN code or city:");
                                    if (newLoc) setLocationName(newLoc);
                                }}>
                                    <MapPin size={20} className="pin-icon" />
                                    <div className="location-info">
                                        <span className="label">Deliver to</span>
                                        <span className="value">{locationName}</span>
                                    </div>
                                    <ChevronDown size={14} className="chevron" />
                                </div>

                                <div className="nav-search">
                                    <Search size={18} className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search products, brands and more..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value.trim()) {
                                                const params = new URLSearchParams();
                                                params.set('search', e.target.value.trim());
                                                navigate(`/products?${params.toString()}`);
                                                e.target.blur();
                                            }
                                        }}
                                    />
                                </div>

                                <div className="nav-selectors">
                                    {/* Language Selector */}
                                    <div className="selector-container">
                                        <button
                                            className="selector-trigger"
                                            onClick={() => {
                                                setIsLangOpen(!isLangOpen);
                                            }}
                                        >
                                            <Languages size={18} />
                                            <span>{selectedLang.name}</span>
                                            <ChevronDown size={14} className={isLangOpen ? 'rotate' : ''} />
                                        </button>
                                        {isLangOpen && (
                                            <div className="selector-dropdown glass-card animate-slide-up">
                                                {LANGUAGES.map(lang => (
                                                    <button
                                                        key={lang.code}
                                                        className={selectedLang.code === lang.code ? 'active' : ''}
                                                        onClick={() => {
                                                            setSelectedLang(lang);
                                                            setIsLangOpen(false);
                                                        }}
                                                    >
                                                        <span className="lang-native">{lang.native}</span>
                                                        {selectedLang.code === lang.code && <span className="dot"></span>}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="nav-actions">
                            <Link to="/wishlist" className="btn btn-secondary icon-btn wishlist-btn-nav">
                                <Heart size={20} />
                                {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
                            </Link>

                            <Link to="/checkout" className="btn btn-secondary icon-btn cart-btn-nav">
                                <ShoppingCart size={20} />
                                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                            </Link>

                            {user ? (
                                <div className="profile-dropdown-container">
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="profile-trigger btn btn-secondary"
                                    >
                                        <User size={20} />
                                        <span className="user-name">{user.fullName || 'User'}</span>
                                        <ChevronDown size={14} />
                                    </button>
                                    {isProfileOpen && (
                                        <div className="profile-menu glass-card">
                                            <div className="menu-header">
                                                <div className="avatar">{(user.fullName || 'U').charAt(0).toUpperCase()}</div>
                                                <div className="info">
                                                    <p className="name">{user.fullName || 'User'}</p>
                                                    <p className="email">{user.email || user.phone}</p>
                                                </div>
                                            </div>
                                            <div className="menu-items">
                                                <button onClick={() => {
                                                    const path = user.role === 'ADMIN' ? '/admin' : (user.role === 'SELLER' ? '/seller/dashboard' : '/dashboard');
                                                    navigate(path);
                                                    setIsProfileOpen(false);
                                                }}>
                                                    <ShoppingBag size={16} /> My Dashboard
                                                </button>
                                                <button onClick={() => { setIsLoginModalOpen(true); setIsProfileOpen(false); }}>
                                                    <User size={16} /> Switch Account
                                                </button>
                                                <button onClick={handleSignOut} className="signout-btn">
                                                    <LogOut size={16} /> Sign Out
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <button onClick={() => setIsLoginModalOpen(true)} className="btn btn-secondary icon-btn">
                                    <User size={20} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {!location.pathname.startsWith('/checkout') && (
                    <div className="sub-nav-wrapper" onMouseLeave={() => setActiveMegaMenu(null)}>
                        <div className="sub-nav container">
                            {['Electronics', "Men's Fashion", "Women's Fashion", "Home & Living", "Beauty", "Sports", "Accessories", "Today's Deals", "New Arrivals", "Trending"].map(cat => {
                                let path = `/products?category=${cat}`;
                                if (cat === "Today's Deals") path = "/deals";
                                if (cat === "New Arrivals") path = "/new-arrivals";
                                if (cat === "Trending") path = "/trending";

                                const isMega = !!dynamicMegaData[cat];

                                return (
                                    <div key={cat} className="sub-nav-item">
                                        <Link
                                            to={path}
                                            className={`sub-nav-link ${location.pathname.includes(cat) ? 'active' : ''}`}
                                            onMouseEnter={() => isMega && setActiveMegaMenu(cat)}
                                            onClick={() => setActiveMegaMenu(null)}
                                        >
                                            {cat}
                                            {isMega && <ChevronDown size={12} />}
                                        </Link>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Mega Menu Dropdown */}
                        {activeMegaMenu && dynamicMegaData[activeMegaMenu] && (
                            <div className="mega-menu animate-slide-down" onMouseEnter={() => setActiveMegaMenu(activeMegaMenu)}>
                                <div className="container mega-menu-content">
                                    <div className="mega-sidebar">
                                        <h3 onClick={() => { navigate(`/products?category=${activeMegaMenu}`); setActiveMegaMenu(null); }} style={{ cursor: 'pointer' }}>
                                            {activeMegaMenu}
                                        </h3>
                                        <div className="sidebar-items">
                                            {dynamicMegaData[activeMegaMenu].categories.map((scat, idx) => (
                                                <button
                                                    key={scat.id}
                                                    className={activeSubCategory === idx ? 'active' : ''}
                                                    onMouseEnter={() => setActiveSubCategory(idx)}
                                                    onClick={() => { navigate(`/products?category=${activeMegaMenu}&sub=${scat.name}`); setActiveMegaMenu(null); }}
                                                >
                                                    {scat.name}
                                                    <ArrowRight size={14} className="arrow" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mega-main">
                                        {dynamicMegaData[activeMegaMenu].categories[activeSubCategory] && (
                                            <>
                                                <div className="mega-title-row">
                                                    <h4>{dynamicMegaData[activeMegaMenu].categories[activeSubCategory].name}</h4>
                                                </div>
                                                <div className="mega-grid">
                                                    {dynamicMegaData[activeMegaMenu].categories[activeSubCategory].items.map((item, idx) => (
                                                        <div
                                                            key={item.id}
                                                            className="mega-item-card"
                                                            onClick={() => { navigate(`/product/${item.id}`); setActiveMegaMenu(null); }}
                                                        >
                                                            <div className="img-box">
                                                                <img src={item.images?.[0] || item.image || item.imageUrl} alt={item.name} />
                                                            </div>
                                                            <div className="item-info">
                                                                <h5>{item.name}</h5>
                                                                <p>₹{item.price?.toLocaleString()}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </>
                                        )}

                                        <div className="mega-footer">
                                            <div className="popular-tags">
                                                <span className="label">Popular Tags:</span>
                                                {dynamicMegaData[activeMegaMenu].popular.map(tag => (
                                                    <Link key={tag} to={`/products?search=${tag}`} className="tag" onClick={() => setActiveMegaMenu(null)}>{tag}</Link>
                                                ))}
                                            </div>
                                            <Link to={`/products?category=${activeMegaMenu}`} className="explore-link" onClick={() => setActiveMegaMenu(null)}>
                                                Explore {activeMegaMenu} <ArrowRight size={14} />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </nav >

            <style>{navStyles}</style>

            <AuthModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSuccess={handleLoginSuccess}
            />
        </>
    );
}

const navStyles = `
/* Mega Menu specific styles */
.navbar-container {
    position: sticky;
    top: 0;
    z-index: 1000;
    background: white;
    box-shadow: 0 2px 10px rgba(0,0,0,0.05);
}

.main-nav-wrapper {
    background: white;
    border-bottom: 1px solid var(--border);
}

.main-nav {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    padding: 0.75rem 2rem;
}

.nav-location {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    transition: 0.2s;
    min-width: 140px;
}

.nav-location:hover {
    background: #f3f4f6;
}

.nav-location .pin-icon {
    color: #4B5563;
}

.nav-location .location-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.nav-location .label {
    font-size: 0.75rem;
    color: #6B7280;
    line-height: 1;
    margin-bottom: 2px;
}

.nav-location .value {
    font-size: 0.85rem;
    font-weight: 700;
    color: #111827;
    line-height: 1;
}

.nav-location .chevron {
    color: #9CA3AF;
    margin-left: 0.25rem;
}

.nav-selectors {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.selector-container {
    position: relative;
}

.selector-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border-radius: 8px;
    background: #f3f4f6;
    border: none;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.85rem;
    color: #4B5563;
    transition: 0.2s;
}

.selector-trigger:hover {
    background: #e5e7eb;
}

.selector-trigger .rotate {
    transform: rotate(180deg);
}

.selector-trigger svg {
    transition: 0.3s;
}

.currency-symbol-btn {
    font-weight: 800;
    font-size: 1rem;
    color: var(--primary);
}

.selector-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    width: 220px;
    padding: 0.5rem;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.currency-dropdown {
    width: 240px;
}

.selector-dropdown button {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0.75rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text);
    transition: 0.2s;
    background: transparent;
    border: none;
}

.selector-dropdown button:hover {
    background: var(--surface-hover);
}

.selector-dropdown button.active {
    background: hsla(230, 85%, 60%, 0.05);
    color: var(--primary);
    font-weight: 700;
}

.lang-native {
    flex: 1;
    text-align: left;
}

.dot {
    width: 6px;
    height: 6px;
    background: var(--primary);
    border-radius: 50%;
}

.curr-symbol {
    width: 24px;
    font-weight: 800;
    color: var(--primary);
    font-size: 1.1rem;
}

.curr-name {
    flex: 1;
    text-align: left;
}

.curr-code-fade {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.sub-nav-wrapper {
    position: relative;
    background: white;
}

.sub-nav {
    display: flex;
    gap: 2.5rem;
    padding: 0.75rem 0;
}

.sub-nav-link {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.9rem;
    font-weight: 700;
    color: #4B5563;
    transition: 0.2s;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 0.25rem 0;
    position: relative;
}

.sub-nav-link:hover, .sub-nav-link.active {
    color: var(--primary);
}

.sub-nav-link.active::after {
    content: '';
    position: absolute;
    bottom: -0.75rem;
    left: 0;
    width: 100%;
    height: 3px;
    background: var(--primary);
}

.sub-nav-link svg {
    transition: 0.3s;
}

.sub-nav-link svg.rotate {
    transform: rotate(180deg);
}

/* Mega Menu Content */
.mega-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: white;
    border-top: 1px solid var(--border);
    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    z-index: 999;
}

.mega-menu-content {
    display: grid;
    grid-template-columns: 280px 1fr;
    min-height: 450px;
}

.mega-sidebar {
    padding: 2.5rem 2rem;
    border-right: 1px solid var(--border);
    background: #fcfcfe;
}

.mega-sidebar h3 {
    font-size: 1.25rem;
    font-weight: 800;
    margin-bottom: 2rem;
    color: var(--text);
}

.sidebar-items {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.sidebar-items button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-radius: 12px;
    font-weight: 600;
    font-size: 0.95rem;
    color: #4B5563;
    text-align: left;
    transition: 0.2s;
}

.sidebar-items button:hover {
    background: hsla(230, 85%, 60%, 0.05);
    color: var(--primary);
}

.sidebar-items button.active {
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    color: var(--primary);
    border: 1px solid hsla(230, 85%, 60%, 0.1);
}

.sidebar-items .arrow {
    opacity: 0;
    transform: translateX(-5px);
    transition: 0.3s;
}

.sidebar-items button.active .arrow {
    opacity: 1;
    transform: translateX(0);
}

.mega-main {
    padding: 2.5rem 3rem;
    display: flex;
    flex-direction: column;
}

.mega-title-row {
    margin-bottom: 2rem;
}

.mega-title-row h4 {
    font-size: 1.4rem;
    font-weight: 800;
}

.mega-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
    flex: 1;
}

.mega-item-card {
    cursor: pointer;
    transition: 0.3s;
}

.mega-item-card:hover {
    transform: translateY(-5px);
}

.mega-item-card .img-box {
    height: 160px;
    background: #f9f9fb;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
}

.mega-item-card .img-box img {
    max-width: 100%;
    max-height: 100%;
    object-fit: cover;
}

.item-info h5 {
    font-size: 1rem;
    font-weight: 800;
    margin-bottom: 0.25rem;
}

.item-info p {
    font-size: 0.8rem;
    color: var(--text-muted);
}

.mega-footer {
    margin-top: 3rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.popular-tags {
    display: flex;
    align-items: center;
    gap: 1rem;
}

.popular-tags .label {
    font-weight: 700;
    font-size: 0.9rem;
}

.popular-tags .tag {
    font-size: 0.85rem;
    color: var(--text-muted);
    font-weight: 500;
    transition: 0.2s;
}

.popular-tags .tag:hover {
    color: var(--primary);
}

.explore-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    color: var(--primary);
    font-size: 0.95rem;
}

/* Animations */
@keyframes navFadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-slide-down {
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Search and profile styles inherited and slightly tweaked for wrapper */
.cart-btn-nav, .wishlist-btn-nav { position: relative; }
.cart-badge, .wishlist-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #E11D48;
    color: white;
    font-size: 0.7rem;
    font-weight: 800;
    min-width: 18px;
    height: 18px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
.brand-logo { font-size: 1.5rem; font-weight: 800; letter-spacing: -1px; }
.nav-search { flex: 1; max-width: 600px; margin: 0 1rem; position: relative; }
.search-icon { position: absolute; left: 1rem; top: 50%; transform: translateY(-50%); opacity: 0.4; color: var(--text); }
.nav-search input { width: 100%; padding: 0.6rem 1rem 0.6rem 2.8rem; background: var(--surface); border: 1px solid var(--border); border-radius: 99px; font-size: 0.9rem; transition: 0.3s; }
.nav-search input:focus { border-color: var(--primary); background: white; box-shadow: 0 0 0 4px hsla(230, 85%, 60%, 0.1); }
.nav-actions { display: flex; gap: 0.75rem; align-items: center; }
.icon-btn { width: 42px; height: 42px; padding: 0; border-radius: 50%; }
.profile-dropdown-container { position: relative; }
.profile-trigger { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 1rem; border-radius: 99px; }
.user-name { font-size: 0.9rem; font-weight: 600; max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu { position: absolute; top: calc(100% + 10px); right: 0; width: 280px; padding: 0.5rem; z-index: 1001; animation: navFadeIn 0.2s ease-out; }
.menu-header { display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--border); }
.avatar { width: 40px; height: 40px; background: var(--primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; }
.menu-header .info p { margin: 0; }
.menu-header .info .name { font-weight: 700; font-size: 0.95rem; }
.menu-header .info .email { font-size: 0.8rem; color: var(--text-muted); }
.menu-items { padding-top: 0.5rem; }
.menu-items button { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; border-radius: 8px; font-size: 0.9rem; font-weight: 500; color: var(--text); transition: 0.2s; }
.menu-items button:hover { background: var(--surface-hover); }
.signout-btn { color: var(--error) !important; }
`;
