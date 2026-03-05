import React from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';

const testimonials = [
  {
    name: "Amit & Rajat",
    business: "Smartees",
    city: "Tiruppur",
    quote: "Our business has grown beyond our imagination, getting upto 10,000 orders consistently during sale days. We are now constantly bringing new products thanks to SellSathi's insights.",
    image: "https://picsum.photos/seed/seller1/400/300"
  },
  {
    name: "Suman",
    business: "Keshav Fashion",
    city: "Hisar",
    quote: "I started selling on SellSathi with 4-5 orders on the very first day. In no time I was getting over 1000 orders a day, like a dream come true.",
    image: "https://picsum.photos/seed/seller2/400/300"
  },
  {
    name: "Mohit Rathi",
    business: "Meira Jewellery",
    city: "Ahmedabad",
    quote: "SellSathi made it extremely simple to transition to online business during lockdown. Suddenly we were all over India to our surprise, seeing up to 5X growth on sale days.",
    image: "https://picsum.photos/seed/seller3/400/300"
  }
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-white overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-12 text-center">
          Experiences Suppliers Love to Talk About
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group relative rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 hover:shadow-xl transition-all duration-300"
            >
              <div className="aspect-video relative overflow-hidden">
                <img 
                  src={t.image} 
                  alt={t.business}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center text-brand shadow-lg group-hover:scale-110 transition-transform">
                    <Play fill="currentColor" size={20} className="ml-1" />
                  </div>
                </div>
              </div>
              <div className="p-6">
                <p className="text-gray-600 italic mb-6 leading-relaxed">"{t.quote}"</p>
                <div>
                  <h4 className="font-bold text-gray-900">{t.name}</h4>
                  <p className="text-sm text-brand font-medium">{t.business}, {t.city}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};