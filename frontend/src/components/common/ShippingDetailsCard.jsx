import { Package, Truck, Calendar } from 'lucide-react';

export default function ShippingDetailsCard({ order }) {
  // Return null if no shipping data available
  if (!order.awbNumber && !order.courierName && !order.estimatedDelivery) {
    return null;
  }

  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Truck size={20} className="text-primary" /> Shipping Details
      </h3>
      <div className="flex flex-col gap-4">
        {order.awbNumber && (
          <div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <Package size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              AWB Tracking Number
            </p>
            <p style={{ fontFamily: 'monospace', fontWeight: '700', fontSize: '1rem', margin: 0 }}>
              {order.awbNumber}
            </p>
          </div>
        )}
        {order.courierName && (
          <div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <Truck size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Courier Partner
            </p>
            <p style={{ fontWeight: '700', fontSize: '1rem', margin: 0 }}>
              {order.courierName}
            </p>
          </div>
        )}
        {order.estimatedDelivery && (
          <div>
            <p className="text-muted" style={{ fontSize: '0.85rem', marginBottom: '0.25rem' }}>
              <Calendar size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
              Estimated Delivery
            </p>
            <p style={{ fontWeight: '700', fontSize: '1rem', margin: 0 }}>
              {new Date(order.estimatedDelivery).toLocaleDateString('en-IN', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
