import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ShieldCheck, ArrowRight, User as UserIcon, Mail, Lock, Check, Eye, EyeOff } from 'lucide-react';
import { auth } from '../../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

const TEST_CREDENTIALS = {
    '+917483743936': { otp: '123456', role: 'ADMIN' },
    '+919876543210': { otp: '123456', role: 'CONSUMER' },
    '+917676879059': { otp: '123456', role: 'CONSUMER' },
};

export default function AuthModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState('phone'); // 'phone' or 'otp'
    const [isRegistering, setIsRegistering] = useState(false);
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [isTestNumber, setIsTestNumber] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        agreedToTerms: false,
        agreedToPrivacy: false
    });
    const [isEmailSignup, setIsEmailSignup] = useState(false);
    const [isEmailLogin, setIsEmailLogin] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const cleanupRecaptcha = () => {
        if (window.recaptchaVerifier) {
            try { window.recaptchaVerifier.clear(); } catch (e) { console.log('Recaptcha clear error:', e); }
            window.recaptchaVerifier = null;
        }
    };

    useEffect(() => {
        return () => cleanupRecaptcha();
    }, []);

    useEffect(() => {
        if (!isOpen) {
            cleanupRecaptcha();
            setStep('phone');
            setPhone('');
            setOtp('');
            setError('');
            setIsRegistering(false);
            setIsEmailSignup(false);
            setIsEmailLogin(false);
            setShowPassword(false);
            setShowConfirmPassword(false);
        }
    }, [isOpen]);

    const setupRecaptcha = () => {
        cleanupRecaptcha();
        try {
            window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => { },
                'expired-callback': () => cleanupRecaptcha()
            });
        } catch (error) {
            console.error('Error creating recaptcha verifier:', error);
            cleanupRecaptcha();
        }
    };

    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();

        if (phone.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        const phoneNumber = `+91${phone}`;
        setError('');

        if (TEST_CREDENTIALS[phoneNumber]) {
            setIsTestNumber(true);
            setStep('otp');
            setConfirmationResult({ isTestMode: true });
            return;
        }

        setIsTestNumber(false);
        setLoading(true);

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifier;
            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setStep('otp');
            setLoading(false);
        } catch (err) {
            console.error('Error sending OTP:', err);
            setError(err.code === 'auth/too-many-requests' ? 'Too many attempts. Please try later.' : 'Failed to send OTP. Check your connection.');
            setLoading(false);
            cleanupRecaptcha();
        }
    };

    const handleRegisterDirectly = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!isEmailSignup && phone.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        if (isEmailSignup) {
            if (!formData.email.trim() || !formData.password.trim()) {
                setError('Please fill in both email and password');
                return;
            }
        } else {
            if (!formData.fullName.trim() || !formData.email.trim() || !formData.password.trim()) {
                setError('Please fill in all information');
                return;
            }
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            let idToken = null;
            let currentIsTest = false;

            try {
                // 1. Create user in Firebase with Email/Password
                const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
                const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                const user = userCredential.user;

                // Updated name
                await updateProfile(user, { displayName: formData.fullName });
                idToken = await user.getIdToken();
            } catch (fbErr) {
                console.warn('Firebase Auth Error:', fbErr);
                if (fbErr.code === 'auth/operation-not-allowed') {
                    console.log('Falling back to test mode registration...');
                    currentIsTest = true;
                } else {
                    throw fbErr;
                }
            }

            // 2. Register in our backend
            const response = await fetch('http://localhost:5000/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken,
                    isTest: currentIsTest,
                    fullName: formData.fullName || 'User',
                    email: formData.email,
                    phone: isEmailSignup ? null : `+91${phone}`,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (data.success) {
                const userData = {
                    uid: data.uid,
                    role: data.role,
                    phone: `+91${phone}`,
                    email: formData.email,
                    fullName: formData.fullName,
                    isDevMode: currentIsTest
                };
                localStorage.setItem('user', JSON.stringify(userData));
                window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));
                navigate('/');
                if (onSuccess) onSuccess(data);
                handleClose();
            } else {
                setError(data.message || 'Registration failed');
            }
        } catch (err) {
            console.error('Registration Error:', err);
            let msg = err.message || 'Registration failed.';
            if (err.code === 'auth/operation-not-allowed') {
                msg = 'Email/Password auth is not enabled in Firebase. Please enable it in Firebase Console -> Authentication -> Sign-in method.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOrRegister = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const phoneNumber = `+91${phone}`;
            let idToken = null;

            if (!isTestNumber || !confirmationResult?.isTestMode) {
                const result = await confirmationResult.confirm(otp);
                idToken = await result.user.getIdToken();
            }

            const endpoint = isRegistering ? 'http://localhost:5000/auth/register' :
                (isTestNumber ? 'http://localhost:5000/auth/test-login' : 'http://localhost:5000/auth/login');

            const payload = isRegistering ? {
                idToken,
                phone: phoneNumber,
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password,
                isTest: isTestNumber,
                otp: isTestNumber ? otp : undefined
            } : (isTestNumber ? { phone: phoneNumber, otp } : { idToken });

            console.log('Sending payload to backend:', payload);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('Non-JSON response received:', text);
                throw new Error('Server error: Received invalid response from server.');
            }

            const data = await response.json();

            if (data.success) {
                const userData = { uid: data.uid, role: data.role, phone: phoneNumber, status: data.status, fullName: data.fullName };
                localStorage.setItem('user', JSON.stringify(userData));
                window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));

                if (isRegistering) {
                    navigate('/');
                } else if (data.role === 'ADMIN') {
                    navigate('/admin');
                } else if (data.role === 'SELLER' && data.status === 'APPROVED') {
                    navigate('/seller/dashboard');
                } else {
                    navigate('/');
                }

                if (onSuccess) onSuccess(data);
                handleClose();
            } else {
                setError(data.message || 'Verification failed');
            }
        } catch (err) {
            console.error('Error:', err);
            setError(err.message || 'Verification failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (isRegistering) {
            setIsEmailSignup(true);
        } else {
            setIsEmailLogin(true);
        }
        setError('');
    };

    const handleEmailLogin = async (e) => {
        if (e) e.preventDefault();
        setError('');

        if (!formData.email.trim() || !formData.password.trim()) {
            setError('Please fill in both email and password');
            return;
        }

        setLoading(true);

        try {
            let user;
            let currentIdToken = null;
            let isTestMode = false;

            try {
                const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
                user = userCredential.user;
                currentIdToken = await user.getIdToken();
            } catch (loginErr) {
                if (loginErr.code === 'auth/user-not-found' || loginErr.code === 'auth/invalid-credential') {
                    try {
                        // Try to register if login fails (User might be new)
                        console.log('User not found, attempting auto-registration...');
                        const { createUserWithEmailAndPassword } = await import('firebase/auth');
                        const registerCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
                        user = registerCredential.user;
                        currentIdToken = await user.getIdToken();
                    } catch (regErr) {
                        if (regErr.code === 'auth/operation-not-allowed') {
                            isTestMode = true;
                        } else {
                            throw regErr;
                        }
                    }
                } else if (loginErr.code === 'auth/operation-not-allowed') {
                    isTestMode = true;
                } else {
                    throw loginErr;
                }
            }

            // Sync with backend
            const response = await fetch('http://localhost:5000/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    idToken: currentIdToken,
                    isTest: isTestMode,
                    email: formData.email,
                    password: formData.password
                }),
            });

            const data = await response.json();

            if (data.success) {
                const userData = {
                    uid: data.uid,
                    role: data.role,
                    email: user?.email || formData.email,
                    fullName: data.fullName || user?.displayName || formData.email.split('@')[0],
                };
                localStorage.setItem('user', JSON.stringify(userData));
                window.dispatchEvent(new CustomEvent('userDataChanged', { detail: userData }));

                if (data.role === 'ADMIN') navigate('/admin');
                else if (data.role === 'SELLER' && data.status === 'APPROVED') navigate('/seller/dashboard');
                else navigate('/');

                if (onSuccess) onSuccess(data);
                handleClose();
            } else {
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            console.error('Email Auth Error:', err);
            let msg = err.message || 'Authentication failed.';
            if (err.code === 'auth/wrong-password') {
                msg = 'Incorrect password for this email.';
            } else if (err.code === 'auth/operation-not-allowed') {
                msg = 'Email/Password auth is not enabled in Firebase Console.';
            } else if (err.code === 'auth/weak-password') {
                msg = 'Password is too weak. Please use at least 6 characters.';
            } else if (err.code === 'auth/email-already-in-use') {
                msg = 'Email already in use. Please check your password.';
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };


    const handleClose = () => {
        setStep('phone');
        setPhone('');
        setOtp('');
        setError('');
        setConfirmationResult(null);
        setIsTestNumber(false);
        setIsRegistering(false);
        setIsEmailSignup(false);
        setFormData({ fullName: '', email: '', password: '', confirmPassword: '', agreedToTerms: false, agreedToPrivacy: false });
        cleanupRecaptcha();
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="auth-modal-overlay" onClick={handleClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="auth-modal-content"
                    style={{ width: '100%', maxWidth: isRegistering && step === 'phone' ? '500px' : '400px' }}
                    onClick={e => e.stopPropagation()}
                >
                    <button className="auth-close-btn" onClick={handleClose}><X size={20} /></button>

                    <div className="auth-header">
                        <div className="auth-icon-container">
                            {isEmailSignup || isEmailLogin ? <Mail color="white" size={24} /> : (step === 'phone' ? <UserIcon color="white" size={24} /> : <ShieldCheck color="white" size={24} />)}
                        </div>
                        <h2>{isEmailLogin ? 'Login with ' : (isEmailSignup ? 'Register with ' : (step === 'phone' ? (isRegistering ? 'Create ' : 'Welcome to ') : 'Verify '))} <span className="gradient-text">{isEmailSignup || isEmailLogin ? 'Email' : 'SELLSATHI'}</span></h2>
                        <p>{isEmailLogin ? 'Enter your credentials to login' : (isEmailSignup ? 'Create an account using your email' : (step === 'phone' ? (isRegistering ? 'Fill in your details to get started' : 'Login to your account') : `OTP sent to +91 ${phone}`))}</p>
                    </div>

                    {error && <div className="auth-error-msg">{error}</div>}

                    {isEmailLogin ? (
                        <form onSubmit={handleEmailLogin} className="auth-form">
                            <div className="auth-fields-grid">
                                <div className="auth-input-group">
                                    <Mail size={18} className="auth-field-icon" />
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="auth-input-group">
                                    <Lock size={18} className="auth-field-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    {loading ? 'Logging in...' : 'Login with Email'}
                                </button>
                                <div className="auth-form-footer">
                                    <p>Don't have an account? <button type="button" onClick={() => { setIsEmailLogin(false); setIsRegistering(true); }}>Register</button></p>
                                    <button type="button" className="auth-back-link" onClick={() => setIsEmailLogin(false)}>Back to Phone Login</button>
                                </div>
                            </div>
                        </form>
                    ) : isEmailSignup ? (
                        <form onSubmit={handleRegisterDirectly} className="auth-form">
                            <div className="auth-fields-grid">
                                <div className="auth-input-group">
                                    <UserIcon size={18} className="auth-field-icon" />
                                    <input
                                        type="text"
                                        placeholder="Full Name"
                                        value={formData.fullName}
                                        onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="auth-input-group">
                                    <Mail size={18} className="auth-field-icon" />
                                    <input
                                        type="email"
                                        placeholder="Email Address"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="auth-input-group">
                                    <Lock size={18} className="auth-field-icon" />
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="auth-input-group">
                                    <Lock size={18} className="auth-field-icon" />
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm Password"
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <button type="submit" className="auth-submit-btn" disabled={loading}>
                                    {loading ? 'Registering...' : 'Register with Email'}
                                </button>
                                <div className="auth-form-footer">
                                    <p>Already have an account? <button type="button" onClick={() => { setIsEmailSignup(false); setIsEmailLogin(true); }}>Login</button></p>
                                    <button type="button" className="auth-back-link" onClick={() => setIsEmailSignup(false)}>Back to Phone Login</button>
                                </div>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={step === 'phone' ? (isRegistering ? handleRegisterDirectly : handleSendOTP) : handleVerifyOrRegister} className="auth-form">
                            {step === 'phone' ? (
                                <div className="auth-fields-grid">
                                    {isRegistering && (
                                        <>
                                            <div className="auth-input-group">
                                                <UserIcon size={18} className="auth-field-icon" />
                                                <input
                                                    type="text"
                                                    placeholder="Full Name"
                                                    value={formData.fullName}
                                                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                                                    required
                                                />
                                            </div>
                                            <div className="auth-input-group">
                                                <Mail size={18} className="auth-field-icon" />
                                                <input
                                                    type="email"
                                                    placeholder="Email Address"
                                                    value={formData.email}
                                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                    required
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="auth-input-group">
                                        <Phone size={18} className="auth-field-icon" />
                                        <div className="phone-input-wrapper">
                                            <span className="country-code">+91</span>
                                            <input
                                                type="tel"
                                                placeholder="Mobile Number"
                                                value={phone}
                                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                required
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>

                                    {isRegistering && (
                                        <>
                                            <div className="auth-input-group">
                                                <Lock size={18} className="auth-field-icon" />
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="Password"
                                                    value={formData.password}
                                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle-btn"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                            <div className="auth-input-group">
                                                <Lock size={18} className="auth-field-icon" />
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Confirm Password"
                                                    value={formData.confirmPassword}
                                                    onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="password-toggle-btn"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    <button type="submit" className="auth-submit-btn" disabled={phone.length < 10 || loading}>
                                        {loading ? 'Processing...' : (isRegistering ? 'Register' : 'Get OTP')}
                                    </button>
                                </div>
                            ) : (
                                <div className="auth-fields-grid">
                                    <div className="otp-input-container">
                                        <input
                                            type="text"
                                            placeholder="0 0 0 0 0 0"
                                            value={otp}
                                            onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                    <button type="submit" className="auth-submit-btn" disabled={otp.length < 6 || loading}>
                                        {loading ? 'Verifying...' : (isRegistering ? 'Complete Registration' : 'Login')} <ArrowRight size={18} />
                                    </button>
                                    <button type="button" className="auth-back-link" onClick={() => setStep('phone')}>Change Phone Number</button>
                                </div>
                            )}
                        </form>
                    )}

                    {step === 'phone' && !isEmailLogin && !isEmailSignup && (
                        <>
                            <div className="auth-divider">
                                <span>OR</span>
                            </div>

                            <button
                                type="button"
                                className="auth-google-btn"
                                onClick={handleGoogleSignIn}
                                disabled={loading}
                            >
                                <svg viewBox="0 0 24 24" width="20" height="20">
                                    <path
                                        fill="#4285F4"
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    />
                                    <path
                                        fill="#34A853"
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    />
                                    <path
                                        fill="#FBBC05"
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    />
                                    <path
                                        fill="#EA4335"
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    />
                                </svg>
                                Continue with Google
                            </button>
                        </>
                    )}

                    <div id="recaptcha-container"></div>

                    {step === 'phone' && !isEmailSignup && !isEmailLogin && (
                        <div className="auth-toggle">
                            {isRegistering ? (
                                <p>Already have an account? <button onClick={() => setIsRegistering(false)}>Login</button></p>
                            ) : (
                                <>
                                    <p>New User? <button onClick={() => setIsRegistering(true)}>Register</button></p>
                                </>
                            )}
                        </div>
                    )}
                </motion.div>
            </div>
            <style>{modalStyles}</style>
        </AnimatePresence>
    );
}

const modalStyles = `
.auth-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 3000;
    padding: 1.5rem;
}

/* Hide native browser password reveal icon */
input::-ms-reveal,
input::-ms-clear,
input::-webkit-contacts-auto-fill-button,
input::-webkit-credentials-auto-fill-button {
    display: none !important;
}

.auth-modal-content {
    background: var(--background);
    border: 1px solid var(--border);
    border-radius: 24px;
    padding: 2.5rem;
    position: relative;
    box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}

.auth-close-btn {
    position: absolute;
    top: 1.25rem;
    right: 1.25rem;
    background: rgba(var(--primary-rgb), 0.1);
    color: var(--primary);
    border: none;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    z-index: 10;
}

.auth-close-btn:hover {
    background: #ef4444;
    color: white;
    transform: rotate(90deg);
}

.auth-header {
    text-align: center;
    margin-bottom: 2rem;
}

.auth-icon-container {
    width: 56px;
    height: 56px;
    border-radius: 14px;
    background: var(--primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 1.25rem;
    box-shadow: 0 8px 16px rgba(var(--primary-rgb), 0.2);
}

.auth-header h2 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
}

.auth-header p {
    color: var(--text-muted);
    font-size: 0.9rem;
}

.auth-error-msg {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    padding: 0.75rem;
    border-radius: 12px;
    margin-bottom: 1.5rem;
    font-size: 0.85rem;
    text-align: center;
}

.auth-fields-grid {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.auth-input-group {
    position: relative;
    display: flex;
    align-items: center;
}

.auth-field-icon {
    position: absolute;
    left: 1rem;
    opacity: 0.5;
}

.auth-input-group input {
    width: 100%;
    padding: 0.8rem 1rem 0.8rem 3rem;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface);
    transition: all 0.2s;
}

.auth-form-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    margin-top: 1rem;
}

.auth-form-footer p {
    font-size: 0.85rem;
    color: var(--text-muted);
}

.auth-form-footer p button {
    background: none;
    border: none;
    color: var(--primary);
    font-weight: 600;
    cursor: pointer;
    padding: 0 4px;
}

.auth-form-footer p button:hover {
    text-decoration: underline;
}

.auth-back-link {
    background: none;
    border: none;
    color: var(--text-muted);
    font-size: 0.85rem;
    cursor: pointer;
    transition: color 0.2s;
}

.phone-input-wrapper {
    display: flex;
    align-items: center;
    width: 100%;
}

.country-code {
    position: absolute;
    left: 3rem;
    font-weight: 600;
    color: var(--primary);
}

.phone-input-wrapper input {
    padding-left: 5.5rem;
}

.auth-submit-btn {
    margin-top: 1rem;
    background: var(--primary);
    color: white;
    padding: 1rem;
    border-radius: 12px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: none;
    cursor: pointer;
}

.auth-submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.otp-input-container input {
    width: 100%;
    text-align: center;
    letter-spacing: 0.5rem;
    font-size: 1.5rem;
    font-weight: bold;
    padding: 1rem;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: var(--surface);
}

.auth-back-link {
    background: none;
    border: none;
    color: var(--primary);
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
}

.auth-toggle {
    margin-top: 1.5rem;
    text-align: center;
    font-size: 0.9rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--border);
}

.auth-toggle button {
    background: none;
    border: none;
    color: var(--primary);
    font-weight: 700;
    cursor: pointer;
}

.auth-divider {
    display: flex;
    align-items: center;
    margin: 1.5rem 0;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
}

.auth-divider::before,
.auth-divider::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border);
}

.auth-divider span {
    padding: 0 1rem;
}

.auth-google-btn {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    padding: 0.8rem;
    background: white;
    border: 1px solid #dadce0;
    border-radius: 12px;
    color: #3c4043;
    font-weight: 600;
    font-size: 0.95rem;
    cursor: pointer;
    transition: all 0.2s;
}

.auth-google-btn:hover {
    background: #f8f9fa;
    border-color: #d2d4d7;
    box-shadow: 0 1px 2px 0 rgba(60,64,67,.30), 0 1px 3.1px rgba(60,64,67,.15);
}

.auth-google-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.dark .auth-google-btn {
    background: #1a1a1b;
    border-color: #3e3e40;
    color: #e8eaed;
}

.dark .auth-google-btn:hover {
    background: #232325;
}

.password-toggle-btn {
    position: absolute;
    right: 1rem;
    background: none;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-muted);
    opacity: 0.6;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.password-toggle-btn:hover {
    opacity: 1;
    color: var(--primary);
}

.auth-input-group input {
    padding-right: 3rem; /* Space for the eye icon */
}
`;
