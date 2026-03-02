import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck, Phone, ArrowRight, MessageSquare, ShieldAlert, User as UserIcon } from 'lucide-react';
import { auth } from '../../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../utils/api';

const TEST_CREDENTIALS = {
    '+917483743936': { otp: '123456', role: 'ADMIN' },
    '+919876543210': { otp: '123456', role: 'CONSUMER' },
    '+917676879059': { otp: '123456', role: 'CONSUMER' },
    '+919353469036': { otp: '741852', role: 'SELLER' },
};

export default function AdminLoginModal({ isOpen, onClose }) {
    const [step, setStep] = useState('phone'); // 'phone' | 'otp'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isTestNumber, setIsTestNumber] = useState(false);
    const navigate = useNavigate();

    const cleanupRecaptcha = () => {
        if (window.adminRecaptchaVerifier) {
            try { window.adminRecaptchaVerifier.clear(); } catch (e) { }
            window.adminRecaptchaVerifier = null;
        }
    };

    useEffect(() => {
        if (!isOpen) {
            setStep('phone');
            setPhone('');
            setOtp('');
            setError('');
            setLoading(false);
            cleanupRecaptcha();
        }
        return () => cleanupRecaptcha();
    }, [isOpen]);

    const setupRecaptcha = () => {
        cleanupRecaptcha();
        // Add a small delay to ensure DOM is fully ready
        setTimeout(() => {
            try {
                if (!document.getElementById('admin-recaptcha-container')) {
                    console.error('Recaptcha container not found');
                    return;
                }
                window.adminRecaptchaVerifier = new RecaptchaVerifier(auth, 'admin-recaptcha-container', {
                    size: 'invisible',
                    'callback': () => { },
                    'expired-callback': () => cleanupRecaptcha()
                });
            } catch (e) {
                console.error('Recaptcha init error:', e);
                cleanupRecaptcha();
            }
        }, 100);
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');

        if (phone.length !== 10) {
            setError('Please enter a valid 10-digit mobile number.');
            return;
        }

        const formattedPhone = `+91${phone}`;
        if (TEST_CREDENTIALS[formattedPhone]) {
            setIsTestNumber(true);
            setStep('otp');
            return;
        }

        setIsTestNumber(false);
        setLoading(true);
        try {
            // Setup recaptcha and wait for it to be ready
            await new Promise((resolve) => {
                setupRecaptcha();
                setTimeout(resolve, 200); // Wait for recaptcha initialization
            });

            if (!window.adminRecaptchaVerifier) {
                throw new Error('reCAPTCHA initialization failed');
            }

            const confirmation = await signInWithPhoneNumber(auth, formattedPhone, window.adminRecaptchaVerifier);
            setConfirmationResult(confirmation);
            setStep('otp');
        } catch (err) {
            console.error('OTP Send Error:', err);
            setError(err.code === 'auth/too-many-requests' ? 'Too many attempts. Please try again later.' : 'Failed to send OTP. Please check the number.');
            cleanupRecaptcha();
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        if (otp.length !== 6) { return; }

        setLoading(true);
        try {
            let idToken = null;
            const formattedPhone = `+91${phone}`;

            if (isTestNumber) {
                if (TEST_CREDENTIALS[formattedPhone].otp !== otp) {
                    throw new Error('Invalid test OTP');
                }
            } else {
                const result = await confirmationResult.confirm(otp);
                idToken = await result.user.getIdToken();
            }

            const response = await authFetch(isTestNumber ? '/auth/test-login' : '/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(isTestNumber ? { phone: formattedPhone, otp } : { idToken }),
            });

            const data = await response.json();

            if (data.success) {
                if (data.role !== 'ADMIN') {
                    setError('Access Denied: You do not have management privileges.');
                    setLoading(false);
                    return;
                }

                const userData = {
                    uid: data.uid,
                    role: data.role,
                    phone: data.phone || formattedPhone,
                    email: data.email,
                    fullName: data.fullName || 'Admin User',
                    status: data.status || 'AUTHORIZED',
                };
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('userName', userData.fullName);
                localStorage.setItem('dob', data.dob || '');
                window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));

                navigate('/admin');
                onClose();
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('OTP Verify Error:', err);
            setError('Invalid OTP. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const idToken = await result.user.getIdToken();

            const response = await authFetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken, email: result.user.email }),
            });

            const data = await response.json();

            if (data.success) {
                if (data.role !== 'ADMIN') {
                    setError('Access Denied: This Google account is not authorized for management.');
                    await auth.signOut();
                    setLoading(false);
                    return;
                }

                const userData = {
                    uid: data.uid,
                    role: data.role,
                    email: data.email || result.user.email,
                    fullName: data.fullName || result.user.displayName || 'Admin User',
                    phone: data.phone || result.user.phoneNumber,
                    status: data.status || 'AUTHORIZED',
                };
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('userName', userData.fullName);
                localStorage.setItem('dob', data.dob || '');
                window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));

                navigate('/admin');
                onClose();
            } else {
                setError(data.message || 'Management access denied.');
            }
        } catch (err) {
            console.error('Google Login Error:', err);
            setError('Google authentication failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="auth-modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
                    <div id="admin-recaptcha-container"></div>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="auth-modal-content"
                        style={{ width: '100%', maxWidth: '400px', border: '2px solid var(--primary)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <button className="auth-close-btn" onClick={onClose}><X size={20} /></button>

                        <div className="auth-header">
                            <div className="auth-icon-container" style={{ background: 'var(--primary)' }}>
                                {step === 'phone' ? <UserIcon color="white" size={24} /> : <ShieldCheck color="white" size={24} />}
                            </div>
                            <h2>Management <span className="gradient-text">Portal</span></h2>
                            <p>{step === 'phone' ? 'Authorized access only. Enter your credentials.' : `Verification code sent to +91 ${phone}`}</p>
                        </div>

                        {error && <div className="auth-error-msg" style={{ background: '#fef2f2', color: '#dc2626', padding: '0.75rem', borderRadius: '12px', marginBottom: '1.5rem', fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>{error}</div>}

                        {step === 'phone' ? (
                            <form onSubmit={handleSendOTP} className="auth-form">
                                <div className="phone-input-standard" style={{ marginBottom: '1.5rem' }}>
                                    <Phone size={18} className="auth-field-icon" style={{ position: 'absolute', left: '1rem', zIndex: 1, color: '#94a3b8' }} />
                                    <div className="phone-prefix-box">+91</div>
                                    <input
                                        type="tel"
                                        placeholder="Admin Mobile Number"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        required
                                        className="phone-main-input"
                                        autoComplete="tel"
                                    />
                                </div>
                                <button type="submit" className="auth-submit-btn" disabled={loading} style={{ background: 'var(--primary)', color: 'white' }}>
                                    {loading ? 'Sending OTP...' : (
                                        <>Continue to Login <ArrowRight size={18} /></>
                                    )}
                                </button>

                                <div className="auth-divider"><span>OR</span></div>

                                <button
                                    type="button"
                                    onClick={handleGoogleLogin}
                                    className="auth-google-btn"
                                    disabled={loading}
                                >
                                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="18" />
                                    Sign in with Google
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleVerifyOTP} className="auth-form">
                                <div className="auth-input-group" style={{ marginBottom: '1.5rem' }}>
                                    <MessageSquare size={18} className="auth-field-icon" style={{ position: 'absolute', left: '1rem', zIndex: 1, color: '#94a3b8' }} />
                                    <input
                                        type="text"
                                        placeholder="Enter 6-digit OTP"
                                        value={otp}
                                        onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        required
                                        style={{ width: '100%', padding: '0.875rem 1rem 0.875rem 3rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '1rem', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 'bold' }}
                                    />
                                </div>
                                <button type="submit" className="auth-submit-btn" disabled={loading || otp.length < 6} style={{ background: 'var(--primary)', color: 'white' }}>
                                    {loading ? 'Verifying...' : 'Verify & Access Dashboard'}
                                </button>
                                <button
                                    type="button"
                                    className="auth-back-link"
                                    onClick={() => setStep('phone')}
                                    style={{ marginTop: '1rem', width: '100%', border: 'none', background: 'none', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                                >
                                    Change Phone Number
                                </button>
                            </form>
                        )}

                        <div className="auth-form-footer" style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                            <p className="text-muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                <ShieldAlert size={14} /> Unauthorized access is strictly prohibited.
                            </p>
                        </div>
                    </motion.div>
                </div>
            )}
            <style>{`
                .auth-modal-overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 23, 42, 0.6);
                    backdrop-filter: blur(8px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 1.5rem;
                    z-index: 9999;
                }
                .auth-modal-content {
                    background: white;
                    border-radius: 2rem;
                    padding: 2.5rem;
                    position: relative;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                }
                .auth-close-btn {
                    position: absolute;
                    top: 1.25rem;
                    right: 1.25rem;
                    width: 32px;
                    height: 32px;
                    border-radius: 50%;
                    border: none;
                    background: #f1f5f9;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .auth-close-btn:hover { background: #e2e8f0; color: #ef4444; }
                .auth-header { text-align: center; margin-bottom: 2rem; }
                .auth-icon-container {
                    width: 56px;
                    height: 56px;
                    border-radius: 1.25rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.25rem;
                }
                .auth-header h2 { font-size: 1.75rem; font-weight: 900; letter-spacing: -0.025em; margin-bottom: 0.5rem; }
                .auth-header p { color: #64748b; font-size: 0.95rem; }
                .auth-form { display: flex; flex-direction: column; }
                
                .phone-input-standard {
                    display: flex;
                    align-items: center;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 1rem;
                    overflow: hidden;
                    position: relative;
                }
                .phone-prefix-box {
                    padding: 0.875rem 0.5rem 0.875rem 3rem;
                    font-weight: 700;
                    color: var(--primary);
                    border-right: 1px solid #e2e8f0;
                    background: rgba(37, 99, 235, 0.05);
                }
                .phone-main-input {
                    border: none !important;
                    background: transparent !important;
                    padding: 0.875rem 1rem !important;
                    flex: 1;
                    font-weight: 700;
                    outline: none;
                }
                .auth-submit-btn {
                    padding: 1rem;
                    border-radius: 1rem;
                    border: none;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: 0.2s;
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                .auth-submit-btn:hover:not(:disabled) { transform: translateY(-2px); opacity: 0.9; }
                .auth-submit-btn:disabled { opacity: 0.6; cursor: not-allowed; }
                
                .auth-divider {
                    display: flex;
                    align-items: center;
                    margin: 1.5rem 0;
                    color: #94a3b8;
                    font-size: 0.8rem;
                    font-weight: 600;
                }
                .auth-divider::before, .auth-divider::after {
                    content: "";
                    flex: 1;
                    height: 1px;
                    background: #e2e8f0;
                }
                .auth-divider span { padding: 0 1rem; }
                
                .auth-google-btn {
                    width: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    padding: 0.875rem;
                    background: white;
                    border: 1px solid #e2e8f0;
                    border-radius: 1rem;
                    color: #334155;
                    font-weight: 600;
                    font-size: 0.95rem;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .auth-google-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
            `}</style>
        </AnimatePresence>
    );
}
