import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export default function ConfirmationAnimation({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    >
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ 
          type: 'spring', 
          damping: 15, 
          stiffness: 200,
          duration: 0.5 
        }}
        className="relative"
      >
        <motion.div
          className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center shadow-2xl"
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 0.6,
            repeat: 1,
            ease: "easeInOut"
          }}
        >
          <CheckCircle2 size={48} className="text-white" strokeWidth={3} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
