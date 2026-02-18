import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, ShieldCheck, ArrowRight, Store } from 'lucide-react';
import { auth } from '../../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';

export default function SellerAuthModal({ isOpen, onClose, onSuccess }) {
    const [step, setStep] = useState('phone'); // 'phone', 'otp', or 'details'
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [confirmationResult, setConfirmationResult] = useState(null);
    const [sellerDetails, setSellerDetails] = useState({
        shopName: '',
        category: '',
        address: '',
        gstNumber: ''
    });

    // Get current user's phone from localStorage
    const getCurrentUserPhone = () => {
        const user = localStorage.getItem('user');
        if (user) {
            const userData = JSON.parse(user);
            return userData.phone || '';
        }
        return '';
    };

    // Cleanup function for reCAPTCHA
    const cleanupRecaptcha = () => {
        if (window.recaptchaVerifierSeller) {
            try {
                window.recaptchaVerifierSeller.clear();
            } catch (e) {
                console.log('Recaptcha clear error:', e);
            }
            window.recaptchaVerifierSeller = null;
        }
    };

    // Cleanup on unmount or when modal closes
    useEffect(() => {
        return () => cleanupRecaptcha();
    }, []);

    // Also cleanup when isOpen changes to false
    useEffect(() => {
        if (!isOpen) {
            cleanupRecaptcha();
        }
    }, [isOpen]);

    // Initialize reCAPTCHA
    const setupRecaptcha = () => {
        cleanupRecaptcha();

        try {
            window.recaptchaVerifierSeller = new RecaptchaVerifier(auth, 'recaptcha-container-seller', {
                'size': 'invisible',
                'callback': (response) => {
                    // reCAPTCHA solved
                },
                'expired-callback': () => {
                    cleanupRecaptcha();
                }
            });
        } catch (error) {
            console.error('Error creating recaptcha verifier:', error);
            cleanupRecaptcha();
        }
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        if (phone.length < 10) {
            setError('Please enter a valid 10-digit phone number');
            return;
        }

        // Check if phone matches the logged-in user's phone
        const currentUserPhone = getCurrentUserPhone();
        if (currentUserPhone && phone !== currentUserPhone) {
            setError('Phone number doesn\'t match. Please use the same phone number you used for customer login.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            setupRecaptcha();
            const appVerifier = window.recaptchaVerifierSeller;
            const phoneNumber = `+91${phone}`;

            const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
            setConfirmationResult(confirmation);
            setStep('otp');
            setLoading(false);
        } catch (err) {
            console.error('Error sending OTP:', err);
            setError('Failed to send OTP. Please try again.');
            setLoading(false);

            // Reset reCAPTCHA
            cleanupRecaptcha();
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) {
            setError('Please enter a valid 6-digit OTP');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Verify OTP with Firebase
            const result = await confirmationResult.confirm(otp);
            const user = result.user;

            // Move to seller details form
            setStep('details');
            setLoading(false);
        } catch (err) {
            console.error('Error verifying OTP:', err);
            setError('Invalid OTP. Please try again.');
            setLoading(false);
        }
    };

    const handleSubmitSellerApplication = async (e) => {
        e.preventDefault();

        if (!sellerDetails.shopName || !sellerDetails.category || !sellerDetails.address) {
            setError('Please fill in all required fields');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const user = auth.currentUser;
            const idToken = await user.getIdToken();

            // Submit seller application to backend
            const response = await fetch('http://localhost:5000/auth/apply-seller', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    idToken,
                    sellerDetails: {
                        ...sellerDetails,
                        phone: phone
                    }
                }),
            });

            const data = await response.json();

            if (data.success) {
                alert('Seller application submitted successfully! Please wait for admin approval.');

                // Update localStorage
                const userData = JSON.parse(localStorage.getItem('user') || '{}');
                userData.sellerStatus = 'PENDING';
                localStorage.setItem('user', JSON.stringify(userData));

                if (onSuccess) {
                    onSuccess(data);
                }
                handleClose();
            } else {
                setError(data.message || 'Failed to submit application');
            }

            setLoading(false);
        } catch (err) {
            console.error('Error submitting seller application:', err);
            setError('Failed to submit application. Please try again.');
            setLoading(false);
        }
    };

    const handleClose = () => {
        setStep('phone');
        setPhone('');
        setOtp('');
        setError('');
        setConfirmationResult(null);
        cleanupRecaptcha();
        setSellerDetails({
            shopName: '',
            category: '',
            address: '',
            gstNumber: ''
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2000,
                padding: '1.5rem',
                overflowY: 'auto'
            }} onClick={handleClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="glass-card"
                    style={{
                        width: '100%',
                        maxWidth: '500px',
                        background: 'var(--background)',
                        position: 'relative',
                        padding: '2.5rem',
                        margin: '2rem auto'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <button
                        onClick={handleClose}
                        style={{ position: 'absolute', top: '1rem', right: '1rem', opacity: 0.5 }}
                    >
                        <X size={20} />
                    </button>

                    <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                        <div style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '50%',
                            background: 'hsla(230, 85%, 60%, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 1rem'
                        }}>
                            {step === 'phone' ? <Phone color="var(--primary)" /> :
                                step === 'otp' ? <ShieldCheck color="var(--primary)" /> :
                                    <Store color="var(--primary)" />}
                        </div>
                        <h2 style={{ fontSize: '1.5rem' }}>
                            {step === 'phone' ? 'Become a ' :
                                step === 'otp' ? 'Verify ' :
                                    'Seller '}
                            <span className="gradient-text">
                                {step === 'phone' ? 'Seller' :
                                    step === 'otp' ? 'OTP' :
                                        'Details'}
                            </span>
                        </h2>
                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>
                            {step === 'phone' ? 'Enter the same phone number you used for customer login' :
                                step === 'otp' ? `Enter the 6-digit OTP sent to +91${phone}` :
                                    'Provide your shop details for verification'}
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '0.75rem',
                            marginBottom: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '0.5rem',
                            color: '#ef4444',
                            fontSize: '0.875rem',
                            textAlign: 'center'
                        }}>
                            {error}
                        </div>
                    )}

                    {step === 'phone' && (
                        <form onSubmit={handleSendOTP}>
                            <div className="flex flex-col gap-4">
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: '600', opacity: 0.7 }}>+91</span>
                                    <input
                                        type="tel"
                                        placeholder="Mobile Number"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                        style={{ paddingLeft: '3.5rem', width: '100%' }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '1rem' }}
                                    disabled={phone.length < 10 || loading}
                                >
                                    {loading ? 'Sending...' : 'Get OTP'}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'otp' && (
                        <form onSubmit={handleVerifyOTP}>
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    placeholder="Enter 6-digit OTP"
                                    value={otp}
                                    onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    style={{ textAlign: 'center', letterSpacing: '0.5rem', fontSize: '1.25rem', fontWeight: 'bold', width: '100%' }}
                                    required
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '1rem' }}
                                    disabled={otp.length < 6 || loading}
                                >
                                    {loading ? 'Verifying...' : 'Continue'} {!loading && <ArrowRight size={18} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStep('phone');
                                        setOtp('');
                                        setError('');
                                    }}
                                    style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: '600' }}
                                    disabled={loading}
                                >
                                    Change Number
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 'details' && (
                        <form onSubmit={handleSubmitSellerApplication}>
                            <div className="flex flex-col gap-4">
                                <input
                                    type="text"
                                    placeholder="Shop Name *"
                                    value={sellerDetails.shopName}
                                    onChange={e => setSellerDetails({ ...sellerDetails, shopName: e.target.value })}
                                    style={{ width: '100%' }}
                                    required
                                    disabled={loading}
                                />
                                <select
                                    value={sellerDetails.category}
                                    onChange={e => setSellerDetails({ ...sellerDetails, category: e.target.value })}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)' }}
                                    required
                                    disabled={loading}
                                >
                                    <option value="">Select Category *</option>
                                    <option value="Electronics">Electronics</option>
                                    <option value="Fashion">Fashion</option>
                                    <option value="Home & Kitchen">Home & Kitchen</option>
                                    <option value="Handicrafts">Handicrafts</option>
                                    <option value="Food & Beverages">Food & Beverages</option>
                                    <option value="Beauty & Personal Care">Beauty & Personal Care</option>
                                    <option value="Sports & Fitness">Sports & Fitness</option>
                                    <option value="Books & Stationery">Books & Stationery</option>
                                    <option value="Others">Others</option>
                                </select>
                                <textarea
                                    placeholder="Shop Address *"
                                    value={sellerDetails.address}
                                    onChange={e => setSellerDetails({ ...sellerDetails, address: e.target.value })}
                                    style={{ width: '100%', minHeight: '80px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border)', background: 'var(--surface)', resize: 'vertical' }}
                                    required
                                    disabled={loading}
                                />
                                <input
                                    type="text"
                                    placeholder="GST Number (Optional)"
                                    value={sellerDetails.gstNumber}
                                    onChange={e => setSellerDetails({ ...sellerDetails, gstNumber: e.target.value })}
                                    style={{ width: '100%' }}
                                    disabled={loading}
                                />
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '1rem' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Submitting...' : 'Submit Application'} {!loading && <ArrowRight size={18} />}
                                </button>
                            </div>
                        </form>
                    )}

                    <div id="recaptcha-container-seller"></div>

                    <p style={{ marginTop: '2rem', fontSize: '0.75rem', textAlign: 'center' }} className="text-muted">
                        Your application will be reviewed by our admin team within 24-48 hours.
                    </p>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
