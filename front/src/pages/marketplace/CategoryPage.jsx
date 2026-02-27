import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft, ArrowRight, ShoppingCart, Star, Heart, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';

const CATEGORY_DATA_FALLBACK = {
    'Electronics': { popular: ['Flagship Phones', 'Mid-range Phones', 'Budget Phones', 'Tablets'] },
    'Men\'s Fashion': { popular: ['Formal Shirts', 'T-Shirts', 'Jeans', 'Sneakers'] },
    'Women\'s Fashion': { popular: ['Dresses', 'Handbags', 'Kurtas', 'Heels'] },
    'Home & Living': { popular: ['Furniture', 'Decor', 'Kitchen'] },
    'Beauty': { popular: ['Skincare', 'Fragrance', 'Makeup'] },
    'Sports': { popular: ['Fitness', 'Apparel', 'Equipment'] },
    'Accessories': { popular: ['Bags', 'Wallets', 'Watches'] }
};

export default function CategoryPage() {
    const { categoryName } = useParams();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(0);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Redirection to "remove this page" as requested by user
        if (categoryName) {
            navigate(`/products?category=${categoryName}`, { replace: true });
        }
    }, [categoryName, navigate]);

    useEffect(() => {
        const fetchCategoryProducts = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "products"), where("category", "==", categoryName));
                const snap = await getDocs(q);
                let products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

                // Group products by subCategory
                const grouped = {};
                products.forEach(p => {
                    const sub = p.subCategory || 'General';
                    if (!grouped[sub]) grouped[sub] = [];
                    grouped[sub].push(p);
                });

                const dynamicSections = Object.keys(grouped).map(sub => ({
                    id: sub.toLowerCase().replace(/\s+/g, '-'),
                    name: sub,
                    items: grouped[sub]
                }));

                setSections(dynamicSections);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching category products:", err);
                setLoading(false);
            }
        };

        fetchCategoryProducts();
    }, [categoryName]);

    const fallbackData = CATEGORY_DATA_FALLBACK[categoryName] || { popular: [] };

    if (loading) return <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>Loading {categoryName}...</div>;
    if (sections.length === 0) return (
        <div className="container" style={{ padding: '4rem', textAlign: 'center' }}>
            <h2>No products found in {categoryName}</h2>
            <Link to="/" style={{ color: 'var(--primary)', marginTop: '1rem', display: 'inline-block' }}>Back to Home</Link>
        </div>
    );

    return (
        <div className="category-hub-page bg-light">
            <div className="container main-container glass-card">
                {/* Header with Back Button */}
                <div className="hub-header">
                    <button onClick={() => navigate('/')} className="back-home-btn">
                        <ArrowLeft size={18} /> Back to Home
                    </button>
                    <div className="hub-breadcrumb">
                        <Link to="/">Home</Link> / <span>{categoryName}</span>
                    </div>
                </div>

                <div className="hub-layout">
                    {/* Sidebar */}
                    <aside className="hub-sidebar">
                        <h2>{categoryName}</h2>
                        <div className="sidebar-nav">
                            {sections.map((section, idx) => (
                                <button
                                    key={section.id}
                                    className={activeSection === idx ? 'active' : ''}
                                    onClick={() => setActiveSection(idx)}
                                >
                                    {section.name}
                                    <ChevronRight size={16} className="chevron" />
                                </button>
                            ))}
                        </div>
                    </aside>

                    {/* Content Area */}
                    <main className="hub-main">
                        <div className="section-title">
                            <h3>{sections[activeSection].name}</h3>
                        </div>

                        <div className="items-grid">
                            {sections[activeSection].items.map((item, idx) => (
                                <motion.div
                                    key={item.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="item-card"
                                    onClick={() => navigate(`/product/${item.id}`)}
                                >
                                    <div className="img-box">
                                        <img src={item.image || item.imageUrl} alt={item.name} />
                                    </div>
                                    <div className="item-info">
                                        <h4>{item.name}</h4>
                                        <p>{item.description?.substring(0, 60)}...</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer / Popular */}
                        <div className="hub-footer">
                            <div className="popular-row">
                                <span className="label">Popular:</span>
                                <div className="tags">
                                    {fallbackData.popular.map(tag => (
                                        <Link key={tag} to={`/products?search=${tag}`} className="tag">{tag}</Link>
                                    ))}
                                </div>
                            </div>
                            <Link to={`/products?category=${categoryName}`} className="explore-btn">
                                Explore All {categoryName} <ArrowRight size={16} />
                            </Link>
                        </div>
                    </main>
                </div>
            </div>

            <style>{`
                .category-hub-page {
                    padding: 2rem 0 6rem;
                    min-height: 100vh;
                }

                .main-container {
                    padding: 0 !important;
                    overflow: hidden;
                    border: 1px solid var(--border);
                }

                .hub-header {
                    padding: 1.5rem 2.5rem;
                    border-bottom: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: white;
                }

                .back-home-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 700;
                    color: var(--primary);
                    background: none;
                    border: none;
                    cursor: pointer;
                    font-size: 0.95rem;
                }

                .hub-breadcrumb {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                }
                .hub-breadcrumb span { font-weight: 700; color: var(--text); }

                .hub-layout {
                    display: grid;
                    grid-template-columns: 320px 1fr;
                    height: 700px;
                }

                .hub-sidebar {
                    background: #fcfcfe;
                    padding: 3rem 2.5rem;
                    border-right: 1px solid var(--border);
                }

                .hub-sidebar h2 {
                    font-size: 2rem;
                    font-weight: 850;
                    margin-bottom: 2.5rem;
                    letter-spacing: -1px;
                }

                .sidebar-nav {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }

                .sidebar-nav button {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.25rem 1.5rem;
                    border-radius: 16px;
                    font-weight: 700;
                    font-size: 1rem;
                    color: #4B5563;
                    background: transparent;
                    border: none;
                    text-align: left;
                    transition: 0.3s;
                }

                .sidebar-nav button:hover {
                    color: var(--primary);
                    background: hsla(230, 85%, 60%, 0.05);
                }

                .sidebar-nav button.active {
                    background: white;
                    color: var(--primary);
                    box-shadow: 0 4px 20px rgba(0,0,0,0.06);
                    border: 1px solid hsla(230, 85%, 60%, 0.1);
                }

                .sidebar-nav button .chevron {
                    opacity: 0;
                    transform: translateX(-5px);
                    transition: 0.3s;
                }

                .sidebar-nav button.active .chevron {
                    opacity: 1;
                    transform: translateX(0);
                }

                .hub-main {
                    padding: 3rem 4rem;
                    display: flex;
                    flex-direction: column;
                    background: white;
                }

                .section-title h3 {
                    font-size: 1.75rem;
                    font-weight: 800;
                    margin-bottom: 2.5rem;
                }

                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                    flex: 1;
                }

                .item-card {
                    cursor: pointer;
                    transition: 0.3s;
                }

                .item-card:hover {
                    transform: translateY(-8px);
                }

                .item-card .img-box {
                    height: 180px;
                    background: #f9f9fb;
                    border-radius: 24px;
                    overflow: hidden;
                    margin-bottom: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                }

                .item-card .img-box img {
                    max-width: 100%;
                    max-height: 100%;
                    object-fit: contain;
                }

                .item-info h4 {
                    font-size: 1.1rem;
                    font-weight: 800;
                    margin-bottom: 0.4rem;
                }

                .item-info p {
                    font-size: 0.85rem;
                    color: var(--text-muted);
                    font-weight: 500;
                }

                .hub-footer {
                    margin-top: 3rem;
                    padding-top: 2rem;
                    border-top: 1px solid var(--border);
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .popular-row {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }

                .popular-row .label { font-weight: 800; font-size: 0.9rem; }
                .tags { display: flex; gap: 1rem; }
                .tag { font-size: 0.85rem; color: var(--text-muted); font-weight: 600; transition: 0.2s; }
                .tag:hover { color: var(--primary); }

                .explore-btn {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    font-weight: 800;
                    color: var(--primary);
                    font-size: 1rem;
                    transition: 0.3s;
                }
                .explore-btn:hover { gap: 0.75rem; }

                @media (max-width: 1200px) {
                    .items-grid { grid-template-columns: repeat(3, 1fr); }
                }
                @media (max-width: 1024px) {
                    .hub-layout { grid-template-columns: 1fr; height: auto; }
                    .hub-sidebar { border-right: none; border-bottom: 1px solid var(--border); }
                    .sidebar-nav { flex-direction: row; overflow-x: auto; padding-bottom: 1rem; }
                    .sidebar-nav button { white-space: nowrap; }
                }
            `}</style>
        </div>
    );
}
