import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, User, CreditCard, Building, MapPin, Check } from 'lucide-react';

export default function ManualSellerRegistration({ onClose }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Form data for all steps
    const [formData, setFormData] = useState({
        personalDetails: {
            fullName: '',
            phoneNumber: '',
            emailAddress: '',
            aadhaarNumber: ''
        },
        bankDetails: {
            bankName: '',
            accountHolderName: '',
            ifscCode: '',
            upiId: ''
        },
        companyDetails: {
            companyName: '',
            companyHolderName: '',
            companyEmail: '',
            companyPhoneNumber: ''
        },
        pickupAddress: {
            address: '',
            state: '',
            city: '',
            country: '',
            landmark: ''
        }
    });

    const steps = [
        { id: 1, name: 'Personal', icon: User },
        { id: 2, name: 'Bank', icon: CreditCard },
        { id: 3, name: 'Company', icon: Building },
        { id: 4, name: 'Pickup', icon: MapPin }
    ];

    const updateFormData = (step, field, value) => {
        setFormData(prev => ({
            ...prev,
            [step]: {
                ...prev[step],
                [field]: value
            }
        }));
    };

    const validateStep = (step) => {
        const stepData = formData[step];
        
        switch(step) {
            case 'personalDetails':
                return stepData.fullName && stepData.phoneNumber && stepData.emailAddress && stepData.aadhaarNumber;
            case 'bankDetails':
                return stepData.bankName && stepData.accountHolderName && stepData.ifscCode;
            case 'companyDetails':
                return stepData.companyName && stepData.companyHolderName && stepData.companyEmail && stepData.companyPhoneNumber;
            case 'pickupAddress':
                return stepData.address && stepData.state && stepData.city && stepData.country;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (validateStep(getStepKey(currentStep))) {
            if (currentStep < 4) {
                setCurrentStep(currentStep + 1);
            }
        } else {
            alert('Please fill in all required fields');
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            onClose();
        }
    };

    const getStepKey = (step) => {
        const keys = ['', 'personalDetails', 'bankDetails', 'companyDetails', 'pickupAddress'];
        return keys[step];
    };

    const handleSubmit = async () => {
        if (!validateStep('pickupAddress')) {
            alert('Please fill in all required fields');
            return;
        }

        setLoading(true);
        
        try {
            // Console log all form data (as requested - no backend call)
            console.log('Manual Seller Registration Data:', {
                personalDetails: formData.personalDetails,
                bankDetails: formData.bankDetails,
                companyDetails: formData.companyDetails,
                pickupAddress: formData.pickupAddress,
                status: 'pending'
            });

            // Show success message
            setShowSuccess(true);
            
            // Auto close after 3 seconds
            setTimeout(() => {
                onClose();
            }, 3000);
            
        } catch (error) {
            console.error('Error submitting application:', error);
            alert('Failed to submit application. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Success Screen
    if (showSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white">
                <div className="text-center animate-fade-in">
                    <div className="text-green-500 text-8xl mb-6">
                        <Check className="w-20 h-20 mx-auto" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">
                        Application Submitted Successfully.
                    </h2>
                    <p className="text-xl text-gray-600">
                        Your seller application has been submitted for review.
                    </p>
                </div>
            </div>
        );
    }

    const renderStepContent = () => {
        const stepKey = getStepKey(currentStep);
        const stepData = formData[stepKey];

        switch(currentStep) {
            case 1:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Personal Details</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                            <input
                                type="text"
                                value={stepData.fullName}
                                onChange={(e) => updateFormData('personalDetails', 'fullName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter your full name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                            <input
                                type="tel"
                                value={stepData.phoneNumber}
                                onChange={(e) => updateFormData('personalDetails', 'phoneNumber', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter your phone number"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                            <input
                                type="email"
                                value={stepData.emailAddress}
                                onChange={(e) => updateFormData('personalDetails', 'emailAddress', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter your email address"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number *</label>
                            <input
                                type="text"
                                value={stepData.aadhaarNumber}
                                onChange={(e) => updateFormData('personalDetails', 'aadhaarNumber', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter your Aadhaar number"
                                maxLength={12}
                            />
                        </div>
                    </div>
                );

            case 2:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Bank Details</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                            <input
                                type="text"
                                value={stepData.bankName}
                                onChange={(e) => updateFormData('bankDetails', 'bankName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter bank name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name *</label>
                            <input
                                type="text"
                                value={stepData.accountHolderName}
                                onChange={(e) => updateFormData('bankDetails', 'accountHolderName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter account holder name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
                            <input
                                type="text"
                                value={stepData.ifscCode}
                                onChange={(e) => updateFormData('bankDetails', 'ifscCode', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter IFSC code"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">UPI ID</label>
                            <input
                                type="text"
                                value={stepData.upiId}
                                onChange={(e) => updateFormData('bankDetails', 'upiId', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter UPI ID (optional)"
                            />
                        </div>
                    </div>
                );

            case 3:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Company Details</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
                            <input
                                type="text"
                                value={stepData.companyName}
                                onChange={(e) => updateFormData('companyDetails', 'companyName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter company name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Holder Name *</label>
                            <input
                                type="text"
                                value={stepData.companyHolderName}
                                onChange={(e) => updateFormData('companyDetails', 'companyHolderName', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter company holder name"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Email *</label>
                            <input
                                type="email"
                                value={stepData.companyEmail}
                                onChange={(e) => updateFormData('companyDetails', 'companyEmail', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter company email"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Company Phone Number *</label>
                            <input
                                type="tel"
                                value={stepData.companyPhoneNumber}
                                onChange={(e) => updateFormData('companyDetails', 'companyPhoneNumber', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter company phone number"
                            />
                        </div>
                    </div>
                );

            case 4:
                return (
                    <div className="space-y-6">
                        <h3 className="text-2xl font-semibold text-gray-900 mb-6">Pickup Address Details</h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                            <textarea
                                value={stepData.address}
                                onChange={(e) => updateFormData('pickupAddress', 'address', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter pickup address"
                                rows={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                            <input
                                type="text"
                                value={stepData.state}
                                onChange={(e) => updateFormData('pickupAddress', 'state', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter state"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                            <input
                                type="text"
                                value={stepData.city}
                                onChange={(e) => updateFormData('pickupAddress', 'city', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter city"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
                            <input
                                type="text"
                                value={stepData.country}
                                onChange={(e) => updateFormData('pickupAddress', 'country', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter country"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Landmark</label>
                            <input
                                type="text"
                                value={stepData.landmark}
                                onChange={(e) => updateFormData('pickupAddress', 'landmark', e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                placeholder="Enter landmark (optional)"
                            />
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-2xl mx-auto px-4">
                {/* Progress Indicator */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            const isActive = currentStep === step.id;
                            const isCompleted = currentStep > step.id;
                            
                            return (
                                <div key={step.id} className="flex items-center">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                                        isActive ? 'border-purple-600 bg-purple-600 text-white' :
                                        isCompleted ? 'border-green-500 bg-green-500 text-white' :
                                        'border-gray-300 bg-white text-gray-500'
                                    }`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className={`ml-2 text-sm font-medium ${
                                        isActive ? 'text-purple-600' :
                                        isCompleted ? 'text-green-500' :
                                        'text-gray-500'
                                    }`}>
                                        {step.name}
                                    </span>
                                    {index < steps.length - 1 && (
                                        <div className={`flex-1 h-0.5 mx-4 ${
                                            currentStep > step.id ? 'bg-green-500' : 'bg-gray-300'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Form Card */}
                <div className="bg-white rounded-2xl shadow-lg p-8">
                    {renderStepContent()}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between mt-8">
                        <button
                            onClick={handleBack}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 inline mr-2" />
                            Back
                        </button>

                        {currentStep < 4 ? (
                            <button
                                onClick={handleNext}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                            >
                                Next
                                <ArrowRight className="w-4 h-4 inline ml-2" />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Submitting...' : 'Submit'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.5s ease-out;
                }
            `}</style>
        </div>
    );
}



