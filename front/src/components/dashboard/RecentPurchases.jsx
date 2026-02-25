import { Package, ChevronRight, ShoppingCart } from 'lucide-react';

export default function RecentPurchases({ orders, loading, onOrderClick, activeOrderId }) {
    if (loading) {
        return (
            <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-20 bg-gray-50 rounded-2xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (orders.length === 0) {
        return (
            <div className="p-20 text-center">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShoppingCart size={32} className="text-gray-300" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">No purchases yet</h3>
                <p className="text-gray-500 max-w-xs mx-auto">When you buy things from the marketplace, they will appear here.</p>
                <button className="mt-6 btn btn-primary px-6" onClick={() => window.location.href = '/products'}>
                    Browse Products
                </button>
            </div>
        );
    }

    const getStatusStyle = (status) => {
        const s = status?.toLowerCase() || 'placed';
        if (s.includes('delivered')) return 'bg-green-50 text-green-600 ring-green-100';
        if (s.includes('cancel')) return 'bg-red-50 text-red-600 ring-red-100';
        if (s.includes('ship') || s.includes('out')) return 'bg-blue-50 text-blue-600 ring-blue-100';
        return 'bg-amber-50 text-amber-600 ring-amber-100';
    };

    return (
        <div className="divide-y divide-gray-50 max-h-[400px] md:max-h-[500px] overflow-y-auto custom-scrollbar">
            {orders.map((order) => (
                <div
                    key={order.id}
                    onClick={() => onOrderClick(order)}
                    className={`group p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 md:gap-6 cursor-pointer hover:bg-gray-50/80 transition-all order-card-hover ${activeOrderId === order.id ? 'bg-primary/5 border-l-4 border-l-primary' : 'border-l-4 border-l-transparent'
                        }`}
                >
                    <div className="flex items-center gap-3 md:gap-5 flex-1 w-full sm:w-auto">
                        <div className="w-12 h-12 md:w-14 md:h-14 bg-white border border-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm flex-shrink-0">
                            <Package size={20} className="md:w-6 md:h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <h4 className="font-bold text-gray-900 text-base md:text-lg">Order #{order.orderId || order.id.substring(0, 8)}</h4>
                                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ring-1 ${getStatusStyle(order.status)}`}>
                                    {order.status || 'Placed'}
                                </span>
                            </div>
                            <p className="text-xs md:text-sm text-gray-500 flex items-center gap-2 flex-wrap">
                                <span>{new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                <span className="font-semibold text-gray-700">{order.items?.length || 0} Items</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 md:gap-10 w-full sm:w-auto">
                        <div className="text-left sm:text-right">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Total</p>
                            <p className="text-lg md:text-xl font-black text-gray-900">₹{order.total?.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="p-2.5 md:p-3 bg-gray-50 group-hover:bg-primary group-hover:text-white rounded-lg md:rounded-xl transition-all shadow-sm">
                            <ChevronRight size={18} className="md:w-5 md:h-5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
