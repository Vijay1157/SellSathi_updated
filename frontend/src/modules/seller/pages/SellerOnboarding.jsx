import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, CreditCard, Phone, MapPin, Store, Tag, CheckCircle2, Upload, Camera, Loader } from 'lucide-react';

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
    district: '',
    city: '',
    buildingNumber: '',
    streetLocality: '',
    
    // Pickup Address
    pickupAddress: '',
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
    contactEmail: ''
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
        age: extractedData.age || prev.age,
        shopAddress: extractedData.shopAddress || prev.shopAddress
      }));
    }
  }, [location.state]);

  const updateSellerData = (field, value) => {
    setSellerData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (currentStep) => {
    switch(currentStep) {
      case 1:
        return sellerData.fullName && 
               sellerData.aadhaarNumber && 
               sellerData.phoneNumber && 
               sellerData.age && 
               sellerData.shopAddress && 
               sellerData.shopName && 
               sellerData.shopCategory;
      case 2:
        return sellerData.hasGST === 'yes' ? sellerData.gstNumber : true;
      case 3:
        return sellerData.pickupAddress && 
               sellerData.pickupCity && 
               sellerData.pickupState && 
               sellerData.pickupPincode;
      case 4:
        return sellerData.bankAccountName && 
               sellerData.accountNumber && 
               sellerData.ifscCode;
      case 5:
        return sellerData.supplierName && 
               sellerData.businessType && 
               sellerData.productCategory && 
               sellerData.contactEmail;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (!validateStep(step)) {
      setError('Please fill all required fields');
      return;
    }
    if (step < 5) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmitApplication = async () => {
    if (!validateStep(5)) {
      setError('Please fill all required fields');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      // Send seller data to backend
      const response = await fetch('/api/seller/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sellerData }),
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
    switch(step) {
      case 1:
        return <PersonalDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} />;
      case 2:
        return <GSTSelectionStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} />;
      case 3:
        return <PickupAddressStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} prevStep={prevStep} />;
      case 4:
        return <BankDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} prevStep={prevStep} />;
      case 5:
        return <SupplierDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} prevStep={prevStep} />;
      default:
        return <PersonalDetailsStep sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} />;
    }
  };

  const steps = [
    { id: 1, name: 'Personal Details' },
    { id: 2, name: 'GST Verification' },
    { id: 3, name: 'Pickup Address' },
    { id: 4, name: 'Bank Details' },
    { id: 5, name: 'Supplier Details' }
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background Gradient and Illustration */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a, #4f46e5)',
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          backgroundSize: '60px 60px',
          opacity: 1
        }}
      >
        {/* Dark overlay for better text contrast */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'rgba(0,0,0,0.35)'
          }}
        />
      </div>
      
      {/* Back Button */}
      <button
        onClick={() => navigate('/seller')}
        className="absolute top-6 left-6 text-white flex items-center gap-2 font-medium z-10 hover:text-gray-200 transition-colors"
      >
        <ArrowLeft size={20} />
        Back to SellSathi
      </button>

      {/* Progress Bar */}
      <div className="relative z-10 pt-20 pb-8">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-full p-2">
              {steps.map((stepItem, index) => (
                <React.Fragment key={stepItem.id}>
                  <div
                    className={`flex items-center px-4 py-2 rounded-full transition-all ${
                      step === stepItem.id 
                        ? 'bg-indigo-600 text-white font-semibold' 
                        : step > stepItem.id 
                        ? 'text-white' 
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    <span className="text-sm font-medium">
                      {step > stepItem.id ? '✓' : stepItem.id}
                    </span>
                    <span className="ml-2 text-sm hidden sm:block">
                      {stepItem.name}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-8 h-0.5 mx-2 ${
                      step > stepItem.id ? 'bg-white' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center px-6 pb-12">
        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
            {/* Left Side - Illustration (40%) */}
            <div className="lg:col-span-2 text-center lg:text-left relative z-10">
              <div className="text-white space-y-6">
                <h2 className="text-3xl lg:text-4xl font-bold leading-tight text-white font-semibold">
                  Start Your Selling Journey
                </h2>
                <p className="text-white/90 text-lg">
                  Join thousands of sellers who trust SellSathi to grow their business across India.
                </p>
                <div className="hidden lg:block">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-white" size={20} />
                      <span className="text-white font-semibold">0% Commission</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-white" size={20} />
                      <span className="text-white font-semibold">Fast Payments</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-white" size={20} />
                      <span className="text-white font-semibold">24/7 Support</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-white" size={20} />
                      <span className="text-white font-semibold">Easy Setup</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Form Card (60%) */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-lg p-8">
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                  </div>
                )}

                {success ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle2 className="text-green-600" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
                    <p className="text-gray-600">{success}</p>
                  </div>
                ) : (
                  renderStep()
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Personal Details Step Component
const PersonalDetailsStep = ({ sellerData, updateSellerData, nextStep }) => {
  const isFormValid = sellerData.fullName && 
                     sellerData.aadhaarNumber && 
                     sellerData.phoneNumber && 
                     sellerData.age && 
                     sellerData.shopAddress && 
                     sellerData.shopName && 
                     sellerData.shopCategory;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Personal Details</h2>
        <p className="text-gray-600">Please provide your personal information</p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={sellerData.fullName}
              onChange={(e) => updateSellerData('fullName', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Aadhaar Number *
            </label>
            <input
              type="text"
              value={sellerData.aadhaarNumber}
              onChange={(e) => updateSellerData('aadhaarNumber', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter Aadhaar number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={sellerData.phoneNumber}
              onChange={(e) => updateSellerData('phoneNumber', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter phone number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age *
            </label>
            <input
              type="number"
              value={sellerData.age}
              onChange={(e) => updateSellerData('age', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter your age"
            />
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Shop Details</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shop Address *
              </label>
              <textarea
                rows={3}
                value={sellerData.shopAddress}
                onChange={(e) => updateSellerData('shopAddress', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter shop address"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Name *
                </label>
                <input
                  type="text"
                  value={sellerData.shopName}
                  onChange={(e) => updateSellerData('shopName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter shop name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Category *
                </label>
                <select
                  value={sellerData.shopCategory}
                  onChange={(e) => updateSellerData('shopCategory', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          </div>
        </div>

        <div className="flex justify-end mt-8">
          <button
            onClick={nextStep}
            disabled={!isFormValid}
            className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

// GST Selection Step Component
const GSTSelectionStep = ({ sellerData, updateSellerData, nextStep }) => {
  const [showGSTInput, setShowGSTInput] = useState(false);
  const [showEIDModal, setShowEIDModal] = useState(false);

  const handleGSTSelection = (hasGST) => {
    updateSellerData('hasGST', hasGST);
    if (hasGST === 'yes') {
      setShowGSTInput(true);
      setShowEIDModal(false);
    } else {
      setShowGSTInput(false);
      setShowEIDModal(true);
    }
  };

  if (showEIDModal) {
    return <EIDModal sellerData={sellerData} updateSellerData={updateSellerData} nextStep={nextStep} onClose={() => setShowEIDModal(false)} />;
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Do you have a GST number?</h2>
        
        <div className="flex justify-center gap-8 mb-8">
          <button
            onClick={() => handleGSTSelection('yes')}
            className={`px-8 py-4 rounded-lg font-medium transition-all ${
              sellerData.hasGST === 'yes' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Yes
          </button>
          <button
            onClick={() => handleGSTSelection('no')}
            className={`px-8 py-4 rounded-lg font-medium transition-all ${
              sellerData.hasGST === 'no' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            No
          </button>
        </div>

        {showGSTInput && (
          <div className="max-w-md mx-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GST Number
            </label>
            <input
              type="text"
              value={sellerData.gstNumber}
              onChange={(e) => updateSellerData('gstNumber', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter GST number"
            />
            <button
              onClick={nextStep}
              className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Verify GST
            </button>
          </div>
        )}

        {sellerData.hasGST === 'no' && !showEIDModal && (
          <div className="max-w-md mx-auto text-left">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sell without GST in minutes</h3>
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-gray-700">PAN number</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-gray-700">Full Name</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-gray-700">Email ID</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-500" size={20} />
                <span className="text-gray-700">Full Address</span>
              </div>
            </div>
            <button
              onClick={() => setShowEIDModal(true)}
              className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Proceed to add details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// EID Modal Component
const EIDModal = ({ sellerData, updateSellerData, nextStep, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Create your EID</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            {[1, 2].map((num) => (
              <div
                key={num}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  num === 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
                }`}
              >
                {num}
              </div>
            ))}
            <span className="text-gray-500 text-sm ml-2">— Add Details</span>
            <span className="text-gray-500 text-sm ml-2">— Verify OTP</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">PAN and Contact Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  PAN Number
                </label>
                <input
                  type="text"
                  value={sellerData.panNumber}
                  onChange={(e) => updateSellerData('panNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter PAN number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name as per PAN
                </label>
                <input
                  type="text"
                  value={sellerData.nameAsPerPAN}
                  onChange={(e) => updateSellerData('nameAsPerPAN', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter name as per PAN"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email ID
                </label>
                <input
                  type="email"
                  value={sellerData.emailId}
                  onChange={(e) => updateSellerData('emailId', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter email ID"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State
                  </label>
                  <input
                    type="text"
                    value={sellerData.state}
                    onChange={(e) => updateSellerData('state', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter state"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={sellerData.pincode}
                    onChange={(e) => updateSellerData('pincode', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    District
                  </label>
                  <input
                    type="text"
                    value={sellerData.district}
                    onChange={(e) => updateSellerData('district', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter district"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    value={sellerData.city}
                    onChange={(e) => updateSellerData('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter city"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Room/Floor/Building Number
                </label>
                <input
                  type="text"
                  value={sellerData.buildingNumber}
                  onChange={(e) => updateSellerData('buildingNumber', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter building number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street/Locality/Landmark
                </label>
                <input
                  type="text"
                  value={sellerData.streetLocality}
                  onChange={(e) => updateSellerData('streetLocality', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter street/locality"
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 text-center">
              <strong>Captcha Security Check</strong> - Please complete the security verification below
            </p>
          </div>

          <button
            onClick={nextStep}
            className="w-full px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Submit Details
          </button>
        </div>
      </div>
    </div>
  );
};

// Pickup Address Step Component
const PickupAddressStep = ({ sellerData, updateSellerData, nextStep, prevStep }) => {
  const isFormValid = sellerData.pickupAddress && 
                     sellerData.pickupCity && 
                     sellerData.pickupState && 
                     sellerData.pickupPincode;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Pickup Address</h2>
        <p className="text-gray-600">Where should we pick up your products?</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup Address *
          </label>
          <textarea
            rows={3}
            value={sellerData.pickupAddress}
            onChange={(e) => updateSellerData('pickupAddress', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter complete pickup address"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              City *
            </label>
            <input
              type="text"
              value={sellerData.pickupCity}
              onChange={(e) => updateSellerData('pickupCity', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter city"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              State *
            </label>
            <input
              type="text"
              value={sellerData.pickupState}
              onChange={(e) => updateSellerData('pickupState', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter state"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pincode *
          </label>
          <input
            type="text"
            value={sellerData.pickupPincode}
            onChange={(e) => updateSellerData('pickupPincode', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter pincode"
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
          className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
};

// Bank Details Step Component
const BankDetailsStep = ({ sellerData, updateSellerData, nextStep, prevStep }) => {
  const isFormValid = sellerData.bankAccountName && 
                     sellerData.accountNumber && 
                     sellerData.ifscCode;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Bank Details</h2>
        <p className="text-gray-600">Add your bank information for payments</p>
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Enter account holder name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Number *
          </label>
          <input
            type="text"
            value={sellerData.accountNumber}
            onChange={(e) => updateSellerData('accountNumber', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
              value={sellerData.ifscCode}
              onChange={(e) => updateSellerData('ifscCode', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter IFSC code"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              UPI ID
            </label>
            <input
              type="text"
              value={sellerData.upiId}
              onChange={(e) => updateSellerData('upiId', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Enter UPI ID"
            />
          </div>
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
          className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
          className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
