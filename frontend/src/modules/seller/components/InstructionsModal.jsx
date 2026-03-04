import React from 'react';
import { X, User, CreditCard, Building, MapPin, CheckCircle, AlertCircle, Clock, CheckSquare } from 'lucide-react';

export default function InstructionsModal({ onClose }) {
    const instructionsData = [
        {
            id: 1,
            icon: User,
            iconColor: 'text-blue-600',
            iconBg: 'bg-blue-100',
            title: "Step 1: Provide Your Personal Information",
            description: "Enter your full name, phone number, email address, and Aadhaar number for identity verification. This ensures account authenticity and secure onboarding.",
            fields: [
                { label: "Full Name", value: "Your legal full name as per documents" },
                { label: "Phone Number", value: "Active mobile number for verification" },
                { label: "Email Address", value: "Professional email for communications" },
                { label: "Aadhaar Number", value: "12-digit Aadhaar number for identity verification" }
            ]
        },
        {
            id: 2,
            icon: CreditCard,
            iconColor: 'text-green-600',
            iconBg: 'bg-green-100',
            title: "Step 2: Add Your Bank Information",
            description: "Enter your bank details to receive payments securely. IFSC ensures correct bank routing and UPI ID can be used for fast settlements.",
            fields: [
                { label: "Bank Name", value: "Your primary bank name" },
                { label: "Account Holder Name", value: "Name as registered with bank" },
                { label: "IFSC Code", value: "11-character bank branch identifier" },
                { label: "UPI ID", value: "Your UPI handle for quick payments (optional)" }
            ]
        },
        {
            id: 3,
            icon: Building,
            iconColor: 'text-purple-600',
            iconBg: 'bg-purple-100',
            title: "Step 3: Enter Your Business Details",
            description: "Provide your company name, business contact details, and official email to establish store identity on the platform.",
            fields: [
                { label: "Company Name", value: "Your registered business name" },
                { label: "Company Holder Name", value: "Authorized person name" },
                { label: "Company Email", value: "Official business email address" },
                { label: "Company Phone Number", value: "Business contact number" }
            ]
        },
        {
            id: 4,
            icon: MapPin,
            iconColor: 'text-orange-600',
            iconBg: 'bg-orange-100',
            title: "Step 4: Set Your Pickup Address",
            description: "This address will be used for order pickups and logistics coordination. Provide accurate state, city, country, and landmark details.",
            fields: [
                { label: "Address", value: "Complete pickup address with street details" },
                { label: "State", value: "Your state/region" },
                { label: "City", value: "Your city name" },
                { label: "Country", value: "Your country" },
                { label: "Landmark", value: "Nearby landmark for easy identification (optional)" }
            ]
        },
        {
            id: 5,
            icon: CheckCircle,
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-100',
            title: "Step 5: Submit Application for Review",
            description: "Once all details are submitted, your application will be reviewed by the admin. The admin verifies identity and business details before approval.",
            statusInfo: [
                { status: "Approved", description: "Seller can start listing and selling products", icon: CheckSquare, color: "text-green-600" },
                { status: "Rejected", description: "Seller may update details and reapply", icon: X, color: "text-red-600" },
                { status: "Pending", description: "Application under admin review", icon: Clock, color: "text-yellow-600" }
            ]
        }
    ];

    return (
        <div
            className="modal-overlay flex items-center justify-center"
            style={{ 
                position: 'fixed', 
                inset: 0, 
                background: 'rgba(0,0,0,0.7)', 
                backdropFilter: 'blur(10px)', 
                zIndex: 10000, 
                padding: '2rem' 
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div 
                className="glass-card animate-fade-in" 
                style={{ 
                    padding: 0, 
                    overflow: 'hidden', 
                    background: 'white', 
                    border: '1px solid var(--border)', 
                    borderRadius: '1.5rem', 
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', 
                    width: '100%', 
                    maxWidth: '800px',
                    maxHeight: '90vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >

                {/* Header */}
                <div style={{ 
                    padding: '2rem 2rem 1.5rem', 
                    borderBottom: '1px solid var(--border)', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                }}>
                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <h2 style={{ 
                                fontSize: '1.75rem', 
                                fontWeight: 800, 
                                margin: '0 0 1rem 0',
                                lineHeight: '1.2'
                            }}>
                                Complete Guide to Becoming a Seller on SellSathi
                            </h2>
                            <p style={{ 
                                fontSize: '1rem', 
                                margin: 0, 
                                opacity: 0.9,
                                lineHeight: '1.6'
                            }}>
                                Learn how to register, submit your details, and get approved to start selling on our platform. 
                                Follow our comprehensive step-by-step process for a smooth onboarding experience.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="btn btn-secondary"
                            style={{ 
                                padding: '0.5rem', 
                                borderRadius: '50%', 
                                width: '40px', 
                                height: '40px',
                                background: 'rgba(255,255,255,0.2)',
                                border: '1px solid rgba(255,255,255,0.3)',
                                color: 'white',
                                marginLeft: '1rem'
                            }}
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div style={{ 
                    padding: '2rem', 
                    overflowY: 'auto', 
                    flex: 1,
                    background: '#fafbfc'
                }}>
                    <div className="space-y-6">
                        {instructionsData.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div 
                                    key={step.id}
                                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                                    style={{ transition: 'all 0.3s ease' }}
                                >
                                    {/* Step Header */}
                                    <div className="flex items-start gap-4 p-6 border-b border-gray-100">
                                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${step.iconBg} flex-shrink-0`}>
                                            <Icon size={24} className={step.iconColor} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-600 text-white text-sm font-bold">
                                                    {step.id}
                                                </span>
                                                <h3 style={{ 
                                                    fontSize: '1.25rem', 
                                                    fontWeight: 700, 
                                                    margin: 0,
                                                    color: '#1f2937'
                                                }}>
                                                    {step.title}
                                                </h3>
                                            </div>
                                            <p style={{ 
                                                fontSize: '0.95rem', 
                                                margin: 0, 
                                                color: '#6b7280',
                                                lineHeight: '1.6'
                                            }}>
                                                {step.description}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Step Fields */}
                                    <div className="p-6 bg-gray-50">
                                        {step.fields && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {step.fields.map((field, fieldIndex) => (
                                                    <div key={fieldIndex} className="flex items-start gap-3">
                                                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 mt-0.5">
                                                            <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                                                        </div>
                                                        <div className="flex-1">
                                                            <div style={{ 
                                                                fontSize: '0.875rem', 
                                                                fontWeight: 600, 
                                                                color: '#374151',
                                                                marginBottom: '0.25rem'
                                                            }}>
                                                                {field.label}
                                                            </div>
                                                            <div style={{ 
                                                                fontSize: '0.8rem', 
                                                                color: '#6b7280',
                                                                fontStyle: 'italic'
                                                            }}>
                                                                {field.value}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {step.statusInfo && (
                                            <div className="space-y-3">
                                                <div style={{ 
                                                    fontSize: '0.875rem', 
                                                    fontWeight: 600, 
                                                    color: '#374151',
                                                    marginBottom: '1rem'
                                                }}>
                                                    Application Status Outcomes:
                                                </div>
                                                {step.statusInfo.map((status, statusIndex) => {
                                                    const StatusIcon = status.icon;
                                                    return (
                                                        <div key={statusIndex} className="flex items-center gap-3 p-3 rounded-lg bg-white border border-gray-200">
                                                            <div className={`flex items-center justify-center w-8 h-8 rounded-full ${status.color === 'text-green-600' ? 'bg-green-100' : status.color === 'text-red-600' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                                                                <StatusIcon size={16} className={status.color} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div style={{ 
                                                                    fontSize: '0.875rem', 
                                                                    fontWeight: 600, 
                                                                    color: '#374151'
                                                                }}>
                                                                    {status.status}
                                                                </div>
                                                                <div style={{ 
                                                                    fontSize: '0.8rem', 
                                                                    color: '#6b7280'
                                                                }}>
                                                                    {status.description}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Additional Info Section */}
                    <div className="mt-8 p-6 bg-blue-50 rounded-xl border border-blue-200">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-blue-600 mt-1" size={20} />
                            <div>
                                <h4 style={{ 
                                    fontSize: '1rem', 
                                    fontWeight: 700, 
                                    color: '#1e40af',
                                    marginBottom: '0.5rem'
                                }}>
                                    Important Notes
                                </h4>
                                <ul style={{ 
                                    fontSize: '0.875rem', 
                                    color: '#1e40af',
                                    margin: 0,
                                    paddingLeft: '1.25rem',
                                    lineHeight: '1.6'
                                }}>
                                    <li>All information provided must be accurate and verifiable</li>
                                    <li>Admin review typically takes 24-48 hours</li>
                                    <li>You can update your details before submission</li>
                                    <li>Keep your documents ready for verification</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    background: 'white', 
                    borderTop: '1px solid var(--border)', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Need help? Contact our support team
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-primary"
                        style={{ 
                            padding: '0.75rem 1.5rem', 
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none'
                        }}
                    >
                        Got it, Let's Start
                    </button>
                </div>
            </div>
        </div>
    );
}



