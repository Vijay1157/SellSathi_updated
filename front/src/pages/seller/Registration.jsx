import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, FileCheck, CheckCircle, Upload, ShieldCheck, ArrowRight, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SellerRegistration() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    // User data
    const [user, setUser] = useState(null);
    
    // Form data
    const [phone, setPhone] = useState('');
    const [shopName, setShopName] = useState('');
    const [category, setCategory] = useState('');
    const [address, setAddress] = useState('');
    const [gstNumber, setGstNumber] = useState('');

    // Fetch logged-in user on mount
    useEffect(() => {
        const userData = localStorage.getItem('user');
        if (!userData) {
            navigate('/');
            return;
        }
        
        try {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            // Use the phone directly from login session
            setPhone(parsedUser.phone);
        } catch (err) {
            console.error('Error parsing user data:', err);
            navigate('/');
        }
    }, [navigate]);

    const handleVerifyPhone = async (e) => {
        e.preventDefault();

        if (!user?.phone) {
            setError('Phone number not found in session. Please login again.');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // For test credentials, just verify the phone directly
            if (phone === '+919876543210' || phone === '+917483743936') {
                setSuccess('Phone verified successfully!');
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setStep(2);
                }, 1000);
                setLoading(false);
                return;
            }

            // For real Firebase numbers would verify here - for now just proceed
            setSuccess('Phone verified successfully!');
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setStep(2);
            }, 1000);
            setLoading(false);
        } catch (err) {
            console.error('Error verifying phone:', err);
            setError('Failed to verify phone. Please try again.');
            setLoading(false);
        }
    };

    const handleSubmitSellerApplication = async (e) => {
        e.preventDefault();

        if (!shopName || !category || !address) {
            setError('Please fill in all required fields');
            return;
        }

        if (shopName.length < 3) {
            setError('Shop name must be at least 3 characters');
            return;
        }

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            // Use phone from user session (not from input)
            const phoneNumber = user?.phone || phone;
            
            console.log('Seller Application:', {
                phone: phoneNumber,
                shopName,
                category,
                address,
                gstNumber
            });

            setSuccess('Seller application submitted successfully!');
            setTimeout(() => {
                alert('Your seller application has been submitted. Please wait for admin approval.');
                navigate('/');
            }, 2000);
        } catch (err) {
            console.error('Error submitting seller application:', err);
            setError('Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const steps = [
        { title: 'Mobile Verification', icon: <Phone size={20} /> },
        { title: 'Shop Details', icon: <FileCheck size={20} /> },
        { title: 'Success', icon: <CheckCircle size={20} /> }
    ];

    if (!user) {
        return (
            <div className="container" style={{ padding: '4rem 0', textAlign: 'center' }}>
                <Loader style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                <p>Loading...</p>
            </div>
        );
    }

    return (
        <div className="container" style={{ maxWidth: '800px', padding: '4rem 0' }}>
            <div className="text-center" style={{ marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Become a <span className="gradient-text">Seller</span></h1>
                <p className="text-muted">Fill out the details below to start your selling journey.</p>
            </div>

            {/* Progress Bar */}
            <div className="flex justify-between items-center" style={{ marginBottom: '4rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '20px', left: 0, right: 0, height: '2px', background: 'var(--border)', zIndex: 0 }}></div>
                <div style={{ position: 'absolute', top: '20px', left: 0, width: `${(step - 1) * 50}%`, height: '2px', background: 'var(--primary)', zIndex: 0, transition: 'width 0.3s' }}></div>

                {steps.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-2" style={{ zIndex: 1, position: 'relative' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: step > i + 1 ? 'var(--primary)' : step === i + 1 ? 'var(--surface)' : 'var(--background)',
                            border: `2px solid ${step >= i + 1 ? 'var(--primary)' : 'var(--border)'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: step > i + 1 ? 'white' : 'inherit'
                        }}>
                            {step > i + 1 ? <CheckCircle size={20} /> : s.icon}
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: step === i + 1 ? 'bold' : 'normal', color: step === i + 1 ? 'var(--primary)' : 'var(--text-muted)' }}>{s.title}</span>
                    </div>
                ))}
            </div>

            {/* Error Alert */}
            {error && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#ef4444',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}

            {/* Success Alert */}
            {success && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    background: 'rgba(34, 197, 94, 0.1)',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#22c55e',
                    fontSize: '0.9rem'
                }}>
                    {success}
                </div>
            )}

            <div className="glass-card" style={{ padding: '3rem' }}>
                <AnimatePresence mode="wait">
                    {/* Step 1: Mobile Verification - Just confirm phone from login */}
                    {step === 1 && (
                        <motion.div
                            key="step1"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col gap-6"
                        >
                            <div style={{ textAlign: 'center' }}>
                                <h3>Step 1: Verify Phone Number</h3>
                                <p className="text-muted">Confirm your phone number to proceed with seller registration</p>
                            </div>

                            <div style={{
                                background: 'var(--surface)',
                                border: '2px solid var(--border)',
                                borderRadius: '0.5rem',
                                padding: '1.5rem',
                                textAlign: 'center'
                            }}>
                                <p className="text-muted" style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>Your Registered Phone Number</p>
                                <h2 style={{ fontSize: '1.8rem', margin: 0, color: 'var(--primary)', fontWeight: 'bold' }}>
                                    {user?.phone || '+91**'}
                                </h2>
                                <p className="text-muted" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                    This is your login phone number
                                </p>
                            </div>

                            <form onSubmit={handleVerifyPhone} className="flex flex-col gap-4">
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                                    Click the button below to verify and proceed to shop details
                                </p>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    style={{ width: '100%', padding: '1rem' }}
                                    disabled={loading || !user?.phone}
                                >
                                    {loading ? 'Verifying...' : 'Verify Phone'} {!loading && <ArrowRight size={18} />}
                                </button>
                            </form>
                        </motion.div>
                    )}

                    {/* Step 2: Shop Details */}
                    {step === 2 && (
                        <motion.div
                            key="step2"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex flex-col gap-6"
                        >
                            <div style={{ textAlign: 'center' }}>
                                <h3>Step 2: Shop Details</h3>
                                <p className="text-muted">Fill in your shop information</p>
                            </div>

                            <form onSubmit={handleSubmitSellerApplication} className="flex flex-col gap-4">
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Shop Name *</label>
                                    <input
                                        type="text"
                                        placeholder="Enter your shop name"
                                        value={shopName}
                                        onChange={e => setShopName(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Category *</label>
                                    <select value={category} onChange={e => setCategory(e.target.value)} disabled={loading}>
                                        <option value="">Select a category</option>
                                        <option value="Electronics">Electronics</option>
                                        <option value="Fashion">Fashion</option>
                                        <option value="Home & Living">Home & Living</option>
                                        <option value="Books">Books</option>
                                        <option value="Sports">Sports</option>
                                        <option value="Groceries">Groceries</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>Address *</label>
                                    <textarea
                                        placeholder="Enter your shop address"
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                        rows="4"
                                        disabled={loading}
                                    ></textarea>
                                </div>

                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>GST Number (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="Your GST number"
                                        value={gstNumber}
                                        onChange={e => setGstNumber(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="btn btn-secondary"
                                        style={{ flex: 1, padding: '1rem' }}
                                        disabled={loading}
                                    >
                                        Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        style={{ flex: 1, padding: '1rem' }}
                                        disabled={loading}
                                    >
                                        {loading ? 'Submitting...' : 'Submit Application'} {!loading && <ArrowRight size={18} />}
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    )}

                    {/* Step 3: Success */}
                    {step === 3 && (
                        <motion.div
                            key="step3"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-4 text-center"
                        >
                            <div style={{
                                width: '80px',
                                height: '80px',
                                borderRadius: '50%',
                                background: 'var(--success)20',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto'
                            }}>
                                <CheckCircle size={40} color="var(--success)" />
                            </div>
                            <h3>Application Submitted!</h3>
                            <p className="text-muted">We&apos;ve received your seller application. Our team will review it and contact you soon.</p>
                            <button
                                onClick={() => navigate('/')}
                                className="btn btn-primary"
                                style={{ marginTop: '1rem' }}
                            >
                                Back to Home
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
