import { motion } from 'framer-motion';
import { ArrowLeft, Package, Truck, CheckCircle, FileText, MapPin, Download, XCircle } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import OrderTimeline from '../../components/common/OrderTimeline';
import ShippingDetailsCard from '../../components/common/ShippingDetailsCard';
import { mapOrderStatus } from '../../utils/orderUtils';
import { authFetch } from '../../utils/api';

export default function OrderTracking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');

    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setLoading(false);
                return;
            }

            try {
                // First, try to find by document ID
                let orderDoc = await getDoc(doc(db, 'orders', orderId));

                if (orderDoc.exists()) {
                    setOrder({ id: orderDoc.id, ...orderDoc.data() });
                } else {
                    // If not found by document ID, search by orderId field
                    const ordersRef = collection(db, 'orders');
                    const q = query(ordersRef, where('orderId', '==', orderId));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const doc = querySnapshot.docs[0];
                        setOrder({ id: doc.id, ...doc.data() });
                    } else {
                        console.log('Order not found with ID:', orderId);
                        setOrder(null);
                    }
                }
            } catch (error) {
                console.error('Error fetching order:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    const handleCancelOrder = async () => {
        if (!order || !order.id) return;

        setCancelling(true);
        try {
            const response = await authFetch(`/api/orders/${order.id}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                // Refresh order data
                const orderDoc = await getDoc(doc(db, 'orders', order.id));
                if (orderDoc.exists()) {
                    setOrder({ id: orderDoc.id, ...orderDoc.data() });
                }
                alert('Order cancelled successfully!');
            } else {
                alert(`Failed to cancel order: ${data.message}`);
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            alert('Failed to cancel order. Please try again.');
        } finally {
            setCancelling(false);
            setShowCancelConfirm(false);
        }
    };

    if (loading) {
        return (
            <div className="container" style={{ padding: '4rem 0', minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="container" style={{ padding: '4rem 0', minHeight: '80vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
                <Package size={64} className="text-gray-300" />
                <h2>Order not found</h2>
                <button onClick={() => navigate('/dashboard')} className="btn btn-primary">
                    Go to Dashboard
                </button>
            </div>
        );
    }

    const currentStatus = mapOrderStatus(order);
    const canCancel = order.status !== 'Cancelled' && order.status !== 'Delivered' && order.shipmentId;

    return (
        <div className="container animate-fade-in" style={{ padding: '4rem 0', minHeight: '80vh' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '3rem' }}>
                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-muted hover:text-primary transition-colors"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                    >
                        <ArrowLeft size={18} />
                        Back to Shopping
                    </button>
                    <h1 style={{ margin: 0 }}>Track <span className="gradient-text">Order</span></h1>
                </div>

            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2.5rem' }}>
                {/* Tracking Timeline */}
                <div className="glass-card" style={{ padding: '2.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <div>
                            <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>Order ID</p>
                            <h3 style={{ margin: 0 }}>#{order.orderId || order.id}</h3>
                        </div>
                        {order.awbNumber && (
                            <div style={{ textAlign: 'right' }}>
                                <p className="text-muted" style={{ fontSize: '0.9rem', marginBottom: '0.25rem' }}>AWB Number</p>
                                <h3 style={{ margin: 0, color: 'var(--primary)' }}>{order.awbNumber}</h3>
                            </div>
                        )}
                    </div>

                    {/* Shipping / Courier Details Section */}
                    {order.status !== 'Cancelled' && (
                        <div style={{
                            padding: '1.5rem',
                            background: 'var(--surface)',
                            borderRadius: '16px',
                            marginBottom: '2.5rem',
                            border: '1px solid var(--border)'
                        }}>
                            <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Truck size={18} className="text-primary" /> Delivery Information
                            </h4>

                            {order.awbNumber ? (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                    <div>
                                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Courier Partner</p>
                                        <p style={{ fontWeight: 600, margin: 0 }}>{order.courierName || 'Assigned Courier'}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Tracking Number (AWB)</p>
                                        <a
                                            href={`https://shiprocket.co/tracking/${order.awbNumber}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ fontWeight: 600, margin: 0, fontFamily: 'monospace', letterSpacing: '0.05em', color: 'var(--primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                                        >
                                            {order.awbNumber}
                                        </a>
                                    </div>
                                    {order.estimatedDeliveryDays && (
                                        <div>
                                            <p className="text-muted" style={{ fontSize: '0.8rem', marginBottom: '0.25rem' }}>Est. Delivery</p>
                                            <p style={{ fontWeight: 600, margin: 0 }}>{order.estimatedDeliveryDays}</p>
                                        </div>
                                    )}
                                </div>
                            ) : order.shipmentId ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)' }}>
                                    <div className="animate-spin" style={{ width: '16px', height: '16px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                                    <p style={{ margin: 0, fontSize: '0.9rem' }}>Courier assignment in progress. AWB will be generated shortly.</p>
                                </div>
                            ) : (
                                <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                    Shipping details will be updated once the order is processed.
                                </p>
                            )}
                        </div>
                    )}

                    {order.status === 'Cancelled' && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '12px',
                            marginBottom: '2rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem'
                        }}>
                            <XCircle size={20} style={{ color: '#ef4444' }} />
                            <div>
                                <p style={{ margin: 0, fontWeight: '600', color: '#ef4444' }}>Order Cancelled</p>
                                <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>
                                    {order.cancellationReason || 'This order has been cancelled'}
                                </p>
                            </div>
                        </div>
                    )}

                    <OrderTimeline currentStatus={currentStatus} />

                    {/* Detailed Tracking Events */}
                    {order.trackingEvents && order.trackingEvents.length > 0 && (
                        <div style={{
                            marginTop: '2rem',
                            padding: '1.5rem',
                            background: 'var(--surface)',
                            borderRadius: '16px',
                            border: '1px solid var(--border)'
                        }}>
                            <h4 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FileText size={18} className="text-primary" /> Tracking Updates
                            </h4>
                            <div className="flex flex-col gap-4">
                                {order.trackingEvents.map((event, index) => (
                                    <div key={index} className="flex gap-4 relative">
                                        {/* Connecting Line */}
                                        {index !== order.trackingEvents.length - 1 && (
                                            <div style={{
                                                position: 'absolute',
                                                left: '7px',
                                                top: '24px',
                                                bottom: '-16px',
                                                width: '2px',
                                                background: 'var(--border)'
                                            }} />
                                        )}

                                        {/* Node Marker */}
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '50%',
                                            background: index === 0 ? 'var(--primary)' : 'var(--surface)',
                                            border: `2px solid ${index === 0 ? 'var(--primary)' : 'var(--border)'}`,
                                            marginTop: '4px',
                                            zIndex: 1
                                        }} />

                                        <div className="flex-1">
                                            <p style={{ margin: 0, fontWeight: 600, fontSize: '0.95rem' }}>{event.status}</p>
                                            {event.location && <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem' }}>{event.location}</p>}
                                            {event.remarks && <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', fontStyle: 'italic' }}>{event.remarks}</p>}
                                            <p className="text-muted" style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem' }}>
                                                {new Date(event.date).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Delivery Info */}
                <div className="flex flex-col gap-6">
                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <MapPin size={20} className="text-primary" /> Delivery Address
                        </h3>
                        {order.shippingAddress ? (
                            <>
                                <p style={{ fontWeight: '600', marginBottom: '0.5rem' }}>{order.shippingAddress.name || 'N/A'}</p>
                                <p className="text-muted" style={{ fontSize: '0.9rem', lineHeight: '1.6', margin: 0 }}>
                                    {order.shippingAddress.address || 'N/A'}<br />
                                    {order.shippingAddress.city || ''}, {order.shippingAddress.state || ''} {order.shippingAddress.pincode || ''}<br />
                                    Phone: {order.shippingAddress.phone || 'N/A'}
                                </p>
                            </>
                        ) : (
                            <p className="text-muted">No address information available</p>
                        )}
                    </div>

                    <ShippingDetailsCard order={order} />

                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem' }}>Items in this Order</h3>
                        <div className="flex flex-col gap-4">
                            {order.items && order.items.length > 0 ? (
                                order.items.map((item, index) => (
                                    <div key={index} className="flex gap-4 items-center">
                                        <div style={{
                                            width: '50px',
                                            height: '50px',
                                            background: 'var(--surface)',
                                            borderRadius: '8px',
                                            backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : 'none',
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center'
                                        }}></div>
                                        <div className="flex-1">
                                            <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{item.name || 'Product'}</h4>
                                            <p className="text-muted" style={{ fontSize: '0.8rem', margin: 0 }}>Qty: {item.quantity || 1}</p>
                                        </div>
                                        <span style={{ fontWeight: 'BOLD' }}>₹{(item.price * (item.quantity || 1)).toLocaleString('en-IN')}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted">No items found</p>
                            )}
                        </div>
                        <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />
                        <div className="flex justify-between items-center">
                            <span style={{ fontWeight: '600' }}>Total Paid</span>
                            <span className="gradient-text" style={{ fontWeight: '800', fontSize: '1.25rem' }}>₹{order.total?.toLocaleString('en-IN') || '0'}</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate(`/invoice?orderId=${order.id}`)}
                        className="btn btn-primary flex items-center justify-center gap-3"
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
                            fontWeight: '700',
                            fontSize: '1rem'
                        }}
                    >
                        <FileText size={20} />
                        View Bill
                    </button>

                    {canCancel && (
                        <>
                            {!showCancelConfirm ? (
                                <button
                                    onClick={() => setShowCancelConfirm(true)}
                                    className="btn flex items-center justify-center gap-3"
                                    style={{
                                        width: '100%',
                                        padding: '1.25rem',
                                        borderRadius: '16px',
                                        background: 'rgba(239, 68, 68, 0.1)',
                                        border: '2px solid rgba(239, 68, 68, 0.3)',
                                        color: '#ef4444',
                                        fontWeight: '700',
                                        fontSize: '1rem'
                                    }}
                                >
                                    <XCircle size={20} />
                                    Cancel Order
                                </button>
                            ) : (
                                <div className="glass-card" style={{ padding: '1.5rem' }}>
                                    <p style={{ marginBottom: '1rem', fontWeight: '600' }}>Are you sure you want to cancel this order?</p>
                                    <div style={{ display: 'flex', gap: '1rem' }}>
                                        <button
                                            onClick={handleCancelOrder}
                                            disabled={cancelling}
                                            className="btn"
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                background: '#ef4444',
                                                color: 'white',
                                                fontWeight: '600'
                                            }}
                                        >
                                            {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
                                        </button>
                                        <button
                                            onClick={() => setShowCancelConfirm(false)}
                                            disabled={cancelling}
                                            className="btn"
                                            style={{
                                                flex: 1,
                                                padding: '0.75rem',
                                                background: 'var(--surface)',
                                                fontWeight: '600'
                                            }}
                                        >
                                            No, Keep Order
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
