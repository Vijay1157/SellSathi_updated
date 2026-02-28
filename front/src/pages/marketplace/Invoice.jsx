import { ArrowLeft, Download, Mail, Phone } from 'lucide-react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import html2pdf from 'html2pdf.js';

export default function Invoice() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                // First, try to find by document ID
                let orderDoc = await getDoc(doc(db, 'orders', orderId));

                if (orderDoc.exists()) {
                    setOrder({ id: orderDoc.id, ...orderDoc.data() });
                } else {
                    // If not found by document ID, search by orderId field
                    const ordersRef = collection(db, 'orders');
                    const q = query(ordersRef, where('orderId', '==', orderId));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        setOrder({ id: doc.id, ...doc.data() });
                    } else {
                        console.log('Order not found with ID:', orderId);
                        setOrder(null);
                    }
                }
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('download') === 'true' && order) {
            // Give a small delay for contents to settle
            setTimeout(handleDownload, 1000);
        }
    }, [location, order]);



    const handleDownload = () => {
        if (!order) return;
        
        const element = document.getElementById('invoice-card');
        const opt = {
            margin: 0,
            filename: `Sellsathi_Invoice_${order.orderId || order.id}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        // Use imported html2pdf instead of window.html2pdf
        html2pdf().from(element).set(opt).save();
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '4rem 0', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container" style={{ padding: '4rem 0', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <h2>Invoice not found</h2>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const formatDate = (timestamp) => {
        if (!timestamp) return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        
        try {
            if (timestamp.toDate && typeof timestamp.toDate === 'function') {
                return timestamp.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            }
            const date = new Date(timestamp);
            if (!isNaN(date.getTime())) {
                return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
            }
            return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (error) {
            return new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    };

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Action Bar - Non-printable */}
            <div className="no-print flex justify-between items-center" style={{ width: '100%', maxWidth: '850px', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate(`/track?orderId=${order.orderId || order.id}`)}
                    className="btn btn-secondary flex items-center gap-2"
                    style={{ padding: '0.6rem 1.2rem' }}
                >
                    <ArrowLeft size={18} />
                    Back to Tracking
                </button>
                <div className="flex gap-3">
                    <button
                        onClick={handleDownload}
                        className="btn btn-primary flex items-center gap-2"
                        style={{ padding: '0.6rem 1.2rem', background: 'var(--success)', border: 'none' }}
                    >
                        <Download size={18} />
                        Download PDF
                    </button>

                </div>
            </div>

            {/* Professional Invoice Card */}
            <div id="invoice-card" className="invoice-container" style={{
                background: 'white',
                width: '100%',
                maxWidth: '850px',
                padding: '3rem',
                borderRadius: '8px',
                boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
                color: '#1a1a1a',
                position: 'relative',
                fontFamily: "'Inter', sans-serif"
            }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: '3rem', fontWeight: '800', margin: 0, letterSpacing: '-2px', color: '#000' }}>INVOICE</h1>
                        <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '0.5rem' }}>#{order.orderId || order.id}</p>
                    </div>
                    {/* Logo */}
                    <div style={{
                        width: '45px',
                        height: '45px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{ width: '20px', height: '20px', border: '3px solid white', borderRadius: '4px' }}></div>
                    </div>
                </div>

                {/* Info Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #eee' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div>
                            <label style={{ color: '#999', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Date</label>
                            <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{formatDate(order.createdAt)}</p>
                        </div>
                        <div>
                            <label style={{ color: '#999', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Status</label>
                            <span style={{
                                background: order.paymentMethod === 'COD' ? '#f59e0b' : '#10b981',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}>{order.paymentMethod === 'COD' ? 'COD' : 'PAID'}</span>
                        </div>
                    </div>
                    <div>
                        <label style={{ color: '#999', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Billed From</label>
                        <p style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '0.4rem' }}>SELLSATHI Marketplace</p>
                        <p style={{ color: '#555', lineHeight: '1.6', fontSize: '0.95rem' }}>
                            Business address<br />
                            Bangalore, Karnataka, IN — 560001<br />
                            TAX ID: GSTIN29AAACB1234F1Z5
                        </p>
                    </div>
                </div>

                {/* Table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid #eee' }}>
                            <th style={{ textAlign: 'left', padding: '1rem 0', color: '#666', fontWeight: '500', fontSize: '0.9rem' }}>Item</th>
                            <th style={{ textAlign: 'center', padding: '1rem 0', color: '#666', fontWeight: '500', fontSize: '0.9rem' }}>Qty</th>
                            <th style={{ textAlign: 'right', padding: '1rem 0', color: '#666', fontWeight: '500', fontSize: '0.9rem' }}>Price</th>
                            <th style={{ textAlign: 'right', padding: '1rem 0', color: '#666', fontWeight: '500', fontSize: '0.9rem' }}>Line total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items && order.items.map((item, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #f9f9f9' }}>
                                <td style={{ padding: '1rem 0', fontWeight: '500' }}>{item.name || item.title || 'Product'}</td>
                                <td style={{ textAlign: 'center', padding: '1rem 0' }}>{item.quantity || 1}</td>
                                <td style={{ textAlign: 'right', padding: '1rem 0' }}>₹{(item.price || 0).toLocaleString()}</td>
                                <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: '600' }}>₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                        <span style={{ color: '#666' }}>Subtotal</span>
                        <span style={{ fontWeight: '600' }}>₹{(order.total || 0).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                        <span style={{ color: '#666' }}>Shipping</span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>FREE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #000', fontSize: '1.4rem', fontWeight: '900' }}>
                        <span>Total</span>
                        <span>₹{(order.total || 0).toLocaleString()}</span>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '1px solid #eee' }}>
                    <p style={{ fontWeight: '700', marginBottom: '0.4rem' }}>Thank you for Shopping!</p>
                    <p style={{ color: '#666', fontSize: '0.9rem' }}>Please contact support if you have any questions.</p>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2.5rem' }}>
                        <p style={{ fontWeight: '600', color: '#000' }}>SELLSATHI - Empowering Local Sellers</p>
                        <div style={{ display: 'flex', gap: '2rem', color: '#666', fontSize: '0.9rem' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Phone size={14} /> +91 98765 43210</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Mail size={14} /> support@sellsathi.com</span>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                {`
                    @media print {
                        .no-print { display: none !important; }
                        body { background: white !important; padding: 0 !important; }
                        .container { padding: 0 !important; max-width: 100% !important; }
                        #invoice-card { 
                            box-shadow: none !important; 
                            padding: 2rem !important; 
                            width: 100% !important;
                            max-width: 100% !important;
                            border: 1px solid #eee;
                        }
                    }
                `}
            </style>
        </div>
    );
}
