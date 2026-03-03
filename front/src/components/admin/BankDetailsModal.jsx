import React, { useState, useEffect } from 'react';
import { X, CreditCard, Building, DollarSign, Smartphone, Loader, User } from 'lucide-react';
import { authFetch } from '../../utils/api';

export default function BankDetailsModal({ sellerId, onClose }) {
    const [bankDetails, setBankDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchBankDetails();
    }, [sellerId]);

    const fetchBankDetails = async () => {
        try {
            setLoading(true);
            // Fetch bank details using seller ID
            const response = await authFetch(`/api/admin/seller/${sellerId}/bank-details`);
            const data = await response.json();

            if (data.success && data.bankDetails) {
                setBankDetails(data.bankDetails);
            } else {
                // If no bank details found, check if they exist in seller record
                const sellerResponse = await authFetch(`/api/admin/seller/${sellerId}`);
                const sellerData = await sellerResponse.json();
                
                if (sellerData.success && sellerData.seller) {
                    const seller = sellerData.seller;
                    const manualBankDetails = {
                        bankName: seller.bankName || '',
                        accountHolderName: seller.accountHolderName || '',
                        ifscCode: seller.ifscCode || '',
                        upiId: seller.upiId || ''
                    };
                    
                    // Check if any bank details exist
                    if (manualBankDetails.bankName || manualBankDetails.accountHolderName || 
                        manualBankDetails.ifscCode || manualBankDetails.upiId) {
                        setBankDetails(manualBankDetails);
                    } else {
                        setError('Bank details not submitted.');
                    }
                } else {
                    setError('Bank details not submitted.');
                }
            }
        } catch (error) {
            console.error('Error fetching bank details:', error);
            setError('Failed to fetch bank details.');
        } finally {
            setLoading(false);
        }
    };

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
                    maxWidth: '500px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >

                {/* Header */}
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    borderBottom: '1px solid var(--border)', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    background: 'var(--surface)' 
                }}>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                            <CreditCard size={20} className="text-purple-600" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                                Bank Details
                            </h2>
                            <p className="text-muted" style={{ margin: 0, fontSize: '0.875rem' }}>
                                Seller ID: {sellerId}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '0.5rem', borderRadius: '50%', width: '36px', height: '36px' }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8">
                            <Loader className="animate-spin text-purple-600 mb-4" size={32} />
                            <p className="text-muted">Loading bank details...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-8">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mx-auto mb-4">
                                <CreditCard size={32} className="text-gray-400" />
                            </div>
                            <p className="text-gray-600 font-medium mb-2">No Bank Details Found</p>
                            <p className="text-muted text-sm">{error}</p>
                        </div>
                    ) : bankDetails ? (
                        <div className="space-y-4">
                            {/* Bank Name */}
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 flex-shrink-0 mt-1">
                                    <Building size={18} className="text-blue-600" />
                                </div>
                                <div className="flex-1">
                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Bank Name
                                    </small>
                                    <p style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}>
                                        {bankDetails.bankName || 'Not provided'}
                                    </p>
                                </div>
                            </div>

                            {/* Account Holder Name */}
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 flex-shrink-0 mt-1">
                                    <User size={18} className="text-green-600" />
                                </div>
                                <div className="flex-1">
                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        Account Holder Name
                                    </small>
                                    <p style={{ fontWeight: 600, margin: 0, fontSize: '1rem' }}>
                                        {bankDetails.accountHolderName || 'Not provided'}
                                    </p>
                                </div>
                            </div>

                            {/* IFSC Code */}
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 flex-shrink-0 mt-1">
                                    <DollarSign size={18} className="text-purple-600" />
                                </div>
                                <div className="flex-1">
                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        IFSC Code
                                    </small>
                                    <p style={{ 
                                        fontWeight: 600, 
                                        margin: 0, 
                                        fontSize: '1rem',
                                        fontFamily: 'monospace',
                                        letterSpacing: '0.05em',
                                        backgroundColor: 'var(--surface)',
                                        padding: '0.5rem 0.75rem',
                                        borderRadius: '6px',
                                        border: '1px solid var(--border)'
                                    }}>
                                        {bankDetails.ifscCode || 'Not provided'}
                                    </p>
                                </div>
                            </div>

                            {/* UPI ID */}
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 flex-shrink-0 mt-1">
                                    <Smartphone size={18} className="text-orange-600" />
                                </div>
                                <div className="flex-1">
                                    <small className="text-muted d-block mb-1" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        UPI ID
                                    </small>
                                    <p style={{ 
                                        fontWeight: 600, 
                                        margin: 0, 
                                        fontSize: '1rem',
                                        backgroundColor: bankDetails.upiId ? 'var(--surface)' : 'transparent',
                                        padding: bankDetails.upiId ? '0.5rem 0.75rem' : '0',
                                        borderRadius: '6px',
                                        border: bankDetails.upiId ? '1px solid var(--border)' : 'none'
                                    }}>
                                        {bankDetails.upiId || 'Not provided'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div style={{ 
                    padding: '1.5rem 2rem', 
                    background: 'var(--surface)', 
                    borderTop: '1px solid var(--border)', 
                    display: 'flex', 
                    justifyContent: 'flex-end' 
                }}>
                    <button
                        onClick={onClose}
                        className="btn btn-secondary"
                        style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
