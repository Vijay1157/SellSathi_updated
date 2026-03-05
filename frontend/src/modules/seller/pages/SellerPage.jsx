import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { SellerHeader } from '../components/SellerHeader';
import { Footer } from '../components/Footer';
import { StatsSection } from '../components/StatsSection';
import { WhySellSathi } from '../components/WhySellSathi';
import { HowItWorks } from '../components/HowItWorks';
import { Testimonals } from '../components/Testimonals';
import { ArrowRight, BookOpen, Truck, Rocket, BarChart3, Mail, Zap, Play } from 'lucide-react';

const categories = [
  "Sell Sarees Online", "Sell Jewellery Online", "Sell Tshirts Online", 
  "Sell Shirts Online", "Sell Watches Online", "Sell Electronics Online", 
  "Sell Clothes Online", "Sell Socks Online"
];

export const SellerPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <SellerHeader />
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden bg-gradient-to-b from-brand/5 to-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 text-center lg:text-left"
            >
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
                Sell Online to Crores of Customers at <span className="text-brand">0% Commission</span>
              </h1>
              <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto lg:mx-0">
                Become a SellSathi seller and grow your business across India.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6">
                <Link 
                  to="/seller/register"
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-brand text-white font-bold text-lg shadow-xl shadow-brand/20 hover:bg-brand-hover hover:-translate-y-1 transition-all"
                >
                  Start Selling
                </Link>
              </div>
              <p className="text-sm text-gray-500">
                <span className="bg-brand text-white text-[10px] font-bold px-2 py-0.5 rounded mr-2">NEW</span>
                Don’t have a GSTIN? You can still sell on SellSathi.{' '}
                <Link to="#" className="text-brand font-semibold hover:underline">Know more</Link>
              </p>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="flex-1 w-full max-w-xl"
            >
              <div className="relative rounded-[2rem] overflow-hidden shadow-2xl aspect-square lg:aspect-video">
                <img 
                  src="https://picsum.photos/seed/seller-hero/1200/800" 
                  alt="Seller Success" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <StatsSection />
      <WhySellSathi />
      <Testimonals />
      <HowItWorks />

      {/* Learning Hub Section */}
      <section className="py-20 bg-brand">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items_center justify-between gap-8 bg-white/10 backdrop-blur-md rounded-[2.5rem] p-8 md:p-16 border border-white/20">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-4 text-white/80">
                <BookOpen size={24} />
                <span className="font-bold tracking-widest uppercase text-sm">Supplier Learning Hub</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Learn how to sell and grow your business on SellSathi
              </h2>
            </div>
            <button className="px-8 py-4 rounded-2xl bg-white text-brand font-bold text-lg hover:bg-gray-50 transition-all flex items-center gap-2 whitespace-nowrap">
              <Play fill="currentColor" size={20} /> Visit Learning Hub
            </button>
          </div>
        </div>
      </section>

      {/* Grow Your Business Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-16 text-center">
            Grow Your Business With SellSathi
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <Truck size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Efficient & Affordable Shipping</h4>
                <p className="text-gray-600 leading-relaxed">Sell your products across India with our vast logistics network covering 28,000+ pincodes.</p>
              </div>
            </div>
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <Rocket size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Next Day Dispatch Program</h4>
                <p className="text-gray-600 leading-relaxed">Get higher visibility and faster growth by opting for our Next Day Dispatch (NDD) program.</p>
              </div>
            </div>
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <Zap size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Ads to Grow More</h4>
                <p className="text-gray-600 leading-relaxed">Use our intuitive advertising tools to put your products in front of the right customers.</p>
              </div>
            </div>
            <div className="p-10 rounded-[2rem] bg-gray-50 border border-gray-100 flex gap-6">
              <div className="w-14 h-14 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0">
                <BarChart3 size={28} />
              </div>
              <div>
                <h4 className="text-xl font-bold text-gray-900 mb-3">Business Insights & Analytics</h4>
                <p className="text-gray-600 leading-relaxed">Make data-driven decisions with our comprehensive seller dashboard and analytics.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-10">Popular Categories To Sell Online</h2>
          <div className="flex flex-wrap gap-4 mb-8">
            {categories.map((cat, i) => (
              <button key={i} className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-medium hover:border-brand hover:text-brand transition-all">
                {cat}
              </button>
            ))}
          </div>
          <button className="text-brand font-bold flex items-center gap-2 hover:underline">
            View More <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Support Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-brand/5 text-brand mb-8">
            <Mail size={32} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-4">SellSathi Supplier Support Available 24/7</h2>
          <p className="text-gray-600 mb-8">Have questions? We're here to help you every step of the way.</p>
          <a href="mailto:support@sellsathi.com" className="text-2xl font-bold text-brand hover:underline">
            support@sellsathi.com
          </a>
        </div>
      </section>

      <Footer />
    </div>
  );
};