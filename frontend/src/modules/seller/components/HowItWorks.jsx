import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, PackageSearch, ShoppingCart, Truck, CreditCard, ArrowRight } from 'lucide-react';

const steps = [
  {
    id: "01",
    title: "Create Account",
    desc: "All you need is GSTIN or Enrolment ID / UIN and a Bank Account.",
    icon: <UserPlus className="text-purple-600" size={32} />,
    color: "bg-purple-100"
  },
  {
    id: "02",
    title: "List Products",
    desc: "Upload products you want to sell in your supplier panel. Easy bulk upload available.",
    icon: <PackageSearch className="text-purple-600" size={32} />,
    color: "bg-blue-100"
  },
  {
    id: "03",
    title: "Get Orders",
    desc: "Start receiving orders from crores of Indians actively shopping on our platform.",
    icon: <ShoppingCart className="text-purple-600" size={32} />,
    color: "bg-emerald-100"
  },
  {
    id: "04",
    title: "Affordable Shipping",
    desc: "Enjoy affordable shipping to customers across India with our logistics partners.",
    icon: <Truck className="text-purple-600" size={32} />,
    color: "bg-orange-100"
  },
  {
    id: "05",
    title: "Receive Payments",
    desc: "Payments are deposited directly to your bank account after a 7-day payment cycle.",
    icon: <CreditCard className="text-purple-600" size={32} />,
    color: "bg-pink-100"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-24 bg-gray-50 overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight">
            How it works
          </h2>
          <p className="text-gray-600 text-lg">
            Start your online selling journey in 5 simple steps. We've made the process seamless so you can focus on your business.
          </p>
        </div>
        
        <div className="relative max-w-5xl mx-auto">
          {/* Desktop Connector Line */}
          <div className="hidden lg:block absolute top-[120px] left-[10%] right-[10%] h-1 bg-gradient-to-r from-purple-200 via-purple-400 to-purple-200 rounded-full opacity-30" />
          
          <div className="flex flex-col lg:flex-row justify-between gap-12 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="flex-1 flex flex-col items-center text-center group"
              >
                <div className="relative mb-8">
                  {/* Step Number Badge */}
                  <div className="absolute -top-4 -right-4 w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-lg z-20">
                    {step.id}
                  </div>
                  
                  {/* Icon Container */}
                  <div className={`w-28 h-28 rounded-[2rem] ${step.color} flex items-center justify-center shadow-sm group-hover:shadow-xl group-hover:scale-110 transition-all duration-500 relative z-10`}>
                    {step.icon}
                  </div>
                  
                  {/* Pulse Effect */}
                  <div className="absolute inset-0 rounded-[2rem] bg-purple-400/20 animate-ping opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                </div>

                <h4 className="text-xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                  {step.title}
                </h4>
                <p className="text-gray-500 text-sm leading-relaxed max-w-[200px] mx-auto">
                  {step.desc}
                </p>

                {/* Mobile/Tablet Arrow */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden mt-8 text-purple-200">
                    <ArrowRight className="rotate-90" size={32} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <button className="px-10 py-4 rounded-2xl bg-purple-600 text-white font-bold text-lg shadow-xl shadow-purple-200 hover:bg-purple-700 hover:-translate-y-1 transition-all">
            Start Your Journey Now
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorks;