import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, FileCheck, CheckCircle, Upload, ShieldCheck, ArrowRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '@/modules/shared/config/firebase';
import { authFetch } from '@/modules/shared/utils/api';
import SellerLandingBanner from '@/modules/seller/components/SellerLandingBanner';
import ManualSellerRegistration from '@/modules/seller/components/ManualSellerRegistration';

export default function SellerRegistration() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showManualRegistration, setShowManualRegistration] = useState(false);

    // User data
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(null); // 'NONE', 'PENDING', 'APPROVED'

    // Form data - Step 1: Aadhaar + Shop Info
    const [phone, setPhone] = useState('');
    const [shopName, setShopName] = useState('');
    const [category, setCategory] = useState('');
    const [address, setAddress] = useState('');
    const [fullName, setFullName] = useState('');
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [age, setAge] = useState('');
    const [aadhaarImageUrl, setAadhaarImageUrl] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    // Form data - Step 2: Company Details
    const [companyName, setCompanyName] = useState('');
    const [companyEmail, setCompanyEmail] = useState('');
    const [companyAddress, setCompanyAddress] = useState('');
    const [panNumber, setPanNumber] = useState('');

    // Form data - Step 3: Pickup Address
    const [pickupAddress1, setPickupAddress1] = useState('');
    const [pickupAddress2, setPickupAddress2] = useState('');
    const [pickupCity, setPickupCity] = useState('');
    const [pickupState, setPickupState] = useState('');
    const [pickupPincode, setPickupPincode] = useState('');

    // Validation errors state
    const [errors, setErrors] = useState({
        shopAddress: '',
        shopName: '',
        shopCategory: '',
        companyName: '',
        companyEmail: '',
        panNumber: '',
        pickupAddress1: '',
        city: '',
        state: '',
        pincode: ''
    });

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
        { title: 'Shop', icon: <FileCheck size={20} /> },
        { title: 'Company', icon: <FileCheck size={20} /> },
        { title: 'Pickup', icon: <FileCheck size={20} /> },
        { title: 'Submit', icon: <CheckCircle size={20} /> }
    ];

    const handleNext = () => {
        if (!validateStep()) {
            return;
        }
        if (step < 6) setStep(step + 1);
    };

    const validateStep = () => {
        let newErrors = { ...errors };
        let isValid = true;

        // Clear previous errors
        Object.keys(newErrors).forEach(key => {
            newErrors[key] = '';
        });

        if (step === 3) {
            // Shop Details validation
            if (!address.trim()) {
                newErrors.shopAddress = 'Shop Address is required';
                isValid = false;
            }
            if (!shopName.trim()) {
                newErrors.shopName = 'Shop Name is required';
                isValid = false;
            }
            if (!category.trim()) {
                newErrors.shopCategory = 'Shop Category is required';
                isValid = false;
            }
        } else if (step === 4) {
            // Company Details validation
            if (!companyName.trim()) {
                newErrors.companyName = 'Company Name is required';
                isValid = false;
            }
            if (!companyEmail.trim()) {
                newErrors.companyEmail = 'Company Email is required';
                isValid = false;
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyEmail)) {
                newErrors.companyEmail = 'Please enter a valid email address';
                isValid = false;
            }
            if (!companyAddress.trim()) {
                newErrors.companyAddress = 'Company Address is required';
                isValid = false;
            }
            if (!panNumber.trim()) {
                newErrors.panNumber = 'PAN Card Number is required';
                isValid = false;
            }
        } else if (step === 5) {
            // Pickup Address validation
            if (!pickupAddress1.trim()) {
                newErrors.pickupAddress1 = 'Pickup Address Line 1 is required';
                isValid = false;
            }
            if (!pickupCity.trim()) {
                newErrors.city = 'City is required';
                isValid = false;
            }
            if (!pickupState.trim()) {
                newErrors.state = 'State is required';
                isValid = false;
            }
            if (!pickupPincode.trim()) {
                newErrors.pincode = 'Pincode is required';
                isValid = false;
            } else if (!/^\d{6}$/.test(pickupPincode)) {
                newErrors.pincode = 'Pincode must be 6 digits';
                isValid = false;
            }
        }

        setErrors(newErrors);

        if (!isValid) {
            setError('Please fill all required fields');
        } else {
            setError('');
        }

        return isValid;
    };

    const handleBack = () => {
        if (step > 1) setStep(step - 1);
    };

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
        <>
            {/* Show Manual Registration if activated */}
            {showManualRegistration ? (
                <ManualSellerRegistration onClose={() => setShowManualRegistration(false)} />
            ) : (
                <>
                    {/* Seller Landing Banner */}
                    <SellerLandingBanner />
                    
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
                                <h3 className="text-2xl mb-2">Shop Information</h3>
                                <p className="text-muted">Provide your shop details below.</p>
                            </div>

                            <div className="flex flex-col gap-6">
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
                                    <textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} className={`py-3 px-4 ${errors.shopAddress ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} placeholder="Enter your full shop address" />
                                    {errors.shopAddress && <span className="text-red-500 text-sm mt-1">{errors.shopAddress}</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Shop Name *</label>
                                        <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="e.g. Rahul's Gadgets" className={`py-3 px-4 ${errors.shopName ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} />
                                        {errors.shopName && <span className="text-red-500 text-sm mt-1">{errors.shopName}</span>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Shop Category *</label>
                                        <select value={category} onChange={e => setCategory(e.target.value)} className={`py-3 px-4 ${errors.shopCategory ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary'}`}>
                                            <option value="">Select Category</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Fashion">Fashion</option>
                                            <option value="Home & Living">Home & Living</option>
                                            <option value="Books">Books</option>
                                            <option value="Groceries">Groceries</option>
                                            <option value="Other">Other</option>
                                        </select>
                                        {errors.shopCategory && <span className="text-red-500 text-sm mt-1">{errors.shopCategory}</span>}
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
                                    <button type="button" onClick={handleNext} className="btn btn-primary flex-1 py-4 font-bold shadow-xl">
                                        Next <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 4 && (
                        <motion.div key="s4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8" style={{ padding: '3rem' }}>
                            <div className="text-center">
                                <h3 className="text-2xl mb-2">Company Details</h3>
                                <p className="text-muted">Provide your company information below.</p>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Company Name *</label>
                                    <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Enter your company name" className={`py-3 px-4 ${errors.companyName ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} />
                                    {errors.companyName && <span className="text-red-500 text-sm mt-1">{errors.companyName}</span>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Company Email ID *</label>
                                    <input type="email" value={companyEmail} onChange={e => setCompanyEmail(e.target.value)} placeholder="company@example.com" className={`py-3 px-4 ${errors.companyEmail ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} />
                                    {errors.companyEmail && <span className="text-red-500 text-sm mt-1">{errors.companyEmail}</span>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Company Address *</label>
                                    <textarea value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} rows={2} className={`py-3 px-4 ${errors.companyAddress ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} placeholder="Enter your company address" />
                                    {errors.companyAddress && <span className="text-red-500 text-sm mt-1">{errors.companyAddress}</span>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">PAN Card Number *</label>
                                    <input type="text" value={panNumber} onChange={e => setPanNumber(e.target.value)} placeholder="Enter PAN number" className={`py-3 px-4 ${errors.panNumber ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} maxLength={10} />
                                    {errors.panNumber && <span className="text-red-500 text-sm mt-1">{errors.panNumber}</span>}
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <button type="button" onClick={handleBack} className="btn btn-secondary flex-1 py-4 font-bold">Go Back</button>
                                    <button type="button" onClick={handleNext} className="btn btn-primary flex-1 py-4 font-bold shadow-xl">
                                        Next <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 5 && (
                        <motion.div key="s5" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8" style={{ padding: '3rem' }}>
                            <div className="text-center">
                                <h3 className="text-2xl mb-2">Pickup Address Details</h3>
                                <p className="text-muted">Provide your pickup address for order fulfillment.</p>
                            </div>

                            <div className="flex flex-col gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Pickup Address Line 1 *</label>
                                    <input type="text" value={pickupAddress1} onChange={e => setPickupAddress1(e.target.value)} placeholder="Street address" className={`py-3 px-4 ${errors.pickupAddress1 ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} />
                                    {errors.pickupAddress1 && <span className="text-red-500 text-sm mt-1">{errors.pickupAddress1}</span>}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-primary">Pickup Address Line 2</label>
                                    <input type="text" value={pickupAddress2} onChange={e => setPickupAddress2(e.target.value)} placeholder="Apartment, suite, etc." className="py-3 px-4 border-primary focus:ring-2 ring-primary" />
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">City *</label>
                                        <input type="text" value={pickupCity} onChange={e => setPickupCity(e.target.value)} placeholder="City" className={`py-3 px-4 ${errors.city ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} />
                                        {errors.city && <span className="text-red-500 text-sm mt-1">{errors.city}</span>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">State *</label>
                                        <input type="text" value={pickupState} onChange={e => setPickupState(e.target.value)} placeholder="State" className={`py-3 px-4 ${errors.state ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} />
                                        {errors.state && <span className="text-red-500 text-sm mt-1">{errors.state}</span>}
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <label className="text-xs font-bold uppercase tracking-wider text-primary">Pincode *</label>
                                        <input type="text" value={pickupPincode} onChange={e => setPickupPincode(e.target.value)} placeholder="Pincode" className={`py-3 px-4 ${errors.pincode ? 'border-red-500 focus:ring-2 ring-red-500' : 'border-primary focus:ring-2 ring-primary'}`} maxLength={6} />
                                        {errors.pincode && <span className="text-red-500 text-sm mt-1">{errors.pincode}</span>}
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <button type="button" onClick={handleBack} className="btn btn-secondary flex-1 py-4 font-bold">Go Back</button>
                                    <button type="button" onClick={handleNext} className="btn btn-primary flex-1 py-4 font-bold shadow-xl">
                                        Next <ArrowRight size={20} />
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {step === 6 && (
                        <motion.div key="s6" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }} transition={{ duration: 0.3 }} className="flex flex-col gap-8" style={{ padding: '3rem' }}>
                            <div className="text-center">
                                <h3 className="text-2xl mb-2">Final Step</h3>
                                <p className="text-muted">Review your information and submit your seller application.</p>
                            </div>

                            <form onSubmit={handleSubmitSellerApplication} className="flex flex-col gap-6">
                                <div className="glass-card" style={{ background: 'var(--surface)', padding: '2rem', borderRadius: '1rem' }}>
                                    <h4 className="font-bold mb-4">Summary of Information</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted">Shop Name:</span>
                                            <p className="font-semibold">{shopName}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted">Category:</span>
                                            <p className="font-semibold">{category}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted">Company Name:</span>
                                            <p className="font-semibold">{companyName}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted">PAN Number:</span>
                                            <p className="font-semibold">{panNumber}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-4">
                                    <button type="button" onClick={handleBack} className="btn btn-secondary flex-1 py-4 font-bold">Go Back</button>
                                    <button type="submit" disabled={loading} className="btn btn-primary flex-1 py-4 font-bold shadow-xl">
                                        {loading ? <Loader className="animate-spin" /> : 'Apply for Seller Account'}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Alternative Manual Registration Option */}
            <div className="text-center" style={{ marginTop: '3rem', marginBottom: '2rem' }}>
                <div className="flex items-center justify-center mb-6">
                    <div className="border-t border-gray-300 flex-grow"></div>
                    <span className="px-4 text-gray-500 font-medium">OR</span>
                    <div className="border-t border-gray-300 flex-grow"></div>
                </div>
                
                <button
                    onClick={() => setShowManualRegistration(true)}
                    className="btn btn-primary w-full py-5 text-lg font-bold flex items-center justify-center gap-2 shadow-lg"
                >
                    Enter Details Manually
                </button>
            </div>
        </div>
                </>
            )}
        </>
    );
}



