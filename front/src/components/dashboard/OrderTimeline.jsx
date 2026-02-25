import { Truck, PackageCheck, Home, Package } from 'lucide-react';

export default function OrderTimeline({ currentStatus }) {
    const statuses = [
        { name: 'Placed', icon: Package, description: 'Order confirmed' },
        { name: 'Shipped', icon: Truck, description: 'On the way' },
        { name: 'Out for Delivery', icon: PackageCheck, description: 'Very near' },
        { name: 'Delivered', icon: Home, description: 'At your door' }
    ];

    const currentStatusIndex = statuses.findIndex(s => s.name === currentStatus);
    const activeIndex = currentStatusIndex === -1 ? 0 : currentStatusIndex;

    return (
        <div className="space-y-8 relative before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
            {statuses.map((status, idx) => {
                const isCompleted = idx <= activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                    <div key={status.name} className="flex gap-6 relative">
                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-4 border-white shadow-sm transition-all duration-500 ${isCompleted ? 'bg-primary text-white scale-110' : 'bg-gray-100 text-gray-400'
                            }`}>
                            <status.icon size={18} />
                        </div>

                        <div>
                            <h4 className={`text-sm font-bold transition-colors duration-500 ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>
                                {status.name}
                            </h4>
                            <p className="text-xs text-gray-500 mt-0.5">{status.description}</p>
                            {isCurrent && (
                                <span className="mt-2 inline-flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-primary/10 text-[10px] font-bold text-primary animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                                    LIVE NOW
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
