import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginModal = ({ isOpen, onClose, role }) => {
  const [view, setView] = useState('login');
  const navigate = useNavigate();

  const handleSellerSignup = () => {
    onClose();
    navigate('/seller/register');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="relative w-full max-w-md rounded-[2.5rem] bg-white p-8 shadow-2xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors z-10"
            >
              <X size={24} />
            </button>

            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {role === 'seller' ? 'Seller Center' : (view === 'login' ? 'Welcome Back' : 'Create Account')}
              </h2>
              <p className="text-gray-500">
                {role === 'seller' 
                  ? 'Log in to manage your store' 
                  : (view === 'login' ? 'Log in to your account' : 'Join SellSathi today')}
              </p>
            </div>

            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              {role === 'user' && view === 'signup' && (
                <>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="Full Name"
                      className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="tel"
                      placeholder="Phone Number"
                      className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                    />
                  </div>
                </>
              )}
              
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  placeholder="Password"
                  className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                />
              </div>

              {role === 'user' && view === 'signup' && (
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                  />
                </div>
              )}

              <div className="text-right">
                <button type="button" className="text-xs text-brand font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-brand py-3.5 font-bold text-white shadow-lg shadow-brand/20 hover:bg-brand-hover transition-all active:scale-[0.98]"
              >
                {view === 'login' ? 'Login' : 'Create Account'}
              </button>
            </form>

            <div className="mt-8 text-center">
              {role === 'user' ? (
                <p className="text-sm text-gray-600">
                  {view === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button
                    onClick={() => setView(view === 'login' ? 'signup' : 'login')}
                    className="font-bold text-brand hover:underline"
                  >
                    {view === 'login' ? 'Create Account' : 'Login'}
                  </button>
                </p>
              ) : (
                <p className="text-sm text-gray-600">
                  New to SellSathi?{' '}
                  <button
                    onClick={handleSellerSignup}
                    className="font-bold text-brand hover:underline"
                  >
                    Create your Supplier Account
                  </button>
                </p>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};