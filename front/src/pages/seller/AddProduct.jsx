import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Package,
    Image as ImageIcon,
    ArrowLeft,
    Plus,
    Trash2,
    Upload,
    CheckCircle,
    AlertCircle,
    Tag,
    Info,
    Loader,
    X,
    Layers,
    Palette,
    Ruler,
    Cpu,
    Settings,
    ChevronDown
} from 'lucide-react';
import { auth } from '../../config/firebase';
import { authFetch } from '../../utils/api';

// ─── Category Configuration ───────────────────────────────────────────────────
// Defines which dynamic fields appear for each category
const CATEGORY_CONFIG = {
    "Fashion": {
        icon: "👗",
        hasSizes: true,
        hasColors: true,
        defaultSizes: ["XS", "S", "M", "L", "XL", "XXL"],
        colorPresets: ["Black", "White", "Red", "Blue", "Green", "Pink", "Grey", "Navy", "Beige", "Brown"],
        hasSpecifications: true,
        specPresets: ["Fit", "Pattern", "Sleeve", "Collar", "Occasion", "Material", "Wash Care"]
    },
    "Electronics": {
        icon: "📱",
        hasVariants: true,
        hasColors: true,
        variantTypes: [
            { key: "storage", label: "Storage", presets: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
            { key: "memory", label: "RAM / Memory", presets: ["4GB", "6GB", "8GB", "12GB", "16GB", "32GB"] }
        ],
        colorPresets: ["Black", "White", "Silver", "Space Gray", "Gold", "Blue", "Red"],
        hasSpecifications: true,
        specPresets: ["Processor", "Display", "Battery", "Camera", "Weight", "OS", "Warranty"]
    },
    "Home & Kitchen": {
        icon: "🏠",
        hasColors: true,
        hasDimensions: true,
        colorPresets: ["White", "Black", "Silver", "Wooden", "Grey", "Blue", "Green"],
        hasSpecifications: true,
        specPresets: ["Material", "Dimensions", "Weight", "Power", "Warranty", "Care Instructions"]
    },
    "Handicrafts": {
        icon: "🎨",
        hasColors: true,
        hasCustomAttributes: true,
        colorPresets: ["Natural", "Brown", "Red", "Blue", "Gold", "Multi-color"],
        hasSpecifications: true,
        specPresets: ["Material", "Origin", "Technique", "Weight", "Dimensions", "Care"]
    },
    "Food & Beverages": {
        icon: "🍽️",
        hasVariants: true,
        variantTypes: [
            { key: "weight", label: "Pack Size / Weight", presets: ["100g", "250g", "500g", "1kg", "2kg", "5kg"] }
        ],
        hasSpecifications: true,
        specPresets: ["Ingredients", "Shelf Life", "Storage", "Allergens", "Nutritional Info", "FSSAI License"]
    },
    "Beauty & Personal Care": {
        icon: "💄",
        hasSizes: true,
        hasColors: true,
        defaultSizes: ["30ml", "50ml", "100ml", "150ml", "200ml", "250ml"],
        colorPresets: ["Fair", "Medium", "Dark", "Universal"],
        hasSpecifications: true,
        specPresets: ["Skin Type", "Ingredients", "Volume", "Usage", "Shelf Life", "Country of Origin"]
    },
    "Sports & Fitness": {
        icon: "🏋️",
        hasSizes: true,
        hasColors: true,
        defaultSizes: ["S", "M", "L", "XL", "XXL", "Free Size"],
        colorPresets: ["Black", "White", "Red", "Blue", "Grey", "Neon Green", "Orange"],
        hasSpecifications: true,
        specPresets: ["Material", "Weight Capacity", "Dimensions", "Warranty", "Usage"]
    },
    "Books & Stationery": {
        icon: "📚",
        hasSpecifications: true,
        specPresets: ["Author", "Publisher", "Language", "Pages", "ISBN", "Edition", "Binding"]
    },
    "Others": {
        icon: "📦",
        hasColors: true,
        hasCustomAttributes: true,
        hasSizes: true,
        defaultSizes: [],
        colorPresets: ["Black", "White", "Red", "Blue", "Green"],
        hasSpecifications: true,
        specPresets: []
    }
};

const categories = Object.keys(CATEGORY_CONFIG);

// ─── Styles ───────────────────────────────────────────────────────────────────
const sty = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', padding: '2rem 1rem' },
    container: { maxWidth: '1100px', margin: '0 auto' },
    card: { background: 'white', borderRadius: '20px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' },
    sectionIcon: (color) => ({ padding: '0.5rem', background: `${color}15`, color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }),
    label: { display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: '#334155' },
    input: { width: '100%', padding: '0.875rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', background: 'white', transition: 'border-color 0.2s', outline: 'none' },
    select: { width: '100%', padding: '0.875rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: '12px', fontSize: '0.95rem', background: '#f8fafc', cursor: 'pointer' },
    chip: (active) => ({ padding: '0.5rem 1rem', borderRadius: '50px', border: active ? '2px solid var(--primary)' : '1.5px solid #e2e8f0', background: active ? 'var(--primary)' : 'white', color: active ? 'white' : '#475569', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }),
    chipRemove: { background: 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, color: 'inherit', fontSize: '0.7rem' },
    addChipBtn: { padding: '0.5rem 1rem', borderRadius: '50px', border: '1.5px dashed #94a3b8', background: 'transparent', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' },
    priceInput: { width: '100%', padding: '0.7rem 0.7rem 0.7rem 1.8rem', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '0.9rem' },
    dynamicSection: { background: '#f8fafc', borderRadius: '16px', padding: '1.5rem', border: '1px solid #e2e8f0', marginTop: '1rem' },
    radioGroup: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
    radioOption: (active) => ({ padding: '0.75rem 1.25rem', borderRadius: '12px', border: active ? '2px solid var(--primary)' : '1.5px solid #e2e8f0', background: active ? 'var(--primary)08' : 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: active ? 600 : 400, color: active ? 'var(--primary)' : '#475569', transition: 'all 0.2s' }),
    specRow: { display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' },
    variantPriceRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '0.5rem' },
    badge: (color) => ({ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.75rem', borderRadius: '50px', background: `${color}15`, color, fontSize: '0.78rem', fontWeight: 600 }),
};

export default function AddProduct() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);

    // ─── Core Product State ──────────────────────────────────────────────
    const [product, setProduct] = useState({
        name: '', price: '', discountPrice: '', category: '', stock: '', description: '', image: ''
    });

    // ─── Dynamic Fields State ────────────────────────────────────────────
    const [selectedSizes, setSelectedSizes] = useState([]);
    const [customSizeInput, setCustomSizeInput] = useState('');
    const [pricingType, setPricingType] = useState('same'); // 'same' | 'varied'
    const [sizePrices, setSizePrices] = useState({});

    const [selectedColors, setSelectedColors] = useState([]);
    const [customColorInput, setCustomColorInput] = useState('');

    const [variants, setVariants] = useState({}); // { storage: [{label, priceOffset}], memory: [...] }
    const [customVariantInput, setCustomVariantInput] = useState({});
    const [variantPricingType, setVariantPricingType] = useState({}); // { storage: 'same'|'varied' }

    const [specifications, setSpecifications] = useState([]);
    const [showSpecInput, setShowSpecInput] = useState(false);
    const [newSpecKey, setNewSpecKey] = useState('');
    const [newSpecVal, setNewSpecVal] = useState('');

    const [variantImages, setVariantImages] = useState({});

    const config = CATEGORY_CONFIG[product.category] || null;

    // ─── Size Handlers ───────────────────────────────────────────────────
    const toggleSize = (size) => {
        if (selectedSizes.includes(size)) {
            setSelectedSizes(selectedSizes.filter(s => s !== size));
            const newPrices = { ...sizePrices };
            delete newPrices[size];
            setSizePrices(newPrices);
        } else {
            setSelectedSizes([...selectedSizes, size]);
        }
    };

    const addCustomSize = () => {
        const trimmed = customSizeInput.trim();
        if (trimmed && !selectedSizes.includes(trimmed)) {
            setSelectedSizes([...selectedSizes, trimmed]);
            setCustomSizeInput('');
        }
    };

    // ─── Color Handlers ──────────────────────────────────────────────────
    const toggleColor = (color) => {
        if (selectedColors.includes(color)) {
            setSelectedColors(selectedColors.filter(c => c !== color));
        } else {
            setSelectedColors([...selectedColors, color]);
        }
    };

    const addCustomColor = () => {
        const trimmed = customColorInput.trim();
        if (trimmed && !selectedColors.includes(trimmed)) {
            setSelectedColors([...selectedColors, trimmed]);
            setCustomColorInput('');
        }
    };

    // ─── Variant Handlers (Electronics/Food) ─────────────────────────────
    const toggleVariant = (variantKey, value) => {
        const current = variants[variantKey] || [];
        const exists = current.find(v => v.label === value);
        if (exists) {
            setVariants({ ...variants, [variantKey]: current.filter(v => v.label !== value) });
        } else {
            setVariants({ ...variants, [variantKey]: [...current, { label: value, priceOffset: 0 }] });
        }
    };

    const addCustomVariant = (variantKey) => {
        const input = (customVariantInput[variantKey] || '').trim();
        if (!input) return;
        const current = variants[variantKey] || [];
        if (!current.find(v => v.label === input)) {
            setVariants({ ...variants, [variantKey]: [...current, { label: input, priceOffset: 0 }] });
        }
        setCustomVariantInput({ ...customVariantInput, [variantKey]: '' });
    };

    const updateVariantPrice = (variantKey, label, priceOffset) => {
        const current = variants[variantKey] || [];
        setVariants({
            ...variants,
            [variantKey]: current.map(v => v.label === label ? { ...v, priceOffset: Number(priceOffset) || 0 } : v)
        });
    };

    // ─── Specification Handlers ──────────────────────────────────────────
    const addSpecification = () => {
        if (newSpecKey.trim()) {
            setSpecifications([...specifications, { key: newSpecKey.trim(), value: newSpecVal.trim() }]);
            setNewSpecKey('');
            setNewSpecVal('');
            setShowSpecInput(false);
        }
    };

    const addPresetSpec = (presetKey) => {
        if (!specifications.find(s => s.key === presetKey)) {
            setSpecifications([...specifications, { key: presetKey, value: '' }]);
        }
    };

    const updateSpecValue = (index, value) => {
        const updated = [...specifications];
        updated[index].value = value;
        setSpecifications(updated);
    };

    const removeSpec = (index) => {
        setSpecifications(specifications.filter((_, i) => i !== index));
    };

    // ─── Submit Handler ──────────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!product.image) {
            alert('Main Product Image is compulsory. Please upload it.');
            return;
        }

        let basePrice = parseFloat(product.price);
        if (selectedSizes.length > 0 && pricingType === 'varied') {
            const prices = Object.values(sizePrices).map(p => parseFloat(p)).filter(p => !isNaN(p) && p > 0);
            if (prices.length > 0) {
                basePrice = Math.min(...prices);
            }
        }

        const user = auth.currentUser;
        let sellerId = user?.uid || null;
        if (!sellerId) {
            try { sellerId = JSON.parse(localStorage.getItem('user'))?.uid; } catch { sellerId = null; }
        }
        if (!sellerId) { alert("Please login first"); return; }

        // Build the full product data with dynamic fields
        const fullProduct = {
            title: product.name,
            price: basePrice,
            discountPrice: product.discountPrice ? parseFloat(product.discountPrice) : null,
            category: product.category,
            stock: parseInt(product.stock),
            description: product.description,
            image: product.image,
        };

        if (Object.keys(variantImages).length > 0) {
            fullProduct.variantImages = variantImages;
        }

        // Add sizes if selected
        if (selectedSizes.length > 0) {
            fullProduct.sizes = selectedSizes;
            fullProduct.pricingType = pricingType;
            if (pricingType === 'varied') {
                fullProduct.sizePrices = sizePrices;
            }
        }

        // Add colors if selected
        if (selectedColors.length > 0) {
            fullProduct.colors = selectedColors;
        }

        // Add variants (storage, memory, weight, etc.)
        for (const [key, items] of Object.entries(variants)) {
            if (items.length > 0) {
                fullProduct[key] = items;
            }
        }

        // Add specifications
        if (specifications.length > 0) {
            const specsObj = {};
            specifications.forEach(s => { if (s.key && s.value) specsObj[s.key] = s.value; });
            if (Object.keys(specsObj).length > 0) fullProduct.specifications = specsObj;
        }

        setLoading(true);
        try {
            const response = await authFetch('/seller/product/add', {
                method: 'POST',
                body: JSON.stringify({ sellerId, productData: fullProduct })
            });
            const data = await response.json();
            if (data.success) { navigate('/seller/dashboard'); }
            else { alert("Failed: " + data.message); }
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Error adding product");
        } finally { setLoading(false); }
    };

    // ─── Render ──────────────────────────────────────────────────────────
    return (
        <div style={sty.page}>
            <div style={sty.container}>
                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <button onClick={() => navigate('/seller/dashboard')} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', borderRadius: '12px' }}>
                        <ArrowLeft size={20} /> Back to Dashboard
                    </button>
                    <div style={{ textAlign: 'right' }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Create New <span className="gradient-text">Listing</span></h1>
                        <p className="text-muted">Build your product with dynamic attributes</p>
                    </div>
                </motion.div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                        {/* ═══════════ LEFT COLUMN ═══════════ */}
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                            className="flex flex-col gap-6">

                            {/* ── Basic Info ── */}
                            <div style={sty.card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={sty.sectionIcon('var(--primary)')}><Info size={20} /></div>
                                    <h3 style={{ margin: 0 }}>Product Information</h3>
                                </div>
                                <div className="flex flex-col gap-5">
                                    <div>
                                        <label style={sty.label}>Product Title</label>
                                        <input type="text" placeholder="e.g. Premium Silk Scarf" required style={sty.input}
                                            value={product.name} onChange={e => setProduct({ ...product, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label style={sty.label}>Description</label>
                                        <textarea placeholder="Describe your product in detail..." required rows="4" style={{ ...sty.input, resize: 'vertical' }}
                                            value={product.description} onChange={e => setProduct({ ...product, description: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* ── Category & Pricing ── */}
                            <div style={sty.card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={sty.sectionIcon('#22c55e')}><Tag size={20} /></div>
                                    <h3 style={{ margin: 0 }}>Category & Pricing</h3>
                                </div>

                                {/* Category Selector */}
                                <div style={{ marginBottom: '1.5rem' }}>
                                    <label style={sty.label}>Category</label>
                                    <select required style={sty.select} value={product.category}
                                        onChange={e => {
                                            setProduct({ ...product, category: e.target.value });
                                            // Reset dynamic fields on category change
                                            setSelectedSizes([]); setSelectedColors([]); setVariants({});
                                            setSpecifications([]); setPricingType('same'); setSizePrices({});
                                            setVariantPricingType({});
                                        }}>
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].icon} {cat}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Category Badge */}
                                {config && (
                                    <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <span style={sty.badge('var(--primary)')}>
                                            {config.icon} {product.category}
                                        </span>
                                        {config.hasSizes && <span style={sty.badge('#8b5cf6')}>📏 Size Options</span>}
                                        {config.hasColors && <span style={sty.badge('#ec4899')}>🎨 Color Options</span>}
                                        {config.hasVariants && <span style={sty.badge('#f59e0b')}>⚙️ Variant Options</span>}
                                    </div>
                                )}

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                    <div>
                                        <label style={sty.label}>Base Price (₹)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: '#94a3b8' }}>₹</span>
                                            <input type="number" placeholder="0.00" required style={sty.priceInput}
                                                value={product.price} onChange={e => setProduct({ ...product, price: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={sty.label}>Discount Price (₹)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: '#94a3b8' }}>₹</span>
                                            <input type="number" placeholder="Optional" style={sty.priceInput}
                                                value={product.discountPrice} onChange={e => setProduct({ ...product, discountPrice: e.target.value })} />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={sty.label}>Stock Qty</label>
                                        <input type="number" placeholder="Units" required style={sty.input}
                                            value={product.stock} onChange={e => setProduct({ ...product, stock: e.target.value })} />
                                    </div>
                                </div>
                            </div>

                            {/* ═══════════ DYNAMIC SECTIONS (based on category) ═══════════ */}
                            <AnimatePresence>
                                {config && (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                        className="flex flex-col gap-6">

                                        {/* ── SIZES SECTION ── */}
                                        {config.hasSizes && config.defaultSizes && (
                                            <div style={sty.card}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                                    <div style={sty.sectionIcon('#8b5cf6')}><Ruler size={20} /></div>
                                                    <div>
                                                        <h3 style={{ margin: 0 }}>Size Options</h3>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Select available sizes for this product</p>
                                                    </div>
                                                </div>

                                                {/* Size chips */}
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    {config.defaultSizes.map(size => (
                                                        <button key={size} type="button" style={sty.chip(selectedSizes.includes(size))}
                                                            onClick={() => toggleSize(size)}>
                                                            {selectedSizes.includes(size) && <CheckCircle size={14} />} {size}
                                                        </button>
                                                    ))}
                                                    {/* Show custom sizes that aren't in presets */}
                                                    {selectedSizes.filter(s => !config.defaultSizes.includes(s)).map(size => (
                                                        <button key={size} type="button" style={sty.chip(true)} onClick={() => toggleSize(size)}>
                                                            <CheckCircle size={14} /> {size}
                                                            <span style={sty.chipRemove}>×</span>
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Add custom size */}
                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                                                    <input type="text" placeholder="Custom size (e.g. XXXL, 42)" style={{ ...sty.input, flex: 1 }}
                                                        value={customSizeInput} onChange={e => setCustomSizeInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomSize())} />
                                                    <button type="button" onClick={addCustomSize} style={sty.addChipBtn}>
                                                        <Plus size={14} /> Add
                                                    </button>
                                                </div>

                                                {/* Pricing type */}
                                                {selectedSizes.length > 0 && (
                                                    <div style={sty.dynamicSection}>
                                                        <label style={{ ...sty.label, marginBottom: '0.75rem' }}>
                                                            💰 Is the price the same for all sizes?
                                                        </label>
                                                        <div style={sty.radioGroup}>
                                                            <div style={sty.radioOption(pricingType === 'same')} onClick={() => setPricingType('same')}>
                                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${pricingType === 'same' ? 'var(--primary)' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {pricingType === 'same' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                                                </div>
                                                                Same price for all sizes
                                                            </div>
                                                            <div style={sty.radioOption(pricingType === 'varied')} onClick={() => setPricingType('varied')}>
                                                                <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${pricingType === 'varied' ? 'var(--primary)' : '#cbd5e1'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    {pricingType === 'varied' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary)' }} />}
                                                                </div>
                                                                Different price per size
                                                            </div>
                                                        </div>

                                                        {/* Per-size prices */}
                                                        {pricingType === 'varied' && (
                                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                                                                style={{ marginTop: '1rem' }}>
                                                                <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                                                    Set individual prices for each size:
                                                                </p>
                                                                {selectedSizes.map(size => (
                                                                    <div key={size} style={sty.variantPriceRow}>
                                                                        <span style={{ fontWeight: 600, color: '#334155' }}>{size}</span>
                                                                        <div style={{ position: 'relative' }}>
                                                                            <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 'bold' }}>₹</span>
                                                                            <input type="number" placeholder={product.price || '0'} style={sty.priceInput}
                                                                                value={sizePrices[size] || ''}
                                                                                onChange={e => setSizePrices({ ...sizePrices, [size]: e.target.value })} />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </motion.div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* ── COLORS SECTION ── */}
                                        {config.hasColors && (
                                            <div style={sty.card}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                                    <div style={sty.sectionIcon('#ec4899')}><Palette size={20} /></div>
                                                    <div>
                                                        <h3 style={{ margin: 0 }}>Color Options</h3>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Select available colors</p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    {config.colorPresets.map(color => (
                                                        <button key={color} type="button" style={sty.chip(selectedColors.includes(color))}
                                                            onClick={() => toggleColor(color)}>
                                                            {selectedColors.includes(color) && <CheckCircle size={14} />} {color}
                                                        </button>
                                                    ))}
                                                    {selectedColors.filter(c => !config.colorPresets.includes(c)).map(color => (
                                                        <button key={color} type="button" style={sty.chip(true)} onClick={() => toggleColor(color)}>
                                                            <CheckCircle size={14} /> {color}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                    <input type="text" placeholder="Custom color (e.g. Pastel Pink)" style={{ ...sty.input, flex: 1 }}
                                                        value={customColorInput} onChange={e => setCustomColorInput(e.target.value)}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomColor())} />
                                                    <button type="button" onClick={addCustomColor} style={sty.addChipBtn}>
                                                        <Plus size={14} /> Add
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* ── VARIANTS SECTION (Electronics, Food) ── */}
                                        {config.hasVariants && config.variantTypes?.map(vType => (
                                            <div key={vType.key} style={sty.card}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                                    <div style={sty.sectionIcon('#f59e0b')}><Cpu size={20} /></div>
                                                    <div>
                                                        <h3 style={{ margin: 0 }}>{vType.label} Variants</h3>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Select available {vType.label.toLowerCase()} options & set price offsets</p>
                                                    </div>
                                                </div>

                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    {vType.presets.map(preset => {
                                                        const isActive = (variants[vType.key] || []).find(v => v.label === preset);
                                                        return (
                                                            <button key={preset} type="button" style={sty.chip(!!isActive)}
                                                                onClick={() => toggleVariant(vType.key, preset)}>
                                                                {isActive && <CheckCircle size={14} />} {preset}
                                                            </button>
                                                        );
                                                    })}
                                                    {(variants[vType.key] || []).filter(v => !vType.presets.includes(v.label)).map(v => (
                                                        <button key={v.label} type="button" style={sty.chip(true)}
                                                            onClick={() => toggleVariant(vType.key, v.label)}>
                                                            <CheckCircle size={14} /> {v.label}
                                                        </button>
                                                    ))}
                                                </div>

                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                                                    <input type="text" placeholder={`Custom ${vType.label.toLowerCase()}`} style={{ ...sty.input, flex: 1 }}
                                                        value={customVariantInput[vType.key] || ''}
                                                        onChange={e => setCustomVariantInput({ ...customVariantInput, [vType.key]: e.target.value })}
                                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomVariant(vType.key))} />
                                                    <button type="button" onClick={() => addCustomVariant(vType.key)} style={sty.addChipBtn}>
                                                        <Plus size={14} /> Add
                                                    </button>
                                                </div>

                                                {/* Variant pricing */}
                                                {(variants[vType.key] || []).length > 0 && (
                                                    <div style={sty.dynamicSection}>
                                                        <label style={{ ...sty.label, marginBottom: '0.5rem' }}>💰 Price offsets from base price</label>
                                                        <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.75rem' }}>
                                                            Use + for additional cost, - for discount, 0 for same as base price
                                                        </p>
                                                        {(variants[vType.key] || []).map(v => (
                                                            <div key={v.label} style={sty.variantPriceRow}>
                                                                <span style={{ fontWeight: 600, color: '#334155' }}>{v.label}</span>
                                                                <div style={{ position: 'relative' }}>
                                                                    <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem' }}>+₹</span>
                                                                    <input type="number" placeholder="0" style={{ ...sty.priceInput, paddingLeft: '2.2rem' }}
                                                                        value={v.priceOffset || ''}
                                                                        onChange={e => updateVariantPrice(vType.key, v.label, e.target.value)} />
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* ── SPECIFICATIONS SECTION ── */}
                                        {config.hasSpecifications && (
                                            <div style={sty.card}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                                    <div style={sty.sectionIcon('#0ea5e9')}><Settings size={20} /></div>
                                                    <div>
                                                        <h3 style={{ margin: 0 }}>Specifications</h3>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Add product specs for customer reference</p>
                                                    </div>
                                                </div>

                                                {/* Quick-add preset specs */}
                                                {config.specPresets && config.specPresets.length > 0 && (
                                                    <div style={{ marginBottom: '1rem' }}>
                                                        <label style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem', display: 'block' }}>Quick add:</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                            {config.specPresets.filter(sp => !specifications.find(s => s.key === sp)).map(preset => (
                                                                <button key={preset} type="button" style={sty.addChipBtn} onClick={() => addPresetSpec(preset)}>
                                                                    <Plus size={12} /> {preset}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Existing specs */}
                                                {specifications.map((spec, i) => (
                                                    <div key={i} style={sty.specRow}>
                                                        <input type="text" value={spec.key} readOnly
                                                            style={{ ...sty.input, background: '#f1f5f9', fontWeight: 600 }} />
                                                        <input type="text" placeholder="Enter value..." style={sty.input}
                                                            value={spec.value} onChange={e => updateSpecValue(i, e.target.value)} />
                                                        <button type="button" onClick={() => removeSpec(i)}
                                                            style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer' }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}

                                                {/* Add custom spec */}
                                                {showSpecInput ? (
                                                    <div style={{ ...sty.specRow, marginTop: '0.5rem' }}>
                                                        <input type="text" placeholder="Spec name" style={sty.input}
                                                            value={newSpecKey} onChange={e => setNewSpecKey(e.target.value)} />
                                                        <input type="text" placeholder="Value" style={sty.input}
                                                            value={newSpecVal} onChange={e => setNewSpecVal(e.target.value)}
                                                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSpecification())} />
                                                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                            <button type="button" onClick={addSpecification}
                                                                style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer' }}>
                                                                <CheckCircle size={16} />
                                                            </button>
                                                            <button type="button" onClick={() => setShowSpecInput(false)}
                                                                style={{ background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '10px', padding: '0.6rem', cursor: 'pointer' }}>
                                                                <X size={16} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <button type="button" onClick={() => setShowSpecInput(true)}
                                                        style={{ ...sty.addChipBtn, marginTop: '0.5rem' }}>
                                                        <Plus size={14} /> Add Custom Specification
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>

                        {/* ═══════════ RIGHT COLUMN ═══════════ */}
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            className="flex flex-col gap-6">

                            {/* Image Upload */}
                            <div style={sty.card}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={sty.sectionIcon('#a855f7')}><ImageIcon size={20} /></div>
                                    <h3 style={{ margin: 0 }}>Product Media</h3>
                                </div>
                                <div style={{
                                    border: '2px dashed #e2e8f0', borderRadius: '16px', padding: '2rem', textAlign: 'center',
                                    background: '#fafbfc', minHeight: '200px', display: 'flex', flexDirection: 'column',
                                    alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s'
                                }}>
                                    {product.image ? (
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <img src={product.image} alt="Preview" style={{ width: '100%', borderRadius: '12px', maxHeight: '300px', objectFit: 'contain' }} />
                                            <button type="button" onClick={() => setProduct({ ...product, image: '' })}
                                                style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'white', padding: '0.5rem', borderRadius: '50%', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', color: '#ef4444', border: 'none', cursor: 'pointer' }}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center gap-3" style={{ cursor: 'pointer', width: '100%' }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
                                                {uploading ? <Loader className="animate-spin" style={{ color: 'var(--primary)' }} /> : <Upload style={{ color: '#94a3b8' }} />}
                                            </div>
                                            <div style={{ width: '100%', textAlign: 'center' }}>
                                                <p style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    {uploading ? "Uploading..." : "Click to Upload Image"}
                                                </p>
                                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>High-quality images work best!</p>
                                                <input type="file" accept="image/*" hidden disabled={uploading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;
                                                        setUploading(true);
                                                        const formData = new FormData();
                                                        formData.append('image', file);
                                                        try {
                                                            const response = await authFetch('/seller/upload-image', { method: 'POST', body: formData });
                                                            const data = await response.json();
                                                            if (data.success) { setProduct(p => ({ ...p, image: data.url })); }
                                                            else { alert('Upload failed: ' + data.message); }
                                                        } catch (err) { console.error(err); alert('Upload error'); }
                                                        finally { setUploading(false); }
                                                    }} />
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Variant Images Upload */}
                            {(() => {
                                const allVariantLabels = [
                                    ...selectedColors,
                                    ...Object.values(variants).flat().map(v => v.label)
                                ];
                                if (allVariantLabels.length === 0) return null;
                                return (
                                    <div style={sty.card}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                            <div style={sty.sectionIcon('#3b82f6')}><ImageIcon size={20} /></div>
                                            <div>
                                                <h3 style={{ margin: 0 }}>Variant Images</h3>
                                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>(Optional) Upload images for specific colors or variants.</p>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {allVariantLabels.map(label => (
                                                <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '12px', background: '#f8fafc' }}>
                                                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#334155' }}>{label}</span>
                                                    <div>
                                                        {variantImages[label] ? (
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                <img src={variantImages[label]} alt={label} style={{ width: '36px', height: '36px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                                <button type="button" onClick={() => {
                                                                    const updated = { ...variantImages };
                                                                    delete updated[label];
                                                                    setVariantImages(updated);
                                                                }} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.35rem', cursor: 'pointer' }}><Trash2 size={14} /></button>
                                                            </div>
                                                        ) : (
                                                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.4rem 0.8rem', background: 'var(--primary)', color: 'white', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                                                <Upload size={14} />
                                                                Upload
                                                                <input type="file" accept="image/*" hidden
                                                                    onChange={async (e) => {
                                                                        const file = e.target.files[0];
                                                                        if (!file) return;
                                                                        const formData = new FormData();
                                                                        formData.append('image', file);
                                                                        try {
                                                                            const response = await authFetch('/seller/upload-image', { method: 'POST', body: formData });
                                                                            const data = await response.json();
                                                                            if (data.success) { setVariantImages(prev => ({ ...prev, [label]: data.url })); }
                                                                            else { alert('Upload failed: ' + data.message); }
                                                                        } catch (err) { console.error(err); alert('Upload error'); }
                                                                    }} />
                                                            </label>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Summary Preview */}
                            {product.category && (
                                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={sty.card}>
                                    <h4 style={{ margin: '0 0 1rem', color: '#334155' }}>📋 Listing Summary</h4>
                                    <div style={{ fontSize: '0.85rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                        {product.name && <div><strong>Title:</strong> {product.name}</div>}
                                        <div><strong>Category:</strong> {config?.icon} {product.category}</div>
                                        {product.price && <div><strong>Base Price:</strong> ₹{Number(product.price).toLocaleString()}</div>}
                                        {product.stock && <div><strong>Stock:</strong> {product.stock} units</div>}
                                        {selectedSizes.length > 0 && <div><strong>Sizes:</strong> {selectedSizes.join(', ')}</div>}
                                        {selectedColors.length > 0 && <div><strong>Colors:</strong> {selectedColors.join(', ')}</div>}
                                        {Object.entries(variants).map(([k, v]) => v.length > 0 && (
                                            <div key={k}><strong>{k}:</strong> {v.map(i => i.label).join(', ')}</div>
                                        ))}
                                        {Object.keys(variantImages).length > 0 && (
                                            <div><strong>Variant Images:</strong> {Object.keys(variantImages).length} uploaded</div>
                                        )}
                                        {specifications.filter(s => s.value).length > 0 && (
                                            <div><strong>Specs:</strong> {specifications.filter(s => s.value).length} defined</div>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button type="submit" disabled={loading}
                                    className="btn btn-primary shadow-glow"
                                    style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', fontSize: '1.1rem' }}>
                                    {loading ? 'Publishing...' : '🚀 Publish Product'}
                                </button>
                                <button type="button" onClick={() => navigate('/seller/dashboard')}
                                    className="btn btn-secondary" style={{ width: '100%', padding: '1.25rem', borderRadius: '16px' }}>
                                    Cancel
                                </button>
                            </div>

                            {/* Tips */}
                            <div style={{ ...sty.card, background: '#f8fafc', border: 'none' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <AlertCircle size={18} /> Seller Tips
                                </h4>
                                <ul style={{ fontSize: '0.85rem', color: '#64748b', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <li>Add sizes & colors to help customers find the right fit.</li>
                                    <li>Set variant pricing for different configurations.</li>
                                    <li>Specifications improve search visibility.</li>
                                    <li>High-quality images boost conversions by 40%.</li>
                                </ul>
                            </div>
                        </motion.div>
                    </div>
                </form>
            </div>
        </div>
    );
}
