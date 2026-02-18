import { useState, useEffect } from 'react';
import { LayoutDashboard, Package, ShoppingBag, DollarSign, Plus, Edit2, Trash2, Truck, Loader, X } from 'lucide-react';
import { auth } from '../../config/firebase';

export default function SellerDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [loading, setLoading] = useState(true);

    // Data States
    const [stats, setStats] = useState({ totalSales: 0, totalProducts: 0, newOrders: 0, pendingOrders: 0 });
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);

    // Modal State
    const [showAddModal, setShowAddModal] = useState(false);
    const [newProduct, setNewProduct] = useState({ title: '', price: '', category: '', stock: '', description: '', image: '' });

    useEffect(() => {
        const fetchSellerData = async () => {
            const user = auth.currentUser;
            if (!user) return; // Should be handled by ProtectedRoute

            try {
                setLoading(true);
                const uid = user.uid;

                // Fetch Stats
                const statsRes = await fetch(`http://localhost:5000/seller/${uid}/stats`);
                const statsData = await statsRes.json();
                if (statsData.success) setStats(statsData.stats);

                // Fetch Products
                const prodRes = await fetch(`http://localhost:5000/seller/${uid}/products`);
                const prodData = await prodRes.json();
                if (prodData.success) setProducts(prodData.products);

                // Fetch Orders
                const ordRes = await fetch(`http://localhost:5000/seller/${uid}/orders`);
                const ordData = await ordRes.json();
                if (ordData.success) setOrders(ordData.orders);

            } catch (error) {
                console.error("Error fetching seller data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchSellerData();
    }, []);

    const handleAddProduct = async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        try {
            const response = await fetch('http://localhost:5000/seller/product/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sellerId: user.uid,
                    productData: {
                        ...newProduct,
                        price: parseFloat(newProduct.price),
                        stock: parseInt(newProduct.stock)
                    }
                })
            });

            const data = await response.json();
            if (data.success) {
                alert("Product added successfully!");
                setShowAddModal(false);
                setNewProduct({ title: '', price: '', category: '', stock: '', description: '', image: '' });
                // Refresh products
                const prodRes = await fetch(`http://localhost:5000/seller/${user.uid}/products`);
                const prodData = await prodRes.json();
                if (prodData.success) setProducts(prodData.products);
            } else {
                alert("Failed: " + data.message);
            }
        } catch (error) {
            console.error("Error adding product:", error);
            alert("Error adding product");
        }
    };

    const handleDeleteProduct = async (id) => {
        if (!confirm("Are you sure you want to delete this product?")) return;

        try {
            const response = await fetch(`http://localhost:5000/seller/product/${id}`, { method: 'DELETE' });
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

    const statCards = [
        { label: 'Total Sales', value: `₹${stats.totalSales.toLocaleString()}`, icon: <DollarSign />, color: 'var(--success)' },
        { label: 'Active Products', value: stats.totalProducts, icon: <Package />, color: 'var(--primary)' },
        { label: 'New Orders', value: stats.newOrders, icon: <ShoppingBag />, color: 'var(--secondary)' },
        { label: 'Pending', value: stats.pendingOrders, icon: <Truck />, color: 'var(--warning)' },
    ];

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader className="animate-spin" /></div>;

    return (
        <div className="flex" style={{ minHeight: 'calc(100vh - 80px)', width: '100%', gap: '2rem', padding: '2rem' }}>
            {/* Sidebar */}
            <aside className="glass-card flex flex-col justify-between" style={{ width: '280px', height: 'calc(100vh - 120px)', padding: '1.5rem', position: 'sticky', top: '2rem' }}>
                <div>
                    <h3 style={{ marginBottom: '2rem', fontSize: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>Seller Portal</h3>
                    <nav className="flex flex-col gap-2">
                        {['overview', 'products', 'orders'].map(tab => (
                            <button
                                key={tab}
                                className={`btn ${activeTab === tab ? 'btn-primary' : 'btn-secondary'}`}
                                style={{
                                    width: '100%',
                                    justifyContent: 'flex-start',
                                    textTransform: 'capitalize',
                                    padding: '1rem',
                                    fontSize: '1rem'
                                }}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === 'overview' && <LayoutDashboard size={20} />}
                                {tab === 'products' && <Package size={20} />}
                                {tab === 'orders' && <ShoppingBag size={20} />}
                                {tab}
                            </button>
                        ))}
                    </nav>
                </div>

                <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <small className="text-muted">Need Help?</small>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>Contact Sellsathi Support for assistance.</p>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col" style={{ height: '100%', gap: '2rem' }}>
                <div className="glass-card flex justify-between items-center" style={{ padding: '1.5rem 2rem' }}>
                    <div>
                        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>Welcome back, Seller!</h2>
                        <p className="text-muted">Here's what's happening with your store today.</p>
                    </div>
                </div>

                {activeTab === 'overview' && (
                    <div className="animate-fade-in flex flex-col" style={{ gap: '2rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                            {statCards.map((s, i) => (
                                <div key={i} className="glass-card flex flex-col justify-center gap-4" style={{ minHeight: '180px', padding: '1.5rem' }}>
                                    <div className="flex items-start justify-between">
                                        <div style={{ padding: '0.75rem', borderRadius: '12px', background: s.color + '22', color: s.color }}>
                                            {s.icon}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{s.value}</h3>
                                        <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Store Performance Placeholder */}
                        <div className="glass-card" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                            <h3 style={{ marginBottom: '1rem' }}>Store Performance</h3>
                            <p className="text-muted" style={{ maxWidth: '600px' }}>
                                Your sales analytics and performance charts will appear here as your store grows. Keep adding quality products!
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="animate-fade-in flex flex-col gap-4" style={{ height: '100%' }}>
                        <div className="flex justify-between items-center mb-4">
                            <h3>Manage Products ({products.length})</h3>
                            <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ padding: '0.75rem 1.5rem' }}>
                                <Plus size={20} /> Add New Product
                            </button>
                        </div>

                        <div className="glass-card flex-1" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            {products.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                                    <Package size={64} className="text-muted mb-4" />
                                    <h3>No Products Yet</h3>
                                    <p className="text-muted mb-4">Start selling by adding your first product.</p>
                                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                                        <Plus size={18} /> Add Product
                                    </button>
                                </div>
                            ) : (
                                <div style={{ overflowX: 'auto', flex: 1 }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead style={{ background: 'var(--surface)', textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                                            <tr>
                                                <th style={{ padding: '1.25rem' }}>Product Details</th>
                                                <th>Category</th>
                                                <th>Price</th>
                                                <th>Stock</th>
                                                <th style={{ padding: '1.25rem' }}>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {products.map(p => (
                                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                    <td style={{ padding: '1.25rem' }}>
                                                        <div className="flex items-center gap-4">
                                                            {p.image ? (
                                                                <img src={p.image} style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }} />
                                                            ) : (
                                                                <div style={{ width: '50px', height: '50px', borderRadius: '8px', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <Package size={20} className="text-muted" />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <p style={{ fontWeight: 600 }}>{p.title}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span style={{ background: 'var(--surface)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem' }}>
                                                            {p.category}
                                                        </span>
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>₹{p.price}</td>
                                                    <td>
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.stock > 0 ? 'var(--success)' : 'var(--error)' }}></div>
                                                            {p.stock || 0} in stock
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '1.25rem' }}>
                                                        <div className="flex gap-2">
                                                            <button
                                                                className="btn btn-secondary"
                                                                style={{ padding: '0.5rem', color: 'var(--error)', borderColor: 'var(--error)22', background: 'var(--error)11' }}
                                                                onClick={() => handleDeleteProduct(p.id)}
                                                                title="Delete Product"
                                                            >
                                                                <Trash2 size={16} />
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
                                                    <td style={{ padding: '1.25rem' }}>
                                                        <button className="btn btn-secondary btn-sm flex items-center gap-2">
                                                            Update Status
                                                        </button>
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

            {/* Add Product Modal */}
            {showAddModal && (
                <div style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-card animate-scale-in" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                        <div className="flex justify-between items-center" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1.4rem' }}>Add New Product</h3>
                                <p className="text-muted" style={{ fontSize: '0.9rem' }}>Fill in the details to list your item.</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="btn btn-ghost" style={{ padding: '0.5rem' }}>
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddProduct} className="flex flex-col gap-5">
                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Product Title</label>
                                <input
                                    type="text" placeholder="e.g. Handmade Silk Saree" required
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.75rem' }}
                                    value={newProduct.title} onChange={e => setNewProduct({ ...newProduct, title: e.target.value })}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Price (₹)</label>
                                    <div className="relative">
                                        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>₹</span>
                                        <input
                                            type="number" placeholder="0.00" required
                                            className="input-field"
                                            style={{ width: '100%', padding: '0.75rem 0.75rem 0.75rem 2.5rem' }}
                                            value={newProduct.price} onChange={e => setNewProduct({ ...newProduct, price: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Stock Quantity</label>
                                    <input
                                        type="number" placeholder="Available units" required
                                        className="input-field"
                                        style={{ width: '100%', padding: '0.75rem' }}
                                        value={newProduct.stock} onChange={e => setNewProduct({ ...newProduct, stock: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Category</label>
                                <select
                                    required
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.75rem' }}
                                    value={newProduct.category} onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                >
                                    <option value="">Select Category</option>
                                    <option value="Clothing">Clothing</option>
                                    <option value="Accessories">Accessories</option>
                                    <option value="Home Decor">Home Decor</option>
                                    <option value="Art">Art & Crafts</option>
                                    <option value="Food">Food & Beverages</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Image URL</label>
                                <input
                                    type="text" placeholder="https://example.com/image.jpg"
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.75rem' }}
                                    value={newProduct.image} onChange={e => setNewProduct({ ...newProduct, image: e.target.value })}
                                />
                                {newProduct.image && (
                                    <div style={{ marginTop: '0.5rem', height: '150px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                                        <img src={newProduct.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            onError={(e) => { e.target.src = 'https://via.placeholder.com/400x200?text=Invalid+Image+URL'; }} />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Description</label>
                                <textarea
                                    placeholder="Describe your product in detail..." rows="4"
                                    className="input-field"
                                    style={{ width: '100%', padding: '0.75rem' }}
                                    value={newProduct.description} onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                                ></textarea>
                            </div>

                            <div className="flex justify-end gap-3" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" style={{ minWidth: '120px' }}>Add Product</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
