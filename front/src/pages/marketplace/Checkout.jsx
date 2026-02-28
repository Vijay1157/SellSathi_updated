import { useState, useEffect } from 'react';
import {
    ArrowLeft,
    CreditCard,
    MapPin,
    ShoppingBag,
    Trash2,
    Banknote,
    ShoppingCart,
    Shield,
    Package,
    TrendingUp,
    CheckCircle2,
    X,
    AlertCircle,
    Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { listenToCart, removeFromCart } from '../../utils/cartUtils';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { authFetch } from '../../utils/api';
import ConfirmationAnimation from '../../components/common/ConfirmationAnimation';

export default function Checkout() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [shippingAddress, setShippingAddress] = useState({
        firstName: '',
        lastName: '',
        addressLine: '',
        city: '',
        state: '',
        pincode: ''
    });
    const [paymentMethod, setPaymentMethod] = useState('razorpay');
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
    const [user, setUser] = useState(null);
    const [saveAddressForFuture, setSaveAddressForFuture] = useState(false);
    const [setAsDefault, setSetAsDefault] = useState(false);
    const [fetchingSavedAddress, setFetchingSavedAddress] = useState(false);
    const [razorpayLoading, setRazorpayLoading] = useState(false);
    const [showAnimation, setShowAnimation] = useState(false);
    
    // New states for address selection
    const [addressMode, setAddressMode] = useState('saved'); // 'saved' or 'new'
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [selectedAddressIndex, setSelectedAddressIndex] = useState(null);

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            setUser(u);
            if (u) {
                // Fetch saved addresses
                setFetchingSavedAddress(true);
                try {
                    const docRef = doc(db, "users", u.uid);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        const addresses = docSnap.data().addresses || [];
                        setSavedAddresses(addresses);
                        
                        // Auto-select default address if exists
                        const defaultAddr = addresses.find(addr => addr.isDefault === true);
                        if (defaultAddr) {
                            const defaultIndex = addresses.indexOf(defaultAddr);
                            setSelectedAddressIndex(defaultIndex);
                            setShippingAddress(defaultAddr);
                            setAddressMode('saved');
                        } else if (addresses.length > 0) {
                            // If no default but addresses exist, select first one
                            setSelectedAddressIndex(0);
                            setShippingAddress(addresses[0]);
                            setAddressMode('saved');
                        } else {
                            // No saved addresses, switch to new address mode
                            setAddressMode('new');
                        }
                    } else {
                        setAddressMode('new');
                    }
                } catch (error) {
                    console.error("Error fetching addresses:", error);
                    setAddressMode('new');
                } finally {
                    setFetchingSavedAddress(false);
                }
            }
        });
        return () => unsubscribe();
    }, []);

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

    const handleRazorpayPayment = async () => {
        setRazorpayLoading(true);
        try {
            // Create order on backend first
            const customerInfo = {
                firstName: shippingAddress.firstName,
                lastName: shippingAddress.lastName,
                email: user?.email || '',
                phone: user?.phoneNumber || user?.phone || '',
                address: shippingAddress
            };

            const createOrderResponse = await authFetch('/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: subtotal,
                    cartItems: cartItems,
                    customerInfo: customerInfo
                })
            });

            const orderResult = await createOrderResponse.json();

            if (!orderResult.success) {
                alert('Failed to create payment order');
                setRazorpayLoading(false);
                return;
            }

            // Load Razorpay script
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            document.body.appendChild(script);

            script.onload = () => {
                const options = {
                    key: orderResult.key_id,
                    amount: orderResult.order.amount,
                    currency: orderResult.order.currency,
                    order_id: orderResult.order.id,
                    name: 'Sellsathi',
                    description: 'Order Payment',
                    image: '/logo.png',
                    handler: async function (response) {
                        console.log('Razorpay Payment Success:', response);
                        // Verify payment on backend
                        try {
                            const verifyResponse = await authFetch('/payment/verify', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    razorpay_payment_id: response.razorpay_payment_id,
                                    razorpay_order_id: response.razorpay_order_id,
                                    razorpay_signature: response.razorpay_signature,
                                    cartItems: cartItems,
                                    customerInfo: customerInfo,
                                    amount: subtotal,
                                    uid: auth.currentUser?.uid || 'guest'
                                })
                            });

                            const verifyResult = await verifyResponse.json();

                            if (verifyResult.success) {
                                // Clear cart
                                cartItems.forEach(item => removeFromCart(item.id || item.productId));

                                // Save new address if needed
                                if (addressMode === 'new' && saveAddressForFuture && user) {
                                    try {
                                        const newAddress = {
                                            ...shippingAddress,
                                            isDefault: setAsDefault
                                        };
                                        await authFetch(`/api/user/${user.uid}/address/save`, {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ address: newAddress })
                                        });
                                    } catch (error) {
                                        console.error("Error saving address:", error);
                                    }
                                }

                                // Store order ID and show animation
                                setOrderId(verifyResult.orderId);
                                setShowAnimation(true);
                            } else {
                                alert('Payment verification failed: ' + verifyResult.message);
                            }
                        } catch (error) {
                            console.error('Verification Error:', error);
                            alert('Payment verification failed. Please contact support.');
                        } finally {
                            setRazorpayLoading(false);
                        }
                    },
                    prefill: {
                        name: `${shippingAddress.firstName} ${shippingAddress.lastName}`,
                        email: user?.email || '',
                        contact: user?.phoneNumber || user?.phone || ''
                    },
                    theme: {
                        color: '#6366f1'
                    },
                    modal: {
                        ondismiss: function () {
                            setRazorpayLoading(false);
                        }
                    }
                };

                const razorpay = new window.Razorpay(options);
                razorpay.open();
                setRazorpayLoading(false);
            };

            script.onerror = () => {
                alert('Failed to load Razorpay. Please try again.');
                setRazorpayLoading(false);
            };
        } catch (error) {
            console.error('Razorpay Error:', error);
            alert('Payment initialization failed');
            setRazorpayLoading(false);
        }
    };

    const processOrder = async (paymentType, paymentId = null) => {
        setLoading(true);
        try {
            const customerInfo = {
                firstName: shippingAddress.firstName,
                lastName: shippingAddress.lastName,
                email: user?.email || '',
                phone: user?.phoneNumber || user?.phone || '',
                address: shippingAddress
            };

            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("Please login to place an order");
                setLoading(false);
                return;
            }

            // Use backend COD endpoint
            const response = await authFetch('/payment/cod-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: currentUser.uid,
                    cartItems: cartItems,
                    customerInfo: customerInfo,
                    amount: subtotal
                })
            });

            const result = await response.json();

            if (result.success) {
                // Save new address if needed
                if (addressMode === 'new' && saveAddressForFuture && user) {
                    try {
                        const newAddress = {
                            ...shippingAddress,
                            isDefault: setAsDefault
                        };
                        await authFetch(`/api/user/${user.uid}/address/save`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ address: newAddress })
                        });
                    } catch (error) {
                        console.error("Error saving address:", error);
                    }
                }

                // Clear cart
                cartItems.forEach(item => removeFromCart(item.id || item.productId));

                // Store order ID and show animation
                setOrderId(result.orderId);
                setShowAnimation(true);
            } else {
                alert("Failed to place order: " + result.message);
            }
        } catch (error) {
            console.error("Order Error:", error);
            alert("An error occurred while placing your order.");
        } finally {
            setLoading(false);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!shippingAddress.firstName.trim())
            newErrors.firstName = 'First name is required';
        if (!shippingAddress.lastName.trim())
            newErrors.lastName = 'Last name is required';
        if (!shippingAddress.addressLine.trim() || shippingAddress.addressLine.length < 5)
            newErrors.addressLine = 'Full address is required';
        if (!shippingAddress.city.trim())
            newErrors.city = 'City is required';
        if (!shippingAddress.state.trim())
            newErrors.state = 'State is required';
        if (!/^\d{6}$/.test(shippingAddress.pincode))
            newErrors.pincode = 'Pincode must be exactly 6 digits';

        if (step === 2) {
            // Payment method validation - razorpay and cod don't need additional validation
            if (!paymentMethod) {
                newErrors.payment = 'Please select a payment method';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRemove = async (productId) => {
        await removeFromCart(productId);
    };

    const handleContinue = async () => {
        console.log('=== handleContinue called ===');
        console.log('Current step:', step);
        console.log('Payment method:', paymentMethod);
        console.log('Shipping address:', shippingAddress);

        if (step === 1) {
            console.log('Validating step 1 (address)...');
            if (validateForm()) {
                console.log('Step 1 validation passed, moving to step 2');
                setStep(2);
            } else {
                console.log('Step 1 validation failed. Errors:', errors);
                alert('Please fill in all required address fields correctly.');
            }
        } else {
            console.log('Validating step 2 (payment)...');
            const isValid = validateForm();
            console.log('Validation result:', isValid);
            console.log('Validation errors:', errors);

            if (isValid) {
                // Handle Razorpay separately
                if (paymentMethod === 'razorpay') {
                    handleRazorpayPayment();
                } else {
                    processOrder(paymentMethod);
                }
            } else {
                console.log('Step 2 validation failed!');
                console.log('Current errors:', errors);
                alert('Please fix the validation errors before continuing.');
            }
        }
    };

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleAnimationComplete = () => {
        navigate(`/track?orderId=${orderId}`);
    };

    if (isOrdered) {
        return (
            <div className="min-h-[80vh] flex items-center justify-center p-6 bg-gray-50/20">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    className="max-w-2xl w-full bg-white rounded-[3rem] border border-gray-100 shadow-2xl p-12 text-center space-y-8 relative overflow-hidden"
                >
                    {/* Background Sparkle Effect */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-green-500/5 rounded-full blur-3xl" />

                    <div className="relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                            className="w-24 h-24 bg-green-500 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-green-500/20 rotate-12"
                        >
                            <ShoppingCart size={48} />
                        </motion.div>

                        <h1 className="text-5xl font-black text-gray-900 tracking-tight leading-tight">
                            Order <span className="gradient-text">Confirmed</span>
                        </h1>
                        <p className="text-gray-500 text-lg font-medium mt-4 max-w-sm mx-auto">
                            Thank you for your purchase, {shippingAddress.firstName}! Your order is being processed.
                        </p>
                    </div>

                    <div className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-gray-400">ORDER ID</span>
                            <span className="text-gray-900 font-mono">#{orderId.substring(0, 10)}</span>
                        </div>
                        <div className="h-px bg-gray-100 w-full" />
                        <div className="flex justify-between items-center text-sm font-bold">
                            <span className="text-gray-400">PAYMENT</span>
                            <span className="text-gray-900 uppercase">{paymentMethod}</span>
                        </div>
                        <div className="h-px bg-gray-100 w-full" />
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-gray-400">TOTAL</span>
                            <span className="text-2xl font-black text-primary">₹{subtotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                            onClick={() => window.location.href = `/track?orderId=${orderId}`}
                            className="flex-1 py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            Track Detailed Status
                        </button>
                        <Link
                            to="/dashboard"
                            className="flex-1 py-5 bg-white text-gray-600 rounded-2xl font-black border border-gray-100 hover:bg-gray-50 active:scale-95 transition-all text-center"
                        >
                            View Dashboard
                        </Link>
                    </div>

                    <p className="text-xs text-gray-400 font-bold">
                        A confirmation email has been sent to {user?.email}
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50/20 min-h-screen">
            <div className="container px-6 py-12 max-w-7xl mx-auto">
                <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Checkout <span className="text-gray-400 font-light">Process</span>
                        </h1>
                        <p className="text-gray-500 font-medium mt-2">Securely complete your purchase at Sellsathi</p>
                    </div>
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2 px-6 py-4 bg-white border border-gray-100 rounded-2xl font-bold text-gray-600 hover:bg-gray-50 hover:border-primary/20 hover:text-primary transition-all shadow-sm self-start"
                    >
                        <ArrowLeft size={18} />
                        Back to Shopping
                    </Link>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-12 gap-12 items-start">
                    <div className="xl:col-span-8 space-y-8">
                        {/* Cart Items List */}
                        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    <ShoppingBag size={22} className="text-primary" />
                                    Your Items ({cartItems.length})
                                </h3>
                            </div>
                            <div className="p-8 space-y-4">
                                {cartItems.map((item) => (
                                    <div key={item.id} className="flex gap-6 items-center p-4 bg-gray-50/50 rounded-2xl border border-gray-100/50 group hover:bg-white hover:border-primary/20 transition-all">
                                        <div className="w-20 h-20 rounded-xl overflow-hidden shadow-sm">
                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 mb-1">{item.name}</h4>
                                            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                                                <span>Qty: {item.quantity}</span>
                                                <span>•</span>
                                                <span className="text-primary">₹{item.price.toLocaleString()}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-3">
                                            <span className="text-lg font-black text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
                                            <button
                                                onClick={() => handleRemove(item.id || item.productId)}
                                                className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Step 1: Address */}
                        <section className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden transition-all ${step > 1 ? 'opacity-80' : ''}`}>
                            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20">1</div>
                                    Shipping Information
                                </h3>
                                {step === 2 && (
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-4 py-2 text-primary font-bold hover:bg-primary/5 rounded-xl transition-all"
                                    >
                                        Edit Address
                                    </button>
                                )}
                            </div>

                            <div className="p-8">
                                {step === 1 && savedAddresses.length > 0 && (
                                    <div className="mb-6">
                                        <div className="flex gap-3 mb-6">
                                            <button
                                                onClick={() => {
                                                    setAddressMode('saved');
                                                    if (selectedAddressIndex !== null) {
                                                        setShippingAddress(savedAddresses[selectedAddressIndex]);
                                                    }
                                                }}
                                                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                                                    addressMode === 'saved' 
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                Select Saved Address
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setAddressMode('new');
                                                    setShippingAddress({
                                                        firstName: '',
                                                        lastName: '',
                                                        addressLine: '',
                                                        city: '',
                                                        state: '',
                                                        pincode: ''
                                                    });
                                                }}
                                                className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                                                    addressMode === 'new' 
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                Enter New Address
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {addressMode === 'saved' && savedAddresses.length > 0 && step === 1 ? (
                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Delivery Address</label>
                                            <select
                                                value={selectedAddressIndex !== null ? selectedAddressIndex : ''}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '') {
                                                        setSelectedAddressIndex(null);
                                                        setShippingAddress({
                                                            firstName: '',
                                                            lastName: '',
                                                            addressLine: '',
                                                            city: '',
                                                            state: '',
                                                            pincode: '',
                                                            phone: ''
                                                        });
                                                    } else {
                                                        const index = parseInt(value);
                                                        setSelectedAddressIndex(index);
                                                        setShippingAddress(savedAddresses[index]);
                                                    }
                                                }}
                                                className="w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none"
                                            >
                                                <option value="">Choose an address</option>
                                                {savedAddresses.map((addr, index) => (
                                                    <option key={index} value={index}>
                                                        {addr.label} - {addr.firstName} {addr.lastName}, {addr.addressLine}, {addr.city}
                                                        {addr.isDefault ? ' (Default)' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        {selectedAddressIndex !== null && savedAddresses[selectedAddressIndex] && (
                                            <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-6 rounded-2xl border border-blue-100/50">
                                                <div className="flex items-start gap-3 mb-4">
                                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <MapPin size={20} className="text-primary" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <h4 className="font-bold text-gray-900">{savedAddresses[selectedAddressIndex].label}</h4>
                                                            {savedAddresses[selectedAddressIndex].isDefault && (
                                                                <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">
                                                                    Default
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-gray-700 font-medium">
                                                            {savedAddresses[selectedAddressIndex].firstName} {savedAddresses[selectedAddressIndex].lastName}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            {savedAddresses[selectedAddressIndex].addressLine}
                                                        </p>
                                                        <p className="text-sm text-gray-600">
                                                            {savedAddresses[selectedAddressIndex].city}, {savedAddresses[selectedAddressIndex].state} {savedAddresses[selectedAddressIndex].pincode}
                                                        </p>
                                                        {savedAddresses[selectedAddressIndex].phone && (
                                                            <p className="text-sm text-gray-500 mt-1">
                                                                Phone: {savedAddresses[selectedAddressIndex].phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">First Name</label>
                                            <input
                                                type="text"
                                                name="firstName"
                                                value={shippingAddress.firstName}
                                                onChange={handleAddressChange}
                                                placeholder="John"
                                                className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none ${errors.firstName ? 'ring-2 ring-red-500/20' : ''}`}
                                                readOnly={step === 2}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Last Name</label>
                                            <input
                                                type="text"
                                                name="lastName"
                                                value={shippingAddress.lastName}
                                                onChange={handleAddressChange}
                                                placeholder="Doe"
                                                className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none ${errors.lastName ? 'ring-2 ring-red-500/20' : ''}`}
                                                readOnly={step === 2}
                                            />
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Delivery Address</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="addressLine"
                                                    value={shippingAddress.addressLine}
                                                    onChange={handleAddressChange}
                                                    placeholder="Street, Building, Flat"
                                                    className={`w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none ${errors.addressLine ? 'ring-2 ring-red-500/20' : ''}`}
                                                    readOnly={step === 2}
                                                />
                                                <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-300" size={18} />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">City</label>
                                            <input
                                                type="text"
                                                name="city"
                                                value={shippingAddress.city}
                                                onChange={handleAddressChange}
                                                placeholder="Bangalore"
                                                className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none ${errors.city ? 'ring-2 ring-red-500/20' : ''}`}
                                                readOnly={step === 2}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">State</label>
                                            <input
                                                type="text"
                                                name="state"
                                                value={shippingAddress.state}
                                                onChange={handleAddressChange}
                                                placeholder="Karnataka"
                                                className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none ${errors.state ? 'ring-2 ring-red-500/20' : ''}`}
                                                readOnly={step === 2}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Pincode</label>
                                            <input
                                                type="text"
                                                name="pincode"
                                                value={shippingAddress.pincode}
                                                onChange={handleAddressChange}
                                                placeholder="560XXX"
                                                maxLength={6}
                                                className={`w-full px-6 py-4 bg-gray-50 border-none rounded-2xl font-bold focus:ring-4 ring-primary/10 transition-all outline-none ${errors.pincode ? 'ring-2 ring-red-500/20' : ''}`}
                                                readOnly={step === 2}
                                            />
                                        </div>
                                    </div>
                                )}

                                {step === 1 && (
                                    <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-6">
                                        {addressMode === 'new' && (
                                            <div className="w-full space-y-3">
                                                <label className="flex items-center gap-3 cursor-pointer group">
                                                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${saveAddressForFuture ? 'bg-primary border-primary shadow-lg shadow-primary/20 scale-110' : 'border-gray-200 group-hover:border-gray-300'}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={saveAddressForFuture}
                                                            onChange={(e) => setSaveAddressForFuture(e.target.checked)}
                                                            className="hidden"
                                                        />
                                                        {saveAddressForFuture && <CheckCircle2 size={16} className="text-white" />}
                                                    </div>
                                                    <span className="text-xs font-bold text-gray-500">Save this address for future use</span>
                                                </label>
                                                {saveAddressForFuture && (
                                                    <label className="flex items-center gap-3 cursor-pointer group ml-9">
                                                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${setAsDefault ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/20 scale-110' : 'border-gray-200 group-hover:border-gray-300'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={setAsDefault}
                                                                onChange={(e) => setSetAsDefault(e.target.checked)}
                                                                className="hidden"
                                                            />
                                                            {setAsDefault && <CheckCircle2 size={16} className="text-white" />}
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500">Set as default address</span>
                                                    </label>
                                                )}
                                            </div>
                                        )}
                                        <button
                                            className="w-full sm:w-auto px-12 py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all text-lg"
                                            onClick={handleContinue}
                                            disabled={fetchingSavedAddress}
                                        >
                                            {fetchingSavedAddress ? 'Syncing...' : 'Continue to Payment Selection'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Step 2: Payment */}
                        <section className={`bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden transition-all ${step < 2 ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                            <div className="p-8 border-b border-gray-50">
                                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                                    <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white text-xs font-black shadow-lg shadow-primary/20">2</div>
                                    Secure Payment Method
                                </h3>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Pay Online Option */}
                                <div
                                    onClick={() => setPaymentMethod('razorpay')}
                                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer group relative overflow-hidden ${paymentMethod === 'razorpay' ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'}`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'razorpay' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                            {paymentMethod === 'razorpay' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === 'razorpay' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:text-primary'}`}>
                                            <CreditCard size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 text-lg">Pay Online</h4>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Cards, UPI, Netbanking, Wallets via Razorpay</p>
                                        </div>
                                        {paymentMethod === 'razorpay' && (
                                            <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold ring-1 ring-green-100">
                                                <Shield size={14} className="inline mr-1" />
                                                Secure
                                            </div>
                                        )}
                                    </div>

                                    <AnimatePresence>
                                        {paymentMethod === 'razorpay' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-6 pt-6 border-t border-gray-100 overflow-hidden"
                                            >
                                                <div className="bg-gradient-to-br from-blue-50/50 to-purple-50/50 p-5 rounded-2xl mb-5 border border-blue-100/50">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0">
                                                            <Shield size={20} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 mb-1">Secure Payment via Razorpay</p>
                                                            <p className="text-xs text-gray-600 leading-relaxed">
                                                                You'll be redirected to Razorpay to complete your payment. All major cards, UPI, netbanking & wallets are accepted.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="w-full py-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleContinue();
                                                    }}
                                                    disabled={razorpayLoading}
                                                >
                                                    {razorpayLoading ? (
                                                        <>
                                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                            Loading...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Shield size={20} />
                                                            Pay ₹{subtotal.toLocaleString()} Securely
                                                        </>
                                                    )}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Cash on Delivery Option */}
                                <div
                                    onClick={() => setPaymentMethod('cod')}
                                    className={`p-6 rounded-3xl border-2 transition-all cursor-pointer group relative overflow-hidden ${paymentMethod === 'cod' ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'}`}
                                >
                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${paymentMethod === 'cod' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                                            {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                                        </div>
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${paymentMethod === 'cod' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-400 group-hover:text-primary'}`}>
                                            <Banknote size={22} />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900 text-lg">Cash on Delivery</h4>
                                            <p className="text-xs text-gray-500 font-medium mt-0.5">Pay when you receive the order</p>
                                        </div>
                                    </div>

                                    <AnimatePresence>
                                        {paymentMethod === 'cod' && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-6 pt-6 border-t border-gray-100 overflow-hidden"
                                            >
                                                <div className="bg-amber-50/50 p-5 rounded-2xl mb-5 border border-amber-100/50">
                                                    <p className="text-sm text-gray-700 leading-relaxed text-center font-medium">
                                                        Pay online for a safer and contactless delivery experience
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    className="w-full py-5 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleContinue();
                                                    }}
                                                    disabled={loading || razorpayLoading}
                                                >
                                                    {loading ? 'Processing...' : 'Place Order'}
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Order Summary Sidebar */}
                    <div className="xl:col-span-4 lg:sticky lg:top-10">
                        <section className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                            <div className="p-8 border-b border-gray-50">
                                <h3 className="text-xl font-bold text-gray-900">Order Summary</h3>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-400 font-bold text-sm">Cart Subtotal</span>
                                        <span className="text-gray-900 font-black">₹{subtotal.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-400 font-bold text-sm">Shipping Fee</span>
                                        <span className="text-green-500 font-black uppercase text-xs">Free</span>
                                    </div>
                                    <div className="flex justify-between items-center group">
                                        <span className="text-gray-400 font-bold text-sm">Platform Tax</span>
                                        <span className="text-gray-900 font-black">₹0.00</span>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-50 w-full" />

                                <div className="space-y-2">
                                    <div className="flex justify-between items-end">
                                        <span className="text-gray-900 font-black text-lg">Total Amount</span>
                                        <div className="text-right">
                                            <span className="text-3xl font-black text-primary">₹{subtotal.toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-green-600 font-bold text-right uppercase tracking-widest">
                                        Save with Sellsathi Premium
                                    </p>
                                </div>

                                <div className="pt-2">
                                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex gap-3 items-center">
                                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                                            <Shield size={20} />
                                        </div>
                                        <div>
                                            <h5 className="text-xs font-black text-gray-900 leading-none mb-1">Guaranteed Safety</h5>
                                            <p className="text-[10px] text-gray-400 font-bold">100% Secure Transaction System</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50/50 p-6 flex flex-col items-center gap-3">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200" />
                                    ))}
                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-primary text-[8px] flex items-center justify-center text-white font-black">+2k</div>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold">Consumers recently purchased here</p>
                            </div>
                        </section>

                        <div className="mt-6 flex items-center justify-center gap-6 grayscale opacity-30">
                            <Shield size={24} />
                            <Package size={24} />
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Animation */}
            <AnimatePresence>
                {showAnimation && (
                    <ConfirmationAnimation onComplete={handleAnimationComplete} />
                )}
            </AnimatePresence>
        </div>
    );
}
