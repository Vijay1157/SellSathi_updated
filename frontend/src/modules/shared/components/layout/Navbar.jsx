import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, LogOut, ChevronDown, ArrowRight, Heart, ShoppingBag } from 'lucide-react';
import AuthModal from '@/modules/auth/components/AuthModal';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '@/modules/shared/config/firebase';
import { listenToCart } from '@/modules/shared/utils/cartUtils';
import { listenToWishlist } from '@/modules/shared/utils/wishlistUtils';
import { MAIN_CATEGORIES, SPECIAL_CATEGORIES, SUBCATEGORIES, ALL_SUBCATEGORIES } from '@/modules/shared/config/categories';
import { fetchWithCache } from '@/modules/shared/utils/firestoreCache';

export default function Navbar() {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [activeMegaMenu, setActiveMegaMenu] = useState(null);
    const [activeSubCategory, setActiveSubCategory] = useState(0);
    const [showAllSubcategories, setShowAllSubcategories] = useState(false);
    const [user, setUser] = useState(null);
    const [cartCount, setCartCount] = useState(0);
    const [wishlistCount, setWishlistCount] = useState(0);
    const [dynamicMegaData, setDynamicMegaData] = useState({});
    const [showCategories, setShowCategories] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const menuRef = useRef(null);
    const profileRef = useRef(null);

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    useEffect(() => {
        const fetchMegaData = async () => {
            try {
                // Use cache with 10 minute TTL to reduce Firestore reads
                const products = await fetchWithCache(
                    'navbar_products',
                    async () => {
                        // Limit to 100 products instead of fetching ALL
                        const q = query(collection(db, "products"), limit(100));
                        const snap = await getDocs(q);
                        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                    },
                    10 * 60 * 1000 // 10 minutes cache
                );

                // Only proceed if we have products from database
                if (products.length === 0) {
                    setDynamicMegaData({});
                    return;
                }

                const mega = {};
                [...MAIN_CATEGORIES, ...SPECIAL_CATEGORIES].forEach(cat => {
                    let catProducts;
                    if (cat === "Today's Deals") {
                        catProducts = products.filter(p => p.discount || p.oldPrice);
                    } else if (cat === "New Arrivals") {
                        catProducts = [...products].reverse().slice(0, 10);
                    } else if (cat === "Trending") {
                        catProducts = products.filter(p => (p.rating || 0) >= 4.5);
                    } else if (cat === "Men's Fashion") {
                        catProducts = products.filter(p =>
                            p.category === "Men's Fashion" ||
                            p.category === "Fashion" ||
                            p.category === "Mens Fashion" ||
                            p.category === "Men Fashion" ||
                            p.subCategory?.toLowerCase().includes('men') ||
                            p.name?.toLowerCase().includes('men')
                        );
                    } else if (cat === "Women's Fashion") {
                        catProducts = products.filter(p =>
                            p.category === "Women's Fashion" ||
                            p.category === "Fashion" ||
                            p.category === "Womens Fashion" ||
                            p.category === "Women Fashion" ||
                            p.subCategory?.toLowerCase().includes('women') ||
                            p.name?.toLowerCase().includes('women')
                        );
                    } else if (cat === "Books & Stationery") {
                        catProducts = products.filter(p =>
                            p.category === "Books & Stationery" ||
                            p.category === "Books" ||
                            p.category === "Stationery" ||
                            p.subCategory?.toLowerCase().includes('book') ||
                            p.subCategory?.toLowerCase().includes('stationery')
                        );
                    } else if (cat === "Food & Beverages") {
                        catProducts = products.filter(p =>
                            p.category === "Food & Beverages" ||
                            p.category === "Food" ||
                            p.category === "Beverages" ||
                            p.subCategory?.toLowerCase().includes('food') ||
                            p.subCategory?.toLowerCase().includes('beverage')
                        );
                    } else if (cat === "Handicrafts") {
                        catProducts = products.filter(p =>
                            p.category === "Handicrafts" ||
                            p.category === "Handicraft" ||
                            p.subCategory?.toLowerCase().includes('handicraft') ||
                            p.subCategory?.toLowerCase().includes('handmade')
                        );
                    } else {
                        // For other categories, try exact match first, then fuzzy match
                        catProducts = products.filter(p => 
                            p.category === cat ||
                            p.category?.toLowerCase().includes(cat.toLowerCase()) ||
                            p.subCategory?.toLowerCase().includes(cat.toLowerCase())
                        );
                    }

                    const subGroups = {};
                    catProducts.forEach(p => {
                        const sub = p.subCategory || 'Featured';
                        if (!subGroups[sub]) subGroups[sub] = [];
                        subGroups[sub].push(p);
                    });

                    // Create mega menu data only if products exist for this category
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
                    // If no products, don't create mega menu data - category will still be clickable but won't show dropdown
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
            }
            // Close profile dropdown when clicking outside
            if (profileRef.current && !profileRef.current.contains(event.target)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);

        const handleOpenLogin = () => setIsLoginModalOpen(true);
        window.addEventListener('openLoginModal', handleOpenLogin);

        return () => {
            window.removeEventListener('userDataChanged', handleUserChange);
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('openLoginModal', handleOpenLogin);
        };
    }, []);

    const handleSignOut = () => {
        localStorage.removeItem('user');
        localStorage.removeItem('userName');
        localStorage.removeItem('dob');
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

    const handleSubCategoryClick = (category, subcategory) => {
        setActiveMegaMenu(null);
        navigate(`/products?category=${encodeURIComponent(category)}&subcategory=${encodeURIComponent(subcategory)}`);
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
                        {location.pathname === '/' ? (
                            <div className="brand-logo gradient-text" style={{ cursor: 'default' }}>
                                SELLSATHI
                            </div>
                        ) : (
                            <Link to="/" className="brand-logo gradient-text">
                                SELLSATHI
                            </Link>
                        )}

                        {!location.pathname.startsWith('/checkout') && (
                            <>
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

                                <Link 
                                    to="/seller/register" 
                                    className="btn btn-seller"
                                >
                                    Become a Seller
                                </Link>
                            </>
                        )}

                        <div className="nav-actions">
                            <Link
                                to={user ? "/wishlist" : "#"}
                                onClick={(e) => {
                                    if (!user) {
                                        e.preventDefault();
                                        setIsLoginModalOpen(true);
                                    }
                                }}
                                className="btn btn-secondary icon-btn wishlist-btn-nav"
                            >
                                <Heart size={20} />
                                {wishlistCount > 0 && <span className="wishlist-badge">{wishlistCount}</span>}
                            </Link>

                            <Link
                                to={user ? "/cart" : "#"}
                                onClick={(e) => {
                                    if (!user) {
                                        e.preventDefault();
                                        setIsLoginModalOpen(true);
                                    }
                                }}
                                className="btn btn-secondary icon-btn cart-btn-nav"
                            >
                                <ShoppingCart size={20} />
                                {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
                            </Link>

                            {user ? (
                                <div className="profile-dropdown-container" ref={profileRef}>
                                    <button
                                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                                        className="btn btn-secondary icon-btn"
                                    >
                                        <User size={20} />
                                    </button>
                                    {isProfileOpen && (
                                        <div className="profile-menu">
                                            <div className="menu-header">
                                                <div className="avatar">{(user.fullName || 'U').charAt(0).toUpperCase()}</div>
                                                <div className="info">
                                                    <p className="name">{localStorage.getItem('userName') || user.fullName || 'User'}</p>
                                                    <p className="email">{user.phone ? (user.phone.startsWith('+') ? user.phone : '+91' + user.phone) : ''}</p>
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

                {/* Hover trigger area for categories */}
                {!location.pathname.startsWith('/checkout') && (
                    <div 
                        className="category-trigger-area"
                        onMouseEnter={() => setShowCategories(true)}
                    />
                )}

                {!location.pathname.startsWith('/checkout') && (
                    <div 
                        className="sub-nav-wrapper"
                        style={{ display: showCategories ? 'block' : 'none' }}
                        onMouseEnter={() => setShowCategories(true)}
                        onMouseLeave={() => {
                            if (!activeMegaMenu) {
                                setShowCategories(false);
                            }
                        }}
                    >
                        <div className="container">
                            {/* First Row - Product Categories */}
                            <div className="sub-nav sub-nav-primary">
                                {MAIN_CATEGORIES.map(cat => {
                                    let path = `/products?category=${cat}`;
                                    // Show mega menu if category has subcategories defined
                                    const isMega = !!SUBCATEGORIES[cat];

                                    return (
                                        <div key={cat} className="sub-nav-item">
                                            <Link
                                                to={path}
                                                className={`sub-nav-link ${location.pathname.includes(cat) ? 'active' : ''}`}
                                                onMouseEnter={() => {
                                                    if (isMega) {
                                                        setActiveMegaMenu(cat);
                                                        setShowAllSubcategories(false);
                                                        setActiveSubCategory(0);
                                                    }
                                                }}
                                                onClick={() => {
                                                    setActiveMegaMenu(null);
                                                    setShowCategories(false);
                                                }}
                                            >
                                                {cat}
                                                {isMega && <ChevronDown size={12} />}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Second Row - Special Categories */}
                            <div className="sub-nav sub-nav-secondary">
                                {SPECIAL_CATEGORIES.map(cat => {
                                    let path = `/products?category=${cat}`;
                                    if (cat === "Today's Deals") path = "/deals";
                                    if (cat === "New Arrivals") path = "/new-arrivals";
                                    if (cat === "Trending") path = "/trending";

                                    // Show mega menu if category has subcategories defined
                                    const isMega = !!SUBCATEGORIES[cat];

                                    return (
                                        <div key={cat} className="sub-nav-item">
                                            <Link
                                                to={path}
                                                className={`sub-nav-link ${location.pathname.includes(cat) ? 'active' : ''}`}
                                                onMouseEnter={() => {
                                                    if (isMega) {
                                                        setActiveMegaMenu(cat);
                                                        setShowAllSubcategories(false);
                                                        setActiveSubCategory(0);
                                                    }
                                                }}
                                                onClick={() => {
                                                    setActiveMegaMenu(null);
                                                    setShowCategories(false);
                                                }}
                                            >
                                                {cat}
                                                {isMega && <ChevronDown size={12} />}
                                            </Link>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Mega Menu Dropdown */}
                        {activeMegaMenu && (
                            <div 
                                className="mega-menu animate-slide-down" 
                                onMouseEnter={() => {
                                    setActiveMegaMenu(activeMegaMenu);
                                    setShowCategories(true);
                                }}
                                onMouseLeave={() => {
                                    setActiveMegaMenu(null);
                                    setShowCategories(false);
                                }}
                            >
                                <div className="container mega-menu-content">
                                    <div className="mega-sidebar">
                                        <h3 onClick={() => { navigate(`/products?category=${encodeURIComponent(activeMegaMenu)}`); setActiveMegaMenu(null); }} style={{ cursor: 'pointer' }}>
                                            {activeMegaMenu}
                                        </h3>
                                        <div className="sidebar-items">
                                            {/* Show first 4 subcategories or all if expanded */}
                                            {(showAllSubcategories ? ALL_SUBCATEGORIES[activeMegaMenu] : SUBCATEGORIES[activeMegaMenu])?.map((subcategory, idx) => (
                                                <button
                                                    key={subcategory}
                                                    className={activeSubCategory === idx ? 'active' : ''}
                                                    onMouseEnter={() => setActiveSubCategory(idx)}
                                                    onClick={() => handleSubCategoryClick(activeMegaMenu, subcategory)}
                                                >
                                                    {subcategory}
                                                    <ArrowRight size={14} className="arrow" />
                                                </button>
                                            ))}
                                            {/* Other button - only show if not expanded */}
                                            {!showAllSubcategories && (
                                                <button
                                                    className="other-btn"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowAllSubcategories(true);
                                                    }}
                                                >
                                                    Other
                                                    <ArrowRight size={14} className="arrow" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mega-main">
                                        {SUBCATEGORIES[activeMegaMenu]?.[activeSubCategory] || ALL_SUBCATEGORIES[activeMegaMenu]?.[activeSubCategory] ? (
                                            <>
                                                <div className="mega-title-row">
                                                    <h4>{(showAllSubcategories ? ALL_SUBCATEGORIES : SUBCATEGORIES)[activeMegaMenu][activeSubCategory]}</h4>
                                                </div>
                                                {dynamicMegaData[activeMegaMenu]?.categories[activeSubCategory]?.items?.length > 0 ? (
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
                                                ) : (
                                                    <div className="mega-empty-state">
                                                        <p>Browse {(showAllSubcategories ? ALL_SUBCATEGORIES : SUBCATEGORIES)[activeMegaMenu][activeSubCategory]} products</p>
                                                        <button
                                                            className="btn btn-primary"
                                                            onClick={() => { 
                                                                const subcatName = (showAllSubcategories ? ALL_SUBCATEGORIES : SUBCATEGORIES)[activeMegaMenu][activeSubCategory];
                                                                navigate(`/products?category=${encodeURIComponent(activeMegaMenu)}&subcategory=${encodeURIComponent(subcatName)}`); 
                                                                setActiveMegaMenu(null); 
                                                            }}
                                                        >
                                                            Browse All {(showAllSubcategories ? ALL_SUBCATEGORIES : SUBCATEGORIES)[activeMegaMenu][activeSubCategory]}
                                                        </button>
                                                    </div>
                                                )}
                                            </>
                                        ) : null}

                                        <div className="mega-footer">
                                            <div className="popular-tags">
                                                <span className="label">Popular Tags:</span>
                                                {dynamicMegaData[activeMegaMenu]?.popular?.map(tag => (
                                                    <Link key={tag} to={`/products?search=${tag}`} className="tag" onClick={() => setActiveMegaMenu(null)}>{tag}</Link>
                                                ))}
                                            </div>
                                            <Link to={`/products?category=${encodeURIComponent(activeMegaMenu)}`} className="explore-link" onClick={() => setActiveMegaMenu(null)}>
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
/* Professional Navbar - 70px Header Height */
.navbar-container {
    position: sticky;
    top: 0;
    z-index: 1020;
    background: #FFFFFF;
    box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
}

.category-trigger-area {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 10px;
    z-index: 1019;
}

.main-nav-wrapper {
    background: #FFFFFF;
    border-bottom: 1px solid #E5E7EB;
    position: relative;
}

.main-nav {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 16px 24px;
    height: 70px;
    background: #FFFFFF;
}

.brand-logo { 
    font-size: 28px; 
    font-weight: 900; 
    letter-spacing: -0.5px;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    transition: all 300ms;
    text-decoration: none;
}

.brand-logo:hover {
    transform: scale(1.05);
    filter: brightness(1.2);
}

.nav-location {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px 12px;
    border-radius: 8px;
    transition: background 200ms;
    min-width: 140px;
}

.nav-location:hover {
    background: #F9FAFB;
}

.nav-location .pin-icon {
    color: var(--text-secondary);
}

.nav-location .location-info {
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.nav-location .label {
    font-size: var(--text-xs, 12px);
    color: var(--text-secondary);
    line-height: 1;
    margin-bottom: 2px;
}

.nav-location .value {
    font-size: var(--text-sm, 14px);
    font-weight: var(--font-bold, 700);
    color: var(--text-primary);
    line-height: 1;
}

.nav-location .chevron {
    color: var(--text-tertiary);
    margin-left: var(--space-1, 4px);
}

.nav-selectors {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
}

.selector-container {
    position: relative;
}

.selector-trigger {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    padding: var(--space-2, 8px) var(--space-3, 12px);
    border-radius: var(--radius-md, 8px);
    background: var(--gray-50);
    border: none;
    cursor: pointer;
    font-weight: var(--font-semibold, 600);
    font-size: var(--text-sm, 14px);
    color: var(--text-secondary);
    transition: background var(--transition-base, 200ms);
}

.selector-trigger:hover {
    background: var(--gray-100);
}

.selector-trigger .rotate {
    transform: rotate(180deg);
}

.selector-trigger svg {
    transition: transform var(--transition-base, 200ms);
}

.currency-symbol-btn {
    font-weight: var(--font-extrabold, 800);
    font-size: var(--text-lg, 18px);
    color: var(--primary);
}

.selector-dropdown {
    position: absolute;
    top: calc(100% + var(--space-2, 8px));
    right: 0;
    width: 220px;
    padding: var(--space-2, 8px);
    z-index: var(--z-dropdown, 1000);
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: #FFFFFF;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    border: 1px solid #E5E7EB;
}

.currency-dropdown {
    width: 240px;
}

.selector-dropdown button {
    width: 100%;
    display: flex;
    align-items: center;
    padding: var(--space-3, 12px) var(--space-4, 16px);
    border-radius: var(--radius-md, 8px);
    font-size: var(--text-sm, 14px);
    font-weight: var(--font-medium, 500);
    color: var(--text-primary);
    transition: background var(--transition-base, 200ms);
    background: transparent;
    border: none;
}

.selector-dropdown button:hover {
    background: var(--gray-50);
}

.selector-dropdown button.active {
    background: var(--primary-light);
    color: var(--primary);
    font-weight: var(--font-bold, 700);
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
    font-weight: var(--font-extrabold, 800);
    color: var(--primary);
    font-size: var(--text-lg, 18px);
}

.curr-name {
    flex: 1;
    text-align: left;
}

.curr-code-fade {
    font-size: var(--text-xs, 12px);
    color: var(--text-secondary);
}

.sub-nav-wrapper {
    position: relative;
    background: #FFFFFF;
    border-bottom: 1px solid #E5E7EB;
}

.sub-nav {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1.8rem;
    width: 100%;
}

.sub-nav-primary {
    padding: 10px 0 6px 0;
    border-bottom: 1px solid #F3F4F6;
}

.sub-nav-secondary {
    padding: 6px 0 10px 0;
    gap: 2.5rem;
}

.sub-nav-link {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 700;
    color: #6B7280;
    transition: all 200ms;
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 6px 10px;
    position: relative;
    white-space: nowrap;
    border-radius: 6px;
}

.sub-nav-secondary .sub-nav-link {
    font-size: 12px;
    padding: 5px 12px;
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
}

.sub-nav-link:hover, .sub-nav-link.active {
    color: #2563EB;
    background: #EFF6FF;
}

.sub-nav-secondary .sub-nav-link:hover,
.sub-nav-secondary .sub-nav-link.active {
    background: #DBEAFE;
    border-color: #93C5FD;
}

.sub-nav-link.active::after {
    content: '';
    position: absolute;
    bottom: -6px;
    left: 50%;
    transform: translateX(-50%);
    width: 40%;
    height: 2px;
    background: #2563EB;
    border-radius: 2px;
}

.sub-nav-secondary .sub-nav-link.active::after {
    display: none;
}

.sub-nav-link svg {
    transition: transform 200ms;
    flex-shrink: 0;
}

.sub-nav-link svg.rotate {
    transform: rotate(180deg);
}

/* Responsive Category Navigation */
@media (max-width: 1400px) {
    .sub-nav {
        gap: 1.5rem;
    }
    .sub-nav-secondary {
        gap: 2rem;
    }
    .sub-nav-link {
        font-size: 12px;
        padding: 5px 8px;
    }
    .sub-nav-secondary .sub-nav-link {
        font-size: 11px;
        padding: 4px 10px;
    }
}

@media (max-width: 1200px) {
    .sub-nav {
        gap: 1.2rem;
    }
    .sub-nav-secondary {
        gap: 1.5rem;
    }
    .sub-nav-link {
        font-size: 11.5px;
        padding: 4px 7px;
    }
    .sub-nav-secondary .sub-nav-link {
        font-size: 10.5px;
        padding: 4px 8px;
    }
}

@media (max-width: 1024px) {
    .sub-nav {
        gap: 1rem;
        flex-wrap: wrap;
    }
    .sub-nav-secondary {
        gap: 1.2rem;
    }
    .sub-nav-link {
        font-size: 11px;
        padding: 4px 6px;
    }
    .sub-nav-secondary .sub-nav-link {
        font-size: 10px;
        padding: 3px 7px;
    }
}

@media (max-width: 768px) {
    .sub-nav {
        gap: 0.8rem;
        justify-content: flex-start;
        overflow-x: auto;
        flex-wrap: nowrap;
        scrollbar-width: none;
        -ms-overflow-style: none;
        padding: 8px 0;
    }
    .sub-nav::-webkit-scrollbar {
        display: none;
    }
    .sub-nav-primary {
        padding: 8px 0 4px 0;
    }
    .sub-nav-secondary {
        padding: 4px 0 8px 0;
        gap: 1rem;
    }
    .sub-nav-link {
        font-size: 10px;
        padding: 4px 6px;
        flex-shrink: 0;
    }
    .sub-nav-secondary .sub-nav-link {
        font-size: 9px;
        padding: 3px 6px;
    }
}

/* Mega Menu Content - Professional Spacing */
.mega-menu {
    position: absolute;
    top: 100%;
    left: 0;
    width: 100%;
    background: #FFFFFF;
    border-top: 1px solid #E5E7EB;
    box-shadow: 0 12px 24px 0 rgba(0, 0, 0, 0.12);
    z-index: 1000;
}

.mega-menu-content {
    display: grid;
    grid-template-columns: 240px 1fr;
    height: 420px;
    background: #FFFFFF;
}

.mega-sidebar {
    padding: 24px 20px;
    border-right: 1px solid #E5E7EB;
    background: #F9FAFB;
    overflow-y: auto;
    height: 420px;
}

.mega-sidebar h3 {
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 20px;
    color: #111827;
}

.sidebar-items {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.sidebar-items button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 14px;
    color: #6B7280;
    text-align: left;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    background: transparent;
    border: none;
    cursor: pointer;
}

.sidebar-items button.other-btn {
    margin-top: 8px;
    border-top: 1px solid #E5E7EB;
    padding-top: 14px;
    color: #2563EB;
    font-weight: 700;
}

.sidebar-items button:hover {
    background: #DBEAFE;
    color: #2563EB;
}

.sidebar-items button.active {
    background: #FFFFFF;
    box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.08);
    color: #2563EB;
    border: 1px solid #DBEAFE;
}

.sidebar-items .arrow {
    opacity: 0;
    transform: translateX(-5px);
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-items button.active .arrow {
    opacity: 1;
    transform: translateX(0);
}

.mega-main {
    padding: 24px 32px;
    display: flex;
    flex-direction: column;
    background: #FFFFFF;
    overflow-y: auto;
    height: 420px;
}

.mega-title-row {
    margin-bottom: 20px;
}

.mega-title-row h4 {
    font-size: 22px;
    font-weight: 800;
    color: #111827;
}

.mega-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    flex: 1;
}

/* Other Subcategories Grid */
.other-subcategories-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 20px;
    background: #F9FAFB;
    border-radius: 12px;
}

.other-subcategory-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: #FFFFFF;
    border: 1px solid #E5E7EB;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    color: #111827;
    cursor: pointer;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.other-subcategory-item:hover {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #FFFFFF;
    border-color: transparent;
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(37, 99, 235, 0.25);
}

.other-subcategory-item svg {
    opacity: 0;
    transform: translateX(-5px);
    transition: all 200ms;
}

.other-subcategory-item:hover svg {
    opacity: 1;
    transform: translateX(0);
}

.mega-item-card {
    cursor: pointer;
    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
    background: #FFFFFF;
    border-radius: 10px;
    padding: 10px;
    border: 1px solid #F3F4F6;
}

.mega-item-card:hover {
    transform: translateY(-3px);
    box-shadow: 0 6px 12px 0 rgba(0, 0, 0, 0.1);
    border-color: #E5E7EB;
}

.mega-item-card .img-box {
    height: 120px;
    background: #F9FAFB;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 10px;
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
    font-size: 14px;
    font-weight: var(--font-bold, 700);
    margin-bottom: var(--space-1, 4px);
    color: #111827;
}

.item-info p {
    font-size: 13px;
    color: #6B7280;
}

.mega-footer {
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid #E5E7EB;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #FFFFFF;
}

.popular-tags {
    display: flex;
    align-items: center;
    gap: 12px;
}

.popular-tags .label {
    font-weight: 700;
    font-size: 13px;
}

.popular-tags .tag {
    font-size: 13px;
    color: #6B7280;
    font-weight: 500;
    transition: color 200ms;
}

.popular-tags .tag:hover {
    color: #2563EB;
}

.explore-link {
    display: flex;
    align-items: center;
    gap: var(--space-2, 8px);
    font-weight: var(--font-bold, 700);
    color: var(--primary);
    font-size: var(--text-base, 16px);
}

/* Mega Menu Empty State */
.mega-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 48px;
    text-align: center;
    flex: 1;
    background: linear-gradient(135deg, #F9FAFB 0%, #FFFFFF 100%);
    border-radius: 16px;
    margin: 20px;
}

.mega-empty-state p {
    color: #111827;
    margin-bottom: 24px;
    font-size: 18px;
    font-weight: 600;
    background: linear-gradient(135deg, #6B7280 0%, #111827 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

.mega-empty-state .btn-primary {
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #FFFFFF;
    padding: 14px 32px;
    border-radius: 10px;
    border: none;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
    transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.mega-empty-state .btn-primary:hover {
    background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
    transform: translateY(-3px);
    box-shadow: 0 8px 20px rgba(37, 99, 235, 0.35);
}

.mega-empty-state .btn-primary:active {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
}

/* Animations */
@keyframes navFadeIn {
    from { opacity: 0; transform: translateY(var(--space-2, 8px)); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-slide-down {
    animation: slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideDown {
    from { opacity: 0; transform: translateY(calc(-1 * var(--space-2, 8px))); }
    to { opacity: 1; transform: translateY(0); }
}

.animate-slide-up {
    animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUp {
    from { opacity: 0; transform: translateY(var(--space-2, 8px)); }
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
/* Search and Actions */
.nav-search { 
    flex: 1; 
    max-width: 600px; 
    margin: 0 var(--space-4, 16px); 
    position: relative; 
}
.search-icon { 
    position: absolute; 
    left: var(--space-4, 16px); 
    top: 50%; 
    transform: translateY(-50%); 
    opacity: 0.4; 
    color: var(--text-primary); 
}
.nav-search input { 
    width: 100%; 
    padding: var(--space-3, 12px) var(--space-4, 16px) var(--space-3, 12px) var(--space-10, 40px); 
    background: var(--gray-50); 
    border: 2px solid #E5E7EB; 
    border-radius: var(--radius-full, 9999px); 
    font-size: var(--text-sm, 14px); 
    transition: all var(--transition-base, 200ms); 
}
.nav-search input:focus { 
    border-color: var(--primary); 
    background: var(--white); 
    box-shadow: 0 0 0 4px var(--primary-light); 
    outline: none;
}

.btn-seller {
    padding: 10px 20px;
    background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%);
    color: #FFFFFF;
    font-weight: 700;
    font-size: 14px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    transition: all 200ms;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

.btn-seller:hover {
    background: linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.nav-actions { 
    display: flex; 
    gap: 12px; 
    align-items: center;
    height: 44px;
}

.icon-btn { 
    width: 44px; 
    height: 44px; 
    padding: 0; 
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #F3F4F6;
    border: 1px solid #E5E7EB;
    color: #6B7280;
    transition: all 200ms;
    cursor: pointer;
}

.icon-btn:hover {
    background: #E5E7EB;
    color: #111827;
}

.profile-dropdown-container { 
    position: relative;
    height: 44px;
    display: flex;
    align-items: center;
}

.cart-btn-nav, .wishlist-btn-nav { 
    position: relative;
    height: 44px;
}

.cart-badge, .wishlist-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    background: #EF4444;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    min-width: 20px;
    height: 20px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #FFFFFF;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.profile-menu { 
    position: absolute; 
    top: calc(100% + var(--space-2, 8px)); 
    right: 0; 
    width: 280px; 
    padding: var(--space-2, 8px); 
    z-index: var(--z-dropdown, 1000); 
    animation: navFadeIn 0.2s ease-out;
    background: #FFFFFF;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
    border: 1px solid #E5E7EB;
}
.menu-header { 
    display: flex; 
    align-items: center; 
    gap: var(--space-4, 16px); 
    padding: var(--space-4, 16px); 
    border-bottom: 1px solid var(--border-light); 
}
.avatar { 
    width: 40px; 
    height: 40px; 
    background: var(--primary); 
    color: var(--white); 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-weight: var(--font-bold, 700); 
}
.menu-header .info p { 
    margin: 0; 
}
.menu-header .info .name { 
    font-weight: var(--font-bold, 700); 
    font-size: var(--text-base, 16px); 
}
.menu-header .info .email { 
    font-size: var(--text-xs, 12px); 
    color: var(--text-secondary); 
}
.menu-items { 
    padding-top: var(--space-2, 8px); 
}
.menu-items button { 
    width: 100%; 
    display: flex; 
    align-items: center; 
    gap: var(--space-3, 12px); 
    padding: var(--space-3, 12px) var(--space-4, 16px); 
    border-radius: var(--radius-md, 8px); 
    font-size: var(--text-sm, 14px); 
    font-weight: var(--font-medium, 500); 
    color: var(--text-primary); 
    transition: background var(--transition-base, 200ms); 
}
.menu-items button:hover { 
    background: var(--gray-50); 
}
.signout-btn { 
    color: var(--error) !important; 
}
`;
