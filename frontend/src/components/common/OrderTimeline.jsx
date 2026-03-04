import { motion } from 'framer-motion';
import { Package, Box, Truck, MapPin, CheckCircle } from 'lucide-react';

const STAGES = [
  { key: 'ORDERED', label: 'Ordered', icon: Package },
  { key: 'PACKING', label: 'Packing', icon: Box },
  { key: 'SHIPPING', label: 'Shipping', icon: Truck },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: MapPin },
  { key: 'DELIVERED', label: 'Delivered', icon: CheckCircle }
];

export default function OrderTimeline({ currentStatus }) {
  const currentIndex = STAGES.findIndex(s => s.key === currentStatus);
  const progressPercentage = currentIndex >= 0 ? (currentIndex / (STAGES.length - 1)) * 100 : 0;

  return (
    <div className="relative" style={{ padding: '2rem 0' }}>
      {/* Progress Bar */}
      <div 
        className="absolute" 
        style={{ 
          top: '2.75rem', 
          left: '2rem', 
          right: '2rem', 
          height: '2px', 
          background: 'var(--border)',
          zIndex: 0
        }}
      >
        <motion.div
          style={{ 
            height: '100%', 
            background: 'var(--primary)'
          }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPercentage}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        />
      </div>
      
      {/* Stage Markers */}
      <div className="relative flex justify-between" style={{ zIndex: 1 }}>
        {STAGES.map((stage, index) => {
          const isCompleted = index <= currentIndex;
          const isCurrent = index === currentIndex;
          const Icon = stage.icon;
          
          return (
            <div key={stage.key} className="flex flex-col items-center" style={{ flex: 1 }}>
              <motion.div
                style={{
                  width: '3rem',
                  height: '3rem',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: isCompleted ? 'var(--primary)' : 'var(--surface)',
                  color: isCompleted ? 'white' : 'var(--text-muted)',
                  border: `2px solid ${isCompleted ? 'var(--primary)' : 'var(--border)'}`,
                  position: 'relative',
                  zIndex: 2
                }}
                animate={isCurrent ? { 
                  scale: [1, 1.1, 1],
                  boxShadow: [
                    '0 0 0 0 hsla(var(--primary-h), 85%, 60%, 0.4)',
                    '0 0 0 8px hsla(var(--primary-h), 85%, 60%, 0.2)',
                    '0 0 0 0 hsla(var(--primary-h), 85%, 60%, 0.4)'
                  ]
                } : {}}
                transition={{ 
                  repeat: isCurrent ? Infinity : 0, 
                  duration: 2,
                  ease: 'easeInOut'
                }}
              >
                <Icon size={24} />
              </motion.div>
              <span 
                className={`mt-2 text-sm font-medium text-center`}
                style={{ 
                  color: isCompleted ? 'var(--text)' : 'var(--text-muted)',
                  maxWidth: '100px'
                }}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
