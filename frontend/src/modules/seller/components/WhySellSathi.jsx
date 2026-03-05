import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Percent, ShieldAlert, TrendingUp, Zap, Eye, Ban, CheckCircle2 } from 'lucide-react';

const features = [
  {
    icon: <Percent className="text-purple-600" size={28} />,
    title: "0% Commission Fee",
    description: "Suppliers keep 100% of profit. No hidden charges, no listing fees, no subscription costs.",
    size: "large",
    color: "bg-purple-50"
  },
  {
    icon: <ShieldAlert className="text-purple-600" size={24} />,
    title: "0 Penalty Charges",
    description: "Sell online without the fear of order cancellation charges with 0 Penalty for late dispatch.",
    size: "small",
    color: "bg-blue-50"
  },
  {
    icon: <TrendingUp className="text-purple-600" size={24} />,
    title: "Growth for Every Supplier",
    description: "From small to large, and now open for sellers who don't have a Regular GSTIN too.",
    size: "small",
    color: "bg-emerald-50"
  },
  {
    icon: <Zap className="text-purple-600" size={28} />,
    title: "Ease of Doing Business",
    description: "Easy Product Listing, Lowest Cost Shipping, and 7-Day Payment Cycle from the delivery date.",
    size: "large",
    color: "bg-orange-50"
  },
  {
    icon: <Eye className="text-purple-600" size={24} />,
    title: "Free Catalog Visibility",
    description: "Run advertisements for your catalogs to increase visibility. Free ad credit for first 30 days.",
    size: "small",
    color: "bg-pink-50"
  },
  {
    icon: <Ban className="text-purple-600" size={24} />,
    title: "No Order Cancellation Charges",
    description: "Cancel orders that you can't fulfill for unforeseen reasons without worrying about penalties.",
    size: "small",
    color: "bg-indigo-50"
  }
];

const WhySellSathi = () => {
  return (
    <section id="grow-business" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.span 
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 text-sm font-bold mb-4"
          >
            Why Choose Us
          </motion.span>
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 tracking-tight"
          >
            Why Suppliers Love SellSathi
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 text-lg leading-relaxed"
          >
            We've built a ecosystem that prioritizes your profit and growth. Join India's most supplier-friendly marketplace.
          </motion.p>
        </div>

        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 text-center">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`group relative p-8 rounded-[2.5rem] border border-gray-100 transition-all duration-500 hover:shadow-2xl hover:shadow-purple-200/50 hover:-translate-y-2 ${
                  f.size === 'large' ? 'md:col-span-3' : 'md:col-span-2'
                } ${f.color}`}
              >
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center mb-8 shadow-sm group-hover:scale-110 transition-transform duration-300">
                    {f.icon}
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">{f.title}</h4>
                  <p className="text-gray-600 leading-relaxed mb-6">{f.description}</p>
                  
                  <div className="flex items-center gap-2 text-purple-600 font-bold text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 size={18} />
                    <span>Verified Benefit</span>
                  </div>
                </div>
                
                {/* Decorative background element */}
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  {React.cloneElement(f.icon, { size: 120 })}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhySellSathi;