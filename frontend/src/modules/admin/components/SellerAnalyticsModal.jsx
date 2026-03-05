import { X, Box, ShoppingCart, Package, DollarSign, TrendingUp, Download, Loader, ArrowLeft, RefreshCw, CreditCard, ChevronUp, ChevronDown, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useState, useRef } from 'react';
import BankDetailsModal from './BankDetailsModal';

export default function SellerAnalyticsModal({ seller, onClose, onDownloadPDF, isDownloading, onRefresh }) {
    if (!seller) return null;

    const [showBankDetails, setShowBankDetails] = useState(false);
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    const [isCustomDownloading, setIsCustomDownloading] = useState(false);
    const tableContainerRef = useRef(null);

    const scrollToTop = () => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const scrollToBottom = () => {
        if (tableContainerRef.current) {
            tableContainerRef.current.scrollTo({ top: tableContainerRef.current.scrollHeight, behavior: 'smooth' });
        }
    };

    const handleCustomDateDownload = async () => {
        if (!customDateFrom || !customDateTo) {
            alert('Please select both start and end dates');
            return;
        }
        
        setIsCustomDownloading(true);
        try {
            await onDownloadPDF(
                `/admin/seller/${seller.uid}/analytics-pdf?fromDate=${customDateFrom}&toDate=${customDateTo}`, 
                `analytics_${(seller.shopName || 'seller').replace(/\s+/g, '_')}_${customDateFrom}_to_${customDateTo}.pdf`
            );
        } finally {
            setIsCustomDownloading(false);
        }
    };

    const handleQuickPeriod = (months) => {
        const today = new Date();
        const toDate = today.toISOString().split('T')[0];
        
        let fromDate;
        if (months === 'all') {
            // Set to a very old date for "All Time"
            fromDate = '2020-01-01';
        } else {
            const from = new Date();
            from.setMonth(from.getMonth() - months);
            fromDate = from.toISOString().split('T')[0];
        }
        
        setCustomDateFrom(fromDate);
        setCustomDateTo(toDate);
    };

    const handleClearDates = () => {
        setCustomDateFrom('');
        setCustomDateTo('');
    };

    // Truncate product names for chart display - only show products with revenue > 0
    const chartData = seller.productMatrix
        .filter(p => p.revenue > 0) // Only show products that have sales
        .sort((a, b) => b.revenue - a.revenue) // Sort by revenue descending
        .slice(0, 10)
        .map(p => ({
            ...p,
            displayName: p.name.length > 20 ? p.name.substring(0, 20) + '...' : p.name
        }));

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
                            onClick={() => setShowBankDetails(true)}
                            className="btn"
                            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontWeight: 600 }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            <CreditCard size={18} />
                            Bank Details
                        </button>
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
                {chartData.length > 0 ? (
                    <div className="glass-card" style={{ padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                            Top Products by Revenue
                        </h3>
                        <div style={{ width: '100%', height: 400 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis 
                                        dataKey="displayName" 
                                        tick={{ fontSize: 11 }} 
                                        angle={0}
                                        textAnchor="middle"
                                        height={60}
                                        interval={0}
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
                                        labelFormatter={(label) => {
                                            const product = chartData.find(p => p.displayName === label);
                                            return `Product: ${product?.name || label}`;
                                        }}
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
                ) : (
                    <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <TrendingUp size={48} style={{ color: 'var(--text-muted)', opacity: 0.3, margin: '0 auto 1rem' }} />
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                            No Sales Data Yet
                        </h3>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                            Products will appear here once they generate revenue
                        </p>
                    </div>
                )}

                {/* All Products Table */}
                <div id="all-products-section" className="glass-card" style={{ padding: 0, overflowX: 'auto', border: '1px solid var(--border)', position: 'relative' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Box size={20} style={{ color: 'var(--primary)' }} />
                            All Products
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={scrollToTop}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}
                            >
                                <ChevronUp size={16} />
                                Scroll to Top
                            </button>
                            <button
                                onClick={scrollToBottom}
                                className="btn btn-secondary"
                                style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.875rem' }}
                            >
                                <ChevronDown size={16} />
                                Scroll to Bottom
                            </button>
                        </div>
                    </div>
                    <div ref={tableContainerRef} style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                            <thead style={{ background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Product</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date Added</th>
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
                                            <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{p.date || 'N/A'}</span>
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
                    
                    {/* Custom Date Range Download Section */}
                    <div style={{ padding: '2rem', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Download size={20} style={{ color: 'var(--primary)' }} />
                            Download Payout PDF
                        </h3>
                        
                        {/* Quick Period Selection */}
                        <div style={{ marginBottom: '1.5rem' }}>
                            <div className="flex items-center justify-between mb-3">
                                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>
                                    Quick Period Selection
                                </p>
                                {(customDateFrom || customDateTo) && (
                                    <button
                                        onClick={handleClearDates}
                                        className="btn btn-secondary"
                                        style={{ padding: '0.375rem 0.875rem', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <XCircle size={14} />
                                        Clear Dates
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleQuickPeriod(1)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}
                                >
                                    1 Month
                                </button>
                                <button
                                    onClick={() => handleQuickPeriod(3)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}
                                >
                                    3 Months
                                </button>
                                <button
                                    onClick={() => handleQuickPeriod(6)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}
                                >
                                    6 Months
                                </button>
                                <button
                                    onClick={() => handleQuickPeriod(12)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}
                                >
                                    12 Months
                                </button>
                                <button
                                    onClick={() => handleQuickPeriod('all')}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 500 }}
                                >
                                    All Time
                                </button>
                            </div>
                        </div>

                        {/* Custom Date Range */}
                        <div>
                            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                                Or Select Custom Date Range
                            </p>
                            <div className="flex items-end gap-3">
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        From Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customDateFrom}
                                        onChange={(e) => setCustomDateFrom(e.target.value)}
                                        placeholder="dd mm yyyy"
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 0.875rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            background: 'white',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                        To Date
                                    </label>
                                    <input
                                        type="date"
                                        value={customDateTo}
                                        onChange={(e) => setCustomDateTo(e.target.value)}
                                        placeholder="dd mm yyyy"
                                        style={{
                                            width: '100%',
                                            padding: '0.625rem 0.875rem',
                                            border: '1px solid var(--border)',
                                            borderRadius: '8px',
                                            fontSize: '0.875rem',
                                            background: 'white',
                                            fontFamily: 'inherit'
                                        }}
                                    />
                                </div>
                                <button
                                    onClick={handleCustomDateDownload}
                                    disabled={isCustomDownloading || !customDateFrom || !customDateTo}
                                    className="btn btn-primary"
                                    style={{
                                        padding: '0.625rem 2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        fontSize: '0.875rem',
                                        fontWeight: 600,
                                        opacity: (!customDateFrom || !customDateTo) ? 0.5 : 1,
                                        cursor: (!customDateFrom || !customDateTo) ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isCustomDownloading ? (
                                        <>
                                            <Loader size={16} className="animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download size={16} />
                                            Download Payout PDF
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bank Details Modal */}
            {showBankDetails && (
                <BankDetailsModal 
                    seller={seller} 
                    onClose={() => setShowBankDetails(false)} 
                />
            )}
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



