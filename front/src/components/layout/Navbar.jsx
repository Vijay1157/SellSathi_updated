import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, Search, LogOut, ChevronDown } from 'lucide-react';
import AuthModal from '../common/AuthModal';

export default function Navbar() {
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [user, setUser] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();

    // Check localStorage on mount and listen for changes
    useEffect(() => {
        const checkUser = () => {
            const userData = localStorage.getItem('user');
            if (userData) {
                try {
                    setUser(JSON.parse(userData));
                } catch (error) {
                    console.error('Error parsing user data:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
        };

        checkUser();

        // Listen for userDataChanged event
        const handleUserChange = () => {
            checkUser();
        };

        window.addEventListener('userDataChanged', handleUserChange);

        return () => {
            window.removeEventListener('userDataChanged', handleUserChange);
        };
    }, []);

    const handleSignOut = () => {
        localStorage.removeItem('user');
        setUser(null);
        setIsProfileOpen(false);
        window.dispatchEvent(new CustomEvent('userDataChanged'));
        navigate('/');
    };

    const handleLoginSuccess = () => {
        setIsLoginModalOpen(false);
        setIsProfileOpen(false);
        // User data will be updated via the userDataChanged event listener
    };

    return (
        <>
            <nav className="glass-card" style={{
                margin: '1rem',
                padding: '0.75rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: '1rem',
                zIndex: 1000
            }}>
                <Link to="/" style={{ fontSize: '1.5rem', fontWeight: 'bold' }} className="gradient-text">
                    SELLSATHI
                </Link>

                {location.pathname === '/' && (
                    <div className="flex gap-8 items-center">
                        <div style={{ position: 'relative' }}>
                            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                onChange={(e) => {
                                    const params = new URLSearchParams(window.location.search);
                                    if (e.target.value) {
                                        params.set('search', e.target.value);
                                    } else {
                                        params.delete('search');
                                    }
                                    // Use history.pushState or similar if not using react-router setSearchParams directly in Navbar to avoid re-renders of the whole nav? 
                                    // Actually, we can just use navigate with existing params + search
                                    navigate(`/?${params.toString()}`);
                                }}
                                style={{ paddingLeft: '2.5rem', width: '300px', height: '40px' }}
                            />
                        </div>
                    </div>
                )}

                <div className="flex gap-4 items-center">
                    <Link to="/checkout" className="btn btn-secondary icon-btn"><ShoppingCart size={20} /></Link>

                    {user ? (
                        <div style={{ position: 'relative' }}>
                            <button
                                onClick={() => setIsProfileOpen(!isProfileOpen)}
                                className="btn btn-secondary icon-btn"
                                style={{ display: 'flex', gap: '8px', alignItems: 'center', paddingRight: '12px' }}
                            >
                                <User size={20} />
                                <span style={{ fontSize: '0.9rem', fontWeight: '600', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {user.fullName || user.phone?.split('@')[0] || 'User'}
                                </span>
                                <ChevronDown size={16} style={{ marginLeft: '4px' }} />
                            </button>

                            {isProfileOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        right: 0,
                                        marginTop: '8px',
                                        backgroundColor: 'var(--background)',
                                        border: '1px solid var(--border)',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        zIndex: 1001,
                                        minWidth: '280px',
                                        overflow: 'hidden'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {/* Profile Header */}
                                    <div style={{
                                        padding: '1rem',
                                        borderBottom: '1px solid var(--border)',
                                        background: 'hsla(230, 85%, 60%, 0.05)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                                            <div style={{
                                                width: '44px',
                                                height: '44px',
                                                borderRadius: '50%',
                                                background: 'var(--primary)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                                fontWeight: 'bold',
                                                fontSize: '1.2rem'
                                            }}>
                                                {(user.fullName || 'U').charAt(0).toUpperCase()}
                                            </div>
                                            <div style={{ flex: 1, overflow: 'hidden' }}>
                                                <p style={{ fontSize: '1rem', fontWeight: 'bold', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {user.fullName || 'User'}
                                                </p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {user.email || user.phone}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{
                                            fontSize: '0.75rem',
                                            padding: '4px 8px',
                                            backgroundColor: 'hsla(230, 85%, 60%, 0.1)',
                                            color: 'var(--primary)',
                                            borderRadius: '4px',
                                            display: 'inline-block',
                                            textTransform: 'capitalize',
                                            fontWeight: 'bold',
                                            marginBottom: '4px'
                                        }}>
                                            {user.role}
                                        </div>
                                    </div>

                                    {/* Profile Actions */}
                                    <div style={{ padding: '0.5rem' }}>
                                        <button
                                            onClick={() => {
                                                setIsLoginModalOpen(true);
                                                setIsProfileOpen(false);
                                            }}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.95rem',
                                                textAlign: 'left',
                                                color: 'var(--text)',
                                                transition: 'background-color 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsla(230, 85%, 60%, 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <User size={16} />
                                            Login as Another User
                                        </button>

                                        <button
                                            onClick={handleSignOut}
                                            style={{
                                                width: '100%',
                                                padding: '10px 12px',
                                                backgroundColor: 'transparent',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: 'pointer',
                                                fontSize: '0.95rem',
                                                textAlign: 'left',
                                                color: 'var(--danger, #ff6b6b)',
                                                transition: 'background-color 0.2s',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsla(0, 100%, 71%, 0.1)'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <LogOut size={16} />
                                            Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsLoginModalOpen(true)}
                            className="btn btn-secondary icon-btn"
                        >
                            <User size={20} />
                        </button>
                    )}
                </div>
            </nav>

            <AuthModal
                isOpen={isLoginModalOpen}
                onClose={() => setIsLoginModalOpen(false)}
                onSuccess={handleLoginSuccess}
            />
        </>
    );
}
