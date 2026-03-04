import { X, Box, ShoppingCart, Package, DollarSign, TrendingUp, Download, Loader, ArrowLeft, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

export default function SellerAnalyticsModal({ seller, onClose, onDownloadPDF, isDownloading, onRefresh }) {
    if (!seller) return null;

    const scrollToSection = (sectionId) => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="flex-1 flex flex-col" style={{ width: '100%', height: '100%' }}>
            {/* Header with Back Button */}
            <div className="glass-card" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: 'white', borderRadius: '16px' }}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '12px', padding: '0.75rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'white', fontWeight: 600 }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            <ArrowLeft size={20} />
                            Back to List
                        </button>
                        <div style={{ borderLeft: '2px solid rgba(255,255,255,0.3)', height: '40px', margin: '0 1rem' }}></div>
                        <div>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
                                {seller.shopName}
                            </h2>
                            <div className="flex items-center gap-2" style={{ marginTop: '0.25rem' }}>
                                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {seller.category}
                                </span>
                                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Seller Analytics & Performance Dashboard</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onRefresh}
                            className="btn"
                            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontWeight: 600 }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            <RefreshCw size={18} />
                            Refresh Data
                        </button>
                        <button
                            onClick={() => onDownloadPDF(`/admin/seller/${seller.uid}/analytics-pdf`, `analytics_${(seller.shopName || 'seller').replace(/\s+/g, '_')}.pdf`)}
                            className="btn"
                            disabled={isDownloading}
                            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', color: 'var(--primary)', border: 'none', fontWeight: 600 }}
                        >
                            {isDownloading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
                            Download PDF
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
                {/* Stat Cards with Click to Scroll */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <StatCardClickable
                        icon={<Box size={24} />}
                        value={seller.metrics.totalProducts}
                        label="Total Products"
                        color="rgba(99, 102, 241, 0.1)"
                        iconColor="var(--primary)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                    <StatCardClickable
                        icon={<ShoppingCart size={24} />}
                        value={seller.metrics.unitsSold}
                        label="Units Sold"
                        color="rgba(16, 185, 129, 0.1)"
                        iconColor="var(--success)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                    <StatCardClickable
                        icon={<Package size={24} />}
                        value={seller.metrics.totalStockLeft}
                        label="Stock Left"
                        color="rgba(245, 158, 11, 0.1)"
                        iconColor="var(--warning)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                    <StatCardClickable
                        icon={<DollarSign size={24} />}
                        value={`₹${seller.metrics.grossRevenue.toLocaleString()}`}
                        label="Total Revenue"
                        color="rgba(239, 68, 68, 0.1)"
                        iconColor="var(--error)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                </div>

                {/* Top Products by Revenue Chart */}
                <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                        Top Products by Revenue
                    </h3>
                    <div style={{ width: '100%', height: 350 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={seller.productMatrix.slice(0, 10)}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 11 }} 
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis />
                                <RechartsTooltip 
                                    contentStyle={{ 
                                        background: 'var(--surface)', 
                                        border: '1px solid var(--border)', 
                                        borderRadius: '8px',
                                        padding: '12px'
                                    }}
                                    formatter={(value, name) => {
                                        if (name === 'Revenue (₹)') return [`₹${value.toLocaleString()}`, name];
                                        return [value, name];
                                    }}
                                    labelFormatter={(label) => `Product: ${label}`}
                                />
                                <Bar 
                                    dataKey="revenue" 
                                    name="Revenue (₹)" 
                                    fill="var(--success)" 
                                    radius={[8, 8, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* All Products Table */}
                <div id="all-products-section" className="glass-card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border)' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Box size={20} style={{ color: 'var(--primary)' }} />
                            All Products
                        </h3>
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead style={{ background: 'var(--surface)' }}>
                            <tr>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Product</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Price</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Disc. Price</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stock</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sold</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Revenue</th>
                                <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Margin %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {seller.productMatrix.map((p, idx) => {
                                const discountPercent = p.discountedPrice ? Math.round(((p.price - p.discountedPrice) / p.price) * 100) : 0;
                                return (
                                    <tr 
                                        key={p.id} 
                                        style={{ 
                                            borderTop: '1px solid var(--border)',
                                            background: idx % 2 === 0 ? 'transparent' : 'var(--surface)'
                                        }}
                                    >
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <div className="flex flex-col">
                                                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{p.name}</span>
                                                <span className="text-muted" style={{ fontSize: '0.75rem' }}>ID: {p.id}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 500 }}>
                                            ₹{p.price.toLocaleString()}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            {p.discountedPrice ? (
                                                <div className="flex flex-col items-center">
                                                    <span style={{ fontWeight: 600, color: 'var(--success)' }}>₹{p.discountedPrice.toLocaleString()}</span>
                                                    <span style={{ fontSize: '0.7rem', color: 'var(--error)' }}>-{discountPercent}%</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontWeight: 600,
                                                color: p.stock < 5 ? 'var(--error)' : p.stock < 20 ? 'var(--warning)' : 'var(--success)'
                                            }}>
                                                {p.stock}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{p.sold}</span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '1rem' }}>
                                                ₹{p.revenue.toLocaleString()}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                            <span style={{ 
                                                fontWeight: 600,
                                                padding: '0.25rem 0.75rem',
                                                borderRadius: '12px',
                                                background: discountPercent > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(156, 163, 175, 0.1)',
                                                color: discountPercent > 0 ? 'var(--success)' : 'var(--text-muted)',
                                                fontSize: '0.85rem'
                                            }}>
                                                {discountPercent > 0 ? `${100 - discountPercent}%` : '100%'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function StatCardClickable({ icon, value, label, color, iconColor, onClick }) {
    return (
        <div 
            onClick={onClick}
            className="glass-card" 
            style={{ padding: '1.5rem', border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.3s' }}
            onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.15)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
        >
            <div className="flex items-center justify-between mb-3">
                <div style={{ padding: '0.75rem', borderRadius: '12px', background: color, color: iconColor }}>
                    {icon}
                </div>
                <button 
                    className="btn btn-secondary" 
                    style={{ padding: '0.25rem 0.75rem', fontSize: '0.75rem' }}
                    onClick={(e) => { e.stopPropagation(); onClick(); }}
                >
                    View Details
                </button>
            </div>
            <h3 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>
                {value}
            </h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>{label}</p>
        </div>
    );
}
