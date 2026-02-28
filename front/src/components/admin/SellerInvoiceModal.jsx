import { ArrowLeft, Download, Loader, RefreshCw, Store, Package, DollarSign, TrendingDown, TrendingUp, Calendar as CalendarIcon, X } from 'lucide-react';
import { useState } from 'react';

export default function SellerInvoiceModal({ seller, onClose, onDownloadPDF, isDownloading, onRefresh, invoiceFilterDateFrom, setInvoiceFilterDateFrom, invoiceFilterDateTo, setInvoiceFilterDateTo }) {
    if (!seller) return null;

    const [selectedPeriod, setSelectedPeriod] = useState('');

    // Format date as dd/mm/yyyy
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    // Handle month selection
    const handleMonthSelection = (months) => {
        const today = new Date();
        const toDate = today.toISOString().split('T')[0];
        
        if (months === 'all') {
            setInvoiceFilterDateFrom('');
            setInvoiceFilterDateTo('');
            setSelectedPeriod('all');
        } else {
            const fromDate = new Date(today);
            fromDate.setMonth(today.getMonth() - months);
            setInvoiceFilterDateFrom(fromDate.toISOString().split('T')[0]);
            setInvoiceFilterDateTo(toDate);
            setSelectedPeriod(months.toString());
        }
    };

    // Handle clear dates
    const handleClearDates = () => {
        setInvoiceFilterDateFrom('');
        setInvoiceFilterDateTo('');
        setSelectedPeriod('');
    };

    const totalProducts = seller.financials?.totalProducts || 0;
    const totalRevenue = seller.financials?.totalRevenue || 0;
    const platformCharges = totalRevenue * 0.1;
    const amountToReceive = totalRevenue * 0.9;
    const deliveredCount = seller.financials?.deliveredCount || 0;
    
    // Debug log
    console.log('[INVOICE MODAL] Seller:', seller.shopName, 'UID:', seller.uid, 'Products:', totalProducts, 'Financials:', seller.financials);

    return (
        <div className="flex-1 flex flex-col" style={{ width: '100%', height: '100%' }}>
            {/* Header */}
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
                                <span style={{ fontSize: '0.85rem', opacity: 0.9 }}>Seller Invoice & Financial Summary</span>
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
                            onClick={() => onDownloadPDF(`/admin/seller/${seller.uid}/pdf?fromDate=${invoiceFilterDateFrom}&toDate=${invoiceFilterDateTo}`, `invoice_${(seller.shopName || 'seller').replace(/\s+/g, '_')}.pdf`)}
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
                {/* Seller Information Section */}
                <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Store size={20} style={{ color: 'var(--primary)' }} />
                        Seller Information
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.5rem' }}>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Shop Name</p>
                            <p style={{ fontWeight: 600, fontSize: '1rem' }}>{seller.shopName}</p>
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Category</p>
                            <p style={{ fontWeight: 600, fontSize: '1rem' }}>{seller.category}</p>
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Seller ID</p>
                            <p style={{ fontWeight: 500, fontSize: '0.9rem', fontFamily: 'monospace' }}>{seller.uid}</p>
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Phone</p>
                            <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{seller.phone || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Email</p>
                            <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{seller.email || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.5rem' }}>Registration Date</p>
                            <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{formatDate(seller.createdAt)}</p>
                        </div>
                    </div>
                </div>

                {/* Invoice Summary - Four Boxes */}
                <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Invoice Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '1rem' }}>
                        {/* Total Products Listed */}
                        <div className="glass-card" style={{ padding: '1.5rem', border: '2px solid #6366f1', background: 'rgba(99, 102, 241, 0.05)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <Package size={24} style={{ color: '#6366f1' }} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#6366f1', fontWeight: 600, marginBottom: '0.5rem' }}>Total Products Listed</p>
                            <h2 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#4f46e5', margin: 0 }}>{totalProducts}</h2>
                        </div>

                        {/* Total Revenue Earned */}
                        <div className="glass-card" style={{ padding: '1.5rem', border: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <TrendingUp size={24} style={{ color: '#10b981' }} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>Total Revenue Earned</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', margin: 0 }}>Rs.{totalRevenue.toLocaleString()}</h2>
                        </div>

                        {/* Platform Charges (10%) */}
                        <div className="glass-card" style={{ padding: '1.5rem', border: '2px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <TrendingDown size={24} style={{ color: '#ef4444' }} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.5rem' }}>Platform Charges (10%)</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#dc2626', margin: 0 }}>Rs.{platformCharges.toLocaleString()}</h2>
                        </div>

                        {/* Amount to Receive */}
                        <div className="glass-card" style={{ padding: '1.5rem', border: '2px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' }}>
                            <div className="flex items-center justify-between mb-2">
                                <DollarSign size={24} style={{ color: '#10b981' }} />
                            </div>
                            <p style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600, marginBottom: '0.5rem' }}>Amount to Receive</p>
                            <h2 style={{ fontSize: '2rem', fontWeight: 800, color: '#059669', margin: 0 }}>Rs.{amountToReceive.toLocaleString()}</h2>
                        </div>
                    </div>
                    <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: '1rem' }}>
                        Based on {deliveredCount} delivered orders
                    </p>
                </div>

                {/* Date Filter Section */}
                <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <CalendarIcon size={20} style={{ color: 'var(--primary)' }} />
                        Download Settlement Invoice
                    </h3>
                    
                    {/* Month Selection Buttons */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Quick Period Selection</p>
                        <div className="flex gap-2 flex-wrap">
                            <button
                                onClick={() => handleMonthSelection(1)}
                                className={`btn ${selectedPeriod === '1' ? 'btn-primary' : ''}`}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '0.85rem',
                                    background: selectedPeriod === '1' ? 'var(--primary)' : 'transparent',
                                    color: selectedPeriod === '1' ? 'white' : 'var(--text)',
                                    border: `1px solid ${selectedPeriod === '1' ? 'var(--primary)' : 'var(--border)'}`,
                                    fontWeight: selectedPeriod === '1' ? 600 : 500
                                }}
                            >
                                1 Month
                            </button>
                            <button
                                onClick={() => handleMonthSelection(3)}
                                className={`btn ${selectedPeriod === '3' ? 'btn-primary' : ''}`}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '0.85rem',
                                    background: selectedPeriod === '3' ? 'var(--primary)' : 'transparent',
                                    color: selectedPeriod === '3' ? 'white' : 'var(--text)',
                                    border: `1px solid ${selectedPeriod === '3' ? 'var(--primary)' : 'var(--border)'}`,
                                    fontWeight: selectedPeriod === '3' ? 600 : 500
                                }}
                            >
                                3 Months
                            </button>
                            <button
                                onClick={() => handleMonthSelection(6)}
                                className={`btn ${selectedPeriod === '6' ? 'btn-primary' : ''}`}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '0.85rem',
                                    background: selectedPeriod === '6' ? 'var(--primary)' : 'transparent',
                                    color: selectedPeriod === '6' ? 'white' : 'var(--text)',
                                    border: `1px solid ${selectedPeriod === '6' ? 'var(--primary)' : 'var(--border)'}`,
                                    fontWeight: selectedPeriod === '6' ? 600 : 500
                                }}
                            >
                                6 Months
                            </button>
                            <button
                                onClick={() => handleMonthSelection(12)}
                                className={`btn ${selectedPeriod === '12' ? 'btn-primary' : ''}`}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '0.85rem',
                                    background: selectedPeriod === '12' ? 'var(--primary)' : 'transparent',
                                    color: selectedPeriod === '12' ? 'white' : 'var(--text)',
                                    border: `1px solid ${selectedPeriod === '12' ? 'var(--primary)' : 'var(--border)'}`,
                                    fontWeight: selectedPeriod === '12' ? 600 : 500
                                }}
                            >
                                12 Months
                            </button>
                            <button
                                onClick={() => handleMonthSelection('all')}
                                className={`btn ${selectedPeriod === 'all' ? 'btn-primary' : ''}`}
                                style={{ 
                                    padding: '0.5rem 1rem', 
                                    fontSize: '0.85rem',
                                    background: selectedPeriod === 'all' ? 'var(--primary)' : 'transparent',
                                    color: selectedPeriod === 'all' ? 'white' : 'var(--text)',
                                    border: `1px solid ${selectedPeriod === 'all' ? 'var(--primary)' : 'var(--border)'}`,
                                    fontWeight: selectedPeriod === 'all' ? 600 : 500
                                }}
                            >
                                All Time
                            </button>
                        </div>
                        {selectedPeriod && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.5rem', fontWeight: 500 }}>
                                {selectedPeriod === 'all' 
                                    ? 'Showing complete invoice history' 
                                    : `Selected: Last ${selectedPeriod} month${selectedPeriod !== '1' ? 's' : ''}`}
                            </p>
                        )}
                    </div>

                    {/* Custom Date Selection */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Or Select Custom Date Range</p>
                            {(invoiceFilterDateFrom || invoiceFilterDateTo) && (
                                <button
                                    onClick={handleClearDates}
                                    className="btn"
                                    style={{ 
                                        padding: '0.4rem 0.75rem', 
                                        fontSize: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        background: 'transparent',
                                        color: '#ef4444',
                                        border: '1px solid #ef4444',
                                        fontWeight: 600
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = '#ef4444';
                                        e.currentTarget.style.color = 'white';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.color = '#ef4444';
                                    }}
                                >
                                    <X size={14} />
                                    Clear Dates
                                </button>
                            )}
                        </div>
                        <div className="flex gap-4 items-end">
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>From Date</label>
                                <input 
                                    type="date" 
                                    value={invoiceFilterDateFrom} 
                                    onChange={(e) => {
                                        setInvoiceFilterDateFrom(e.target.value);
                                        setSelectedPeriod('');
                                    }} 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }} 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>To Date</label>
                                <input 
                                    type="date" 
                                    value={invoiceFilterDateTo} 
                                    onChange={(e) => {
                                        setInvoiceFilterDateTo(e.target.value);
                                        setSelectedPeriod('');
                                    }} 
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '1rem' }} 
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <button
                                    onClick={() => onDownloadPDF(`/admin/seller/${seller.uid}/pdf?fromDate=${invoiceFilterDateFrom}&toDate=${invoiceFilterDateTo}`, `invoice_${(seller.shopName || 'seller').replace(/\s+/g, '_')}.pdf`)}
                                    className="btn btn-primary"
                                    disabled={isDownloading}
                                    style={{ width: '100%', padding: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {isDownloading ? <Loader size={18} className="animate-spin" /> : <Download size={18} />}
                                    Download Invoice PDF
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
