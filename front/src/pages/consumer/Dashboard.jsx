import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import {
    ShoppingBag,
    Heart,
    Settings,
    LogOut,
    Clock,
    CheckCircle2,
    Package,
    TrendingUp,
    ArrowLeft,
    User,
    MapPin,
    CreditCard,
    HelpCircle,
    RotateCcw,
    Download,
    ShoppingCart,
    Bookmark,
    Wallet,
    LayoutDashboard,
    Shield,
    Banknote,
    Star,
    MessageSquare
} from 'lucide-react';
import { listenToWishlist, removeFromWishlist as removeFromWishlistAPI } from '../../utils/wishlistUtils';
import { authFetch } from '../../utils/api';
import ReviewModal from '../../components/common/ReviewModal';

// Helper function to format dates from Firestore Timestamp
const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';

    try {
        // Handle Firestore Timestamp object
        if (timestamp.toDate && typeof timestamp.toDate === 'function') {
            return timestamp.toDate().toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }

        // Handle regular Date object or timestamp number
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }

        return 'Invalid Date';
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
};

export default function ConsumerDashboard() {
    const [user, setUser] = useState(null);
    const [userName, setUserName] = useState('');
    const [userPhoto, setUserPhoto] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [orders, setOrders] = useState([]);
    const [wishlist, setWishlist] = useState([]);
    const [addresses, setAddresses] = useState([]);
    const [reviewableOrders, setReviewableOrders] = useState([]);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [selectedReviewProduct, setSelectedReviewProduct] = useState(null);
    const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, totalSpent: 0 });
    const [activeTab, setActiveTab] = useState('dashboard');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [newAddress, setNewAddress] = useState({
        label: 'Home',
        firstName: '',
        lastName: '',
        addressLine: '',
        city: '',
        state: '',
        pincode: '',
        phone: ''
    });
    const [editingAddress, setEditingAddress] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        let wishlistUnsubscribe = null;
        let mounted = true;

        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (!mounted) return;

            if (currentUser) {
                setUser(currentUser);

                // Fetch real user name from Firestore (not Firebase Auth displayName which can be stale)
                try {
                    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUserName(userData.name || userData.fullName || currentUser.displayName || 'User');
                        setUserPhoto(userData.photoURL || currentUser.photoURL || null);
                    } else {
                        // Fallback: check localStorage
                        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                        setUserName(localUser.fullName || currentUser.displayName || 'User');
                    }
                } catch (e) {
                    console.log('Error fetching user name from Firestore:', e);
                    const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                    setUserName(localUser.fullName || currentUser.displayName || 'User');
                }

                // Fetch data in parallel with timeout
                try {
                    await Promise.race([
                        Promise.all([
                            fetchOrders(currentUser.uid),
                            fetchAddresses(currentUser.uid),
                            fetchReviewableOrders(currentUser.uid)
                        ]),
                        new Promise((_, reject) =>
                            setTimeout(() => reject(new Error('Timeout')), 5000)
                        )
                    ]);
                } catch (error) {
                    console.error('Error loading dashboard data:', error);
                }

                // Use wishlist listener
                wishlistUnsubscribe = listenToWishlist((items) => {
                    if (mounted) {
                        setWishlist(items);
                    }
                });

                if (mounted) {
                    setLoading(false);
                }
            } else {
                navigate('/');
            }
        });

        return () => {
            mounted = false;
            unsubscribe();
            if (wishlistUnsubscribe) {
                wishlistUnsubscribe();
            }
        };
    }, [navigate]);

    const fetchOrders = async (userId) => {
        try {
            console.log('[Dashboard] Fetching orders for userId:', userId);
            const ordersRef = collection(db, 'orders');
            // Try both 'userId' and 'uid' fields
            const q1 = query(ordersRef, where('userId', '==', userId));
            const q2 = query(ordersRef, where('uid', '==', userId));

            let ordersData = [];

            try {
                const querySnapshot1 = await getDocs(q1);
                console.log('[Dashboard] Query by userId found:', querySnapshot1.size, 'orders');
                querySnapshot1.forEach((doc) => {
                    ordersData.push({ id: doc.id, ...doc.data() });
                });
            } catch (e) {
                console.log('Query with userId failed:', e.message);
            }

            if (ordersData.length === 0) {
                try {
                    const querySnapshot2 = await getDocs(q2);
                    console.log('[Dashboard] Query by uid found:', querySnapshot2.size, 'orders');
                    querySnapshot2.forEach((doc) => {
                        ordersData.push({ id: doc.id, ...doc.data() });
                    });
                } catch (e) {
                    console.log('Query with uid also failed:', e.message);
                }
            }

            setOrders(ordersData);

            const total = ordersData.length;
            const pending = ordersData.filter(o => o.status === 'Pending' || o.status === 'Processing').length;
            const delivered = ordersData.filter(o => o.status === 'Delivered').length;
            const totalSpent = ordersData.reduce((sum, o) => sum + (o.total || 0), 0);

            setStats({ total, pending, delivered, totalSpent });

            if (ordersData.length > 0) {
                setSelectedOrder(ordersData[0]);
            }
        } catch (error) {
            console.error('Error fetching orders:', error);
        }
    };

    const fetchReviewableOrders = async (userId) => {
        try {
            const response = await authFetch(`/api/user/${userId}/reviewable-orders`);
            const data = await response.json();
            if (data.success) {
                setReviewableOrders(data.orders || []);
            }
        } catch (error) {
            console.error('Error fetching reviewable orders:', error);
            setReviewableOrders([]);
        }
    };

    const fetchAddresses = async (userId) => {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                setAddresses(userData.addresses || []);
            } else {
                setAddresses([]);
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
            setAddresses([]);
        }
    };

    const removeFromWishlist = async (productId) => {
        const result = await removeFromWishlistAPI(productId);
        if (!result.success) {
            alert(result.message || 'Failed to remove from wishlist');
        }
        // Wishlist will update automatically via listener
    };

    const saveAddress = async () => {
        try {
            const addressToSave = editingAddress || newAddress;
            const response = await authFetch(`/api/user/${user.uid}/address/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: addressToSave })
            });
            const data = await response.json();
            if (data.success) {
                await fetchAddresses(user.uid);
                setNewAddress({
                    label: 'Home',
                    firstName: '',
                    lastName: '',
                    addressLine: '',
                    city: '',
                    state: '',
                    pincode: '',
                    phone: ''
                });
                setEditingAddress(null);
            }
        } catch (error) {
            console.error('Error saving address:', error);
        }
    };

    const setAsDefaultAddress = async (addressIndex) => {
        try {
            const addressToUpdate = { ...addresses[addressIndex], id: addressIndex, isDefault: true };
            const response = await authFetch(`/api/user/${user.uid}/address/save`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: addressToUpdate })
            });
            const data = await response.json();
            if (data.success) {
                await fetchAddresses(user.uid);
            }
        } catch (error) {
            console.error('Error setting default address:', error);
        }
    };

    const deleteAddress = async (addressId) => {
        try {
            const response = await authFetch(`/api/user/${user.uid}/address/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ addressId })
            });
            const data = await response.json();
            if (data.success) {
                await fetchAddresses(user.uid);
            }
        } catch (error) {
            console.error('Error deleting address:', error);
        }
    };

    const handleDownloadInvoice = async (orderId) => {
        try {
            const response = await authFetch(`/api/invoice/${orderId}`);
            if (!response.ok) throw new Error('Failed to download invoice');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `invoice-${orderId}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading invoice:', error);
            alert('Could not download invoice. Please try again later.');
        }
    };

    const recentProducts = [
        { id: 1, name: 'Laptop Pro', price: 56999, image: null },
        { id: 2, name: 'Air Fryer', price: 3499, image: null },
        { id: 3, name: 'Sneakers', price: 2199, image: null },
        { id: 4, name: 'Smart Watch', price: 1299, image: null },
        { id: 5, name: 'Headphones', price: 899, image: null },
    ];

    const handleProfilePictureUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            // Upload to Cloudinary using existing endpoint
            const response = await authFetch('/seller/upload-image', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (data.success && data.url) {
                // Update Firestore user document
                await authFetch(`/api/user/${user.uid}/profile/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ profileData: { photoURL: data.url } })
                });

                // We update local state directly for immediate feedback
                setUserPhoto(data.url);

                // Optionally update local storage
                const localUser = JSON.parse(localStorage.getItem('user') || '{}');
                localUser.photoURL = data.url;
                localStorage.setItem('user', JSON.stringify(localUser));

                alert('Profile picture updated successfully!');
            } else {
                alert('Upload failed: ' + (data.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error uploading profile picture:', err);

            // Fallback for demo if endpoint fails
            const reader = new FileReader();
            reader.onloadend = () => {
                setUserPhoto(reader.result);
                // In a real app we would save this base64 string or notify the user
                // alert('Profile picture updated locally (backend upload failed).');
            };
            reader.readAsDataURL(file);

        } finally {
            setUploadingImage(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center gap-2 text-gray-600 hover:text-primary text-sm font-medium"
                            >
                                <ArrowLeft size={16} />
                                Back
                            </button>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <User size={16} className="text-gray-400" />
                            <span className="text-gray-700 font-medium">{userName || user.email}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {/* Enhanced Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden sticky top-24">
                            {/* User Profile */}
                            <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                                <div className="flex flex-col items-center text-center">
                                    {userPhoto ? (
                                        <div className="w-16 h-16 rounded-full mb-2 overflow-hidden border-2 border-primary">
                                            <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-2xl mb-2">
                                            {(userName || user.email || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-600 mb-1">Hello,</p>
                                    <p className="font-semibold text-gray-900 text-sm">
                                        {userName || 'User'}!
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-xs text-green-600 font-medium">Online</span>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation Menu */}
                            <nav className="p-2">
                                <button
                                    onClick={() => setActiveTab('dashboard')}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <LayoutDashboard size={18} />
                                        <span>Dashboard</span>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setActiveTab('orders')}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'orders' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <ShoppingBag size={18} />
                                        <span>My Orders</span>
                                    </div>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{orders.length}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('wishlist')}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'wishlist' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Heart size={18} />
                                        <span>Wishlist</span>
                                    </div>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{wishlist.length}</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('address')}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'address' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <MapPin size={18} />
                                    <span>Address Book</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('reviews')}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'reviews' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Star size={18} />
                                        <span>My Reviews</span>
                                    </div>
                                    {reviewableOrders.length > 0 && (
                                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">{reviewableOrders.length}</span>
                                    )}
                                </button>

                                <button
                                    onClick={() => setActiveTab('settings')}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <Settings size={18} />
                                    <span>Account Settings</span>
                                </button>

                                <button
                                    onClick={() => setActiveTab('help')}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'help' ? 'bg-blue-50 text-primary' : 'text-gray-700 hover:bg-gray-50'
                                        }`}
                                >
                                    <HelpCircle size={18} />
                                    <span>Help & Support</span>
                                </button>

                                <div className="border-t border-gray-200 my-2"></div>

                                <button
                                    onClick={() => auth.signOut()}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} />
                                    <span>Logout</span>
                                </button>
                            </nav>
                        </div>
                    </div>

                    {/* Main Content Area */}
                    <div className="lg:col-span-4">
                        {activeTab === 'dashboard' && (
                            <div>
                                {/* Stats Cards */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                <ShoppingBag size={20} className="text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Total Orders</p>
                                                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                                <Clock size={20} className="text-orange-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Pending Orders</p>
                                                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                <CheckCircle2 size={20} className="text-green-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Delivered</p>
                                                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                <TrendingUp size={20} className="text-purple-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500">Total Spent</p>
                                                <p className="text-2xl font-bold text-gray-900">₹{stats.totalSpent}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Two Column Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Orders Table */}
                                    <div className="lg:col-span-2">
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                                <h2 className="text-base font-semibold text-gray-900">My Orders</h2>
                                                <button
                                                    onClick={() => setActiveTab('orders')}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    View All
                                                </button>
                                            </div>
                                            {/* Orders Table */}
                                            <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                                <table className="w-full">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {orders.slice(0, 5).map((order) => (
                                                            <tr
                                                                key={order.id}
                                                                onClick={() => setSelectedOrder(order)}
                                                                className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedOrder?.id === order.id ? 'bg-blue-50' : ''
                                                                    }`}
                                                            >
                                                                <td className="px-4 py-3">
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                                                            {order.items && order.items[0] && (order.items[0].imageUrl || order.items[0].image) ? (
                                                                                <img src={order.items[0].imageUrl || order.items[0].image} alt="Product" className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <Package size={16} className="text-gray-400" />
                                                                            )}
                                                                        </div>
                                                                        <span className="text-sm font-medium text-gray-900">
                                                                            #{order.orderId || order.id.substring(0, 6)}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                    {formatDate(order.createdAt)}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                                    {order.items?.length || 0} items
                                                                </td>
                                                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                                                    ₹{order.total?.toLocaleString('en-IN')}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                                'bg-orange-100 text-orange-700'
                                                                        }`}>
                                                                        {order.status === 'Delivered' && '●'}
                                                                        {order.status === 'Pending' && '●'}
                                                                        {order.status || 'Pending'}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            navigate(`/track?orderId=${order.orderId || order.id}`);
                                                                        }}
                                                                        className="text-sm text-primary hover:underline font-medium"
                                                                    >
                                                                        Track
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                {orders.length === 0 && (
                                                    <div className="p-12 text-center">
                                                        <Package size={48} className="text-gray-300 mx-auto mb-4" />
                                                        <p className="text-gray-500 mb-4">No orders yet</p>
                                                        <button
                                                            onClick={() => navigate('/products')}
                                                            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                                                        >
                                                            Start Shopping
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Recently Viewed */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                                <h2 className="text-base font-semibold text-gray-900">Recently Viewed</h2>
                                                <button
                                                    onClick={() => navigate('/products')}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    View All
                                                </button>
                                            </div>
                                            <div className="p-4">
                                                <div className="grid grid-cols-5 gap-4">
                                                    {recentProducts.map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="group cursor-pointer"
                                                            onClick={() => navigate('/products')}
                                                        >
                                                            <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                                                <Package size={32} className="text-gray-400" />
                                                            </div>
                                                            <p className="text-xs text-gray-700 font-medium truncate">{product.name}</p>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <p className="text-sm font-bold text-gray-900">₹{product.price.toLocaleString()}</p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate('/products');
                                                                    }}
                                                                    className="w-6 h-6 bg-primary rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <ShoppingCart size={14} className="text-white" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Recommended Products */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
                                            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <h2 className="text-base font-semibold text-gray-900">Recommended</h2>
                                                    <span className="px-2 py-0.5 bg-orange-500 text-white text-xs font-bold rounded">HOT</span>
                                                </div>
                                                <button
                                                    onClick={() => navigate('/products')}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    View All
                                                </button>
                                            </div>
                                            <div className="p-4">
                                                <div className="grid grid-cols-5 gap-4">
                                                    {[
                                                        { id: 1, name: 'Mobile Phone', price: 24999 },
                                                        { id: 2, name: 'Tablet', price: 18999 },
                                                        { id: 3, name: 'Camera', price: 45999 },
                                                        { id: 4, name: 'Speaker', price: 2999 },
                                                        { id: 5, name: 'Power Bank', price: 1499 },
                                                    ].map((product) => (
                                                        <div
                                                            key={product.id}
                                                            className="group cursor-pointer"
                                                            onClick={() => navigate('/products')}
                                                        >
                                                            <div className="aspect-square bg-gradient-to-br from-orange-50 to-red-50 rounded-lg mb-2 flex items-center justify-center group-hover:from-orange-100 group-hover:to-red-100 transition-colors border border-orange-200">
                                                                <Package size={32} className="text-orange-500" />
                                                            </div>
                                                            <p className="text-xs text-gray-700 font-medium truncate">{product.name}</p>
                                                            <div className="flex items-center justify-between mt-1">
                                                                <p className="text-sm font-bold text-gray-900">₹{product.price.toLocaleString()}</p>
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        navigate('/products');
                                                                    }}
                                                                    className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                >
                                                                    <ShoppingCart size={14} className="text-white" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order Details Sidebar */}
                                    <div className="lg:col-span-1 space-y-6">
                                        {selectedOrder && (
                                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h3 className="text-base font-semibold text-gray-900">Order Details</h3>
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${selectedOrder.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                        'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        ● {selectedOrder.status || 'Pending'}
                                                    </span>
                                                </div>

                                                {/* Timeline */}
                                                <div className="space-y-3 mb-6">
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedOrder.status ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                            <CheckCircle2 size={14} />
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <p className="font-medium text-sm text-gray-900">Order Placed</p>
                                                            <p className="text-xs text-gray-500">
                                                                {formatDate(selectedOrder.createdAt)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="ml-4 w-0.5 h-4 bg-gray-200"></div>

                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedOrder.status === 'Processing' || selectedOrder.status === 'Shipped' ||
                                                            selectedOrder.status === 'Delivered' ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                            <Clock size={14} />
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <p className="font-medium text-sm text-gray-900">Processing</p>
                                                        </div>
                                                    </div>

                                                    <div className="ml-4 w-0.5 h-4 bg-gray-200"></div>

                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedOrder.status === 'Shipped' || selectedOrder.status === 'Delivered'
                                                            ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                            <Package size={14} />
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <p className="font-medium text-sm text-gray-900">Shipped</p>
                                                        </div>
                                                    </div>

                                                    <div className="ml-4 w-0.5 h-4 bg-gray-200"></div>

                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedOrder.status === 'Out for Delivery' || selectedOrder.status === 'Delivered'
                                                            ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                            <TrendingUp size={14} />
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <p className="font-medium text-sm text-gray-900">Out for Delivery</p>
                                                        </div>
                                                    </div>

                                                    <div className="ml-4 w-0.5 h-4 bg-gray-200"></div>

                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${selectedOrder.status === 'Delivered' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                                            }`}>
                                                            <CheckCircle2 size={14} />
                                                        </div>
                                                        <div className="flex-1 pt-1">
                                                            <p className="font-medium text-sm text-gray-900">Delivered</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Order Items Section */}
                                                {selectedOrder.items && selectedOrder.items.length > 0 && (
                                                    <div className="mb-6 pb-6 border-b border-gray-200">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Order Items</h4>
                                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                                            {selectedOrder.items.map((item, idx) => (
                                                                <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                                                    {item.imageUrl && (
                                                                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                                                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                                        </div>
                                                                    )}
                                                                    <div className="flex-1 min-w-0">
                                                                        <p className="text-xs font-bold text-gray-900 truncate">{item.name}</p>
                                                                        <p className="text-xs text-gray-500">Qty: {item.quantity} × ₹{item.price}</p>
                                                                    </div>
                                                                    <p className="text-xs font-black text-primary">₹{(item.price * item.quantity).toLocaleString()}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Shipping Address Section */}
                                                {selectedOrder.shippingAddress && (
                                                    <div className="mb-6 pb-6 border-b border-gray-200">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Delivery Address</h4>
                                                        <div className="p-3 bg-gray-50 rounded-lg text-xs text-gray-700">
                                                            <p className="font-bold text-gray-900">{selectedOrder.shippingAddress.firstName} {selectedOrder.shippingAddress.lastName}</p>
                                                            <p className="mt-1">{selectedOrder.shippingAddress.addressLine}</p>
                                                            <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.pincode}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Payment Method Section */}
                                                {selectedOrder.paymentMethod && (
                                                    <div className="mb-6">
                                                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Payment Method</h4>
                                                        <div className="p-3 bg-gray-50 rounded-lg">
                                                            <p className="text-xs font-bold text-gray-900 uppercase">{selectedOrder.paymentMethod}</p>
                                                            {selectedOrder.paymentId && (
                                                                <p className="text-xs text-gray-500 mt-1">Payment ID: {selectedOrder.paymentId}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Action Buttons */}
                                                <div className="space-y-2">
                                                    <button
                                                        onClick={() => navigate(`/track?orderId=${selectedOrder.orderId || selectedOrder.id}`)}
                                                        className="w-full px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                    >
                                                        Track Order
                                                    </button>
                                                    <button
                                                        onClick={() => handleDownloadInvoice(selectedOrder.orderId || selectedOrder.id)}
                                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Download size={16} />
                                                        Download Invoice
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* Quick Actions */}
                                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
                                            <h3 className="text-base font-semibold text-gray-900 mb-4">Quick Actions</h3>
                                            <div className="space-y-2">
                                                <button
                                                    onClick={() => {
                                                        if (selectedOrder) {
                                                            navigate('/products');
                                                        }
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <RotateCcw size={18} className="text-blue-600" />
                                                    <span className="text-sm font-medium text-gray-700">Buy Again</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (selectedOrder && selectedOrder.status === 'Delivered') {
                                                            alert('Return request initiated. Our team will contact you soon.');
                                                        } else {
                                                            alert('Only delivered orders can be returned.');
                                                        }
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <RotateCcw size={18} className="text-orange-600" />
                                                    <span className="text-sm font-medium text-gray-700">Return Order</span>
                                                </button>
                                                <button
                                                    onClick={() => setActiveTab('wishlist')}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left"
                                                >
                                                    <Bookmark size={18} className="text-red-600" />
                                                    <span className="text-sm font-medium text-gray-700">Saved Items</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Other Tabs */}
                        {activeTab === 'orders' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">All Orders</h2>
                                    <span className="text-sm text-gray-500">{orders.length} total orders</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {orders.map((order) => (
                                                <tr
                                                    key={order.id}
                                                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setActiveTab('dashboard');
                                                    }}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                                                                {order.items && order.items[0] && (order.items[0].imageUrl || order.items[0].image) ? (
                                                                    <img src={order.items[0].imageUrl || order.items[0].image} alt="Product" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Package size={16} className="text-gray-400" />
                                                                )}
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                #{order.orderId || order.id.substring(0, 8)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-600">
                                                        {formatDate(order.createdAt)}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-sm text-gray-900">
                                                            {order.items?.length || 0} items
                                                        </div>
                                                        {order.items && order.items.length > 0 && (
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {order.items[0].name}
                                                                {order.items.length > 1 && ` +${order.items.length - 1} more`}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                                        ₹{order.total?.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-xs font-medium text-gray-700 uppercase">
                                                            {order.paymentMethod || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${order.status === 'Delivered' ? 'bg-green-100 text-green-700' :
                                                            order.status === 'Shipped' ? 'bg-blue-100 text-blue-700' :
                                                                order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                                                    'bg-orange-100 text-orange-700'
                                                            }`}>
                                                            ● {order.status || 'Processing'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/track?orderId=${order.orderId || order.id}`);
                                                                }}
                                                                className="text-sm text-primary hover:underline font-medium"
                                                            >
                                                                Track
                                                            </button>
                                                            <span className="text-gray-300">|</span>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDownloadInvoice(order.orderId || order.id);
                                                                }}
                                                                className="text-sm text-gray-600 hover:underline font-medium"
                                                            >
                                                                Invoice
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {orders.length === 0 && (
                                        <div className="p-12 text-center">
                                            <Package size={48} className="text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 mb-4">No orders yet</p>
                                            <button
                                                onClick={() => navigate('/products')}
                                                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium"
                                            >
                                                Start Shopping
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'wishlist' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">My Wishlist</h2>
                                    <span className="text-sm text-gray-500">{wishlist.length} items</span>
                                </div>
                                {wishlist.length === 0 ? (
                                    <div className="text-center py-12">
                                        <Heart size={48} className="text-gray-300 mx-auto mb-4" />
                                        <p className="text-gray-500 mb-4">Your wishlist is empty</p>
                                        <button
                                            onClick={() => navigate('/products')}
                                            className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Browse Products
                                        </button>
                                    </div>
                                ) : (
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {wishlist.map((item) => (
                                                <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                                                    <div className="aspect-square bg-gray-100 relative">
                                                        {item.imageUrl || item.image ? (
                                                            <img src={item.imageUrl || item.image} alt={item.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center">
                                                                <Package size={48} className="text-gray-300" />
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={() => removeFromWishlist(item.id)}
                                                            className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-red-50 transition-colors"
                                                        >
                                                            <Heart size={16} className="text-red-500 fill-red-500" />
                                                        </button>
                                                    </div>
                                                    <div className="p-4">
                                                        <h3 className="font-semibold text-gray-900 mb-1 truncate">{item.name}</h3>
                                                        <p className="text-sm text-gray-500 mb-2 line-clamp-2">{item.description}</p>
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-lg font-bold text-primary">₹{item.price?.toLocaleString()}</span>
                                                            <button
                                                                onClick={() => navigate('/products')}
                                                                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                            >
                                                                View
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'address' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                                    <h2 className="text-lg font-semibold text-gray-900">Address Book</h2>
                                    <button
                                        onClick={() => setEditingAddress({ label: 'Home', firstName: '', lastName: '', addressLine: '', city: '', state: '', pincode: '', phone: '' })}
                                        className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                    >
                                        Add New Address
                                    </button>
                                </div>
                                <div className="p-6">
                                    {editingAddress && (
                                        <div className="mb-6 p-6 border-2 border-primary rounded-lg bg-blue-50">
                                            <h3 className="text-base font-semibold text-gray-900 mb-4">
                                                {editingAddress.id ? 'Edit Address' : 'New Address'}
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                                                    <select
                                                        value={editingAddress.label}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, label: e.target.value })}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    >
                                                        <option value="Home">Home</option>
                                                        <option value="Work">Work</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                                    <input
                                                        type="tel"
                                                        value={editingAddress.phone}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, phone: e.target.value })}
                                                        placeholder="9876543210"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                                                    <input
                                                        type="text"
                                                        value={editingAddress.firstName}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, firstName: e.target.value })}
                                                        placeholder="John"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                                                    <input
                                                        type="text"
                                                        value={editingAddress.lastName}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, lastName: e.target.value })}
                                                        placeholder="Doe"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address Line</label>
                                                    <input
                                                        type="text"
                                                        value={editingAddress.addressLine}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, addressLine: e.target.value })}
                                                        placeholder="123 Main Street, Apt 4B"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                                                    <input
                                                        type="text"
                                                        value={editingAddress.city}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, city: e.target.value })}
                                                        placeholder="Bangalore"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                                                    <input
                                                        type="text"
                                                        value={editingAddress.state}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, state: e.target.value })}
                                                        placeholder="Karnataka"
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
                                                    <input
                                                        type="text"
                                                        value={editingAddress.pincode}
                                                        onChange={(e) => setEditingAddress({ ...editingAddress, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                                                        placeholder="560001"
                                                        maxLength={6}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex gap-3 mt-4">
                                                <button
                                                    onClick={saveAddress}
                                                    className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                                >
                                                    Save Address
                                                </button>
                                                <button
                                                    onClick={() => setEditingAddress(null)}
                                                    className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {addresses.length === 0 && !editingAddress ? (
                                        <div className="text-center py-12">
                                            <MapPin size={48} className="text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 mb-4">No saved addresses</p>
                                            <button
                                                onClick={() => setEditingAddress({ label: 'Home', firstName: '', lastName: '', addressLine: '', city: '', state: '', pincode: '', phone: '' })}
                                                className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                            >
                                                Add Your First Address
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {addresses.map((address, index) => (
                                                <div key={index} className={`border rounded-lg p-4 transition-colors ${address.isDefault ? 'border-green-500 bg-green-50/30' : 'border-gray-200 hover:border-primary'}`}>
                                                    <div className="flex items-start justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                                                                <MapPin size={16} className="text-primary" />
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-gray-900">{address.label}</span>
                                                                {address.isDefault && (
                                                                    <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                                                        <CheckCircle2 size={12} />
                                                                        Default
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() => setEditingAddress({ ...address, id: index })}
                                                                className="text-primary hover:text-blue-700 text-sm font-medium"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => deleteAddress(index)}
                                                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-700 space-y-1 mb-3">
                                                        <p className="font-medium">{address.firstName} {address.lastName}</p>
                                                        <p>{address.addressLine}</p>
                                                        <p>{address.city}, {address.state} {address.pincode}</p>
                                                        <p className="text-gray-500">Phone: {address.phone}</p>
                                                    </div>
                                                    {!address.isDefault && (
                                                        <button
                                                            onClick={() => setAsDefaultAddress(index)}
                                                            className="w-full py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle2 size={14} />
                                                            Set as Default
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'reviews' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-lg font-semibold text-gray-900">Write Reviews</h2>
                                    <p className="text-sm text-gray-500 mt-1">Share your experience with products you've purchased</p>
                                </div>
                                <div className="p-6">
                                    {reviewableOrders.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Star size={48} className="text-gray-300 mx-auto mb-4" />
                                            <p className="text-gray-500 mb-2">No products to review</p>
                                            <p className="text-sm text-gray-400">Products from delivered orders will appear here</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {reviewableOrders.map((item, index) => (
                                                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                                                    <div className="flex gap-4">
                                                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                            {item.productImage ? (
                                                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <Package size={32} className="text-gray-400" />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <h3 className="font-semibold text-gray-900 text-sm mb-1">{item.productName}</h3>
                                                            <p className="text-xs text-gray-500 mb-2">Delivered on {item.deliveredDate}</p>
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedReviewProduct({
                                                                        productId: item.productId,
                                                                        productName: item.productName,
                                                                        orderId: item.orderId
                                                                    });
                                                                    setShowReviewModal(true);
                                                                }}
                                                                className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
                                                            >
                                                                <Star size={14} />
                                                                Write Review
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'settings' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-lg font-semibold text-gray-900">Account Settings</h2>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Display Name</label>
                                            <input
                                                type="text"
                                                value={userName || ''}
                                                readOnly
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                                            <input
                                                type="email"
                                                value={user?.email || ''}
                                                readOnly
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">User ID</label>
                                            <input
                                                type="text"
                                                value={user?.uid || ''}
                                                readOnly
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                                            />
                                        </div>
                                        <div className="pt-4 border-t border-gray-200">
                                            <h3 className="font-semibold text-gray-900 mb-3">Account Actions</h3>
                                            <div className="space-y-2">
                                                <div className="relative">
                                                    <input
                                                        type="file"
                                                        accept="image/*"
                                                        id="profile-upload"
                                                        className="hidden"
                                                        onChange={handleProfilePictureUpload}
                                                        disabled={uploadingImage}
                                                    />
                                                    <label
                                                        htmlFor="profile-upload"
                                                        className={`w-full block px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium transition-colors text-left cursor-pointer ${uploadingImage ? 'bg-gray-100 text-gray-400' : 'hover:bg-gray-50'}`}
                                                    >
                                                        {uploadingImage ? 'Uploading...' : 'Update Profile Picture'}
                                                    </label>
                                                </div>
                                                <button className="w-full px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors text-left">
                                                    Delete Account
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'help' && (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                                <div className="px-6 py-4 border-b border-gray-200">
                                    <h2 className="text-lg font-semibold text-gray-900">Help & Support</h2>
                                </div>
                                <div className="p-6">
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                                        <HelpCircle size={20} className="text-blue-600" />
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900">FAQs</h3>
                                                </div>
                                                <p className="text-sm text-gray-600">Find answers to commonly asked questions</p>
                                            </div>

                                            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                        <Package size={20} className="text-green-600" />
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900">Track Order</h3>
                                                </div>
                                                <p className="text-sm text-gray-600">Check your order status and delivery</p>
                                            </div>

                                            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                                        <RotateCcw size={20} className="text-orange-600" />
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900">Returns & Refunds</h3>
                                                </div>
                                                <p className="text-sm text-gray-600">Learn about our return policy</p>
                                            </div>

                                            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors cursor-pointer">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                                        <Shield size={20} className="text-purple-600" />
                                                    </div>
                                                    <h3 className="font-semibold text-gray-900">Payment Security</h3>
                                                </div>
                                                <p className="text-sm text-gray-600">Information about secure payments</p>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-200 pt-6">
                                            <h3 className="font-semibold text-gray-900 mb-4">Contact Support</h3>
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <User size={16} className="text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">Email Support</p>
                                                        <p className="text-gray-600">support@sellsathi.com</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <User size={16} className="text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">Phone Support</p>
                                                        <p className="text-gray-600">1800-123-4567 (Toll Free)</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-sm">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                                        <Clock size={16} className="text-gray-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium text-gray-900">Support Hours</p>
                                                        <p className="text-gray-600">Mon-Sat: 9 AM - 6 PM IST</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <h4 className="font-semibold text-gray-900 mb-2">Need Immediate Help?</h4>
                                            <p className="text-sm text-gray-600 mb-3">
                                                Our support team is here to help you with any questions or concerns.
                                            </p>
                                            <button className="px-6 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                                                Start Live Chat
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Review Modal */}
            {showReviewModal && selectedReviewProduct && (
                <ReviewModal
                    isOpen={showReviewModal}
                    onClose={() => {
                        setShowReviewModal(false);
                        setSelectedReviewProduct(null);
                        // Refresh reviewable orders after submitting review
                        if (user) {
                            fetchReviewableOrders(user.uid);
                        }
                    }}
                    productId={selectedReviewProduct.productId}
                    productName={selectedReviewProduct.productName}
                    orderId={selectedReviewProduct.orderId}
                />
            )}
        </div>
    );
}
