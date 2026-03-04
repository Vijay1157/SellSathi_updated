import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Twitter, Youtube } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-gray-50 pt-16 pb-8 border-t border-gray-200">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          <div className="lg:col-span-1">
            <Link to="/" className="text-2xl font-bold text-purple-600 mb-4 block">
              SellSathi
            </Link>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Sell your products to crores of customers at 0% commission. Join India's most trusted marketplace for sellers.
            </p>
            <div className="flex gap-4">
              <Link to="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                <Instagram size={20} />
              </Link>
              <Link to="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                <Facebook size={20} />
              </Link>
              <Link to="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                <Twitter size={20} />
              </Link>
              <Link to="#" className="text-gray-400 hover:text-purple-600 transition-colors">
                <Youtube size={20} />
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Sell on SellSathi</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Sell Online</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Pricing & Commission</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">How it Works</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Shipping & Returns</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Grow Your Business</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Grow Your Business</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Learning Hub</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Ads on SellSathi</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Business Insights</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-6">Contact Us</h4>
            <ul className="space-y-4 text-sm text-gray-600">
              <li><a href="mailto:support@sellsathi.com" className="hover:text-purple-600 transition-colors">support@sellsathi.com</a></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Help Center</Link></li>
              <li><Link to="#" className="hover:text-purple-600 transition-colors">Seller Support</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="pt-8 border-t border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-gray-500">
            © 2026 SellSathi Inc. All Rights Reserved.
          </p>
          <div className="flex gap-6 text-xs text-gray-500">
            <Link to="#" className="hover:text-purple-600">Privacy Policy</Link>
            <Link to="#" className="hover:text-purple-600">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;