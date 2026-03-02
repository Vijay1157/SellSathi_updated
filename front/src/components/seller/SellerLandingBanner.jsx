import React, { useState } from 'react';
import InstructionsModal from './InstructionsModal';

export default function SellerLandingBanner() {
    const [showInstructions, setShowInstructions] = useState(false);

    return (
        <>
            <div className="relative w-full h-80 md:h-96 overflow-hidden">
                {/* Background Image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage: 'url(https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1920&h=600&fit=crop&crop=center)'
                    }}
                />
                
                {/* Dark Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-50"></div>
                
                {/* Centered Text Content */}
                <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 md:px-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {/* Main Heading */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                            Welcome Seller
                        </h1>
                        
                        {/* Sub Heading */}
                        <h2 className="text-xl md:text-2xl lg:text-3xl text-gray-200 font-medium">
                            Start Your Selling Journey with SellSathi
                        </h2>
                        
                        {/* Short Description */}
                        <p className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
                            Grow your business with confidence. Join thousands of trusted sellers expanding their reach through secure Aadhaar-based verification, seamless onboarding, and powerful selling tools designed for your success.
                        </p>
                    </div>
                </div>

                {/* View Instructions Button - Top Right */}
                <div className="absolute top-6 right-6 z-20">
                    <button
                        onClick={() => setShowInstructions(true)}
                        className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white hover:text-gray-900 transition-all duration-300 flex items-center gap-2"
                    >
                        View Instructions
                    </button>
                </div>
            </div>

            {/* Instructions Modal */}
            {showInstructions && (
                <InstructionsModal onClose={() => setShowInstructions(false)} />
            )}
        </>
    );
}
