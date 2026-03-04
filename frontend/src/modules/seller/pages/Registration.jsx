import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Upload, Camera, Store, User, Phone, CreditCard, MapPin, Tag, Loader } from 'lucide-react';
import { auth } from '@/modules/shared/config/firebase';
import { authFetch } from '@/modules/shared/utils/api';

export default function SellerRegistration() {
    const [step, setStep] = useState('upload');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isExtracting, setIsExtracting] = useState(false);

    // Form data
    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        aadhaarNumber: '',
        age: '',
        shopAddress: '',
        shopName: '',
        shopCategory: '',
        aadhaarImageUrl: ''
    });
    const [aadhaarPreview, setAadhaarPreview] = useState(null);

    // User data from existing logic
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState(null);

    // Existing Aadhaar upload logic - PRESERVED
    const handleAadhaarUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsExtracting(true);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAadhaarPreview(reader.result);
        };
        reader.readAsDataURL(file);

        // Existing backend API call - PRESERVED
        const formData = new FormData();
        formData.append('aadharImage', file);

        try {
            const response = await authFetch('/auth/extract-aadhar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (result.success) {
                // Update form with extracted data - PRESERVED LOGIC
                setFormData({
                    ...formData,
                    fullName: result.data.name || '',
                    aadhaarNumber: result.data.aadhaarNumber || '',
                    age: result.data.age || '',
                    shopAddress: result.data.address || '',
                    aadhaarImageUrl: result.data.imageUrl || ''
                });
                setStep('review');
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

    const handleManualEntry = () => {
        setStep('review');
    };

    // Existing form submission logic - PRESERVED
    const handleSubmitSellerApplication = async (e) => {
        e.preventDefault();

        if (!formData.shopName || !formData.shopCategory) {
            setError('Please fill in shop name and category');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Support both Firebase users (idToken) and test users (uid from localStorage) - PRESERVED
            const firebaseUser = auth.currentUser;
            let payload = {};

            if (firebaseUser) {
                const idToken = await firebaseUser.getIdToken();
                payload = { idToken };
            } else {
                const parsedUser = user;
                if (!parsedUser?.uid) {
                    setError('Session expired. Please login again.');
                    setLoading(false);
                    return;
                }
                payload = { uid: parsedUser.uid };
            }

            // Existing API call - PRESERVED
            const response = await authFetch('/auth/apply-seller', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...payload,
                    sellerDetails: {
                        phone: formData.phoneNumber,
                        shopName: formData.shopName,
                        category: formData.shopCategory,
                        address: formData.shopAddress,
                        fullName: formData.fullName,
                        aadhaarNumber: formData.aadhaarNumber,
                        age: formData.age,
                        aadhaarImageUrl: formData.aadhaarImageUrl,
                        extractedName: formData.fullName
                    }
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess('Application submitted successfully! Your account is now under review.');
                setStatus('PENDING');
                setTimeout(() => {
                    // Redirect logic can be added here if needed
                }, 2000);
            } else {
                setError(result.message || 'Application submission failed');
            }
        } catch (err) {
            console.error('Submission error:', err);
            setError('Server connection failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col lg:flex-row">
            {/* Left Side - Branding & Info (Reference UI) */}
            <div className="lg:w-[45%] bg-brand p-8 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
                {/* Abstract Circles Background */}
                <div className="absolute top-[-10%] left-[-10%] w-[60%] aspect-square rounded-full bg-white/10 blur-3xl" />
                <div className="absolute bottom-[10%] right-[-10%] w-[50%] aspect-square rounded-full bg-white/5 blur-3xl" />
                
                <div className="relative z-10">
                    <Link to="/seller" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-12 transition-colors">
                        <ArrowLeft size={20} /> Back to SellSathi
                    </Link>
                    
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                            <Store size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">Seller Center</h3>
                            <p className="text-white/60 text-sm">SellSathi for Business</p>
                        </div>
                    </div>

                    <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-8">
                        Grow your business with SellSathi
                    </h1>
                    <p className="text-xl text-white/80 max-w-md mb-12">
                        Reach millions of customers and scale your brand with powerful selling tools.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                            <p className="text-sm font-semibold">Sales Analytics</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                            <p className="text-sm font-semibold">Inventory Mgmt</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                            <p className="text-sm font-semibold">Growth Insights</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                            <p className="text-sm font-semibold">Fast Payouts</p>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 pt-12">
                    <p className="text-sm text-white/60">
                        By logging in, you agree to SellSathi's Seller <Link to="#" className="underline">Terms of Service</Link>
                    </p>
                </div>
            </div>

            {/* Right Side - Form (Reference UI with Existing Logic) */}
            <div className="flex-1 bg-gray-50 flex items-center justify-center p-6 lg:p-12">
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl shadow-purple-100 p-8 lg:p-12 border border-gray-100"
                >
                    {error && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
                            {success}
                        </div>
                    )}

                    {step === 'upload' ? (
                        <div className="text-center">
                            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verify Your Identity</h2>
                            <p className="text-gray-500 mb-10">Upload your Aadhaar card for quick verification and automatic field filling.</p>
                            
                            <div className="space-y-6">
                                <label className="block">
                                    <div className="w-full h-48 rounded-3xl border-2 border-dashed border-purple-200 bg-purple-50/50 flex flex-col items-center justify-center cursor-pointer hover:bg-purple-50 transition-all group">
                                        {isExtracting ? (
                                            <div className="flex flex-col items-center">
                                                <Loader className="animate-spin text-brand mb-2" size={32} />
                                                <p className="font-bold text-brand">Extracting...</p>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-brand mb-4 shadow-sm group-hover:scale-110 transition-transform">
                                                    <Upload size={28} />
                                                </div>
                                                <p className="font-bold text-brand">Upload Aadhaar Card</p>
                                                <p className="text-xs text-gray-400 mt-2">Supports JPG, PNG, PDF</p>
                                            </>
                                        )}
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            onChange={handleAadhaarUpload} 
                                            accept="image/*" 
                                            disabled={isExtracting}
                                        />
                                    </div>
                                </label>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <div className="w-full border-t border-gray-200"></div>
                                    </div>
                                    <div className="relative flex justify-center text-sm">
                                        <span className="px-4 bg-white text-gray-400">OR</span>
                                    </div>
                                </div>

                                <button 
                                    onClick={handleManualEntry}
                                    disabled={isExtracting}
                                    className="w-full rounded-2xl border-2 border-brand py-4 font-bold text-brand hover:bg-brand/5 transition-all disabled:opacity-50"
                                >
                                    Enter Details Manually
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="mb-8">
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">Review & Submit</h2>
                                <p className="text-gray-500">Check your details and provide shop information below.</p>
                            </div>

                            <form className="space-y-6" onSubmit={handleSubmitSellerApplication}>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <User size={16} /> Full Name *
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.fullName}
                                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Phone size={16} /> Phone Number
                                        </label>
                                        <input 
                                            type="tel" 
                                            value={formData.phoneNumber}
                                            onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                                            placeholder="Enter phone number"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <CreditCard size={16} /> Aadhaar Number (Locked)
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.aadhaarNumber}
                                            readOnly
                                            className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <User size={16} /> Age (Locked)
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.age}
                                            readOnly
                                            className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-gray-500 cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <MapPin size={16} /> Shop Address (Required) *
                                    </label>
                                    <textarea 
                                        rows={3}
                                        value={formData.shopAddress}
                                        onChange={(e) => setFormData({...formData, shopAddress: e.target.value})}
                                        className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Store size={16} /> Shop Name *
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.shopName}
                                            onChange={(e) => setFormData({...formData, shopName: e.target.value})}
                                            placeholder="e.g. Rahul's Gadgets"
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <Tag size={16} /> Shop Category *
                                        </label>
                                        <select 
                                            value={formData.shopCategory}
                                            onChange={(e) => setFormData({...formData, shopCategory: e.target.value})}
                                            className="w-full rounded-xl border border-gray-200 px-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all bg-white"
                                        >
                                            <option value="">Select Category</option>
                                            <option value="electronics">Electronics</option>
                                            <option value="fashion">Fashion</option>
                                            <option value="home">Home & Kitchen</option>
                                            <option value="beauty">Beauty & Health</option>
                                        </select>
                                    </div>
                                </div>

                                {aadhaarPreview && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-gray-700">Aadhaar Preview</label>
                                        <div className="relative rounded-2xl overflow-hidden border border-gray-200 aspect-[1.6/1]">
                                            <img src={aadhaarPreview} alt="Aadhaar Card Preview" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => { setAadhaarPreview(null); setStep('upload'); }}
                                                    className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full font-bold text-sm"
                                                >
                                                    <Camera size={16} /> Retake Photo
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-brand py-4 font-bold text-white shadow-xl shadow-brand/20 hover:bg-brand-hover transition-all active:scale-[0.98] disabled:opacity-50 mt-4"
                                >
                                    {loading ? (
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader className="animate-spin" size={20} />
                                            Submitting...
                                        </div>
                                    ) : (
                                        'Apply for Seller Account'
                                    )}
                                </button>
                            </form>
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
