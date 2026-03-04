import React from 'react';
import { motion } from 'framer-motion';

const stats = [
  {
    value: "11 Lakhs+",
    label: "Sellers trust SellSathi to sell online"
  },
  {
    value: "15 Crores+",
    label: "Customers buying across India"
  },
  {
    value: "28,000+",
    label: "Serviceable pincodes across India — we deliver everywhere."
  },
  {
    value: "700+",
    label: "Categories to sell online"
  }
];

const StatsSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-brand/5 border border-brand/10 hover:bg-brand/10 transition-colors"
            >
              <h3 className="text-3xl font-bold text-brand mb-3">{stat.value}</h3>
              <p className="text-gray-600 text-sm leading-relaxed font-medium">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;