import { ArrowLeft, Download, Mail, Phone } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

export default function Invoice() {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (params.get('download') === 'true') {
            // Give a small delay for contents to settle
            setTimeout(handleDownload, 1000);
        }
    }, [location]);



    const handleDownload = () => {
        const element = document.getElementById('invoice-card');
        const opt = {
            margin: 0,
            filename: 'Sellsathi_Invoice_OD2324-9922.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };

        if (window.html2pdf) {
            window.html2pdf().from(element).set(opt).save();
        } else {
            console.error('html2pdf not loaded');
            // Fallback to print if library fails
            window.print();
        }
    };

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {/* Action Bar - Non-printable */}
            <div className="no-print flex justify-between items-center" style={{ width: '100%', maxWidth: '850px', marginBottom: '2rem' }}>
                <button
                    onClick={() => navigate('/track')}
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
                        <p style={{ color: '#666', fontSize: '1.1rem', marginTop: '0.5rem' }}>#OD2324-9922</p>
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
                            <p style={{ fontWeight: '600', fontSize: '1.1rem' }}>{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                        </div>
                        <div>
                            <label style={{ color: '#999', fontSize: '0.85rem', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Status</label>
                            <span style={{
                                background: '#10b981',
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '0.8rem',
                                fontWeight: 'bold'
                            }}>PAID</span>
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
                        <tr style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '1rem 0', fontWeight: '500' }}>Handmade Jute Bag</td>
                            <td style={{ textAlign: 'center', padding: '1rem 0' }}>1</td>
                            <td style={{ textAlign: 'right', padding: '1rem 0' }}>₹1350.00</td>
                            <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: '600' }}>₹1350.00</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '1rem 0', fontWeight: '500' }}>Rajasthani Blue Pottery Vase</td>
                            <td style={{ textAlign: 'center', padding: '1rem 0' }}>1</td>
                            <td style={{ textAlign: 'right', padding: '1rem 0' }}>₹1450.00</td>
                            <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: '600' }}>₹1450.00</td>
                        </tr>
                    </tbody>
                </table>

                {/* Summary */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                        <span style={{ color: '#666' }}>Subtotal</span>
                        <span style={{ fontWeight: '600' }}>₹2800.00</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px' }}>
                        <span style={{ color: '#666' }}>Shipping</span>
                        <span style={{ color: '#10b981', fontWeight: '600' }}>FREE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '280px', marginTop: '1rem', paddingTop: '1rem', borderTop: '2px solid #000', fontSize: '1.4rem', fontWeight: '900' }}>
                        <span>Total</span>
                        <span>₹2800.00</span>
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
