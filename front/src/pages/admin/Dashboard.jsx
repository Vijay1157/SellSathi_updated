import { useState, useEffect } from 'react';
import { ShieldCheck, Users, Box, ShoppingCart, Truck, Check, X, AlertOctagon, Loader } from 'lucide-react';

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState('sellers');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Data states
    const [stats, setStats] = useState({ totalSellers: 0, totalProducts: 0, todayOrders: 0, pendingApprovals: 0 });
    const [sellers, setSellers] = useState([]);
    const [products, setProducts] = useState([]);
    const [orders, setOrders] = useState([]);

    // Fetch all data on component mount
    useEffect(() => {
        fetchAllData();
    }, []);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError('');

            // Fetch stats
            const statsRes = await fetch('http://localhost:5000/admin/stats');
            const statsData = await statsRes.json();
            if (statsData.success) setStats(statsData.stats);

            // Fetch sellers
            const sellersRes = await fetch('http://localhost:5000/admin/sellers');
            const sellersData = await sellersRes.json();
            if (sellersData.success) setSellers(sellersData.sellers);

            // Fetch products
            const productsRes = await fetch('http://localhost:5000/admin/products');
            const productsData = await productsRes.json();
            if (productsData.success) setProducts(productsData.products);

            // Fetch orders
            const ordersRes = await fetch('http://localhost:5000/admin/orders');
            const ordersData = await ordersRes.json();
            if (ordersData.success) setOrders(ordersData.orders);
        } catch (err) {
            console.error('Error fetching data:', err);
            setError('Failed to load dashboard data. Please refresh.');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveSeller = async (uid) => {
        try {
            const response = await fetch(`http://localhost:5000/admin/seller/${uid}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                alert('Seller approved successfully!');
                fetchAllData(); // Refresh data
            } else {
                alert('Failed to approve seller: ' + data.message);
            }
        } catch (err) {
            console.error('Error approving seller:', err);
            alert('Error approving seller');
        }
    };

    const handleRejectSeller = async (uid) => {
        try {
            const response = await fetch(`http://localhost:5000/admin/seller/${uid}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (data.success) {
                alert('Seller rejected successfully!');
                fetchAllData(); // Refresh data
            } else {
                alert('Failed to reject seller: ' + data.message);
            }
        } catch (err) {
            console.error('Error rejecting seller:', err);
            alert('Error rejecting seller');
        }
    };

    const StatCard = ({ label, value, icon, color }) => (
        <div className="glass-card flex flex-col justify-center gap-4" style={{ minHeight: '180px' }}>
            <div className="flex justify-between items-start">
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: `${color}22`, color: color }}>
                    {icon}
                </div>
                {/* <span className="text-muted" style={{ fontSize: '0.8rem' }}>+2.5%</span> */}
            </div>
            <div>
                <h3 style={{ fontSize: '2.5rem', fontWeight: 700, lineHeight: 1 }}>{loading ? '-' : value}</h3>
                <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '1.1rem' }}>{label}</p>
            </div>
        </div>
    );

    const [searchTerm, setSearchTerm] = useState('');

    // Filter Logic
    const filteredSellers = sellers.filter(s =>
        s.shopName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredProducts = products.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredOrders = orders.filter(o =>
        o.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Render Helpers
    const renderSellersTable = () => (
        <div className="animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3>Pending Approvals ({filteredSellers.length})</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search sellers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    />
                    <button className="btn btn-secondary" onClick={fetchAllData}>Refresh</button>
                </div>
            </div>
            {filteredSellers.length === 0 ? (
                <div className="glass-card text-center p-8 text-muted">No pending seller approvals found.</div>
            ) : (
                <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'var(--surface)', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Shop Name</th>
                                <th>Contact</th>
                                <th>Category</th>
                                <th>Joined</th>
                                <th style={{ padding: '1rem' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSellers.map(s => (
                                <tr key={s.uid} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <strong>{s.shopName}</strong><br />
                                        <small className="text-muted">{s.address}</small>
                                    </td>
                                    <td>{s.email}</td>
                                    <td>{s.category}</td>
                                    <td>{s.joined}</td>
                                    <td style={{ padding: '1rem' }}>
                                        <div className="flex gap-2">
                                            <button className="btn btn-secondary" onClick={() => handleApproveSeller(s.uid)} title="Approve" style={{ color: 'var(--success)' }}>
                                                <Check size={18} />
                                            </button>
                                            <button className="btn btn-secondary" onClick={() => handleRejectSeller(s.uid)} title="Reject" style={{ color: 'var(--error)' }}>
                                                <X size={18} />
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
    );

    const renderProductsTable = () => (
        <div className="animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3>Product Review ({filteredProducts.length})</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search products..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    />
                    <button className="btn btn-secondary" onClick={fetchAllData}>Refresh</button>
                </div>
            </div>
            {filteredProducts.length === 0 ? (
                <div className="glass-card text-center p-8 text-muted">No products found.</div>
            ) : (
                <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'var(--surface)', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Product</th>
                                <th>Seller</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>{p.title}</td>
                                    <td>{p.seller}</td>
                                    <td>{p.category}</td>
                                    <td>₹{p.price}</td>
                                    <td>
                                        <span className="badge badge-success" style={{ background: 'rgba(var(--success-rgb), 0.1)', color: 'var(--success)', padding: '4px 8px', borderRadius: '4px' }}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    const renderOrdersTable = () => (
        <div className="animate-fade-in flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <h3>Global Orders ({filteredOrders.length})</h3>
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}
                    />
                    <button className="btn btn-secondary" onClick={fetchAllData}>Refresh</button>
                </div>
            </div>
            {filteredOrders.length === 0 ? (
                <div className="glass-card text-center p-8 text-muted">No orders found.</div>
            ) : (
                <div className="glass-card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'var(--surface)', textAlign: 'left' }}>
                            <tr>
                                <th style={{ padding: '1rem' }}>Order ID</th>
                                <th>Customer</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map(o => (
                                <tr key={o.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}><strong>{o.orderId}</strong></td>
                                    <td>{o.customer}</td>
                                    <td>₹{o.total.toLocaleString()}</td>
                                    <td>
                                        <span style={{ background: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '4px' }}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td>{o.date}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );

    if (error) {
        return (
            <div className="container" style={{ padding: '2rem', textAlign: 'center', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'var(--error)', marginBottom: '1rem', background: 'rgba(var(--error-rgb), 0.1)', padding: '1rem', borderRadius: '8px' }}>
                    <AlertOctagon size={48} style={{ margin: '0 auto 1rem' }} />
                    <p>{error}</p>
                </div>
                <button className="btn btn-primary" onClick={fetchAllData}>
                    Retry Connection
                </button>
            </div>
        );
    }

    return (
        <div className="flex" style={{ minHeight: 'calc(100vh - 80px)', width: '100%', gap: '2rem', padding: '2rem' }}>
            {/* Sidebar */}
            <aside className="glass-card flex flex-col justify-between" style={{ width: '280px', height: 'calc(100vh - 120px)', padding: '1.5rem', position: 'sticky', top: '2rem' }}>
                <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: '2rem', color: 'var(--primary)', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                        <ShieldCheck size={28} />
                        <h3 style={{ fontSize: '1.5rem', margin: 0 }}>Admin Panel</h3>
                    </div>
                    <nav className="flex flex-col gap-2">
                        <button
                            className={`btn ${activeTab === 'sellers' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                padding: '1rem',
                                fontSize: '1rem'
                            }}
                            onClick={() => { setActiveTab('sellers'); setSearchTerm(''); }}
                        >
                            <Users size={20} /> Seller Mgmt
                        </button>
                        <button
                            className={`btn ${activeTab === 'products' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                padding: '1rem',
                                fontSize: '1rem'
                            }}
                            onClick={() => { setActiveTab('products'); setSearchTerm(''); }}
                        >
                            <Box size={20} /> Product Review
                        </button>
                        <button
                            className={`btn ${activeTab === 'orders' ? 'btn-primary' : 'btn-secondary'}`}
                            style={{
                                width: '100%',
                                justifyContent: 'flex-start',
                                padding: '1rem',
                                fontSize: '1rem'
                            }}
                            onClick={() => { setActiveTab('orders'); setSearchTerm(''); }}
                        >
                            <ShoppingCart size={20} /> Global Orders
                        </button>
                    </nav>
                </div>

                <div style={{ marginTop: 'auto', padding: '1rem', background: 'var(--surface)', borderRadius: 'var(--radius-md)' }}>
                    <small className="text-muted">System Status</small>
                    <div className="flex items-center gap-2" style={{ marginTop: '0.5rem', color: 'var(--success)', fontSize: '0.9rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></div>
                        Online
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col" style={{ height: '100%', gap: '2rem' }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                    <StatCard label="Total Sellers" value={stats.totalSellers} icon={<Users size={32} />} color="var(--primary)" />
                    <StatCard label="Active Products" value={stats.totalProducts} icon={<Box size={32} />} color="var(--secondary)" />
                    <StatCard label="Daily Orders" value={stats.todayOrders} icon={<ShoppingCart size={32} />} color="var(--accent)" />
                    <StatCard label="Pending Approvals" value={stats.pendingApprovals} icon={<ShieldCheck size={32} />} color="var(--warning)" />
                </div>

                {loading ? (
                    <div className="flex justify-center p-12 glass-card flex-1"><Loader className="animate-spin" /></div>
                ) : (
                    <div className="glass-card flex-1" style={{ padding: '0', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                            {activeTab === 'sellers' && renderSellersTable()}
                            {activeTab === 'products' && renderProductsTable()}
                            {activeTab === 'orders' && renderOrdersTable()}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
