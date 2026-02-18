import { Link } from 'react-router-dom';
import { useState } from 'react';
import SellerAuthModal from '../common/SellerAuthModal';

export default function Footer() {
    const [isSellerModalOpen, setIsSellerModalOpen] = useState(false);

    const handleBecomeSellerClick = () => {
        // Check if user is logged in
        const user = localStorage.getItem('user');
        if (!user) {
            alert('Please login as a customer first before becoming a seller');
            return;
        }

        const userData = JSON.parse(user);

        // Check if user is already a seller
        if (userData.role === 'SELLER') {
            alert('You are already registered as a seller');
            return;
        }

        // Check if user is admin
        if (userData.role === 'ADMIN') {
            alert('Admin cannot become a seller');
            return;
        }

        // Open seller registration modal
        setIsSellerModalOpen(true);
    };

    const handleSellerSuccess = () => {
        setIsSellerModalOpen(false);
    };

    return (
        <footer style={{
            marginTop: '4rem',
            padding: '4rem 0',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)'
        }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '2rem' }}>
                    <div>
                        <h3 className="gradient-text" style={{ marginBottom: '1rem' }}>SELLSATHI</h3>
                        <p className="text-muted">The future of global marketplace. Fast, secure, and seller-friendly.</p>
                    </div>

                    <div>
                        <h4>Marketplace</h4>
                        <ul style={{ listStyle: 'none', marginTop: '1rem' }} className="flex flex-col gap-2">
                            <li><Link to="/products" className="text-muted">All Products</Link></li>
                            <li><Link to="/categories" className="text-muted">Categories</Link></li>
                            <li><Link to="/track" className="text-muted">Track Order</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4>Support</h4>
                        <ul style={{ listStyle: 'none', marginTop: '1rem' }} className="flex flex-col gap-2">
                            <li><Link to="/faq" className="text-muted">FAQ</Link></li>
                            <li><Link to="/contact" className="text-muted">Contact Us</Link></li>
                            <li><Link to="/terms" className="text-muted">Terms of Service</Link></li>
                        </ul>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                        <h4>Earn with Us</h4>
                        <div style={{ marginTop: '1rem' }}>
                            <button
                                onClick={handleBecomeSellerClick}
                                className="btn btn-primary"
                                style={{ cursor: 'pointer' }}
                            >
                                Become a Seller
                            </button>
                            <p className="text-muted" style={{ marginTop: '0.5rem' }}>Open your shop in minutes.</p>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                    <p className="text-muted">&copy; 2026 SELLSATHI Inc. All rights reserved.</p>
                </div>
            </div>

            <SellerAuthModal
                isOpen={isSellerModalOpen}
                onClose={() => setIsSellerModalOpen(false)}
                onSuccess={handleSellerSuccess}
            />
        </footer>
    );
}
