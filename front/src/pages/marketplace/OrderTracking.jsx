import { motion } from 'framer-motion';
import { ArrowLeft, Package, Truck, CheckCircle, FileText, MapPin, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function OrderTracking() {
    const navigate = useNavigate();

    const trackingSteps = [
        { status: 'Order Placed', date: 'Feb 13, 10:30 AM', icon: <Package size={20} />, completed: true, current: false },
        { status: 'Processing', date: 'Feb 13, 11:45 AM', icon: <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}><Package size={20} /></motion.div>, completed: true, current: true },
        { status: 'Shipped', date: 'Pending', icon: <Truck size={20} />, completed: false, current: false },
        { status: 'Delivered', date: 'Expected by Feb 15', icon: <CheckCircle size={20} />, completed: false, current: false },
    ];

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 0', minHeight: '80vh' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '3rem' }}>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-muted hover:text-primary transition-colors"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                        <ArrowLeft size={18} />
                        Back to Shopping
                    </button>
                    <h1 style={{ margin: 0 }}>Track <span className="gradient-text">Order</span></h1>
                </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                {/* Tracking Timeline */}
                <div className="glass-card" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Order ID</p>
                            <h3 style={{ margin: 0 }}>#OD9229067909</h3>
                        </div>
                    </div>

                    <div style={{ position: 'relative', paddingLeft: '3rem' }}>
                        {/* Vertical Line */}
                        <div style={{
                            position: 'absolute',
                            left: '14px',
                            top: '10px',
                            bottom: '10px',
                            width: '2px',
                            background: 'var(--border)',
                            zIndex: 0
                        }}></div>

                        <div className="flex flex-col gap-10">
                            {trackingSteps.map((step, index) => (
                                <div key={index} className="flex gap-6" style={{ position: 'relative', zIndex: 1 }}>
                                    <div style={{
                                        width: '30px',
                                        height: '30px',
                                        borderRadius: '50%',
                                        background: step.completed ? 'var(--primary)' : 'var(--surface)',
                                        border: `2px solid ${step.completed ? 'var(--primary)' : 'var(--border)'}`,
                                        color: step.completed ? 'white' : 'var(--text-muted)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: step.current ? '0 0 0 4px hsla(var(--primary-h), 85%, 60%, 0.2)' : 'none'
                                    }}>
                                        {step.completed ? <CheckCircle size={16} /> : <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--border)' }} />}
                                    </div>
                                    <div>
                                        <h4 style={{ margin: '0 0 0.25rem', color: step.completed ? 'var(--text)' : 'var(--text-muted)' }}>{step.status}</h4>
                                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{step.date}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Delivery Info */}
                <div className="flex flex-col gap-6">
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={20} className="text-primary" /> Delivery Address
                        </h3>
                        <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>Tejaswini R</p>
                        <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                            HSR Layout, Sector 7<br />
                            Bangalore, Karnataka 560102<br />
                            Phone: +91 94812 34567
                        </p>
                    </div>

                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Items in this Order</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex gap-4 items-center">
                                <div style={{ width: '50px', height: '50px', background: 'var(--surface)', borderRadius: '8px' }}></div>
                                <div className="flex-1">
                                    <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Handmade Jute Bag</h4>
                                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Qty: 1</p>
                                </div>
                                <span style={{ fontWeight: 'BOLD' }}>₹1350</span>
                            </div>
                            <div className="flex gap-4 items-center">
                                <div style={{ width: '50px', height: '50px', background: 'var(--surface)', borderRadius: '8px' }}></div>
                                <div className="flex-1">
                                    <h4 style={{ margin: 0, fontSize: '0.9rem' }}>Blue Pottery Vase</h4>
                                    <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Qty: 1</p>
                                </div>
                                <span style={{ fontWeight: 'BOLD' }}>₹1450</span>
                            </div>
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
                        <div className="flex justify-between items-center">
                            <span style={{ fontWeight: '600' }}>Total Paid</span>
                            <span className="gradient-text" style={{ fontWeight: '800', fontSize: '1.25rem' }}>₹2800</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/invoice')}
                        className="btn btn-primary flex items-center justify-center gap-3"
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
                            fontWeight: '700',
                            fontSize: '1rem'
                        }}
                    >
                        <FileText size={20} />
                        View Bill
                    </button>
                </div>
            </div>
        </div>
    );
}
