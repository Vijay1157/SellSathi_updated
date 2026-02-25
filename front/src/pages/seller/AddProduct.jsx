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
    ShoppingBag,
    Tag,
    Layers,
    Info,
    Loader
} from 'lucide-react';
import { auth } from '../../config/firebase';
import { authFetch } from '../../utils/api';

export default function AddProduct() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [product, setProduct] = useState({
        name: '',
        price: '',
        discountPrice: '',
        category: '',
        stock: '',
        description: '',
        image: ''
    });

    const categories = [
        "Electronics", "Fashion", "Home & Kitchen", "Handicrafts",
        "Food & Beverages", "Beauty & Personal Care", "Sports & Fitness",
        "Books & Stationery", "Others"
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        let sellerId = user?.uid || null;

        if (!sellerId) {
            try {
                const userData = JSON.parse(localStorage.getItem('user'));
                sellerId = userData?.uid || null;
            } catch {
                sellerId = null;
            }
        }

        if (!sellerId) {
            alert("Please login first");
            return;
        }

        setLoading(true);
        try {
            const response = await authFetch('/seller/product/add', {
                method: 'POST',
                body: JSON.stringify({
                    sellerId,
                    productData: {
                        ...product,
                        price: parseFloat(product.price),
                        stock: parseInt(product.stock)
                    }
                })
            });

            const data = await response.json();
            if (data.success) {
                // Success animation/notification could go here
                navigate('/seller/dashboard');
            } else {
                alert("Failed: " + data.message);
            }
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Error adding product");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            padding: '2rem 1rem'
        }}>
            <div className="container" style={{ maxWidth: '1000px' }}>
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'between',
                        marginBottom: '2.5rem'
                    }}
                >
                    <button
                        onClick={() => navigate('/seller/dashboard')}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem 1rem', borderRadius: '12px' }}
                    >
                        <ArrowLeft size={20} /> Back to Dashboard
                    </button>
                    <div style={{ textAlign: 'right', flex: 1 }}>
                        <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Create New <span className="gradient-text">Listing</span></h1>
                        <p className="text-muted">Fill in the details to showcase your product to the world.</p>
                    </div>
                </motion.div>

                <form onSubmit={handleSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
                        {/* Left Column: Details */}
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 }}
                            className="flex flex-col gap-6"
                        >
                            {/* Basic Info Section */}
                            <div className="glass-card" style={{ background: 'white', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--primary)15', color: 'var(--primary)', borderRadius: '10px' }}>
                                        <Info size={20} />
                                    </div>
                                    <h3 style={{ margin: 0 }}>Product Information</h3>
                                </div>

                                <div className="flex flex-col gap-5">
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Product Title</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Premium Silk Scarf"
                                            required
                                            style={{ width: '100%', padding: '1rem', border: '1.5px solid var(--border)' }}
                                            value={product.name}
                                            onChange={e => setProduct({ ...product, name: e.target.value })}
                                        />
                                    </div>

                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Description</label>
                                        <textarea
                                            placeholder="Describe your product in detail..."
                                            required
                                            rows="6"
                                            style={{ width: '100%', padding: '1rem', border: '1.5px solid var(--border)', resize: 'vertical' }}
                                            value={product.description}
                                            onChange={e => setProduct({ ...product, description: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Inventory & Pricing Section */}
                            <div className="glass-card" style={{ background: 'white', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--success)15', color: 'var(--success)', borderRadius: '10px' }}>
                                        <Tag size={20} />
                                    </div>
                                    <h3 style={{ margin: 0 }}>Pricing & Inventory</h3>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Price (₹)</label>
                                        <div style={{ position: 'relative' }}>
                                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 'bold', color: 'var(--text-muted)' }}>₹</span>
                                            <input
                                                type="number"
                                                placeholder="0.00"
                                                required
                                                style={{ width: '100%', padding: '1rem 1rem 1rem 2.2rem', border: '1.5px solid var(--border)' }}
                                                value={product.price}
                                                onChange={e => setProduct({ ...product, price: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Stock Quantity</label>
                                        <input
                                            type="number"
                                            placeholder="Units in stock"
                                            required
                                            style={{ width: '100%', padding: '1rem', border: '1.5px solid var(--border)' }}
                                            value={product.stock}
                                            onChange={e => setProduct({ ...product, stock: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div style={{ marginTop: '1.5rem' }}>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>Category</label>
                                    <select
                                        required
                                        style={{ width: '100%', padding: '1rem', border: '1.5px solid var(--border)', background: 'var(--surface)' }}
                                        value={product.category}
                                        onChange={e => setProduct({ ...product, category: e.target.value })}
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>{cat}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right Column: Image & Actions */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col gap-6"
                        >
                            {/* Image Upload Section */}
                            <div className="glass-card" style={{ background: 'white', padding: '2rem', boxShadow: 'var(--shadow-md)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                                    <div style={{ padding: '0.5rem', background: 'var(--secondary)15', color: 'var(--secondary)', borderRadius: '10px' }}>
                                        <ImageIcon size={20} />
                                    </div>
                                    <h3 style={{ margin: 0 }}>Product Media</h3>
                                </div>

                                <div
                                    style={{
                                        border: '2px dashed var(--border)',
                                        borderRadius: '16px',
                                        padding: '2rem',
                                        textAlign: 'center',
                                        background: 'var(--surface)',
                                        minHeight: '200px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        transition: 'all 0.3s'
                                    }}
                                >
                                    {product.image ? (
                                        <div style={{ position: 'relative', width: '100%' }}>
                                            <img
                                                src={product.image}
                                                alt="Preview"
                                                style={{ width: '100%', borderRadius: '12px', maxHeight: '300px', objectFit: 'contain' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setProduct({ ...product, image: '' })}
                                                style={{
                                                    position: 'absolute',
                                                    top: '0.5rem',
                                                    right: '0.5rem',
                                                    background: 'white',
                                                    padding: '0.5rem',
                                                    borderRadius: '50%',
                                                    boxShadow: 'var(--shadow-md)',
                                                    color: 'var(--error)'
                                                }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center gap-3" style={{ cursor: 'pointer', width: '100%' }}>
                                            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                {uploading ? <Loader className="animate-spin text-primary" /> : <Upload className="text-muted" />}
                                            </div>
                                            <div style={{ width: '100%', textAlign: 'center' }}>
                                                <p style={{ fontWeight: 600, color: 'var(--primary)' }}>
                                                    {uploading ? "Uploading..." : "Click to Upload Image"}
                                                </p>
                                                <p className="text-muted" style={{ fontSize: '0.8rem' }}>High-quality images work best!</p>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    hidden
                                                    disabled={uploading}
                                                    onChange={async (e) => {
                                                        const file = e.target.files[0];
                                                        if (!file) return;

                                                        setUploading(true);
                                                        const formData = new FormData();
                                                        formData.append('image', file);

                                                        try {
                                                            const response = await authFetch('/seller/upload-image', {
                                                                method: 'POST',
                                                                body: formData
                                                            });
                                                            const data = await response.json();
                                                            if (data.success) {
                                                                setProduct({ ...product, image: data.url });
                                                            } else {
                                                                alert('Upload failed: ' + data.message);
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            alert('Upload error');
                                                        } finally {
                                                            setUploading(false);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </label>
                                    )}
                                </div>

                                <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--primary)05', borderRadius: '12px', border: '1px solid var(--primary)10' }}>
                                    <p style={{ fontSize: '0.875rem', color: 'var(--primary)', lineHeight: 1.4, margin: 0, display: 'flex', gap: '0.5rem' }}>
                                        <CheckCircle size={16} style={{ flexShrink: 0 }} />
                                        <span>Showcase your product from its best angle. Clear lighting is key!</span>
                                    </p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="btn btn-primary shadow-glow"
                                    style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', fontSize: '1.1rem' }}
                                >
                                    {loading ? 'Publishing...' : 'Publish Product'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => navigate('/seller/dashboard')}
                                    className="btn btn-secondary"
                                    style={{ width: '100%', padding: '1.25rem', borderRadius: '16px' }}
                                >
                                    Cancel Listing
                                </button>
                            </div>

                            {/* Tips Card */}
                            <div className="glass-card" style={{ background: 'var(--surface)', border: 'none', padding: '1.5rem' }}>
                                <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                                    <AlertCircle size={18} /> Seller Tips
                                </h4>
                                <ul style={{ fontSize: '0.85rem', color: 'var(--text-muted)', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <li>Use descriptive titles to help customers find you.</li>
                                    <li>Accurate categories improve search results.</li>
                                    <li>Honest descriptions build buyer trust.</li>
                                    <li>Keep your inventory numbers updated.</li>
                                </ul>
                            </div>
                        </motion.div>
                    </div>
                </form>
            </div>
        </div>
    );
}
