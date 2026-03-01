import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, DollarSign, Plus, Edit2, Trash2, Truck, Loader, X, Home, Upload, Eye, AlertCircle, CheckCircle, Ruler, Palette, Cpu, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { auth } from '../../config/firebase';
import { authFetch } from '../../utils/api';

// Helper to get current user UID (works for both Firebase and test login)
const getUserUid = () => {
    // Try Firebase first
    if (auth.currentUser) return auth.currentUser.uid;
    // Fall back to localStorage (test login stores uid there)
    try {
        const userData = JSON.parse(localStorage.getItem('user'));
        return userData?.uid || null;
    } catch { return null; }
};

export default function SellerDashboard() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);
    const [sellerUid, setSellerUid] = useState(null);

    // Data States
    const [stats, setStats] = useState({ totalSales: 0, totalProducts: 0, newOrders: 0, pendingOrders: 0 });
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);
    const [profile, setProfile] = useState({ name: '...', shopName: '' });

    // Modal States
    const [showViewModal, setShowViewModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState(null);
    const [updateLoading, setUpdateLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [quotaExceeded, setQuotaExceeded] = useState(false);

    // Track Order Modal
    const [showTrackModal, setShowTrackModal] = useState(false);
    const [trackingOrder, setTrackingOrder] = useState(null);

    // Performance Analytics State
    const [performanceYear, setPerformanceYear] = useState('This Year');

    useEffect(() => {
        const loadDashboard = async () => {
            const uid = getUserUid();
            setSellerUid(uid);

            if (!uid) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const response = await authFetch(`/seller/${uid}/dashboard-data`);
                const data = await response.json();

                if (data.success) {
                    setProfile(data.profile);
                    setStats(data.stats);
                    setProducts(data.products);
                    setOrders(data.orders);
                    if (data.quotaExceeded) setQuotaExceeded(true);
                }
            } catch (error) {
                console.error("Error fetching seller data:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, []);



    const handleViewProduct = (product) => {
        setSelectedProduct(product);
        setEditData({
            ...product,
            discountPrice: product.discountPrice || '',
            sizes: product.sizes || [],
            pricingType: product.pricingType || 'same',
            sizePrices: product.sizePrices || {},
            colors: product.colors || [],
            storage: product.storage || [],
            memory: product.memory || [],
            weight: product.weight || [],
            specifications: product.specifications || {},
            variantImages: product.variantImages || {}
        });
        setIsEditing(false);
        setShowViewModal(true);
    };

    const handleUpdateProduct = async (e) => {
        e.preventDefault();
        const uid = sellerUid || getUserUid();
        if (!uid) return;

        if (!editData.image) {
            alert('Main Product Image is compulsory. Please upload or provide a URL.');
            return;
        }

        let finalBasePrice = parseFloat(editData.price);
        if (editData.sizes?.length > 0 && editData.pricingType === 'varied') {
            const sizePricesArr = Object.values(editData.sizePrices || {}).map(p => parseFloat(p)).filter(p => !isNaN(p) && p > 0);
            if (sizePricesArr.length > 0) {
                finalBasePrice = Math.min(...sizePricesArr);
            }
        }

        const payloadData = { ...editData, price: finalBasePrice };

        setUpdateLoading(true);
        try {
            const response = await authFetch(`/seller/product/update/${selectedProduct.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    sellerId: uid,
                    productData: payloadData
                })
            });

            const data = await response.json();
            if (data.success) {
                alert("Product updated successfully!");
                setIsEditing(false);
                setSelectedProduct({ ...payloadData });
                // Refresh list
                setProducts(products.map(p => p.id === selectedProduct.id ? { ...payloadData, id: p.id } : p));
            } else {
                alert("Failed to update: " + data.message);
            }
        } catch (error) {
            console.error("Error updating product:", error);
            alert("Error updating product");
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        try {
            const response = await authFetch(`/seller/product/${id}`, { method: 'DELETE' });
            const data = await response.json();
            if (data.success) {
                setProducts(products.filter(p => p.id !== id));
            } else {
                alert("Failed to delete product");
            }
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    };

    const handleUpdateStatus = async (orderId, currentStatus) => {
        const statuses = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
        const nextIndex = (statuses.indexOf(currentStatus) + 1) % statuses.length;
        const newStatus = statuses[nextIndex];

        try {
            const response = await authFetch(`/seller/order/${orderId}/status`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            const data = await response.json();
            if (data.success) {
                setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
            }
        } catch (error) {
            console.error("Error updating status:", error);
        }
    };

    const handleDownloadLabel = async (orderId, awbNumber, existingLabelUrl) => {
        if (!awbNumber) {
            alert("AWB is not generated yet for this order.");
            return;
        }

        // If label is already fetched
        if (existingLabelUrl) {
            window.open(existingLabelUrl, '_blank');
            return;
        }

        try {
            setLoading(true); // Re-use main loader or add a specific state if preferred
            const response = await authFetch(`/api/orders/${orderId}/label`);
            const data = await response.json();

            if (data.success && data.labelUrl) {
                // Update local state so we don't fetch it again
                setOrders(orders.map(o => o.id === orderId ? { ...o, labelUrl: data.labelUrl } : o));
                window.open(data.labelUrl, '_blank');
            } else {
                alert(data.message || "Failed to fetch shipping label");
            }
        } catch (error) {
            console.error("Error downloading label:", error);
            alert("Error trying to download shipping label.");
        } finally {
            setLoading(false);
        }
    };

    const statCards = [
        { label: 'Total Sales', value: `₹${stats.totalSales.toLocaleString()}`, icon: <DollarSign />, color: 'var(--success)' },
        { label: 'Active Products', value: stats.totalProducts, icon: <Package />, color: 'var(--primary)' },
        { label: 'New Orders', value: stats.newOrders, icon: <ShoppingBag />, color: 'var(--secondary)' },
        { label: 'Pending', value: stats.pendingOrders, icon: <Truck />, color: 'var(--warning)' },
    ];

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-4" style={{ background: 'var(--background)' }}>
                <Loader className="animate-spin" size={40} color="var(--primary)" />
                <p style={{ fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.02em' }}>Initializing your dashboard...</p>
            </div>
        );
    }

    if (profile.status === 'PENDING') {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-6 p-8 text-center" style={{ background: 'var(--background)' }}>
                <div style={{ padding: '2rem', background: 'var(--warning)15', borderRadius: '50%', color: 'var(--warning)' }}>
                    <Truck size={64} />
                </div>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#1e293b' }}>Application Pending</h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', lineHeight: 1.6 }}>
                        Thanks for applying to be a seller! Your application is currently under review by our admin team.
                        <br />You will be notified once it is approved.
                    </p>
                </div>
                <button onClick={() => window.location.reload()} className="btn btn-secondary" style={{ marginTop: '1rem' }}>Check Status</button>
            </div>
        );
    }

    if (profile.status === 'REJECTED') {
        return (
            <div className="flex flex-col justify-center items-center h-screen gap-6 p-8 text-center" style={{ background: 'var(--background)' }}>
                <div style={{ padding: '2rem', background: 'var(--error)15', borderRadius: '50%', color: 'var(--error)' }}>
                    <X size={64} />
                </div>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', color: '#1e293b' }}>Application Rejected</h2>
                    <p style={{ fontSize: '1.1rem', color: '#64748b', maxWidth: '600px', lineHeight: 1.6 }}>
                        We're sorry, but your seller application was not approved at this time.
                    </p>
                </div>
                <Link to="/" className="btn btn-primary" style={{ marginTop: '1rem' }}>Return to Home</Link>
            </div>
        );
    }

    return (
        <div className="flex" style={{ minHeight: 'calc(100vh - 80px)', width: '100%', gap: '0', padding: '0' }}>
            {/* Seller Pro Sidebar - Distinct Dark Theme */}
            <aside className="flex flex-col justify-between" style={{
                width: '260px',
                height: 'calc(100vh - 80px)',
                padding: '2rem 1.5rem',
                position: 'sticky',
                top: '80px',
                background: '#1e293b', // Slate-800
                color: '#f8fafc',
                boxShadow: '4px 0 24px rgba(0,0,0,0.05)',
                zIndex: 10
            }}>
                <div>
                    <div style={{ paddingBottom: '2rem', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '0.05em', color: 'white', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '8px', height: '8px', background: 'var(--primary)', borderRadius: '50%' }}></div>
                            SELLER CENTER
                        </h3>
                    </div>

                    <nav className="flex flex-col gap-3">
                        <Link
                            to="/"
                            className="btn"
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                padding: '1rem',
                                fontSize: '0.95rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'rgba(255,255,255,0.8)',
                                border: 'none',
                                borderRadius: '12px'
                            }}
                        >
                            <Home size={18} />
                            Storefront
                        </Link>
                        {['overview', 'products', 'orders'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '1rem',
                                    fontSize: '0.95rem',
                                    borderRadius: '12px',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.2s ease',
                                    background: activeTab === tab ? 'var(--primary)' : 'transparent',
                                    color: activeTab === tab ? 'white' : 'rgba(255,255,255,0.7)',
                                    fontWeight: activeTab === tab ? 600 : 400,
                                    border: 'none',
                                    cursor: 'pointer'
                                }}
                            >
                                {tab === 'overview' && <LayoutDashboard size={18} />}
                                {tab === 'products' && <Package size={18} />}
                                {tab === 'orders' && <ShoppingBag size={18} />}
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div className="flex items-center gap-3 mb-2">
                        <div style={{ padding: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }}>
                            <Edit2 size={14} className="text-white" />
                        </div>
                        <small style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Quick Tip</small>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
                        Update your inventory daily to boost visibility.
                    </p>
                </div>
            </aside>

            {/* Main Content Area - Light & Spacious */}
            <div className="flex-1 flex flex-col" style={{ padding: '2.5rem 3rem', background: '#f8fafc', gap: '2rem', height: 'calc(100vh - 80px)', overflowY: 'auto' }}>

                {quotaExceeded && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: '#fff3cd',
                            color: '#856404',
                            padding: '1rem 1.5rem',
                            borderRadius: '12px',
                            border: '1px solid #ffeeba',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            fontSize: '0.9rem'
                        }}
                    >
                        <AlertCircle size={20} />
                        <div>
                            <strong>Cloud Database Quota Exceeded.</strong> You are currently seeing limited/cached demo data. Real-time updates may be restricted until the quota resets.
                        </div>
                    </motion.div>
                )}

                <div className="flex justify-between items-center">
                    <div>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', marginBottom: '0.25rem' }}>Dashboard</h2>
                        <p style={{ color: '#64748b' }}>Welcome back, <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{profile.name}</span></p>
                    </div>
                    <button className="btn btn-primary shadow-lg hover:shadow-xl transition-all" onClick={() => navigate('/seller/add-product')} style={{ padding: '0.75rem 1.5rem', borderRadius: '50px' }}>
                        <Plus size={20} /> New Product
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <div className="animate-fade-in flex flex-col" style={{ gap: '2.5rem' }}>
                        {/* Panoramic Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                            {statCards.map((s, i) => (
                                <div key={i} style={{
                                    background: 'white',
                                    padding: '1.5rem',
                                    borderRadius: '20px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                                    border: '1px solid #f1f5f9',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    height: '160px',
                                    position: 'relative',
                                    overflow: 'hidden'
                                }}>
                                    <div style={{
                                        width: '48px', height: '48px',
                                        borderRadius: '12px',
                                        background: s.color + '15',
                                        color: s.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {s.icon}
                                    </div>

                                    <div>
                                        <h3 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', lineHeight: 1, marginBottom: '0.25rem' }}>{s.value}</h3>
                                        <p style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Store Performance Placeholder */}


                        {/* Performance Analytics */}
                        <div style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '2rem',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
                            border: '1px solid #f1f5f9'
                        }}>
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Performance Analytics</h3>
                                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Annual Sales Growth</p>
                                </div>
                                <select
                                    value={performanceYear}
                                    onChange={(e) => setPerformanceYear(e.target.value)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        fontSize: '0.85rem',
                                        color: '#64748b'
                                    }}
                                >
                                    <option value="This Year">This Year</option>
                                    <option value="Last Year">Last Year</option>
                                </select>
                            </div>

                            <div style={{ width: '100%', height: 350 }}>
                                <ResponsiveContainer width="100%" height={350}>
                                    <AreaChart data={
                                        // Calculate monthly sales data dynamically from orders
                                        (() => {
                                            console.log("Performance Analytics orders:", orders);
                                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                            const currentYear = new Date().getFullYear();
                                            const targetYear = performanceYear === 'This Year' ? currentYear : currentYear - 1;

                                            // Initialize with 0
                                            const monthlyData = months.map(m => ({ name: m, sales: 0, orders: 0 }));

                                            orders.forEach(order => {
                                                // Handle various date formats securely
                                                let orderDate;
                                                if (order.date) {
                                                    orderDate = new Date(order.date);
                                                } else if (order.createdAt) {
                                                    orderDate = new Date(order.createdAt);
                                                }

                                                // If date is completely unparseable or missing, default to current Date (now)
                                                if (!orderDate || isNaN(orderDate.getTime())) {
                                                    orderDate = new Date();
                                                }

                                                const orderYear = orderDate.getFullYear();
                                                // Default to current year if something extremely weird happens
                                                const finalYear = isNaN(orderYear) ? currentYear : orderYear;

                                                if (finalYear === targetYear) {
                                                    const monthIndex = orderDate.getMonth();
                                                    // Ensure month is within 0-11 bounds
                                                    const finalMonth = (isNaN(monthIndex) || monthIndex < 0 || monthIndex > 11) ? 0 : monthIndex;
                                                    monthlyData[finalMonth].sales += Number(order.total) || 0;
                                                    monthlyData[finalMonth].orders += 1;
                                                }
                                            });
                                            return monthlyData;
                                        })()
                                    }>
                                        <defs>
                                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.1} />
                                                <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis
                                            dataKey="name"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#64748b', fontSize: 12 }}
                                            tickFormatter={(value) => `₹${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                background: 'white',
                                                border: 'none',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                            }}
                                            formatter={(value) => [`₹${value}`, 'Sales']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="sales"
                                            stroke="var(--primary)"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorSales)"
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-fade-in flex flex-col gap-4" style={{ height: '100%' }}>
                        <div className="glass-card flex-1" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'white', border: 'none', boxShadow: 'var(--shadow-md)' }}>
                            {products.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                    <Package size={64} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
                                    <h3 style={{ color: '#1e293b' }}>No Products Yet</h3>
                                    <p style={{ color: '#64748b' }}>Start selling by adding your first product using the button above.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', flex: 1 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: '#1e293b', color: 'white', textAlign: 'left' }}>
                                            <tr>
                                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Product Details</th>
                                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Category</th>
                                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Price</th>
                                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Discount Price</th>
                                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Stock</th>
                                                <th style={{ padding: '1.25rem 1.5rem', fontWeight: 600, fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map(p => (
                                                <tr key={p.id}
                                                    style={{ borderBottom: '1px solid #f1f5f9', background: 'white', transition: 'background 0.15s ease' }}
                                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                                >
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                            {p.image ? (
                                                                <img src={p.image} style={{ width: '52px', height: '52px', borderRadius: '10px', objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }} />
                                                            ) : (
                                                                <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                                    <Package size={20} style={{ color: '#94a3b8' }} />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p style={{ fontWeight: 600, color: '#1e293b', margin: 0, fontSize: '0.95rem' }}>{p.title}</p>
                                                                <div style={{ display: 'flex', gap: '0.3rem', marginTop: '4px', flexWrap: 'wrap' }}>
                                                                    <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>ID: {p.id?.substring(0, 8)}...</span>
                                                                    {p.sizes && p.sizes.length > 0 && <span style={{ background: '#f3e8ff', color: '#7c3aed', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 600 }}>{p.sizes.length} sizes</span>}
                                                                    {p.colors && p.colors.length > 0 && <span style={{ background: '#fce7f3', color: '#db2777', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 600 }}>{p.colors.length} colors</span>}
                                                                    {p.storage && p.storage.length > 0 && <span style={{ background: '#fef3c7', color: '#d97706', padding: '0.1rem 0.5rem', borderRadius: '10px', fontSize: '0.68rem', fontWeight: 600 }}>{p.storage.length} storage</span>}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 500, whiteSpace: 'nowrap' }}>
                                                            {p.category}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#1e293b', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                                                        ₹{Number(p.price).toLocaleString('en-IN')}
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem', fontWeight: 700, color: '#22c55e', fontSize: '1rem', whiteSpace: 'nowrap' }}>
                                                        {p.discountPrice ? `₹${Number(p.discountPrice).toLocaleString('en-IN')}` : '-'}
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.stock > 0 ? '#22c55e' : '#ef4444', flexShrink: 0 }}></div>
                                                            <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 500 }}>{p.stock || 0} units</span>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem 1.5rem' }}>
                                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                            <button
                                                                style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#3b82f6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 500 }}
                                                                onClick={() => handleViewProduct(p)}
                                                                title="View / Edit Product"
                                                            >
                                                                <Eye size={14} /> View
                                                            </button>
                                                            <button
                                                                style={{ padding: '0.45rem 1rem', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff5f5', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 500 }}
                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 size={14} /> Delete
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'orders' && (
                    <div className="animate-fade-in flex flex-col gap-4" style={{ height: '100%' }}>
                        <div className="mb-4">
                            <h3>Customer Orders ({orders.length})</h3>
                        </div>

                        <div className="glass-card flex-1" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {orders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                    <ShoppingBag size={64} className="text-muted mb-4" />
                                    <h3>No Orders Yet</h3>
                                    <p className="text-muted">Orders will appear here once customers start buying your products.</p>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', flex: 1 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                            <tr>
                                                <th style={{ padding: '1.25rem' }}>Order ID</th>
                                                <th>Customer</th>
                                                <th>Total Amount</th>
                                                <th>Status</th>
                                                <th>Courier Info</th>
                                                <th style={{ padding: '1.25rem' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map(o => (
                                                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '1.25rem', fontFamily: 'monospace', fontWeight: 600 }}>#{o.orderId}</td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>
                                                                {o.customer.charAt(0)}
                                                            </div>
                                                            {o.customer}
                                                        </div>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>₹{o.total}</td>
                                                    <td>
                                                        <span style={{
                                                            padding: '0.35rem 0.75rem',
                                                            borderRadius: '6px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 500,
                                                            background: o.status === 'Delivered' ? 'rgba(var(--success-rgb), 0.1)' : 'rgba(var(--warning-rgb), 0.1)',
                                                            color: o.status === 'Delivered' ? 'var(--success)' : 'var(--warning)',
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.5rem'
                                                        }}>
                                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'currentColor' }}></span>
                                                            {o.status}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        {o.awbNumber ? (
                                                            <div className="flex flex-col">
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{o.courierName}</span>
                                                                <span className="text-muted" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>AWB: {o.awbNumber}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted" style={{ fontSize: '0.85rem' }}>Pending Assignment</span>
                                                        )}
                                                    </td>
                                                    <td style={{ padding: '1.25rem' }}>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => { setTrackingOrder(o); setShowTrackModal(true); }}
                                                                className="btn btn-primary btn-sm flex items-center gap-1"
                                                                style={{ padding: '0.4rem 0.75rem' }}
                                                                title="Track Order"
                                                            >
                                                                <Truck size={14} /> Track
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* View/Edit Product Modal */}
            <AnimatePresence>
                {showViewModal && selectedProduct && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(5, 5, 15, 0.75)', backdropFilter: 'blur(20px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem'
                    }}>
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            style={{
                                width: '100%',
                                maxWidth: '900px',
                                maxHeight: '95vh',
                                overflowY: 'auto',
                                borderRadius: '28px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'white',
                                boxShadow: '0 30px 60px -12px rgba(0, 0, 0, 0.25)',
                                color: 'var(--text)',
                                position: 'relative'
                            }}
                        >
                            {/* Header Section */}
                            <div style={{
                                padding: '2rem 2.5rem',
                                borderBottom: '1px solid var(--border)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                background: 'linear-gradient(to right, #f8fafc, white)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{
                                        padding: '0.75rem',
                                        background: 'var(--primary)15',
                                        color: 'var(--primary)',
                                        borderRadius: '12px'
                                    }}>
                                        {isEditing ? <Edit2 size={24} /> : <Eye size={24} />}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
                                            {isEditing ? 'Editing' : 'Product'} <span className="gradient-text">Details</span>
                                        </h2>
                                        <p className="text-muted" style={{ margin: 0 }}>ID: {selectedProduct.id}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    {!isEditing && (
                                        <button
                                            onClick={() => setIsEditing(true)}
                                            className="btn btn-primary"
                                            style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
                                        >
                                            <Edit2 size={18} /> Modify Listing
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setShowViewModal(false)}
                                        style={{
                                            padding: '0.75rem',
                                            borderRadius: '12px',
                                            background: 'var(--surface)',
                                            color: 'var(--text-muted)'
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            <form onSubmit={handleUpdateProduct} style={{ padding: '2.5rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem' }}>
                                    {/* Left Side: Media & Quick Actions */}
                                    <div className="flex flex-col gap-6">
                                        <div style={{
                                            position: 'relative',
                                            borderRadius: '24px',
                                            overflow: 'hidden',
                                            boxShadow: 'var(--shadow-lg)',
                                            border: '1px solid var(--border)'
                                        }}>
                                            <img
                                                src={isEditing ? editData.image : selectedProduct.image}
                                                alt={selectedProduct.title}
                                                style={{ width: '100%', aspectRatio: '1', objectFit: 'cover' }}
                                                onError={(e) => { e.target.src = 'https://via.placeholder.com/600x600?text=Product+Media'; }}
                                            />
                                            {selectedProduct.stock <= 5 && !isEditing && (
                                                <div style={{
                                                    position: 'absolute', top: '1rem', left: '1rem',
                                                    background: 'var(--error)', color: 'white',
                                                    padding: '0.4rem 0.8rem', borderRadius: '8px',
                                                    fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                                                }}>
                                                    Low Stock
                                                </div>
                                            )}
                                        </div>

                                        {isEditing && (
                                            <div style={{ background: 'var(--surface)', padding: '1.25rem', borderRadius: '16px' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                    <Upload size={14} /> Update Product Image
                                                </label>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                    <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.5rem', border: '2px dashed var(--border)', borderRadius: '10px', cursor: isUploading ? 'not-allowed' : 'pointer', background: 'white', transition: 'all 0.2s', textAlign: 'center' }}>
                                                        {isUploading ? <Loader className="animate-spin" style={{ color: 'var(--primary)', marginBottom: '0.5rem' }} /> : <Upload style={{ color: '#94a3b8', marginBottom: '0.5rem' }} />}
                                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>
                                                            {isUploading ? "Uploading..." : "Click to Upload New Image"}
                                                        </span>
                                                        <span className="text-muted" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>Or input an image URL below</span>
                                                        <input type="file" hidden accept="image/*" disabled={isUploading}
                                                            onChange={async (e) => {
                                                                const file = e.target.files[0];
                                                                if (!file) return;
                                                                setIsUploading(true);
                                                                const formData = new FormData();
                                                                formData.append('image', file);
                                                                try {
                                                                    const response = await authFetch('/seller/upload-image', { method: 'POST', body: formData });
                                                                    const data = await response.json();
                                                                    if (data.success) { setEditData({ ...editData, image: data.url }); }
                                                                    else { alert('Upload failed: ' + data.message); }
                                                                } catch (err) { console.error(err); alert('Upload error'); }
                                                                finally { setIsUploading(false); }
                                                            }}
                                                        />
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={editData.image}
                                                        onChange={e => setEditData({ ...editData, image: e.target.value })}
                                                        style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', border: '1px solid var(--border)' }}
                                                        placeholder="Or enter new image URL..."
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {!isEditing && (
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Status:</p>
                                                    <p style={{ fontWeight: 600, color: 'var(--success)' }}>Active</p>
                                                </div>
                                                <div style={{ background: 'var(--surface)', padding: '1rem', borderRadius: '16px', textAlign: 'center' }}>
                                                    <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Views:</p>
                                                    <p style={{ fontWeight: 600 }}>{selectedProduct.views || 0}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right Side: Information Form */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                                        {/* Title Field */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Product Title
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="text"
                                                    value={editData.title}
                                                    onChange={e => setEditData({ ...editData, title: e.target.value })}
                                                    style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', fontWeight: 600, borderRadius: '12px', border: '1px solid #e2e8f0' }}
                                                    required
                                                />
                                            ) : (
                                                <h3 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#1e293b', lineHeight: 1.2 }}>
                                                    {selectedProduct.title}
                                                </h3>
                                            )}
                                        </div>

                                        {/* Price Row — fixed 2 columns */}
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            {/* Retail Price */}
                                            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Retail Price
                                                </label>
                                                {isEditing ? (
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: 'var(--primary)' }}>₹</span>
                                                        <input
                                                            type="number"
                                                            value={editData.price}
                                                            onChange={e => setEditData({ ...editData, price: e.target.value })}
                                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 1.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}
                                                            required
                                                        />
                                                    </div>
                                                ) : (
                                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)', margin: 0 }}>
                                                        ₹{Number(selectedProduct.price).toLocaleString('en-IN')}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Discount Price */}
                                            <div style={{ background: '#f0fdf4', borderRadius: '12px', padding: '1rem', border: '1px solid #bbf7d0' }}>
                                                <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Discount Price <span style={{ color: '#22c55e' }}>(Seasonal)</span>
                                                </label>
                                                {isEditing ? (
                                                    <div style={{ position: 'relative' }}>
                                                        <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 600, color: '#22c55e' }}>₹</span>
                                                        <input
                                                            type="number"
                                                            value={editData.discountPrice}
                                                            onChange={e => setEditData({ ...editData, discountPrice: e.target.value })}
                                                            placeholder="Optional"
                                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 1.75rem', borderRadius: '8px', border: '1px solid #bbf7d0', fontWeight: 600 }}
                                                        />
                                                    </div>
                                                ) : (
                                                    selectedProduct.discountPrice ? (
                                                        <div>
                                                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#22c55e', margin: 0 }}>
                                                                ₹{Number(selectedProduct.discountPrice).toLocaleString('en-IN')}
                                                            </p>
                                                            <small style={{ color: '#64748b' }}>Seasonal Offer</small>
                                                        </div>
                                                    ) : (
                                                        <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: '#94a3b8', margin: 0, paddingTop: '0.25rem' }}>No active discount</p>
                                                    )
                                                )}
                                            </div>
                                        </div>

                                        {/* Stock — own full-width row */}
                                        <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', border: '1px solid #e2e8f0' }}>
                                            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, color: '#64748b', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Inventory Level
                                            </label>
                                            {isEditing ? (
                                                <input
                                                    type="number"
                                                    value={editData.stock}
                                                    onChange={e => setEditData({ ...editData, stock: e.target.value })}
                                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 600 }}
                                                    required
                                                />
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: selectedProduct.stock > 0 ? '#22c55e' : '#ef4444', flexShrink: 0 }}></div>
                                                    <p style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: '#1e293b' }}>{selectedProduct.stock}</p>
                                                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>units in stock</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Category Field */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Product Category
                                            </label>
                                            {isEditing ? (
                                                <select
                                                    value={editData.category}
                                                    onChange={e => setEditData({ ...editData, category: e.target.value })}
                                                    style={{ width: '100%', padding: '0.875rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontWeight: 500 }}
                                                    required
                                                >
                                                    <option value="Electronics">Electronics</option>
                                                    <option value="Fashion">Fashion</option>
                                                    <option value="Home & Kitchen">Home & Kitchen</option>
                                                    <option value="Handicrafts">Handicrafts</option>
                                                    <option value="Food & Beverages">Food & Beverages</option>
                                                    <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                                                    <option value="Sports & Fitness">Sports & Fitness</option>
                                                    <option value="Books & Stationery">Books & Stationery</option>
                                                    <option value="Others">Others</option>
                                                </select>
                                            ) : (
                                                <div style={{ display: 'inline-flex', padding: '0.5rem 1.25rem', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '8px', fontWeight: 600, fontSize: '0.95rem' }}>
                                                    {selectedProduct.category}
                                                </div>
                                            )}
                                        </div>

                                        {/* Description Field */}
                                        <div>
                                            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#64748b', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Product Description
                                            </label>
                                            {isEditing ? (
                                                <textarea
                                                    value={editData.description}
                                                    onChange={e => setEditData({ ...editData, description: e.target.value })}
                                                    style={{ width: '100%', padding: '1rem', height: '160px', borderRadius: '12px', border: '1px solid #e2e8f0', lineHeight: 1.6, fontSize: '1rem', resize: 'vertical' }}
                                                    placeholder="Describe your product..."
                                                    required
                                                />
                                            ) : (
                                                <p style={{
                                                    color: '#334155',
                                                    fontSize: '0.95rem',
                                                    lineHeight: 1.7,
                                                    margin: 0,
                                                    padding: '1.25rem',
                                                    background: '#f8fafc',
                                                    borderRadius: '12px',
                                                    border: '1px solid #e2e8f0',
                                                    whiteSpace: 'pre-line'
                                                }}>
                                                    {selectedProduct.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* ═══════ DYNAMIC ATTRIBUTES SECTION ═══════ */}
                                        {/* SIZES */}
                                        {(selectedProduct.sizes?.length > 0 || (isEditing && editData.category && ['Fashion', 'Beauty & Personal Care', 'Sports & Fitness', 'Others'].includes(editData.category))) && (
                                            <div style={{ background: '#faf5ff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e9d5ff' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, color: '#7c3aed', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Ruler size={14} /> Available Sizes
                                                </label>
                                                {isEditing ? (
                                                    <div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem' }}>
                                                            {(editData.sizes || []).map(size => (
                                                                <span key={size} style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#7c3aed', color: 'white', fontSize: '0.82rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                                                                    onClick={() => setEditData({ ...editData, sizes: editData.sizes.filter(s => s !== size) })}>
                                                                    {size} <X size={12} />
                                                                </span>
                                                            ))}
                                                            <input type="text" placeholder="+ Add size" style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', border: '1.5px dashed #c4b5fd', background: 'transparent', fontSize: '0.82rem', width: '100px', outline: 'none' }}
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = e.target.value.trim(); if (val && !editData.sizes.includes(val)) { setEditData({ ...editData, sizes: [...editData.sizes, val] }); e.target.value = ''; } } }}
                                                            />
                                                        </div>
                                                        {editData.sizes?.length > 0 && (
                                                            <div style={{ marginTop: '0.75rem' }}>
                                                                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                                                    <button type="button" onClick={() => setEditData({ ...editData, pricingType: 'same' })}
                                                                        style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: editData.pricingType === 'same' ? '2px solid #7c3aed' : '1px solid #e2e8f0', background: editData.pricingType === 'same' ? '#f3e8ff' : 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', color: editData.pricingType === 'same' ? '#7c3aed' : '#64748b' }}>
                                                                        Same price all sizes
                                                                    </button>
                                                                    <button type="button" onClick={() => setEditData({ ...editData, pricingType: 'varied' })}
                                                                        style={{ padding: '0.4rem 0.85rem', borderRadius: '8px', border: editData.pricingType === 'varied' ? '2px solid #7c3aed' : '1px solid #e2e8f0', background: editData.pricingType === 'varied' ? '#f3e8ff' : 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer', color: editData.pricingType === 'varied' ? '#7c3aed' : '#64748b' }}>
                                                                        Different prices
                                                                    </button>
                                                                </div>
                                                                {editData.pricingType === 'varied' && editData.sizes.map(size => (
                                                                    <div key={size} style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                                        <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{size}</span>
                                                                        <div style={{ position: 'relative' }}>
                                                                            <span style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 'bold', fontSize: '0.8rem' }}>₹</span>
                                                                            <input type="number" placeholder={editData.price || '0'}
                                                                                value={(editData.sizePrices || {})[size] || ''}
                                                                                onChange={e => setEditData({ ...editData, sizePrices: { ...editData.sizePrices, [size]: e.target.value } })}
                                                                                style={{ width: '100%', padding: '0.5rem 0.5rem 0.5rem 1.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: selectedProduct.pricingType === 'varied' ? '0.75rem' : 0 }}>
                                                            {(selectedProduct.sizes || []).map(size => (
                                                                <span key={size} style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#ede9fe', color: '#6d28d9', fontSize: '0.85rem', fontWeight: 500 }}>
                                                                    {size}
                                                                    {selectedProduct.pricingType === 'varied' && selectedProduct.sizePrices?.[size] && (
                                                                        <span style={{ marginLeft: '0.3rem', fontWeight: 700 }}>— ₹{Number(selectedProduct.sizePrices[size]).toLocaleString('en-IN')}</span>
                                                                    )}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        {selectedProduct.pricingType === 'same' && <p style={{ fontSize: '0.8rem', color: '#8b5cf6', margin: 0, fontStyle: 'italic' }}>Same price for all sizes</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* COLORS */}
                                        {(selectedProduct.colors?.length > 0 || (isEditing && editData.colors?.length > 0)) && (
                                            <div style={{ background: '#fdf2f8', borderRadius: '12px', padding: '1.25rem', border: '1px solid #fbcfe8' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, color: '#db2777', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Palette size={14} /> Available Colors
                                                </label>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                        {(editData.colors || []).map(color => (
                                                            <span key={color} style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#db2777', color: 'white', fontSize: '0.82rem', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
                                                                onClick={() => setEditData({ ...editData, colors: editData.colors.filter(c => c !== color) })}>
                                                                {color} <X size={12} />
                                                            </span>
                                                        ))}
                                                        <input type="text" placeholder="+ Add color" style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', border: '1.5px dashed #f9a8d4', background: 'transparent', fontSize: '0.82rem', width: '110px', outline: 'none' }}
                                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = e.target.value.trim(); if (val && !editData.colors.includes(val)) { setEditData({ ...editData, colors: [...editData.colors, val] }); e.target.value = ''; } } }}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                        {(selectedProduct.colors || []).map(color => (
                                                            <span key={color} style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#fce7f3', color: '#be185d', fontSize: '0.85rem', fontWeight: 500 }}>{color}</span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* STORAGE / MEMORY / WEIGHT VARIANTS */}
                                        {['storage', 'memory', 'weight'].map(vKey => {
                                            const items = isEditing ? (editData[vKey] || []) : (selectedProduct[vKey] || []);
                                            if (items.length === 0 && !(isEditing && editData.category === 'Electronics' && (vKey === 'storage' || vKey === 'memory'))) return null;
                                            const labels = { storage: 'Storage Options', memory: 'Memory / RAM', weight: 'Pack Size / Weight' };
                                            return (
                                                <div key={vKey} style={{ background: '#fffbeb', borderRadius: '12px', padding: '1.25rem', border: '1px solid #fde68a' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, color: '#d97706', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        <Cpu size={14} /> {labels[vKey] || vKey}
                                                    </label>
                                                    {isEditing ? (
                                                        <div>
                                                            {(editData[vKey] || []).map((v, vi) => (
                                                                <div key={v.label || vi} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem', background: 'white', padding: '0.5rem 0.75rem', borderRadius: '10px', border: '1px solid #fde68a' }}>
                                                                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{v.label}</span>
                                                                    <div style={{ position: 'relative' }}>
                                                                        <span style={{ position: 'absolute', left: '0.5rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.75rem' }}>+₹</span>
                                                                        <input type="number" value={v.priceOffset || ''} placeholder="0"
                                                                            onChange={e => {
                                                                                const updated = [...editData[vKey]];
                                                                                updated[vi] = { ...updated[vi], priceOffset: Number(e.target.value) || 0 };
                                                                                setEditData({ ...editData, [vKey]: updated });
                                                                            }}
                                                                            style={{ width: '100%', padding: '0.4rem 0.4rem 0.4rem 1.8rem', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}
                                                                        />
                                                                    </div>
                                                                    <button type="button" onClick={() => setEditData({ ...editData, [vKey]: editData[vKey].filter((_, i) => i !== vi) })}
                                                                        style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.35rem', cursor: 'pointer' }}><X size={14} /></button>
                                                                </div>
                                                            ))}
                                                            <input type="text" placeholder={`+ Add ${vKey}`} style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', border: '1.5px dashed #fbbf24', background: 'transparent', fontSize: '0.82rem', width: '140px', outline: 'none', marginTop: '0.3rem' }}
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const val = e.target.value.trim(); if (val && !(editData[vKey] || []).find(v => v.label === val)) { setEditData({ ...editData, [vKey]: [...(editData[vKey] || []), { label: val, priceOffset: 0 }] }); e.target.value = ''; } } }}
                                                            />
                                                        </div>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                            {items.map((v, i) => (
                                                                <span key={v.label || i} style={{ padding: '0.4rem 0.85rem', borderRadius: '50px', background: '#fef3c7', color: '#92400e', fontSize: '0.85rem', fontWeight: 500 }}>
                                                                    {v.label || v} {v.priceOffset ? <span style={{ fontWeight: 700 }}>{v.priceOffset > 0 ? `+₹${v.priceOffset.toLocaleString()}` : `-₹${Math.abs(v.priceOffset).toLocaleString()}`}</span> : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}

                                        {/* SPECIFICATIONS */}
                                        {(Object.keys(selectedProduct.specifications || {}).length > 0 || (isEditing && Object.keys(editData.specifications || {}).length > 0)) && (
                                            <div style={{ background: '#f0f9ff', borderRadius: '12px', padding: '1.25rem', border: '1px solid #bae6fd' }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, color: '#0284c7', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    <Settings size={14} /> Specifications
                                                </label>
                                                {isEditing ? (
                                                    <div>
                                                        {Object.entries(editData.specifications || {}).map(([key, val]) => (
                                                            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr auto', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                                                                <input type="text" value={key} readOnly style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f1f5f9', fontWeight: 600, fontSize: '0.82rem' }} />
                                                                <input type="text" value={val} placeholder="Value..."
                                                                    onChange={e => { const specs = { ...editData.specifications }; specs[key] = e.target.value; setEditData({ ...editData, specifications: specs }); }}
                                                                    style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.82rem' }}
                                                                />
                                                                <button type="button" onClick={() => { const specs = { ...editData.specifications }; delete specs[key]; setEditData({ ...editData, specifications: specs }); }}
                                                                    style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.35rem', cursor: 'pointer' }}><X size={14} /></button>
                                                            </div>
                                                        ))}
                                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                                            <input id="newSpecKey" type="text" placeholder="Spec name" style={{ flex: 1, padding: '0.45rem 0.75rem', borderRadius: '50px', border: '1.5px dashed #93c5fd', background: 'transparent', fontSize: '0.82rem', outline: 'none' }} />
                                                            <input id="newSpecVal" type="text" placeholder="Value" style={{ flex: 1.5, padding: '0.45rem 0.75rem', borderRadius: '50px', border: '1.5px dashed #93c5fd', background: 'transparent', fontSize: '0.82rem', outline: 'none' }}
                                                                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); const kEl = document.getElementById('newSpecKey'); const vEl = document.getElementById('newSpecVal'); if (kEl.value.trim()) { setEditData({ ...editData, specifications: { ...editData.specifications, [kEl.value.trim()]: vEl.value.trim() } }); kEl.value = ''; vEl.value = ''; } } }}
                                                            />
                                                            <button type="button" onClick={() => { const kEl = document.getElementById('newSpecKey'); const vEl = document.getElementById('newSpecVal'); if (kEl.value.trim()) { setEditData({ ...editData, specifications: { ...editData.specifications, [kEl.value.trim()]: vEl.value.trim() } }); kEl.value = ''; vEl.value = ''; } }}
                                                                style={{ padding: '0.4rem 0.75rem', borderRadius: '50px', background: '#0284c7', color: 'white', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>Add</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                                                        {Object.entries(selectedProduct.specifications || {}).map(([key, val]) => (
                                                            <div key={key} style={{ padding: '0.5rem 0.75rem', background: 'white', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                                                                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>{key}</span>
                                                                <p style={{ margin: 0, fontWeight: 600, fontSize: '0.88rem', color: '#0f172a' }}>{val}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* VARIANT IMAGES */}
                                        {(() => {
                                            const data = isEditing ? editData : selectedProduct;
                                            const allVariantLabels = [
                                                ...(data.colors || []),
                                                ...(data.storage || []).map(v => v.label || v),
                                                ...(data.memory || []).map(v => v.label || v),
                                                ...(data.weight || []).map(v => v.label || v)
                                            ];
                                            if (allVariantLabels.length === 0) return null;

                                            return (
                                                <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.25rem', border: '1px solid #e2e8f0' }}>
                                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, color: '#3b82f6', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                        <Upload size={14} /> Variant Images
                                                    </label>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                        {allVariantLabels.map(label => (
                                                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                                                                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
                                                                {((isEditing ? editData.variantImages : selectedProduct.variantImages) || {})[label] ? (
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                                        <img src={((isEditing ? editData.variantImages : selectedProduct.variantImages) || {})[label]} alt={label} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                                                                        {isEditing && (
                                                                            <button type="button" onClick={() => {
                                                                                const updated = { ...editData.variantImages };
                                                                                delete updated[label];
                                                                                setEditData({ ...editData, variantImages: updated });
                                                                            }} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', padding: '0.3rem', cursor: 'pointer' }}><Trash2 size={12} /></button>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    isEditing ? (
                                                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '0.3rem 0.6rem', background: 'var(--primary)', color: 'white', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 600 }}>
                                                                            <Upload size={12} /> Upload
                                                                            <input type="file" accept="image/*" hidden onChange={async (e) => {
                                                                                const file = e.target.files[0];
                                                                                if (!file) return;
                                                                                const formData = new FormData();
                                                                                formData.append('image', file);
                                                                                try {
                                                                                    const response = await authFetch('/seller/upload-image', { method: 'POST', body: formData });
                                                                                    const resData = await response.json();
                                                                                    if (resData.success) { setEditData(prev => ({ ...prev, variantImages: { ...(prev.variantImages || {}), [label]: resData.url } })); }
                                                                                } catch (err) { console.error(err); alert('Upload error'); }
                                                                            }} />
                                                                        </label>
                                                                    ) : (
                                                                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>None</span>
                                                                    )
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })()}

                                        <div style={{ display: 'none' }}>{/* spacer */}</div>

                                        {isEditing && (
                                            <div className="flex gap-4" style={{ marginTop: 'auto', paddingTop: '2rem' }}>
                                                <button
                                                    type="submit"
                                                    disabled={updateLoading}
                                                    className="btn btn-primary shadow-glow"
                                                    style={{ flex: 2, padding: '1rem', borderRadius: '14px', fontSize: '1.1rem' }}
                                                >
                                                    {updateLoading ? 'Synchronizing...' : 'Apply Changes'}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setIsEditing(false)}
                                                    className="btn btn-secondary"
                                                    style={{ flex: 1, padding: '1rem', borderRadius: '14px' }}
                                                >
                                                    Discard
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Track Order Modal */}
            <AnimatePresence>
                {showTrackModal && trackingOrder && (() => {
                    // Map shipping status to 3-stage seller timeline
                    const SELLER_STAGES = [
                        { key: 'ORDERED', label: 'Ordered', desc: 'Order placed by customer' },
                        { key: 'PICKUP', label: 'Pickup', desc: 'Courier picked up package' },
                        { key: 'DELIVERED', label: 'Delivered', desc: 'Delivered to customer' },
                    ];
                    const shippingToStage = (s) => {
                        if (!s || s === 'ORDERED') return 'ORDERED';
                        if (['PACKING', 'SHIPPING', 'OUT_FOR_DELIVERY', 'PICKUP_SCHEDULED', 'PICKUP_COMPLETE', 'SHIPPED', 'IN_TRANSIT'].includes(s)) return 'PICKUP';
                        if (s === 'DELIVERED') return 'DELIVERED';
                        return 'ORDERED';
                    };
                    const currentStage = shippingToStage(trackingOrder.shippingStatus);
                    const currentIdx = SELLER_STAGES.findIndex(s => s.key === currentStage);

                    return (
                        <div style={{
                            position: 'fixed', inset: 0, background: 'rgba(5,5,15,0.8)', backdropFilter: 'blur(16px)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, padding: '1rem'
                        }} onClick={() => setShowTrackModal(false)}>
                            <motion.div
                                initial={{ opacity: 0, y: 40, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 40, scale: 0.96 }}
                                transition={{ duration: 0.25 }}
                                style={{
                                    background: 'var(--background)', borderRadius: '24px',
                                    width: '100%', maxWidth: '640px', maxHeight: '90vh',
                                    overflowY: 'auto', padding: '2rem', position: 'relative',
                                    border: '1px solid var(--border)', boxShadow: '0 32px 80px rgba(0,0,0,0.4)'
                                }}
                                onClick={e => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                                    <div>
                                        <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>Order Tracking</h2>
                                        <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontFamily: 'monospace' }}>#{trackingOrder.orderId}</p>
                                    </div>
                                    <button onClick={() => setShowTrackModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.5rem' }}>
                                        <X size={20} />
                                    </button>
                                </div>

                                {/* 3-Stage Timeline */}
                                <div style={{
                                    padding: '1.5rem', background: 'var(--surface)',
                                    borderRadius: '16px', marginBottom: '1.5rem',
                                    border: '1px solid var(--border)'
                                }}>
                                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        {/* Progress bar behind */}
                                        <div style={{ position: 'absolute', top: '20px', left: '10%', right: '10%', height: '2px', background: 'var(--border)', zIndex: 0 }}>
                                            <div style={{
                                                height: '100%', background: 'var(--primary)',
                                                width: currentIdx === 0 ? '0%' : currentIdx === 1 ? '50%' : '100%',
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                        {SELLER_STAGES.map((stage, idx) => {
                                            const done = idx <= currentIdx;
                                            const active = idx === currentIdx;
                                            return (
                                                <div key={stage.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1 }}>
                                                    <motion.div
                                                        animate={active ? { scale: [1, 1.15, 1], boxShadow: ['0 0 0 0 rgba(99,102,241,0.4)', '0 0 0 8px rgba(99,102,241,0.15)', '0 0 0 0 rgba(99,102,241,0.4)'] } : {}}
                                                        transition={{ repeat: active ? Infinity : 0, duration: 2 }}
                                                        style={{
                                                            width: '40px', height: '40px', borderRadius: '50%',
                                                            background: done ? 'var(--primary)' : 'var(--background)',
                                                            border: `2px solid ${done ? 'var(--primary)' : 'var(--border)'}`,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            color: done ? 'white' : 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 700
                                                        }}
                                                    >
                                                        {done ? '✓' : idx + 1}
                                                    </motion.div>
                                                    <p style={{ marginTop: '0.5rem', fontWeight: active ? 700 : 500, fontSize: '0.85rem', color: done ? 'var(--text)' : 'var(--text-muted)', textAlign: 'center' }}>{stage.label}</p>
                                                    <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', maxWidth: '90px' }}>{stage.desc}</p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Shipping Info */}
                                <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <Truck size={16} className="text-primary" /> Shipping Details
                                    </h4>
                                    {trackingOrder.awbNumber ? (
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                                            <div>
                                                <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.2rem 0' }}>Courier Partner</p>
                                                <p style={{ margin: 0, fontWeight: 600 }}>{trackingOrder.courierName || 'Assigned'}</p>
                                            </div>
                                            <div>
                                                <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.2rem 0' }}>AWB / Tracking No.</p>
                                                <a href={`https://shiprocket.co/tracking/${trackingOrder.awbNumber}`} target="_blank" rel="noopener noreferrer"
                                                    style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--primary)', textDecoration: 'underline', fontSize: '0.9rem' }}>
                                                    {trackingOrder.awbNumber}
                                                </a>
                                            </div>
                                            {trackingOrder.estimatedDeliveryDays && (
                                                <div>
                                                    <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.2rem 0' }}>Est. Delivery</p>
                                                    <p style={{ margin: 0, fontWeight: 600 }}>{trackingOrder.estimatedDeliveryDays} days</p>
                                                </div>
                                            )}
                                            <div>
                                                <p className="text-muted" style={{ fontSize: '0.75rem', margin: '0 0 0.2rem 0' }}>Shipping Label</p>
                                                <button
                                                    onClick={() => handleDownloadLabel(trackingOrder.id, trackingOrder.awbNumber, trackingOrder.labelUrl)}
                                                    className="btn btn-primary btn-sm flex items-center gap-1"
                                                    style={{ padding: '0.35rem 0.75rem', marginTop: '0.1rem' }}
                                                >
                                                    <Package size={13} /> Download Label
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                            <div className="animate-spin" style={{ width: '14px', height: '14px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Courier assignment pending. AWB will appear here automatically.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Order Items */}
                                <div style={{ padding: '1.25rem', background: 'var(--surface)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                                    <h4 style={{ margin: '0 0 1rem 0' }}>Items Ordered</h4>
                                    <div className="flex flex-col gap-3">
                                        {trackingOrder.items && trackingOrder.items.length > 0 ? (
                                            trackingOrder.items.map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-3" style={{ paddingBottom: idx < trackingOrder.items.length - 1 ? '0.75rem' : 0, borderBottom: idx < trackingOrder.items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                                                    <div style={{
                                                        width: '48px', height: '48px', borderRadius: '10px', flexShrink: 0,
                                                        background: item.imageUrl ? `url(${item.imageUrl}) center/cover` : 'var(--primary)20',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {!item.imageUrl && <Package size={20} style={{ color: 'var(--primary)' }} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</p>
                                                        <p className="text-muted" style={{ margin: '0.1rem 0 0 0', fontSize: '0.8rem' }}>Qty: {item.quantity}</p>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <p style={{ margin: 0, fontWeight: 700 }}>₹{(item.price * item.quantity).toFixed(2)}</p>
                                                        <p className="text-muted" style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem' }}>₹{item.price} each</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>No item details available.</p>
                                        )}
                                    </div>
                                    {/* Order total */}
                                    <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Order Total</span>
                                        <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>₹{trackingOrder.total}</span>
                                    </div>
                                    {/* Payment method & Customer */}
                                    <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Customer: <strong>{trackingOrder.customer}</strong></span>
                                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Payment: <strong style={{ textTransform: 'uppercase' }}>{trackingOrder.paymentMethod || 'N/A'}</strong></span>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
}
