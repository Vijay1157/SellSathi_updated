import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '../../components/common/AuthModal';
import { ShieldCheck } from 'lucide-react';

export default function AdminLogin() {
    const [isModalOpen, setIsModalOpen] = useState(true);
    const navigate = useNavigate();

    const handleSuccess = (data) => {
        setIsModalOpen(false);

        // Only redirect to admin dashboard if user is actually an admin
        // with the correct phone number
        const ADMIN_PHONE = '+917483743936';
        if (data && data.role === 'ADMIN' && data.phone === ADMIN_PHONE) {
            navigate('/admin');
        } else {
            // Redirect non-admin users to home page (featured products)
            navigate('/');
        }
    };

    return (
        <div className="container" style={{
            height: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div className="glass-card text-center" style={{ padding: '4rem', maxWidth: '500px' }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'hsla(230, 85%, 60%, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem'
                }}>
                    <ShieldCheck size={32} color="var(--primary)" />
                </div>
                <h1 style={{ marginBottom: '1rem' }}>Admin <span className="gradient-text">Access</span></h1>
                <p className="text-muted" style={{ marginBottom: '2.5rem' }}>
                    Secure portal for Sellsathi administrators.
                    Please verify your credentials to continue to the dashboard.
                </p>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="btn btn-primary"
                    style={{ padding: '1rem 3rem' }}
                >
                    Launch Admin Login
                </button>
            </div>

            <AuthModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleSuccess}
            />
        </div>
    );
}
