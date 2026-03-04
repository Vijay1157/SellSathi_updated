import { TrendingUp, ShoppingBag, Clock, CheckCircle } from 'lucide-react';

export default function OrderOverviewCard({ stats, loading }) {
    if (loading) {
        return (
            <>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse">
                        <div className="w-12 h-12 bg-gray-100 rounded-2xl mb-4"></div>
                        <div className="h-4 w-24 bg-gray-100 rounded mb-2"></div>
                        <div className="h-8 w-16 bg-gray-100 rounded"></div>
                    </div>
                ))}
            </>
        );
    }

    const cards = [
        {
            label: 'Total Orders',
            value: stats.totalOrders || 0,
            icon: ShoppingBag,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            borderColor: 'border-blue-100'
        },
        {
            label: 'Pending',
            value: stats.pendingOrders || 0,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-50',
            borderColor: 'border-amber-100'
        },
        {
            label: 'Delivered',
            value: stats.deliveredOrders || 0,
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50',
            borderColor: 'border-green-100'
        },
        {
            label: 'Total Spend',
            value: `₹${stats.totalSpend?.toLocaleString('en-IN') || 0}`,
            icon: TrendingUp,
            color: 'text-purple-600',
            bg: 'bg-purple-50',
            borderColor: 'border-purple-100'
        }
    ];

    return (
        <>
            {cards.map((card, idx) => (
                <div
                    key={idx}
                    className={`bg-white p-6 rounded-3xl border ${card.borderColor} shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
                >
                    <div className="flex justify-between items-start relative z-10">
                        <div>
                            <p className="text-sm font-bold text-gray-500 mb-1 uppercase tracking-tight">{card.label}</p>
                            <h3 className="text-3xl font-extrabold text-gray-900">{card.value}</h3>
                        </div>
                        <div className={`${card.bg} ${card.color} p-3 rounded-2xl group-hover:scale-110 transition-transform`}>
                            <card.icon size={24} />
                        </div>
                    </div>

                    <div className={`absolute -right-4 -bottom-4 w-24 h-24 ${card.bg} opacity-10 rounded-full blur-2xl group-hover:scale-150 transition-transform`}></div>
                </div>
            ))}
        </>
    );
}
