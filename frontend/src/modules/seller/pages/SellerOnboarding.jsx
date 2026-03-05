import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, CreditCard, Phone, MapPin, Store, Tag, CheckCircle2, Upload, Camera, Loader } from 'lucide-react';
import { authFetch } from '@/modules/shared/utils/api';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const CITY_DATA = {
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik", "Aurangabad", "Solapur"],
  "Delhi": ["New Delhi", "North Delhi", "South Delhi", "West Delhi", "East Delhi"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Dharwad", "Mangaluru", "Belagavi"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Ramagundam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar"]
};

const SellerOnboarding = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enhanced seller data state
  const [sellerData, setSellerData] = useState({
    // Personal Details
    fullName: '',
    aadhaarNumber: '',
    phoneNumber: '',
    age: '',

    // Shop Details
    shopAddress: '',
    shopName: '',
    shopCategory: '',

    // GST Details
    hasGST: null, // 'yes' or 'no'
    gstNumber: '',

    // EID Details (for non-GST)
    panNumber: '',
    nameAsPerPAN: '',
    emailId: '',
    state: '',
    pincode: '',
    landmark: '',
    district: '',
    city: '',
    buildingNumber: '',
    streetLocality: '',

    // Pickup Address
    pickupAddress: '',
    pickupStreet: '',
    pickupLandmark: '',
    pickupCity: '',
    pickupState: '',
    pickupPincode: '',

    // Bank Details
    bankAccountName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',

    // Supplier Details
    supplierName: '',
    businessType: '',
    productCategory: '',
    contactEmail: '',

    // Aadhaar Image
    aadhaarImageUrl: ''
  });

  // Handle Aadhaar extracted data
  useEffect(() => {
    const extractedData = location.state?.extractedData ||
      JSON.parse(localStorage.getItem('sellerAadhaarData') || '{}');

    if (extractedData.fullName || extractedData.aadhaarNumber) {
      setSellerData(prev => ({
        ...prev,
        fullName: extractedData.fullName || prev.fullName,
        aadhaarNumber: extractedData.aadhaarNumber || prev.aadhaarNumber,
        phoneNumber: extractedData.phoneNumber || prev.phoneNumber,
        age: extractedData.age || prev.age,
        shopAddress: extractedData.shopAddress || prev.shopAddress,
        pincode: extractedData.pincode || prev.pincode,
        aadhaarImageUrl: extractedData.aadhaarImageUrl || prev.aadhaarImageUrl
      }));
    }
  }, [location.state]);

  const updateSellerData = (field, value) => {
    setSellerData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep) => {
    switch (currentStep) {
      case 1: // Personal Details & PAN
        return sellerData.fullName &&
          sellerData.aadhaarNumber?.length === 12 &&
          sellerData.phoneNumber?.length === 10 &&
          sellerData.age &&
          sellerData.panNumber?.length === 10 &&
          sellerData.nameAsPerPAN &&
          sellerData.emailId &&
          sellerData.state &&
          sellerData.pincode?.length === 6 &&
          sellerData.district &&
          sellerData.city &&
          sellerData.buildingNumber &&
          sellerData.streetLocality;
      case 2: // Business & GST Details
        const isBaseValid = sellerData.shopName && sellerData.shopCategory && sellerData.hasGST;

        if (!isBaseValid) return false;

        if (sellerData.hasGST === 'yes') {
          return sellerData.gstNumber?.length === 15;
        }

        return true; // if hasGST is 'no', all required EID info is already captured in step 1
      case 3: // Pickup Address
        return sellerData.pickupAddress &&
          sellerData.pickupCity &&
          sellerData.pickupState &&
          sellerData.pickupPincode?.length === 6;
      case 4: // Bank Details
        return sellerData.bankAccountName &&
          sellerData.accountNumber &&
          sellerData.ifscCode?.length === 11;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      setError('Please fill all required fields');
      return;
    }
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmitApplication = async () => {
    if (!validateStep(4)) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Build the full address from structured fields
      const fullAddress = [
        sellerData.buildingNumber,
        sellerData.streetLocality,
        sellerData.landmark,
        sellerData.city,
        sellerData.district,
        sellerData.state,
        sellerData.pincode
      ].filter(Boolean).join(', ');

      // Send seller data to backend using authenticated fetch
      const response = await authFetch('/auth/apply-seller', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sellerDetails: {
            ...sellerData,
            category: sellerData.shopCategory,
            address: fullAddress || sellerData.shopAddress || sellerData.buildingNumber
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess('Your seller application has been submitted successfully. Our team will review it shortly.');
        setTimeout(() => {
          navigate('/seller/dashboard');
        }, 3000);
      } else {
        setError(result.message || 'Failed to submit application');
      }
    } catch (err) {
      setError('Server connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return <PersonalDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} />;
      case 2:
        return <BusinessAndGSTStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} prevStep={prevStep} />;
      case 3:
        return <PickupAddressStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} prevStep={prevStep} />;
      case 4:
        return <BankDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={handleSubmitApplication} prevStep={prevStep} loading={loading} />;
      default:
        return <PersonalDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} />;
    }
  };

  const steps = [
    { id: 1, name: 'Personal Details' },
    { id: 2, name: 'Business & GST' },
    { id: 3, name: 'Pickup Address' },
    { id: 4, name: 'Bank Details' }
  ];

  return (
    <div className="min-h-screen relative bg-white flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* 1. Branding Side (Left 50%) */}
      <div
        className="lg:w-1/2 p-12 lg:p-20 text-white flex flex-col justify-center relative z-10 min-h-[40vh] lg:min-h-screen"
        style={{ background: 'linear-gradient(135deg, #7B4DDB, #5A32C8)' }}
      >
        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-12 transition-colors">
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

          <h1 className="text-4xl lg:text-6xl font-bold leading-tight mb-8">
            Grow your business with SellSathi
          </h1>
          <p className="text-xl text-white/80 max-w-md mb-12">
            Reach millions of customers and scale your brand with powerful selling tools.
          </p>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {['Sales Analytics', 'Inventory Mgmt', 'Growth Insights', 'Fast Payouts'].map(feat => (
              <div key={feat} className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <p className="text-sm font-semibold">{feat}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Content Side (Right 50%) */}
      <div className="lg:w-1/2 flex flex-col bg-gray-50 h-screen overflow-hidden">
        {/* Fixed Header with Progress */}
        <div className="z-20 pt-4 pb-4 px-6 bg-white border-b border-gray-100 flex flex-col gap-4">
          <div className="flex items-center justify-start">
            <div className="flex items-center bg-gray-50 rounded-full p-1.5 border border-gray-100">
              {steps.map((stepItem, index) => (
                <React.Fragment key={stepItem.id}>
                  <div
                    className={`flex items-center px-4 py-2 rounded-full transition-all ${step === stepItem.id ? 'text-white font-semibold' :
                      step > stepItem.id ? 'text-white' : 'text-gray-400'
                      }`}
                    style={step >= stepItem.id ? { backgroundColor: '#7B4DDB' } : {}}
                  >
                    <span className="text-xs font-bold leading-none">
                      {step > stepItem.id ? '✓' : stepItem.id}
                    </span>
                    <span className="ml-2 text-[10px] hidden sm:block uppercase tracking-widest font-bold">
                      {stepItem.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-4 h-0.5 mx-1 ${step > stepItem.id ? 'bg-[#7B4DDB]' : 'bg-gray-200'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Form Body - no side padding, form fills full width */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="w-full pb-12">
            <div className="bg-white p-6 border-b border-gray-100 min-h-screen">
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
                  {error}
                </div>
              )}

              {success ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-green-600" size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
                  <p className="text-gray-500">{success}</p>
                </div>
              ) : (
                renderStep()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PersonalDetailsStep = ({ sellerData, updateSellerData, nextStep }) => {
  const availableCities = CITY_DATA[sellerData.state] || [];

  const isFormValid = sellerData.fullName &&
    sellerData.aadhaarNumber?.length === 12 &&
    sellerData.phoneNumber?.length === 10 &&
    sellerData.age &&
    sellerData.panNumber?.length === 10 &&
    sellerData.nameAsPerPAN &&
    sellerData.emailId &&
    sellerData.state &&
    sellerData.pincode?.length === 6 &&
    sellerData.district &&
    sellerData.city &&
    sellerData.buildingNumber &&
    sellerData.streetLocality;

  const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB] text-sm";

  return (
    <div className="bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Personal Details</h2>
        <p className="text-gray-500 text-sm">Provide your legal information carefully</p>
      </div>

      <div className="space-y-5">
        {/* Row 1 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
            <input type="text" value={sellerData.fullName}
              onChange={(e) => updateSellerData('fullName', e.target.value)}
              className={inp} placeholder="Enter your full name" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aadhaar Number (Locked) *</label>
            <input type="text" readOnly value={sellerData.aadhaarNumber}
              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed text-sm"
              placeholder="12-digit Aadhaar number" />
          </div>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Phone Number *</label>
            <input type="tel" maxLength={10} value={sellerData.phoneNumber}
              onChange={(e) => updateSellerData('phoneNumber', e.target.value.replace(/\D/g, ''))}
              className={inp} placeholder="10-digit phone number" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Age (Locked) *</label>
            <input type="text" readOnly value={sellerData.age}
              className="w-full px-3 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 cursor-not-allowed text-sm"
              placeholder="Age" />
          </div>
        </div>

        {/* PAN Section */}
        <div className="border-t pt-5">
          <h3 className="text-base font-semibold text-gray-900 mb-1">PAN & Identity Details</h3>
          <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg border border-blue-100 mb-4 flex gap-2">
            <CheckCircle2 size={16} className="shrink-0 text-blue-600 mt-0.5" />
            <p>Identity data (EID) allows tax-exempt selling without a GST certificate.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">PAN Number *</label>
              <input type="text" maxLength={10} value={sellerData.panNumber}
                onChange={(e) => updateSellerData('panNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className={inp} placeholder="e.g. ABCDE1234F" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Name as per PAN *</label>
              <input type="text" value={sellerData.nameAsPerPAN}
                onChange={(e) => updateSellerData('nameAsPerPAN', e.target.value)}
                className={inp} placeholder="Legal name on PAN card" />
            </div>
          </div>
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Business Email ID *</label>
          <input type="email" value={sellerData.emailId}
            onChange={(e) => updateSellerData('emailId', e.target.value)}
            className={inp} placeholder="your@business.com" />
        </div>

        {/* Address Section */}
        <div className="border-t pt-5">
          <h3 className="text-base font-semibold text-gray-900 mb-4">Shop / Business Address</h3>
          <div className="space-y-4">
            {/* Plot / Building */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plot / Building / House No. *</label>
                <input type="text" value={sellerData.buildingNumber}
                  onChange={(e) => updateSellerData('buildingNumber', e.target.value)}
                  className={inp} placeholder="e.g. Plot 12, Flat 3A" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street / Road Name *</label>
                <input type="text" value={sellerData.streetLocality}
                  onChange={(e) => updateSellerData('streetLocality', e.target.value)}
                  className={inp} placeholder="e.g. MG Road, Sector 21" />
              </div>
            </div>

            {/* Landmark */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Landmark</label>
              <input type="text" value={sellerData.landmark}
                onChange={(e) => updateSellerData('landmark', e.target.value)}
                className={inp} placeholder="e.g. Near City Mall, Opp. Bus Stand" />
            </div>

            {/* State & City Dropdowns */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">State *</label>
                <select value={sellerData.state}
                  onChange={(e) => { updateSellerData('state', e.target.value); updateSellerData('city', ''); }}
                  className={inp + " bg-white"}>
                  <option value="">Select State</option>
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">City *</label>
                {availableCities.length > 0 ? (
                  <select value={sellerData.city}
                    onChange={(e) => updateSellerData('city', e.target.value)}
                    className={inp + " bg-white"}>
                    <option value="">Select City</option>
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input type="text" value={sellerData.city}
                    onChange={(e) => updateSellerData('city', e.target.value)}
                    className={inp} placeholder="Enter city name" />
                )}
              </div>
            </div>

            {/* District & Pincode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">District *</label>
                <input type="text" value={sellerData.district}
                  onChange={(e) => updateSellerData('district', e.target.value)}
                  className={inp} placeholder="e.g. Central Delhi" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pincode *</label>
                <input type="text" maxLength={6} value={sellerData.pincode}
                  onChange={(e) => updateSellerData('pincode', e.target.value.replace(/\D/g, ''))}
                  className={inp} placeholder="6-digit pincode" />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t">
          <button onClick={nextStep} disabled={!isFormValid}
            style={{ backgroundColor: '#7B4DDB' }}
            className="px-8 py-3 text-white font-bold rounded-xl shadow-md hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
};

// Business & GST Details Step Component
const BusinessAndGSTStep = ({ sellerData, updateSellerData, nextStep, prevStep }) => {
  const handleGSTSelection = (hasGST) => updateSellerData('hasGST', hasGST);

  const isFormValid = () => {
    const isBaseValid = sellerData.shopName && sellerData.shopCategory && sellerData.hasGST;
    if (!isBaseValid) return false;

    if (sellerData.hasGST === 'yes') return sellerData.gstNumber?.length === 15;

    // If NO, they can safely proceed because step 1 enforces all PAN/EID rules now
    return true;
  };

  return (
    <div className="bg-white">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Business & GST Details</h2>
        <p className="text-gray-500">Tell us about your shop and tax compliance</p>
      </div>

      <div className="space-y-8">
        {/* Core Shop Definition Block */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shop Name *</label>
            <input
              type="text"
              value={sellerData.shopName}
              onChange={(e) => updateSellerData('shopName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              placeholder="Enter your shop name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shop Category *</label>
            <select
              value={sellerData.shopCategory}
              onChange={(e) => updateSellerData('shopCategory', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Category</option>
              <option value="electronics">Electronics</option>
              <option value="fashion">Fashion</option>
              <option value="home">Home & Kitchen</option>
              <option value="beauty">Beauty & Health</option>
              <option value="food">Food & Beverages</option>
              <option value="books">Books & Media</option>
              <option value="sports">Sports & Fitness</option>
              <option value="toys">Toys & Games</option>
            </select>
          </div>
        </div>

        {/* GST Toggle Form */}
        <div className="border-t pt-8">
          <label className="block text-lg font-medium text-gray-900 mb-4 text-center">Do you have a GST Number? *</label>
          <div className="flex justify-center gap-6 mb-8">
            <button
              onClick={() => handleGSTSelection('yes')}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${sellerData.hasGST === 'yes' ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              style={sellerData.hasGST === 'yes' ? { backgroundColor: '#7B4DDB' } : {}}
            >
              Yes
            </button>
            <button
              onClick={() => handleGSTSelection('no')}
              className={`px-8 py-3 rounded-xl font-bold transition-all ${sellerData.hasGST === 'no' ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              style={sellerData.hasGST === 'no' ? { backgroundColor: '#7B4DDB' } : {}}
            >
              No
            </button>
          </div>

          {/* Conditional Rendering Blocks */}
          {sellerData.hasGST === 'yes' && (
            <div className="max-w-md mx-auto space-y-4 animate-in fade-in zoom-in duration-200">
              <label className="block text-sm font-medium text-gray-700">GST Number *</label>
              <input
                type="text"
                maxLength={15}
                value={sellerData.gstNumber}
                onChange={(e) => updateSellerData('gstNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Enter 15-character GST number"
              />
            </div>
          )}

          {sellerData.hasGST === 'no' && (
            <div className="space-y-6 pt-4 border-t border-gray-100 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-xl border border-blue-100 mb-6 flex items-center justify-center gap-3">
                <CheckCircle2 size={24} className="shrink-0 text-blue-600" />
                <p>Tax-exempt flow. PAN verified in previous step.</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8 border-t pt-8">
          <button
            onClick={prevStep}
            className="px-6 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={nextStep}
            disabled={!isFormValid()}
            style={{ backgroundColor: '#7B4DDB' }}
            className="px-8 py-4 text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next Step
          </button>
        </div>
      </div>
    </div>
  );
};

// Pickup Address Step Component
const PickupAddressStep = ({ sellerData, updateSellerData, nextStep, prevStep }) => {
  const availableCities = CITY_DATA[sellerData.pickupState] || [];
  const inp = "w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB] text-sm";

  const isFormValid = sellerData.pickupAddress &&
    sellerData.pickupCity &&
    sellerData.pickupState &&
    sellerData.pickupPincode?.length === 6;

  return (
    <div className="bg-white">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-1">Pickup Address</h2>
        <p className="text-gray-500 text-sm">Where should we pick up your products?</p>
      </div>

      <div className="space-y-4">
        {/* Building / Plot */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Plot / Building / House No. *</label>
          <input type="text" value={sellerData.pickupAddress}
            onChange={(e) => updateSellerData('pickupAddress', e.target.value)}
            className={inp} placeholder="e.g. Plot 12, Flat 3A, Shop No. 5" />
        </div>

        {/* Street */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Street / Road Name *</label>
          <input type="text" value={sellerData.pickupStreet || ''}
            onChange={(e) => updateSellerData('pickupStreet', e.target.value)}
            className={inp} placeholder="e.g. MG Road, Sector 21, Industrial Area" />
        </div>

        {/* Landmark */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">Landmark</label>
          <input type="text" value={sellerData.pickupLandmark}
            onChange={(e) => updateSellerData('pickupLandmark', e.target.value)}
            className={inp} placeholder="e.g. Near Bus Stand, Opp. City Hospital" />
        </div>

        {/* State & City */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">State *</label>
            <select value={sellerData.pickupState}
              onChange={(e) => { updateSellerData('pickupState', e.target.value); updateSellerData('pickupCity', ''); }}
              className={inp + " bg-white"}>
              <option value="">Select State</option>
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">City *</label>
            {availableCities.length > 0 ? (
              <select value={sellerData.pickupCity}
                onChange={(e) => updateSellerData('pickupCity', e.target.value)}
                className={inp + " bg-white"}>
                <option value="">Select City</option>
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input type="text" value={sellerData.pickupCity}
                onChange={(e) => updateSellerData('pickupCity', e.target.value)}
                className={inp} placeholder="Enter city name" />
            )}
          </div>
        </div>

        {/* Pincode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pincode *</label>
            <input type="text" maxLength={6} value={sellerData.pickupPincode}
              onChange={(e) => updateSellerData('pickupPincode', e.target.value.replace(/\D/g, ''))}
              className={inp} placeholder="6-digit pincode" />
          </div>
        </div>

        <div className="flex justify-between pt-6 border-t">
          <button onClick={prevStep}
            className="px-6 py-2.5 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm">
            ← Back
          </button>
          <button onClick={nextStep} disabled={!isFormValid}
            style={{ backgroundColor: '#7B4DDB' }}
            className="px-8 py-2.5 text-white font-bold rounded-xl shadow-md hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-sm">
            Next Step →
          </button>
        </div>
      </div>
    </div>
  );
};

// Bank Details Step Component
const BankDetailsStep = ({ sellerData, updateSellerData, nextStep, prevStep, loading }) => {
  const isFormValid = sellerData.bankAccountName &&
    sellerData.accountNumber &&
    sellerData.ifscCode;

  return (
    <div className="bg-white">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Bank Details</h2>
        <p className="text-gray-500">Provide your payout information</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Holder Name *
          </label>
          <input
            type="text"
            value={sellerData.bankAccountName}
            onChange={(e) => updateSellerData('bankAccountName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
            placeholder="Enter account holder name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            maxLength={18}
            value={sellerData.accountNumber}
            onChange={(e) => updateSellerData('accountNumber', e.target.value.replace(/\D/g, ''))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
            placeholder="Enter account number"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              IFSC Code *
            </label>
            <input
              type="text"
              maxLength={11}
              value={sellerData.ifscCode}
              onChange={(e) => updateSellerData('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
              placeholder="Enter 11-char IFSC code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UPI ID (Optional)
            </label>
            <input
              type="text"
              value={sellerData.upiId}
              onChange={(e) => updateSellerData('upiId', e.target.value.replace(/[^a-zA-Z0-9.\-@]/g, '').toLowerCase())}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
              placeholder="e.g. name@bank"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8 pt-8 border-t">
        <button
          onClick={prevStep}
          disabled={loading}
          className="px-6 py-3 border border-gray-200 text-gray-500 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!isFormValid || loading}
          style={{ backgroundColor: '#7B4DDB' }}
          className="px-8 py-4 text-white font-bold rounded-2xl shadow-lg shadow-brand/20 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <React.Fragment>
              <Loader className="animate-spin" size={18} />
              Submitting...
            </React.Fragment>
          ) : (
            'Complete Setup'
          )}
        </button>
      </div>
    </div>
  );
};

// Supplier Details Step Component
const SupplierDetailsStep = ({ sellerData, updateSellerData, nextStep, prevStep }) => {
  const isFormValid = sellerData.supplierName &&
    sellerData.businessType &&
    sellerData.productCategory &&
    sellerData.contactEmail;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Supplier Details</h2>
        <p className="text-gray-600">Final information about your business</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Supplier Name *
          </label>
          <input
            type="text"
            value={sellerData.supplierName}
            onChange={(e) => updateSellerData('supplierName', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
            placeholder="Enter supplier name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <select
            value={sellerData.businessType}
            onChange={(e) => updateSellerData('businessType', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
          >
            <option value="">Select Business Type</option>
            <option value="proprietorship">Proprietorship</option>
            <option value="partnership">Partnership</option>
            <option value="llp">LLP</option>
            <option value="pvt-ltd">Private Limited</option>
            <option value="public-ltd">Public Limited</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Product Category *
          </label>
          <select
            value={sellerData.productCategory}
            onChange={(e) => updateSellerData('productCategory', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
          >
            <option value="">Select Category</option>
            <option value="electronics">Electronics</option>
            <option value="fashion">Fashion</option>
            <option value="home">Home & Kitchen</option>
            <option value="beauty">Beauty & Health</option>
            <option value="food">Food & Beverages</option>
            <option value="books">Books & Media</option>
            <option value="sports">Sports & Fitness</option>
            <option value="toys">Toys & Games</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Email *
          </label>
          <input
            type="email"
            value={sellerData.contactEmail}
            onChange={(e) => updateSellerData('contactEmail', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7B4DDB] focus:border-[#7B4DDB]"
            placeholder="Enter contact email"
          />
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={prevStep}
          className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          disabled={!isFormValid}
          style={{ backgroundColor: '#7B4DDB' }}
          className="px-8 py-3 text-white font-medium rounded-lg hover:brightness-110 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Application
        </button>
      </div>
    </div>
  );
};

// Submit Step Component
const SubmitStep = ({ formData, loading, error, success, handleSubmitApplication }) => {
  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="text-center">
        {loading ? (
          <div className="py-12">
            <Loader className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Submitting Application</h2>
            <p className="text-gray-600">Please wait while we process your application...</p>
          </div>
        ) : success ? (
          <div className="py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
            <p className="text-gray-600 mb-6">{success}</p>
            <div className="bg-blue-50 rounded-lg p-6">
              <h3 className="font-semibold text-gray-900 mb-3">What happens next?</h3>
              <div className="space-y-2 text-left max-w-md mx-auto">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-blue-600" size={16} />
                  <span className="text-gray-700">Our team will review your application within 2-3 business days</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-blue-600" size={16} />
                  <span className="text-gray-700">You'll receive email updates on your application status</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-blue-600" size={16} />
                  <span className="text-gray-700">Once approved, you can start selling immediately</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Review Your Application</h2>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Application Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Business Name:</span>
                  <span className="font-medium">{formData.supplierName || formData.shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Contact Email:</span>
                  <span className="font-medium">{formData.contactEmail || formData.emailId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Business Type:</span>
                  <span className="font-medium">{formData.businessType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Product Category:</span>
                  <span className="font-medium">{formData.productCategory || formData.shopCategory}</span>
                </div>
              </div>
            </div>
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}
            <button
              onClick={handleSubmitApplication}
              className="w-full px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Submit Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SellerOnboarding;
