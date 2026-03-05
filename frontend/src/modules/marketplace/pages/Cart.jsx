import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShoppingCart,
    Trash2,
    Plus,
    Minus,
    ArrowRight,
    ArrowLeft,
    ShoppingBag,
    Package
} from 'lucide-react';
import { listenToCart, removeFromCart, updateCartItemQuantity } from '@/modules/shared/utils/cartUtils';
import { auth } from '@/modules/shared/config/firebase';
import PriceDisplay from '@/modules/shared/components/common/PriceDisplay';

export default function Cart() {
    const navigate = useNavigate();
    const [cartItems, setCartItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = listenToCart((items) => {
            setCartItems(items);
            setLoading(false);
        });
        return () => unsubscribe && unsubscribe();
    }, []);

    const handleRemove = async (productId) => {
        await removeFromCart(productId);
    };

    const handleQuantityChange = async (item, newQuantity) => {
        if (newQuantity < 1) return;
        if (newQuantity > (item.stock || 99)) {
            alert(`Only ${item.stock || 99} items available in stock`);
            return;
        }
        await updateCartItemQuantity(item.id || item.productId, newQuantity);
    };

    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = subtotal > 500 ? 0 : 50;
    const total = subtotal + shipping;

    const handleCheckout = () => {
        if (!auth.currentUser) {
            window.dispatchEvent(new Event('openLoginModal'));
            return;
        }
        navigate('/checkout');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="bg-gray-50/20 min-h-[70vh] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center max-w-md"
                >
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShoppingCart size={48} className="text-gray-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-3">Your Cart is Empty</h2>
                    <p className="text-gray-500 mb-6">
                        Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
                    </p>
                    <Link
                        to="/products"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary/90 transition-all"
                    >
                        <ShoppingBag size={20} />
                        Continue Shopping
                    </Link>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50/20 min-h-screen">
            <div className="container px-6 py-12 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                            Shopping <span className="text-primary">Cart</span>
                        </h1>
                        <p className="text-gray-500 font-medium mt-2">
                            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'} in your cart
                        </p>
                    </div>
                    <Link
                        to="/products"
                        className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 hover:border-primary/20 hover:text-primary transition-all self-start"
                    >
                        <ArrowLeft size={18} />
                        Continue Shopping
                    </Link>
                </div>

                {/* Checkout Button - Top */}
                <div className="mb-6">
                    <button
                        onClick={handleCheckout}
                        className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        <ShoppingBag size={24} />
                        Proceed to Checkout
                        <ArrowRight size={24} />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2 space-y-4">
                        <AnimatePresence mode="popLayout">
                            {cartItems.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -100 }}
                                    className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all"
                                >
                                    <div className="flex gap-6">
                                        {/* Product Image */}
                                        <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                            <img
                                                src={item.imageUrl || item.image}
                                                alt={item.name}
                                                className="w-full h-full object-contain p-2"
                                            />
                                        </div>

                                        {/* Product Details */}
                                        <div className="flex-1 flex flex-col">
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg mb-1">
                                                        {item.name}
                                                    </h3>
                                                    {item.category && (
                                                        <p className="text-sm text-gray-500">{item.category}</p>
                                                    )}
                                                    {/* Variant Info */}
                                                    {(item.selectedColor || item.selectedSize || item.selectedStorage) && (
                                                        <div className="flex gap-2 mt-2 text-xs text-gray-600">
                                                            {item.selectedColor && (
                                                                <span className="px-2 py-1 bg-gray-100 rounded">
                                                                    Color: {item.selectedColor}
                                                                </span>
                                                            )}
                                                            {item.selectedSize && (
                                                                <span className="px-2 py-1 bg-gray-100 rounded">
                                                                    Size: {item.selectedSize}
                                                                </span>
                                                            )}
                                                            {item.selectedStorage && (
                                                                <span className="px-2 py-1 bg-gray-100 rounded">
                                                                    Storage: {item.selectedStorage}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleRemove(item.id || item.productId)}
                                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove from cart"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            </div>

                                            {/* Price and Quantity */}
                                            <div className="flex justify-between items-end mt-auto">
                                                <div>
                                                    <PriceDisplay
                                                        product={{
                                                            ...item,
                                                            price: item.originalPrice || item.price,
                                                            discountPrice: item.price
                                                        }}
                                                        size="md"
                                                        showBadge={false}
                                                    />
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-3 bg-gray-100 rounded-xl p-1">
                                                    <button
                                                        onClick={() => handleQuantityChange(item, item.quantity - 1)}
                                                        disabled={item.quantity <= 1}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        <Minus size={16} />
                                                    </button>
                                                    <span className="w-12 text-center font-bold text-gray-900">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleQuantityChange(item, item.quantity + 1)}
                                                        disabled={item.quantity >= (item.stock || 99)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Stock Warning */}
                                            {item.stock && item.stock < 5 && (
                                                <p className="text-xs text-orange-600 font-semibold mt-2">
                                                    Only {item.stock} left in stock!
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>

                    {/* Order Summary - Sticky */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm sticky top-24">
                            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Package size={22} className="text-primary" />
                                Order Summary
                            </h2>

                            <div className="space-y-4 mb-6">
                                <div className="flex justify-between text-gray-600">
                                    <span>Subtotal ({cartItems.length} items)</span>
                                    <span className="font-semibold">₹{subtotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                    <span>Shipping</span>
                                    {shipping === 0 ? (
                                        <span className="font-semibold text-green-600">FREE</span>
                                    ) : (
                                        <span className="font-semibold">₹{shipping}</span>
                                    )}
                                </div>
                                {subtotal < 500 && (
                                    <p className="text-xs text-gray-500 bg-blue-50 p-2 rounded-lg">
                                        Add ₹{(500 - subtotal).toLocaleString()} more for FREE shipping!
                                    </p>
                                )}
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-900">Total</span>
                                        <span className="text-2xl font-black text-primary">
                                            ₹{total.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCheckout}
                                className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-black text-lg shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                            >
                                Proceed to Checkout
                                <ArrowRight size={20} />
                            </button>

                            <div className="mt-6 space-y-3">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span>Secure checkout</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span>7-day return policy</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span>Genuine products</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
