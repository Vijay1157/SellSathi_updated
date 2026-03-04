import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LoginModal } from './LoginModal';

export const Header = () => {
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Link to="/" className="text-2xl font-bold tracking-tight text-brand">
              SellSathi
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link to="#" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">Categories</Link>
            <Link to="#" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">Deals</Link>
            <Link to="#" className="text-sm font-medium text-gray-600 hover:text-brand transition-colors">What's New</Link>
          </nav>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsLoginOpen(true)}
              className="text-sm font-medium text-gray-600 hover:text-brand transition-colors"
            >
              Login
            </button>
            <Link
              to="/seller"
              className="rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-hover transition-all"
            >
              Become a Seller
            </Link>
          </div>
        </div>
      </header>
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} role="user" />
    </>
  );
};