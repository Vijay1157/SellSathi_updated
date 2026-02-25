import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, FileCheck, CheckCircle, Upload, ShieldCheck, ArrowRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../config/firebase';
import { authFetch } from '../../utils/api';

export default function SellerRegistration() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // User data
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(null); // 'NONE', 'PENDING', 'APPROVED'

    // Form data
    const [phone, setPhone] = useState('');
    const [shopName, setShopName] = useState('');
    const [category, setCategory] = useState('');
    const [address, setAddress] = useState('');
    const [fullName, setFullName] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [age, setAge] = useState('');
    const [aadhaarImageUrl, setAadhaarImageUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    // Fetch logged-in user and status on mount
    useEffect(() => {
        const checkStatus = async () => {
            const userData = localStorage.getItem('user');
            if (!userData) {
                navigate('/');
                return;
            }

            try {
                const parsedUser = JSON.parse(userData);
                setUser(parsedUser);
                setPhone(parsedUser.phone);

                // Check seller application status from backend
                const response = await authFetch(`/auth/user-status/${parsedUser.uid}`);
                const result = await response.json();
                if (result.success) {
                    // Backend returns sellerStatus (may be null if never applied)
                    const status = result.sellerStatus || result.status || 'NONE';
                    setStatus(status);
                    if (status === 'APPROVED') {
                        navigate('/seller/dashboard');
                    }
                    // If PENDING or NONE — stay on registration page
                } else {
                    setStatus('NONE');
                }
            } catch (err) {
                console.error('Error fetching status:', err);
                setStatus('NONE');

            }
        };

        checkStatus();
    }, [navigate]);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [step]);

    const handleAadhaarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsExtracting(true);
        setError('');

        const formData = new FormData();
        formData.append('aadharImage', file);

        try {
            const response = await authFetch('/auth/extract-aadhar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                setFullName(result.data.name || '');
                setAadhaarNumber(result.data.aadhaarNumber || '');
                setAge(result.data.age || '');
                setAddress(result.data.address || '');
                setAadhaarImageUrl(result.data.imageUrl || '');
                setStep(3); // Move to verification form
            } else {
                const detailedError = result.error ? ` (${result.error})` : '';
                setError((result.message || 'Extraction failed') + detailedError);
            }
        } catch (err) {
            console.error('Extraction error:', err);
            setError('Server connection failed. Make sure backend is running.');
        } finally {
            setIsExtracting(false);
        }
    };

    const handleVerifyPhone = (e) => {
        e.preventDefault();
        setStep(2);
    };

    const handleSubmitSellerApplication = async (e) => {
        e.preventDefault();

        if (!shopName || !category) {
            setError('Please fill in shop name and category');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Support both Firebase users (idToken) and test users (uid from localStorage)
            const firebaseUser = auth.currentUser;
            let payload = {};

            if (firebaseUser) {
                // Real Firebase user — use idToken
                const idToken = await firebaseUser.getIdToken();
                payload = { idToken };
            } else {
                // Test user (phone OTP login) — send uid directly
                const parsedUser = user; // already set from localStorage on mount
                if (!parsedUser?.uid) {
                    setError('Session expired. Please login again.');
                    setLoading(false);
                    return;
                }
                payload = { uid: parsedUser.uid };
            }

            const response = await authFetch('/auth/apply-seller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    sellerDetails: {
                        phone,
                        shopName,
                        category,
                        address,
                        fullName,
                        aadhaarNumber,
                        age,
                        aadhaarImageUrl,
                        extractedName: fullName
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess('Application submitted successfully! Your account is now under review.');
                setStatus('PENDING');
                setTimeout(() => {
                    navigate('/');
                }, 3000);
            } else {
                setError(result.message || 'Failed to submit application');
            }
        } catch (err) {
            console.error('Submit error:', err);
            setError('Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { title: 'Phone', icon: <Phone size={20} /> },
        { title: 'Upload', icon: <Upload size={20} /> },
        { title: 'Confirm', icon: <FileCheck size={20} /> }
    ];

    if (!user || status === null) return <div className="container" style={{ padding: '8rem 0', textAlign: 'center' }}><Loader className="animate-spin inline-block mr-2" /> Loading profile...</div>;

    if (status === 'PENDING') {
        return (
            <div className="container" style={{ maxWidth: '600px', padding: '10rem 0' }}>
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card text-center flex flex-col items-center gap-6" style={{ padding: '4rem' }}>
                    <div style={{ padding: '2rem', borderRadius: '50%', background: 'rgba(234, 179, 8, 0.1)', color: 'var(--warning)' }}>
                        <ShieldCheck size={64} />
                    </div>
                    <div>
                        <h2 className="text-3xl mb-2">Application Under Review</h2>
                        <p className="text-muted">Your seller account request is being verified by our admin team. This usually takes 24-48 hours.</p>
                    </div>
                    <button className="btn btn-primary px-8" onClick={() => navigate('/')}>Back to Home</button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '800px', padding: '4rem 0' }}>
            <div className="text-center" style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Become a <span className="gradient-text">Seller</span></h1>
                <p className="text-muted">Fast & Secure Aadhaar-based verification</p>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-center" style={{ marginBottom: '4rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
                {steps.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-2" style={{ zIndex: 1, position: 'relative' }}>
                        <div style={{
                            width: '40px', height: '40px', borderRadius: '50%',
                            background: step > i + 1 ? 'var(--primary)' : step === i + 1 ? 'var(--surface)' : 'var(--background)',
                            border: `2px solid ${step >= i + 1 ? 'var(--primary)' : 'var(--border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.3s ease',
                            color: step > i + 1 ? 'white' : step === i + 1 ? 'var(--primary)' : 'inherit'
                        }}>
                            {step > i + 1 ? <CheckCircle size={20} /> : s.icon}
                        </div>
                        <span style={{ fontSize: '0.75rem', color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: step === i + 1 ? 600 : 400 }}>{s.title}</span>
                    </div>
                ))}
            </div>

            {error && (
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card mb-6"
                    style={{ color: '#ef4444', borderColor: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <ShieldCheck size={20} />
                    <span>{error}</span>
                </motion.div>
            )}

            {success && (
                <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="glass-card mb-6"
                    style={{ color: '#22c55e', borderColor: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle size={20} />
                    <span>{success}</span>
                </motion.div>
            )}

            <div className="glass-card overflow-hidden" style={{ padding: '0' }}>
                <AnimatePresence mode="wait">
                    {step === 1 && (
                        <motion.div key="s1" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8" style={{ padding: '3rem' }}>
                            <div className="text-center">
                                <h3 className="text-2xl mb-2">Verify Phone Number</h3>
                                <p className="text-muted">We will use this number for your shop communications.</p>
                            </div>
                            <div style={{ background: 'var(--surface)', padding: '2.5rem', borderRadius: '1.5rem', textAlign: 'center', border: '1px solid var(--border)' }}>
                                <small className="text-muted block mb-2 uppercase tracking-widest">Registered Number</small>
                                <h1 className="gradient-text" style={{ fontSize: '3rem', fontWeight: 800 }}>{phone}</h1>
                            </div>
                            <button onClick={handleVerifyPhone} className="btn btn-primary w-full py-5 text-lg font-bold flex items-center justify-center gap-2 shadow-lg">
                                Next Step <ArrowRight size={20} />
                            </button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div key="s2" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8" style={{ padding: '3rem' }}>
                            <div className="text-center">
                                <h3 className="text-2xl mb-2">Aadhaar Verification</h3>
                                <p className="text-muted">Securely extract your details using AI from your Aadhaar card.</p>
                            </div>
                            <label className={`flex flex-col items-center justify-center gap-6 p-16 cursor-pointer border-2 border-dashed transition-all ${isExtracting ? 'opacity-50 pointer-events-none' : 'hover:border-primary hover:bg-[hsla(var(--primary-hsl),0.02)]'}`}
                                style={{ borderRadius: '1.5rem', borderColor: 'var(--border)', background: 'hsla(var(--primary-hsl), 0.05)' }}>
                                {isExtracting ? <Loader className="animate-spin text-primary" size={64} /> : <Upload size={64} className="text-primary" />}
                                <div className="text-center">
                                    <h4 className="text-xl mb-1">{isExtracting ? 'Processing with AI...' : 'Click to Upload Aadhaar'}</h4>
                                    <p className="text-muted">Front side. High quality image for better accuracy.</p>
                                </div>
                                <input type="file" hidden onChange={handleAadhaarUpload} accept="image/*" disabled={isExtracting} />
                            </label>

                            <div className="flex items-center gap-3 p-4 glass-card" style={{ background: 'var(--surface)', borderRadius: '1rem' }}>
                                <ShieldCheck className="text-primary" size={24} />
                                <p className="text-xs text-muted">Your data is processed securely and only used for seller verification purposes.</p>
                            </div>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div key="s3" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8" style={{ padding: '3rem' }}>
                            <div className="text-center">
                                <h3 className="text-2xl mb-2">Review & Submit</h3>
                                <p className="text-muted">Check your details and provide shop information below.</p>
                            </div>

                            <form onSubmit={handleSubmitSellerApplication} className="flex flex-col gap-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Full Name *</label>
                                        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="py-3 px-4 border-primary focus:ring-2 ring-primary" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted">Phone Number</label>
                                        <input type="text" value={phone} onChange={e => setPhone(e.target.value)} className="py-3 px-4" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted">Aadhaar Number (Locked)</label>
                                        <div className="relative">
                                            <input type="text" value={aadhaarNumber} readOnly className="py-3 px-4 w-full" style={{ background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                                            <ShieldCheck size={16} className="absolute right-4 top-4 text-muted" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted">Age (Locked)</label>
                                        <input type="text" value={age} readOnly className="py-3 px-4" style={{ background: 'var(--surface)', color: 'var(--text-muted)', cursor: 'not-allowed' }} />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Shop Address (Required) *</label>
                                    <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className="py-3 px-4 border-primary focus:ring-2 ring-primary" placeholder="Enter your full shop address" />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Shop Name *</label>
                                        <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. Rahul's Gadgets" className="py-3 px-4 border-primary focus:ring-2 ring-primary" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Shop Category *</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className="py-3 px-4 border-primary">
                                            <option value="">Select Category</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Fashion">Fashion</option>
                                            <option value="Home & Living">Home & Living</option>
                                            <option value="Books">Books</option>
                                            <option value="Groceries">Groceries</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ height: '200px', borderRadius: '1rem', overflow: 'hidden', border: '1px solid var(--border)', position: 'relative' }}>
                                    <img src={aadhaarImageUrl} alt="Aadhaar Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
                                        <p className="text-white text-xs font-bold">Aadhaar Card Preview</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <button type="button" onClick={() => setStep(2)} className="btn btn-secondary flex-1 py-4 font-bold">Retake Photo</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-4 font-bold shadow-xl">
                                        {loading ? <Loader className="animate-spin" /> : 'Apply for Seller Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
