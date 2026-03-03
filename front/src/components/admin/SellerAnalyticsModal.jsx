import { X, Box, ShoppingCart, Package, DollarSign, TrendingUp, Download, Loader, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { useState, useCallback, useEffect, Component } from 'react';

// React Error Boundary Class Component
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center" style={{ width: '100%', height: '100%', padding: '2rem' }}>
                    <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '500px' }}>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--error)', marginBottom: '1rem' }}>
                            Something went wrong
                        </h3>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            {this.state.error?.message || 'An unexpected error occurred'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                if (this.props.onClose) {
                                    this.props.onClose();
                                }
                            }}
                            className="btn btn-primary"
                        >
                            Close
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

// Safe component with full validation
function SellerAnalyticsModalContent({ seller, onClose, onDownloadPDF, isDownloading, onRefresh }) {
    const [settlementDateFrom, setSettlementDateFrom] = useState('');
    const [settlementDateTo, setSettlementDateTo] = useState('');
    
    // Log for debugging
    console.log('SellerAnalyticsModal render:', { seller, hasMetrics: !!seller?.metrics, hasProductMatrix: !!seller?.productMatrix });
    
    // Validate seller data
    if (!seller) {
        console.warn('SellerAnalyticsModal: No seller data provided');
        return null;
    }
    
    // Ensure all required properties exist with defaults
    const safeSellerData = {
        uid: seller.uid || '',
        shopName: seller.shopName || 'Unknown Shop',
        category: seller.category || 'N/A',
        email: seller.email || 'N/A',
        createdAt: seller.createdAt || null,
        metrics: {
            totalProducts: seller.metrics?.totalProducts || 0,
            unitsSold: seller.metrics?.unitsSold || 0,
            totalStockLeft: seller.metrics?.totalStockLeft || 0,
            grossRevenue: seller.metrics?.grossRevenue || 0
        },
        productMatrix: Array.isArray(seller.productMatrix) ? seller.productMatrix : []
    };
    
    console.log('Safe seller data:', safeSellerData);
    
    // Reset dates when seller changes
    useEffect(() => {
        setSettlementDateFrom('');
        setSettlementDateTo('');
    }, [safeSellerData.uid]);
    
    const scrollToSection = (sectionId) => {
        try {
            const element = document.getElementById(sectionId);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error('Scroll error:', error);
        }
    };
    
    const handleSettlementDownload = useCallback(() => {
        try {
            const url = `/admin/seller/${safeSellerData.uid}/settlement-invoice${settlementDateFrom || settlementDateTo ? `?dateFrom=${settlementDateFrom}&dateTo=${settlementDateTo}` : ''}`;
            const filename = `seller_analytics_${safeSellerData.shopName.replace(/\s+/g, '_')}${settlementDateFrom ? `_${settlementDateFrom}` : ''}${settlementDateTo ? `_to_${settlementDateTo}` : ''}.pdf`;
            onDownloadPDF(url, filename);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download PDF. Please try again.');
        }
    }, [safeSellerData.uid, safeSellerData.shopName, settlementDateFrom, settlementDateTo, onDownloadPDF]);
    
    const handleAnalyticsDownload = useCallback(() => {
        try {
            const url = `/admin/seller/${safeSellerData.uid}/analytics-pdf`;
            const filename = `analytics_${safeSellerData.shopName.replace(/\s+/g, '_')}.pdf`;
            onDownloadPDF(url, filename);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download PDF. Please try again.');
        }
    }, [safeSellerData.uid, safeSellerData.shopName, onDownloadPDF]);
    
    const handleSettlementDateFromChange = (e) => {
        try {
            if (e && e.target) {
                setSettlementDateFrom(e.target.value || '');
            }
        } catch (error) {
            console.error('Date from error:', error);
        }
    };
    
    const handleSettlementDateToChange = (e) => {
        try {
            if (e && e.target) {
                setSettlementDateTo(e.target.value || '');
            }
        } catch (error) {
            console.error('Date to error:', error);
        }
    };
    
    const handleClearSettlementDates = () => {
        try {
            setSettlementDateFrom('');
            setSettlementDateTo('');
        } catch (error) {
            console.error('Clear dates error:', error);
        }
    };
    
    const handleQuickPeriodClick = (period) => {
        try {
            const today = new Date();
            let startDate = '';
            let endDate = '';
            
            switch(period) {
                case '1month':
                    const oneMonthAgo = new Date(today);
                    oneMonthAgo.setMonth(today.getMonth() - 1);
                    startDate = oneMonthAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case '3months':
                    const threeMonthsAgo = new Date(today);
                    threeMonthsAgo.setMonth(today.getMonth() - 3);
                    startDate = threeMonthsAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case '6months':
                    const sixMonthsAgo = new Date(today);
                    sixMonthsAgo.setMonth(today.getMonth() - 6);
                    startDate = sixMonthsAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case '12months':
                    const twelveMonthsAgo = new Date(today);
                    twelveMonthsAgo.setFullYear(today.getFullYear() - 1);
                    startDate = twelveMonthsAgo.toISOString().split('T')[0];
                    endDate = today.toISOString().split('T')[0];
                    break;
                case 'all':
                default:
                    startDate = '';
                    endDate = '';
                    break;
            }
            
            setSettlementDateFrom(startDate);
            setSettlementDateTo(endDate);
        } catch (error) {
            console.error('Quick period error:', error);
        }
    };
    
    if (!safeSellerData.uid) {
        return null;
    }

    return (
        <div className="flex-1 flex flex-col" style={{ width: '100%', height: '100%' }}>
            {/* Header with Back Button */}
            <div className="glass-card" style={{ padding: '1.5rem 2rem', marginBottom: '2rem', background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)', color: 'white', borderRadius: '16px' }}>
                {/* Top Row: Back Button, Shop Name, and Action Buttons */}
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
                                {safeSellerData.shopName}
                            </h2>
                            <div className="flex items-center gap-2" style={{ marginTop: '0.25rem' }}>
                                <span style={{ background: 'rgba(255,255,255,0.25)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                                    {safeSellerData.category}
                                </span>
                                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Seller Analytics & Performance Dashboard</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={onRefresh}
                            className="btn"
                            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', fontWeight: 600 }}
                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.3)'}
                            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        >
                            <RefreshCw size={18} />
                            Refresh
                        </button>
                        <button
                            onClick={handleAnalyticsDownload}
                            className="btn"
                            disabled={isDownloading}
                            style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '8px', background: 'white', color: 'var(--primary)', border: 'none', fontWeight: 600 }}
                            title="Download complete analytics PDF"
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
                        value={safeSellerData.metrics.totalProducts}
                        label="Total Products"
                        color="rgba(99, 102, 241, 0.1)"
                        iconColor="var(--primary)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                    <StatCardClickable
                        icon={<ShoppingCart size={24} />}
                        value={safeSellerData.metrics.unitsSold}
                        label="Units Sold"
                        color="rgba(16, 185, 129, 0.1)"
                        iconColor="var(--success)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                    <StatCardClickable
                        icon={<Package size={24} />}
                        value={safeSellerData.metrics.totalStockLeft}
                        label="Stock Left"
                        color="rgba(245, 158, 11, 0.1)"
                        iconColor="var(--warning)"
                        onClick={() => scrollToSection('all-products-section')}
                    />
                    <StatCardClickable
                        icon={<DollarSign size={24} />}
                        value={`₹${safeSellerData.metrics.grossRevenue.toLocaleString()}`}
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
                    <div style={{ width: '100%', height: 350, overflowX: 'auto' }}>
                        <div style={{ minWidth: `${Math.max(800, safeSellerData.productMatrix.length * 80)}px`, height: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...safeSellerData.productMatrix].sort((a, b) => b.revenue - a.revenue)}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                    <XAxis 
                                        dataKey="name" 
                                        tick={{ fontSize: 10 }} 
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
                </div>

                {/* All Products Table */}
                <div id="all-products-section" className="glass-card" style={{ padding: 0, border: '1px solid var(--border)' }}>
                    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                            <Box size={20} style={{ color: 'var(--primary)' }} />
                            All Products ({safeSellerData.productMatrix.length})
                        </h3>
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto', overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                            <thead style={{ background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Product</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Date Listed</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Price</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Disc. Price</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Stock</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Sold</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'right', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Revenue</th>
                                    <th style={{ padding: '1rem 1.5rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Margin %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...safeSellerData.productMatrix]
                                    .sort((a, b) => {
                                        // Sort by date (newest first)
                                        let dateA, dateB;
                                        
                                        if (a.createdAt?._seconds) {
                                            dateA = new Date(a.createdAt._seconds * 1000);
                                        } else if (a.createdAt) {
                                            dateA = new Date(a.createdAt);
                                        } else {
                                            dateA = new Date(0);
                                        }
                                        
                                        if (b.createdAt?._seconds) {
                                            dateB = new Date(b.createdAt._seconds * 1000);
                                        } else if (b.createdAt) {
                                            dateB = new Date(b.createdAt);
                                        } else {
                                            dateB = new Date(0);
                                        }
                                        
                                        return dateB.getTime() - dateA.getTime();
                                    })
                                    .map((p, idx) => {
                                    const discountPercent = p.discountedPrice ? Math.round(((p.price - p.discountedPrice) / p.price) * 100) : 0;
                                    
                                    // Format date as dd/mm/yyyy
                                    const formatDate = (dateValue) => {
                                        if (!dateValue) return 'N/A';
                                        try {
                                            let date;
                                            if (dateValue._seconds) {
                                                // Firestore Timestamp with _seconds
                                                date = new Date(dateValue._seconds * 1000);
                                            } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
                                                date = new Date(dateValue);
                                            } else if (dateValue instanceof Date) {
                                                date = dateValue;
                                            } else {
                                                return 'N/A';
                                            }
                                            
                                            if (isNaN(date.getTime())) return 'N/A';
                                            const day = String(date.getDate()).padStart(2, '0');
                                            const month = String(date.getMonth() + 1).padStart(2, '0');
                                            const year = date.getFullYear();
                                            return `${day}/${month}/${year}`;
                                        } catch (error) {
                                            return 'N/A';
                                        }
                                    };
                                    
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
                                                <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                                    {formatDate(p.createdAt)}
                                                </span>
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

                {/* Download Settlement Invoice Section */}
                <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05) 0%, rgba(99, 102, 241, 0.05) 100%)', marginTop: '2rem' }}>
                    <div className="flex items-center gap-2 mb-4">
                        <FileText size={24} style={{ color: 'var(--primary)' }} />
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Download Settlement Invoice</h3>
                    </div>

                    {/* Quick Period Selection */}
                    <div className="mb-4">
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                            Quick Period Selection
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { label: '1 Month', value: '1month' },
                                { label: '3 Months', value: '3months' },
                                { label: '6 Months', value: '6months' },
                                { label: '12 Months', value: '12months' },
                                { label: 'All Time', value: 'all' }
                            ].map(period => (
                                <button
                                    key={period.value}
                                    type="button"
                                    onClick={() => handleQuickPeriodClick(period.value)}
                                    style={{
                                        padding: '0.5rem 1.25rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        background: 'white',
                                        color: 'var(--text)',
                                        fontWeight: 600,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'var(--primary)';
                                        e.currentTarget.style.color = 'white';
                                        e.currentTarget.style.borderColor = 'var(--primary)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'white';
                                        e.currentTarget.style.color = 'var(--text)';
                                        e.currentTarget.style.borderColor = 'var(--border)';
                                    }}
                                >
                                    {period.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Date Range Selection */}
                    <div>
                        <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                            Or Select Custom Date Range
                        </label>
                        <div className="flex gap-3 items-center flex-wrap">
                            <div className="flex flex-col">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    From Date
                                </label>
                                <input
                                    type="date"
                                    value={settlementDateFrom}
                                    onChange={handleSettlementDateFromChange}
                                    max={settlementDateTo || new Date().toISOString().split('T')[0]}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.9rem',
                                        minWidth: '160px',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                            <div className="flex flex-col">
                                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                                    To Date
                                </label>
                                <input
                                    type="date"
                                    value={settlementDateTo}
                                    onChange={handleSettlementDateToChange}
                                    min={settlementDateFrom}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={{
                                        padding: '0.75rem',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.9rem',
                                        minWidth: '160px',
                                        cursor: 'pointer'
                                    }}
                                />
                            </div>
                            {(settlementDateFrom || settlementDateTo) && (
                                <button
                                    type="button"
                                    onClick={handleClearSettlementDates}
                                    className="btn"
                                    style={{ 
                                        padding: '0.75rem 1.25rem', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px', 
                                        background: 'rgba(239, 68, 68, 0.9)', 
                                        color: 'white', 
                                        border: 'none', 
                                        fontWeight: 600, 
                                        fontSize: '0.85rem',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        whiteSpace: 'nowrap',
                                        marginTop: '1.5rem'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 1)'}
                                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)'}
                                >
                                    <X size={16} />
                                    Clear Dates
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleSettlementDownload}
                                disabled={isDownloading}
                                className="btn btn-primary"
                                style={{
                                    padding: '0.75rem 2rem',
                                    fontSize: '0.95rem',
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    marginTop: '1.5rem'
                                }}
                            >
                                {isDownloading ? (
                                    <>
                                        <Loader size={20} className="animate-spin" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Download Payout
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
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

// Error boundary wrapper
export default function SellerAnalyticsModal(props) {
    console.log('SellerAnalyticsModal wrapper called with props:', { 
        hasSeller: !!props.seller, 
        hasOnClose: !!props.onClose,
        hasOnDownloadPDF: !!props.onDownloadPDF
    });
    
    return (
        <ErrorBoundary onClose={props.onClose}>
            <SellerAnalyticsModalContent {...props} />
        </ErrorBoundary>
    );
}
