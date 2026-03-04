import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SellerHeader } from '../components/SellerHeader';
import { Footer } from '../components/Footer';
import { ArrowRight, ShoppingBag, Users, Zap } from 'lucide-react';

export const LandingPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <SellerHeader />
      
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex-1 text-center lg:text-left"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand/5 text-brand text-sm font-semibold mb-6">
                <Zap size={16} />
                <span>Your marketplace, simplified</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-8">
                Start Buying & <span className="text-brand">Selling</span> Online
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0">
                Join thousands of users and suppliers on the most trusted online marketplace. Grow your business or find the best deals today.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link 
                  to="/seller"
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-brand text-white font-bold text-lg shadow-xl shadow-brand/20 hover:bg-brand-hover hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                  Get Started <ArrowRight size={20} />
                </Link>
                <button className="w-full sm:w-auto px-8 py-4 rounded-2xl border border-gray-200 text-gray-700 font-bold text-lg hover:bg-gray-50 transition-all">
                  Learn More
                </button>
              </div>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1 relative"
            >
              <div className="relative z-10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                <img 
                  src="https://picsum.photos/seed/marketplace/1200/800" 
                  alt="Marketplace" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="absolute -top-6 -right-6 w-32 h-32 bg-brand/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-brand/20 rounded-full blur-3xl opacity-50" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand mb-6">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">10K+ Sellers</h3>
              <p className="text-gray-600">A growing community of trusted suppliers across India.</p>
            </div>
            <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand mb-6">
                <ShoppingBag size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Fast Delivery</h3>
              <p className="text-gray-600">Efficient shipping network covering 28,000+ pincodes.</p>
            </div>
            <div className="p-8 rounded-3xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-2xl bg-brand/5 flex items-center justify-center text-brand mb-6">
                <Zap size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Secure Payments</h3>
              <p className="text-gray-600">Safe and transparent 7-day payment cycle for sellers.</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};