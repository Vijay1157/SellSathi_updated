import { useState, useEffect } from 'react';
import { CreditCard, MapPin, ShoppingBag, Trash2, Banknote, ArrowLeft, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { listenToCart, removeFromCart } from '../../utils/cartUtils';

export default function Checkout() {
    const [step, setStep] = useState(1);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shippingAddress, setShippingAddress] = useState({
        firstName: '',
        lastName: '',
        houseNo: '',
        roadName: '',
        city: '',
        pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [cardDetails, setCardDetails] = useState({
        number: '',
        expiry: '',
        cvv: ''
    });
    const [upiId, setUpiId] = useState('');
    const [isUpiVerified, setIsUpiVerified] = useState(false);
    const [errors, setErrors] = useState({});
    const [isOrdered, setIsOrdered] = useState(false);
    const [orderId, setOrderId] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = listenToCart((items) => {
            setCartItems(items);
            setLoading(false);
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        // For pincode, only allow numbers and max 6 digits
        if (name === 'pincode') {
            const numericValue = value.replace(/[^0-9]/g, '').slice(0, 6);
            setShippingAddress(prev => ({ ...prev, [name]: numericValue }));
        } else {
            setShippingAddress(prev => ({ ...prev, [name]: value }));
        }
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleCardChange = (e) => {
        const { name, value } = e.target;
        let formattedValue = value;

        if (name === 'number') {
            formattedValue = value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
        } else if (name === 'expiry') {
            formattedValue = value.replace(/\D/g, '');
            if (formattedValue.length > 2) {
                formattedValue = formattedValue.slice(0, 2) + ' / ' + formattedValue.slice(2, 4);
            }
            formattedValue = formattedValue.slice(0, 7);
        } else if (name === 'cvv') {
            formattedValue = value.replace(/\D/g, '').slice(0, 3);
        }

        setCardDetails(prev => ({ ...prev, [name]: formattedValue }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleVerifyUpi = () => {
        if (!upiId.includes('@')) {
            setErrors(prev => ({ ...prev, upi: 'Invalid UPI ID format' }));
            return;
        }
        // Mock verification
        setIsUpiVerified(true);
        setErrors(prev => ({ ...prev, upi: '' }));
    };

    const validateForm = () => {
        const newErrors = {};
        if (!shippingAddress.firstName.trim() || shippingAddress.firstName.length < 2)
            newErrors.firstName = 'First name is required';
        if (!shippingAddress.lastName.trim() || shippingAddress.lastName.length < 2)
            newErrors.lastName = 'Last name is required';
        if (!shippingAddress.houseNo.trim())
            newErrors.houseNo = 'House no./Building Name is required';
        if (!shippingAddress.roadName.trim())
            newErrors.roadName = 'Road Name/ Area / Colony is required';
        if (!shippingAddress.city.trim())
            newErrors.city = 'City is required';
        if (!/^\d{6}$/.test(shippingAddress.pincode))
            newErrors.pincode = 'Pincode must be exactly 6 digits';

        if (step === 2) {
            if (paymentMethod === 'card') {
                if (cardDetails.number.replace(/\s/g, '').length !== 16)
                    newErrors.number = 'Card number is required';
                if (!/^\d{2} \/ \d{2}$/.test(cardDetails.expiry))
                    newErrors.expiry = 'Expiry is required';
                if (cardDetails.cvv.length !== 3)
                    newErrors.cvv = 'CVV is required';
            } else if (paymentMethod === 'upi') {
                if (!isUpiVerified) {
                    newErrors.upi = 'Please verify your UPI ID first';
                }
            } else if (paymentMethod === 'cod') {
                // No specific validation needed for COD at this step
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRemove = async (productId) => {
        await removeFromCart(productId);
    };

    const handleContinue = () => {
        if (step === 1) {
            if (validateForm()) {
                setStep(2);
            }
        } else {
            if (validateForm()) {
                const newId = 'OD' + Math.floor(Math.random() * 9000000000 + 1000000000);
                setOrderId(newId);
                setIsOrdered(true);
            }
        }
    };

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    if (isOrdered) {
        return (
            <div className="container animate-fade-in" style={{
                padding: '6rem 0',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#10b981',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '2rem',
                    boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)'
                }}>
                    <ShoppingBag size={40} />
                </div>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Order <span className="gradient-text">Confirmed!</span></h1>
                <p className="text-muted" style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>
                    Thank you for your purchase, {shippingAddress.firstName}!
                </p>
                <div className="glass-card" style={{ padding: '2rem', maxWidth: '500px', width: '100%', marginBottom: '3rem' }}>
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                            <span className="text-muted">Order ID</span>
                            <strong style={{ letterSpacing: '1px' }}>{orderId}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted">Payment Mode</span>
                            <span style={{ textTransform: 'uppercase' }}>{paymentMethod}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted">Amount Paid</span>
                            <span style={{ fontWeight: 'bold' }}>₹{subtotal}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => window.location.href = '/track'}
                        className="btn btn-primary"
                        style={{ padding: '1rem 2.5rem' }}
                    >
                        Track Order
                    </button>
                    <Link to="/" className="btn btn-secondary" style={{ padding: '1rem 2.5rem' }}>
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 0' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '3rem' }}>
                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-muted hover:text-primary transition-colors"
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            padding: 0
                        }}
                    >
                        <ArrowLeft size={18} />
                        Go Back
                    </button>
                    <h1 style={{ margin: 0 }}>Checkout</h1>
                </div>
            </div>

            <div className="flex gap-12">
                <div style={{ flex: 1.5 }} className="flex flex-col gap-8">
                    {/* Cart Items List */}
                    <div className="glass-card">
                        <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem' }}>
                            <ShoppingBag size={20} className="text-muted" />
                            <h3>Your Items ({cartItems.length})</h3>
                        </div>
                        <div className="flex flex-col gap-4">
                            {cartItems.map((item) => (
                                <div key={item.id} className="flex gap-4 items-center" style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                                    <img src={item.imageUrl} alt={item.name} style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                                    <div className="flex-1">
                                        <h4 style={{ fontSize: '1rem', marginBottom: '0.25rem' }}>{item.name}</h4>
                                        <p className="text-muted" style={{ fontSize: '0.875rem' }}>Qty: {item.quantity}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span style={{ fontWeight: 'bold' }}>₹{item.price * item.quantity}</span>
                                        <button
                                            onClick={() => handleRemove(item.id || item.productId)}
                                            className="text-muted hover:text-primary transition-colors"
                                            style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                        >
                                            <Trash2 size={14} /> Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step 1: Address */}
                    <div className="glass-card">
                        <div className="flex items-center justify-between" style={{ marginBottom: '1.5rem' }}>
                            <div className="flex items-center gap-3">
                                <h3>Shipping Address</h3>
                            </div>
                            {step === 2 && (
                                <button
                                    onClick={() => setStep(1)}
                                    className="btn btn-secondary"
                                    style={{ padding: '0.4rem 1.2rem', fontSize: '0.875rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
                                >
                                    Edit
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div className="flex flex-col gap-1">
                                <input
                                    type="text"
                                    name="firstName"
                                    value={shippingAddress.firstName}
                                    onChange={handleAddressChange}
                                    placeholder="First Name"
                                    className={errors.firstName ? 'error-ring' : ''}
                                    readOnly={step === 2}
                                />
                                {errors.firstName && <small style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{errors.firstName}</small>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <input
                                    type="text"
                                    name="lastName"
                                    value={shippingAddress.lastName}
                                    onChange={handleAddressChange}
                                    placeholder="Last Name"
                                    className={errors.lastName ? 'error-ring' : ''}
                                    readOnly={step === 2}
                                />
                                {errors.lastName && <small style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{errors.lastName}</small>}
                            </div>
                            <div className="flex flex-col gap-1" style={{ gridColumn: 'span 2' }}>
                                <input
                                    type="text"
                                    name="houseNo"
                                    value={shippingAddress.houseNo}
                                    onChange={handleAddressChange}
                                    placeholder="House no./Building Name*"
                                    className={errors.houseNo ? 'error-ring' : ''}
                                    readOnly={step === 2}
                                />
                                {errors.houseNo && <small style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{errors.houseNo}</small>}
                            </div>
                            <div className="flex flex-col gap-1" style={{ gridColumn: 'span 2' }}>
                                <input
                                    type="text"
                                    name="roadName"
                                    value={shippingAddress.roadName}
                                    onChange={handleAddressChange}
                                    placeholder="Road Name/ Area / Colony"
                                    className={errors.roadName ? 'error-ring' : ''}
                                    readOnly={step === 2}
                                />
                                {errors.roadName && <small style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{errors.roadName}</small>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <input
                                    type="text"
                                    name="city"
                                    value={shippingAddress.city}
                                    onChange={handleAddressChange}
                                    placeholder="City"
                                    className={errors.city ? 'error-ring' : ''}
                                    readOnly={step === 2}
                                />
                                {errors.city && <small style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{errors.city}</small>}
                            </div>
                            <div className="flex flex-col gap-1">
                                <input
                                    type="text"
                                    name="pincode"
                                    value={shippingAddress.pincode}
                                    onChange={handleAddressChange}
                                    placeholder="6-digit Pincode"
                                    maxLength={6}
                                    className={errors.pincode ? 'error-ring' : ''}
                                    readOnly={step === 2}
                                />
                                {errors.pincode && <small style={{ color: 'var(--error)', fontSize: '0.75rem' }}>{errors.pincode}</small>}
                            </div>
                        </div>

                        {step === 1 && (
                            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
                                <button
                                    className="btn btn-primary"
                                    style={{ padding: '0.75rem 2.5rem' }}
                                    onClick={handleContinue}
                                >
                                    Save Address
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Step 2: Payment */}
                    <div className="glass-card" style={{ opacity: step < 2 ? 0.5 : 1, pointerEvents: step < 2 ? 'none' : 'auto' }}>
                        <div className="flex items-center gap-3" style={{ marginBottom: '1.5rem' }}>
                            <h3>Payment Method</h3>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div
                                className="glass-card flex flex-col gap-4"
                                style={{
                                    padding: '1rem',
                                    border: paymentMethod === 'card' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: paymentMethod === 'card' ? 'hsla(var(--primary-h, 230), 85%, 60%, 0.05)' : 'var(--glass)'
                                }}
                            >
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="card"
                                        checked={paymentMethod === 'card'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <CreditCard size={20} />
                                    <div className="flex-1">
                                        <strong>Cards</strong><br />
                                        <small className="text-muted">Credit / Debit / ATM Card</small>
                                    </div>
                                </label>

                                {paymentMethod === 'card' && (
                                    <div className="flex flex-col gap-4 animate-fade-in" style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            Note: Please ensure your card can be used for online transactions. <a href="#" style={{ color: 'var(--primary)' }}>Learn More</a>
                                        </p>

                                        <div className="flex flex-col gap-2">
                                            <small className="text-muted">Card Number</small>
                                            <input
                                                type="text"
                                                name="number"
                                                placeholder="XXXX XXXX XXXX XXXX"
                                                value={cardDetails.number}
                                                onChange={handleCardChange}
                                                className={errors.number ? 'error-ring' : ''}
                                                style={{ width: '100%', padding: '0.75rem' }}
                                            />
                                            {errors.number && <small style={{ color: 'var(--error)' }}>{errors.number}</small>}
                                        </div>

                                        <div className="flex gap-4">
                                            <div className="flex-1 flex flex-col gap-2">
                                                <small className="text-muted">Valid Thru</small>
                                                <input
                                                    type="text"
                                                    name="expiry"
                                                    placeholder="MM / YY"
                                                    value={cardDetails.expiry}
                                                    onChange={handleCardChange}
                                                    className={errors.expiry ? 'error-ring' : ''}
                                                    style={{ width: '100%', padding: '0.75rem' }}
                                                />
                                                {errors.expiry && <small style={{ color: 'var(--error)' }}>{errors.expiry}</small>}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-2">
                                                <div className="flex items-center justify-between">
                                                    <small className="text-muted">CVV</small>
                                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>?</span>
                                                </div>
                                                <input
                                                    type="password"
                                                    name="cvv"
                                                    placeholder="CVV"
                                                    value={cardDetails.cvv}
                                                    onChange={handleCardChange}
                                                    className={errors.cvv ? 'error-ring' : ''}
                                                    style={{ width: '100%', padding: '0.75rem' }}
                                                />
                                                {errors.cvv && <small style={{ color: 'var(--error)' }}>{errors.cvv}</small>}
                                            </div>
                                        </div>

                                        <button
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                marginTop: '1rem',
                                                background: '#fbbf24',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                border: 'none',
                                                borderRadius: '4px'
                                            }}
                                            onClick={handleContinue}
                                        >
                                            Pay ₹{subtotal}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div
                                className="glass-card flex flex-col gap-4"
                                style={{
                                    padding: '1rem',
                                    border: paymentMethod === 'upi' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: paymentMethod === 'upi' ? 'hsla(var(--primary-h, 230), 85%, 60%, 0.05)' : 'var(--glass)'
                                }}
                            >
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="upi"
                                        checked={paymentMethod === 'upi'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <MapPin size={20} />
                                    <div className="flex-1">
                                        <strong>UPI</strong><br />
                                        <small className="text-muted">GPay, PhonePe, etc.</small>
                                    </div>
                                </label>

                                {paymentMethod === 'upi' && (
                                    <div className="flex flex-col gap-4 animate-fade-in" style={{ padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-3 cursor-pointer">
                                                <input type="radio" checked readOnly />
                                                <strong>Add new UPI ID</strong>
                                            </label>
                                            <a href="#" style={{ fontSize: '0.875rem', color: 'var(--primary)' }}>How to find?</a>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            <div className="flex flex-col gap-2">
                                                <small className="text-muted">UPI ID</small>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="Enter your UPI ID"
                                                        value={upiId}
                                                        onChange={(e) => {
                                                            setUpiId(e.target.value);
                                                            setIsUpiVerified(false);
                                                        }}
                                                        style={{ flex: 1, padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '4px' }}
                                                    />
                                                    <button
                                                        className="btn"
                                                        style={{
                                                            padding: '0 1.5rem',
                                                            background: isUpiVerified ? 'var(--success)' : '#2874f0',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            fontWeight: 'bold'
                                                        }}
                                                        onClick={handleVerifyUpi}
                                                        disabled={isUpiVerified}
                                                    >
                                                        {isUpiVerified ? 'Verified' : 'Verify'}
                                                    </button>
                                                </div>
                                            </div>
                                            {errors.upi && <small style={{ color: 'var(--error)' }}>{errors.upi}</small>}

                                            <button
                                                className="btn"
                                                style={{
                                                    width: '100%',
                                                    padding: '1rem',
                                                    background: isUpiVerified ? '#fbbf24' : '#bdc3c7',
                                                    color: isUpiVerified ? 'black' : 'white',
                                                    fontWeight: 'bold',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: isUpiVerified ? 'pointer' : 'not-allowed'
                                                }}
                                                disabled={!isUpiVerified}
                                                onClick={handleContinue}
                                            >
                                                Pay ₹{subtotal}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div
                                className="glass-card flex flex-col gap-4"
                                style={{
                                    padding: '1rem',
                                    border: paymentMethod === 'cod' ? '1px solid var(--primary)' : '1px solid var(--border)',
                                    background: paymentMethod === 'cod' ? 'hsla(var(--primary-h, 230), 85%, 60%, 0.05)' : 'var(--glass)'
                                }}
                            >
                                <label className="flex items-center gap-4 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="payment"
                                        value="cod"
                                        checked={paymentMethod === 'cod'}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                    />
                                    <Banknote size={20} />
                                    <div className="flex-1">
                                        <strong>Cash on Delivery</strong><br />
                                        <small className="text-muted">Pay when you receive the order</small>
                                    </div>
                                </label>

                                {paymentMethod === 'cod' && (
                                    <div className="flex flex-col gap-4 animate-fade-in" style={{ padding: '2rem', background: 'white', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', textAlign: 'center' }}>
                                        <div style={{ padding: '1.5rem', background: 'var(--glass)', borderRadius: '8px', border: '1px solid var(--border)', marginBottom: '1rem' }}>
                                            <p style={{ color: '#666', fontSize: '0.85rem', lineHeight: '1.6' }}>
                                                40,422 people used online payment options in the last hour. Pay online now for safe and contactless delivery.
                                            </p>
                                        </div>
                                        <button
                                            className="btn"
                                            style={{
                                                width: '100%',
                                                padding: '1rem',
                                                background: '#fbbf24',
                                                color: 'black',
                                                fontWeight: 'bold',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '1rem',
                                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                            }}
                                            onClick={handleContinue}
                                        >
                                            Place Order
                                        </button>
                                    </div>
                                )}
                            </div>


                        </div>
                    </div>
                </div>

                {/* Order Summary */}
                <div style={{ flex: 1 }}>
                    <div className="glass-card" style={{ position: 'sticky', top: '6rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Order Summary</h3>
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <span className="text-muted">Subtotal ({cartItems.reduce((acc, item) => acc + item.quantity, 0)} items)</span>
                                <span>₹{subtotal}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted">Shipping</span>
                                <span style={{ color: 'var(--success)' }}>FREE</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted">Tax</span>
                                <span>₹0.00</span>
                            </div>
                            <hr style={{ border: 'none', borderTop: '1px solid var(--border)' }} />
                            <div className="flex justify-between items-center" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                                <span>Total Amount</span>
                                <span className="gradient-text">₹{subtotal}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
