import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import SellerHeader from '../components/SellerHeader.jsx';
import Footer from '../components/Footer.jsx';
import StatsSection from '../components/StatsSection.jsx';
import WhySellSathi from '../components/WhySellSathi.jsx';
import HowItWorks from '../components/HowItWorks.jsx';
import Testimonials from "../components/Testimonials.jsx";
import { ArrowRight, BookOpen, Truck, Rocket, BarChart3, Mail, Zap, Play, ArrowLeft, CheckCircle2, Upload, Camera, Store, User, Phone, CreditCard, MapPin, Tag, Loader } from 'lucide-react';
import { auth } from '@/modules/shared/config/firebase';
import { authFetch } from '@/modules/shared/utils/api';

const categories = [
  "Sell Sarees Online", "Sell Jewellery Online", "Sell Tshirts Online",
  "Sell Shirts Online", "Sell Watches Online", "Sell Electronics Online",
  "Sell Clothes Online", "Sell Socks Online"
];

export default function SellerPageWithAuth() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  // Explicit routing logic - show registration page ONLY for /seller/register
  const isRegisterPage = currentPath === '/seller/register';

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
        // Update form with extracted data - SYNCHRONIZED WITH BACKEND KEYS
        const extractedData = {
          fullName: result.data.name || '',
          aadhaarNumber: result.data.aadharNumber || '', // Backend sends 'aadharNumber' (single a)
          phoneNumber: result.data.phone || '',          // Backend sends 'phone'
          age: result.data.age || '',
          shopAddress: result.data.address || '',
          pincode: result.data.pincode || '',
          aadhaarImageUrl: result.data.imageUrl || ''
        };

        // Store extracted data in localStorage for onboarding flow
        localStorage.setItem('sellerAadhaarData', JSON.stringify(extractedData));

        // Navigate to onboarding flow with extracted data
        navigate('/seller/onboarding', { state: { extractedData } });
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
    navigate('/seller/onboarding');
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

  // If this is the registration page, show the registration form
  if (isRegisterPage) {
    return (
      <div className="flex min-h-screen">
        {/* Left Side - Seller Promotion Panel */}
        <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-purple-600 items-center justify-center text-white">
          <div className="text-center space-y-6 px-8">
            <h1 className="text-4xl font-bold mb-6">
              Grow your business with SellSathi
            </h1>

            <p className="mb-8 text-lg">
              Reach millions of customers and scale your brand with powerful selling tools.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                <p className="text-sm font-semibold">Sales Analytics</p>
              </div>
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                <p className="text-sm font-semibold">Inventory Mgmt</p>
              </div>
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                <p className="text-sm font-semibold">Growth Insights</p>
              </div>
              <div className="p-4 rounded-xl bg-white/10 backdrop-blur-md">
                <p className="text-sm font-semibold">Fast Payouts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Verification Form */}
        <div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md"
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
                    className="w-full py-3 rounded-lg border-2 border-indigo-500 text-indigo-600 font-semibold hover:bg-indigo-50 transition disabled:opacity-50"
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
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
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
                      onChange={(e) => setFormData({ ...formData, shopAddress: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
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
                        onChange={(e) => setFormData({ ...formData, shopCategory: e.target.value })}
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

  // Otherwise, show the normal seller landing page (for /seller and any other path)
  return (
    <div className="min-h-screen bg-white">
      <SellerHeader />

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-brand/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 text-center lg:text-left"
            >
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Sell Online to Crores of Customers at <span className="text-brand">0% Commission</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0">
                Become a SellSathi seller and grow your business across India.
              </p>

              {/* START SELLING BUTTON */}
              <button
                onClick={() => navigate('/seller/register')}
                style={{
                  backgroundColor: '#6C63FF',
                  color: 'white',
                  padding: '12px 28px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  border: 'none',
                  cursor: 'pointer',
                  marginTop: '24px',
                  fontSize: '16px',
                  display: 'inline-block'
                }}
              >
                Start Selling
              </button>

              {/* GST NOTE */}
              <p className="text-sm text-gray-500">
                <span className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2">NEW</span>
                Don't have a GSTIN? You can still sell on SellSathi.{' '}
                <Link to="#" className="text-brand font-semibold hover:underline">Know more</Link>
              </p>
            </motion.div>

            {/* RIGHT SIDE IMAGE */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1 w-full max-w-xl"
            >
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-square lg:aspect-video">
                <img
                  src="https://picsum.photos/seed/seller-hero/1200/800"
                  alt="Seller Success"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <StatsSection />
      <WhySellSathi />
      <HowItWorks />
      <Testimonials />

      {/* Learning Hub Section */}
      <section className="w-full py-16 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-white/10 backdrop-blur-lg p-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4 text-white/80">
                <BookOpen size={24} />
                <span className="font-bold tracking-widest uppercase text-sm">SUPPLIER LEARNING HUB</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Learn how to sell and grow your business on SellSathi
              </h2>
            </div>
            <button className="px-8 py-4 rounded-2xl bg-white text-brand font-bold text-lg hover:bg-gray-50 transition-all flex items-center gap-2 whitespace-nowrap">
              <Play fill="currentColor" size={20} /> Visit Learning Hub
            </button>
          </div>
        </div>
      </section>

      {/* Grow Your Business Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-16 text-center">
            Grow Your Business With SellSathi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <Truck size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Efficient & Affordable Shipping</h4>
                <p className="text-gray-600 leading-relaxed">Sell your products across India with our vast logistics network covering 28,000+ pincodes.</p>
              </div>
            </div>
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <Rocket size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Next Day Dispatch Program</h4>
                <p className="text-gray-600 leading-relaxed">Get higher visibility and faster growth by opting for our Next Day Dispatch (NDD) program.</p>
              </div>
            </div>
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <Zap size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Ads to Grow More</h4>
                <p className="text-gray-600 leading-relaxed">Use our intuitive advertising tools to put your products in front of right customers.</p>
              </div>
            </div>
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <BarChart3 size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Business Insights & Analytics</h4>
                <p className="text-gray-600 leading-relaxed">Make data-driven decisions with our comprehensive seller dashboard and analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10">Popular Categories To Sell Online</h2>
          <div className="flex flex-wrap gap-4 mb-8">
            {categories.map((cat, i) => (
              <button key={i} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:border-brand hover:text-brand transition-all">
                {cat}
              </button>
            ))}
          </div>
          <button className="text-brand font-bold flex items-center gap-2 hover:underline">
            View More <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand/5 text-brand mb-8">
            <Mail size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">SellSathi Supplier Support Available 24/7</h2>
          <p className="text-gray-600 mb-8">Have questions? We're here to help you every step of the way.</p>
          <a href="mailto:support@sellsathi.com" className="text-2xl font-bold text-brand hover:underline">
            support@sellsathi.com
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};
