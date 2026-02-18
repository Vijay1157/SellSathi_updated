import { PRODUCTS, CATEGORIES } from '../../utils/mockData';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Filter, Star, Search } from 'lucide-react';

export default function ProductListing() {
    return (
        <div className="container animate-fade-in" style={{ padding: '2rem 0' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '2rem' }}>All <span className="gradient-text">Products</span></h1>
                <div className="flex gap-4">
                </div>
            </div>

            <div className="flex gap-8">
                {/* Sidebar Filters */}
                <aside style={{ width: '200px' }} className="flex flex-col gap-6">
                    <div>
                        <h4 style={{ marginBottom: '1rem' }}>Categories</h4>
                        <div className="flex flex-col gap-2">
                            {['All', ...CATEGORIES].map(cat => (
                                <label key={cat} className="flex items-center gap-2 cursor-pointer text-muted">
                                    <input type="checkbox" /> {cat}
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 style={{ marginBottom: '1rem' }}>Price Range</h4>
                        <input type="range" style={{ width: '100%' }} />
                        <div className="flex justify-between text-muted" style={{ fontSize: '0.75rem' }}>
                            <span>₹0</span>
                            <span>₹1000+</span>
                        </div>
                    </div>
                </aside>

                {/* Product Grid */}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '2rem' }}>
                    {PRODUCTS.map(p => (
                        <motion.div
                            key={p.id}
                            whileHover={{ y: -5 }}
                            className="glass-card"
                            style={{ overflow: 'hidden', padding: 0 }}
                        >
                            <img src={p.image} style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                            <div style={{ padding: '1rem' }}>
                                <p className="text-muted" style={{ fontSize: '0.75rem' }}>{p.seller}</p>
                                <h4 style={{ margin: '0.25rem 0' }}>{p.title}</h4>
                                <div className="flex items-center gap-1" style={{ marginBottom: '1rem' }}>
                                    <Star size={12} fill="var(--warning)" color="var(--warning)" />
                                    <span style={{ fontSize: '0.875rem' }}>4.8 (120 reviews)</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>₹{p.price}</span>
                                    <Link to={`/product/${p.id}`} className="btn btn-primary btn-sm">View</Link>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {/* Mock padding for grid */}
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="glass-card" style={{ opacity: 0.3, background: 'var(--surface)' }}>
                            <div style={{ height: '200px' }}></div>
                            <div style={{ padding: '1rem', height: '100px' }}></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
