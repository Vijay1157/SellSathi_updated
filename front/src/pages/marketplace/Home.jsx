import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useSearchParams } from 'react-router-dom';
import { Filter, ShoppingCart, Star, Heart, SlidersHorizontal, ChevronDown, Check } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { seedProducts } from '../../utils/seedData';
import { addToCart } from '../../utils/cartUtils';

export default function Home() {
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters State
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [priceRange, setPriceRange] = useState(5000); // Trigger for filtering
    const [sliderValue, setSliderValue] = useState(5000); // Visual slider state
    const [visibleCount, setVisibleCount] = useState(4); // Pagination
    const [sortBy, setSortBy] = useState('featured');

    // Fetch & Seed Data
    useEffect(() => {
        const fetchData = async () => {
            await seedProducts(); // Run once to ensure data exists

            try {
                const querySnapshot = await getDocs(collection(db, "products"));
                const productsData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

                setProducts(productsData);
                setFilteredProducts(productsData);

                // Extract unique categories
                const uniqueCategories = ['All', ...new Set(productsData.map(p => p.category))];
                setCategories(uniqueCategories);

                setLoading(false);
            } catch (error) {
                console.error("Error fetching products:", error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const [searchParams] = useSearchParams();
    const searchQuery = searchParams.get('search')?.toLowerCase() || '';

    const [showPriceSort, setShowPriceSort] = useState(false);

    // Filter Logic
    useEffect(() => {
        if (!products.length) return;

        let result = [...products]; // Always work on a fresh copy

        // Search Filter
        if (searchQuery) {
            result = result.filter(product =>
                product.name.toLowerCase().includes(searchQuery) ||
                (product.description && product.description.toLowerCase().includes(searchQuery)) ||
                (product.category && product.category.toLowerCase().includes(searchQuery))
            );
        }

        // Category Filter
        if (selectedCategory && selectedCategory !== 'All') {
            result = result.filter(product => product.category === selectedCategory);
        }

        // Price Filter
        result = result.filter(product => Number(product.price) <= priceRange);

        // Sorting
        if (sortBy === 'lowToHigh') {
            result.sort((a, b) => Number(a.price) - Number(b.price));
        } else if (sortBy === 'highToLow') {
            result.sort((a, b) => Number(b.price) - Number(a.price));
        }

        setFilteredProducts(result);
        setVisibleCount(4);
    }, [products, selectedCategory, priceRange, sortBy, searchQuery]);

    const handleFeaturedClick = () => {
        setSortBy('featured');
        setShowPriceSort(!showPriceSort);
    };

    const handleAddToCart = async (product) => {
        const result = await addToCart(product);
        if (result.success) {
            alert(result.message);
        } else {
            alert(result.message);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '4rem 0', display: 'flex', justifyContent: 'center' }}>
                <div className="animate-spin" style={{ width: '40px', height: '40px', border: '3px solid var(--border)', borderTop: '3px solid var(--primary)', borderRadius: '50%' }}></div>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {/* Header/Banner Section could go here if needed, but per request keeping it focused on Marketplace UI */}

            <div className="container" style={{ padding: '2rem 1rem', display: 'flex', gap: '2rem', flexDirection: 'column', md: 'row' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '2rem' }}>

                    {/* Sidebar Filters */}
                    <aside style={{ height: 'fit-content', position: 'sticky', top: '100px' }}>
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            {/* Sort By */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>SORT BY</h4>
                                <div className="flex flex-col gap-2">
                                    {/* Featured Toggle Button */}
                                    <button
                                        onClick={handleFeaturedClick}
                                        style={{
                                            textAlign: 'left',
                                            padding: '0.75rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            background: sortBy === 'featured' ? 'var(--primary)' : 'transparent',
                                            color: sortBy === 'featured' ? 'white' : 'var(--text-muted)',
                                            fontWeight: '600',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'all 0.2s',
                                            fontSize: '0.95rem',
                                            width: '100%'
                                        }}
                                        onMouseEnter={(e) => sortBy !== 'featured' && (e.currentTarget.style.background = 'hsla(230, 85%, 60%, 0.1)')}
                                        onMouseLeave={(e) => sortBy !== 'featured' && (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <span className="flex items-center gap-2">
                                            Featured
                                        </span>
                                        <ChevronDown size={14} style={{ transform: showPriceSort ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }} />
                                    </button>

                                    {/* Individual Price Sort Options - Revealed when Featured or expanded */}
                                    {(showPriceSort || sortBy !== 'featured') && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex flex-col gap-2"
                                            style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}
                                        >
                                            {[
                                                { id: 'lowToHigh', label: 'Price: Low to High' },
                                                { id: 'highToLow', label: 'Price: High to Low' }
                                            ].map(option => (
                                                <button
                                                    key={option.id}
                                                    onClick={() => setSortBy(option.id)}
                                                    style={{
                                                        textAlign: 'left',
                                                        padding: '0.6rem 0.75rem',
                                                        borderRadius: 'var(--radius-sm)',
                                                        background: sortBy === option.id ? 'hsla(230, 85%, 60%, 0.1)' : 'transparent',
                                                        color: sortBy === option.id ? 'var(--primary)' : 'var(--text-muted)',
                                                        fontWeight: sortBy === option.id ? '600' : '400',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        transition: 'all 0.2s',
                                                        fontSize: '0.85rem'
                                                    }}
                                                >
                                                    {option.label}
                                                    {sortBy === option.id && <Check size={14} />}
                                                </button>
                                            ))}
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2" style={{ marginBottom: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <Filter size={20} className="text-muted" />
                                <h3>Filters</h3>
                            </div>

                            {/* Categories */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>CATEGORIES</h4>
                                <div className="flex flex-col gap-2">
                                    {categories.map(category => (
                                        <button
                                            key={category}
                                            onClick={() => setSelectedCategory(category)}
                                            style={{
                                                textAlign: 'left',
                                                padding: '0.75rem 1rem',
                                                borderRadius: 'var(--radius-md)',
                                                background: selectedCategory === category ? 'var(--primary)' : 'transparent',
                                                color: selectedCategory === category ? 'white' : 'var(--text-muted)',
                                                fontWeight: selectedCategory === category ? '600' : '400',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                transition: 'all 0.2s',
                                                fontSize: '0.95rem'
                                            }}
                                            onMouseEnter={(e) => selectedCategory !== category && (e.currentTarget.style.background = 'hsla(230, 85%, 60%, 0.1)')}
                                            onMouseLeave={(e) => selectedCategory !== category && (e.currentTarget.style.background = 'transparent')}
                                        >
                                            {category}
                                            {selectedCategory === category && <Check size={14} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Price Slider */}
                            <div style={{ marginBottom: '2.5rem' }}>
                                <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>PRICE</h4>
                                <div style={{ padding: '0 0.5rem' }}>
                                    <input
                                        type="range"
                                        min="0"
                                        max="5000"
                                        step="100"
                                        value={sliderValue}
                                        onChange={(e) => setSliderValue(Number(e.target.value))}
                                        onMouseUp={() => setPriceRange(sliderValue)}
                                        onTouchEnd={() => setPriceRange(sliderValue)}
                                        style={{
                                            background: `linear-gradient(to right, var(--primary) ${(sliderValue / 5000) * 100}%, var(--border) ${(sliderValue / 5000) * 100}%)`
                                        }}
                                        className="price-slider"
                                    />
                                    <div className="flex justify-between text-muted" style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                        <span>Min</span>
                                        <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>Up to ₹{sliderValue}</span>
                                    </div>
                                </div>
                            </div>


                        </div>
                    </aside>

                    {/* Main Content */}
                    <main>
                        {/* Header */}
                        <div className="flex justify-between items-end" style={{ marginBottom: '2rem' }}>
                            <div>
                                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>All <span className="gradient-text">Products</span></h2>
                                <p className="text-muted">Showing {filteredProducts.length} results</p>
                            </div>
                        </div>

                        {/* Product Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
                            {filteredProducts.slice(0, visibleCount).map((product) => (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    whileHover={{ y: -8 }}
                                    className="glass-card"
                                    style={{ overflow: 'hidden', padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
                                >
                                    <div style={{ position: 'relative', height: '220px', overflow: 'hidden' }}>
                                        <img
                                            src={product.imageUrl || product.image}
                                            alt={product.name || product.title}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                                            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                        <div className="flex justify-between items-start" style={{ marginBottom: '0.5rem' }}>
                                            <span className="text-muted" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{product.category}</span>
                                            <div className="flex items-center gap-1" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                                                <Star size={12} fill="var(--warning)" color="var(--warning)" />
                                                <span>4.8</span>
                                            </div>
                                        </div>

                                        <h3 style={{ fontSize: '1.1rem', marginBottom: 'auto', lineHeight: 1.4 }}>{product.name || product.title}</h3>

                                        <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div>
                                                <span className="text-muted" style={{ fontSize: '0.8rem', textDecoration: 'line-through' }}>₹{Math.round(product.price * 1.2)}</span>
                                                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text)' }}>
                                                    ₹{product.price}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddToCart(product)}
                                                className="btn btn-primary"
                                                style={{ borderRadius: '50%', width: '42px', height: '42px', padding: 0 }}
                                                title="Add to Cart"
                                            >
                                                <ShoppingCart size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {visibleCount < filteredProducts.length && (
                            <div className="flex justify-center" style={{ marginBottom: '2rem' }}>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setVisibleCount(prev => prev + 4)}
                                    style={{ padding: '0.75rem 2rem', minWidth: '150px' }}
                                >
                                    Load More
                                </button>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

