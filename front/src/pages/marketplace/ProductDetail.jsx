import { useParams, Link } from 'react-router-dom';
import { PRODUCTS } from '../../utils/mockData';
import { ShoppingCart, Heart, Shield, Truck, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProductDetail() {
    const { id } = useParams();
    const product = PRODUCTS.find(p => p.id === parseInt(id)) || PRODUCTS[0];

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 0' }}>
            <div className="flex gap-12">
                {/* Images */}
                <div style={{ flex: 1.2 }} className="flex flex-col gap-4">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="glass-card" style={{ padding: 0, overflow: 'hidden', height: '500px' }}
                    >
                        <img src={product.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </motion.div>
                    <div className="flex gap-4">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="glass-card" style={{ padding: 0, overflow: 'hidden', width: '100px', height: '100px', cursor: 'pointer' }}>
                                <img src={product.image} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1 }} className="flex flex-col gap-6">
                    <div>
                        <Link to="/products" className="text-muted" style={{ fontSize: '0.875rem' }}>&larr; Back to Shop</Link>
                        <h1 style={{ fontSize: '2.5rem', marginTop: '1rem' }}>{product.title}</h1>
                        <p className="text-muted">By <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{product.seller}</span></p>
                    </div>

                    <div style={{ padding: '2rem', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '2rem', fontWeight: 'bold' }}>₹{product.price}</span>
                        <p className="text-muted" style={{ marginTop: '0.5rem' }}>Inclusive of all taxes</p>
                    </div>

                    <p style={{ fontSize: '1.1rem', lineHeight: 1.6 }}>{product.description}</p>

                    <div className="flex gap-4">
                        <Link to="/checkout" className="btn btn-primary flex-1" style={{ padding: '1rem' }}>
                            <ShoppingCart size={20} /> Add to Cart
                        </Link>
                        <button className="btn btn-secondary" style={{ padding: '1rem' }}><Heart size={20} /></button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '2rem' }}>
                        <div className="glass-card flex items-center gap-3" style={{ padding: '1rem' }}>
                            <Truck size={20} className="text-muted" />
                            <div>
                                <h5 style={{ fontSize: '0.875rem' }}>Free Delivery</h5>
                                <p style={{ fontSize: '0.75rem' }} className="text-muted">Orders over ₹500</p>
                            </div>
                        </div>
                        <div className="glass-card flex items-center gap-3" style={{ padding: '1rem' }}>
                            <RotateCcw size={20} className="text-muted" />
                            <div>
                                <h5 style={{ fontSize: '0.875rem' }}>7 Days Return</h5>
                                <p style={{ fontSize: '0.75rem' }} className="text-muted">Easy returns & refunds</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ background: 'hsla(230, 85%, 60%, 0.05)', borderColor: 'hsla(230, 85%, 60%, 0.2)' }}>
                        <div className="flex gap-3">
                            <Shield size={20} color="var(--primary)" />
                            <div>
                                <h5>Seller Information</h5>
                                <p className="text-muted" style={{ fontSize: '0.875rem' }}>This seller is an active member of SELLSATHI and has completed over 500 successful orders.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
