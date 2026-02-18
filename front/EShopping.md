# SELLSATHI Marketplace System Overview

This document provides a comprehensive overview of the **SELLSATHI** platform, a centralized marketplace built using React.js and Vite.

## 1. System Architecture
The platform consists of three main integrated portals:
*   **Customer Website (Marketplace)**: The primary storefront for users to browse, search, and purchase products.
*   **Seller Panel (Dashboard)**: A dedicated management interface for sellers to list products and fulfill orders.
*   **Admin Panel (Dashboard)**: A centralized control hub for site-wide governance, seller approval, and logistics oversight.

## 2. Core Features

### Customer Marketplace
*   **Responsive UI/UX**: Built with a custom design system focusing on premium aesthetics, glassmorphism, and fluid animations.
*   **Product Discovery**: Home page with featured categories/products and a dedicated listing page with filtering capabilities.
*   **Order Lifecycle**: Integrated checkout process and a visual order tracking system.
*   **Seller Onboarding**: A "Become a Seller" call-to-action in the footer that leads to the registration portal.

### Seller Portal
*   **Registration Flow**: A multi-step verification process (Basic Details -> Business Type -> Document Upload).
*   **Product & Order Management**: Full CRUD operations for product inventory and a status-driven order fulfillment system (Packed -> Shipped -> Delivered).

### Admin Governance
*   **Vetting System**: Review and approve/reject new seller applications based on submitted documentation.
*   **Quality Control**: Monitor all platform products and orders to handle disputes or quality issues.
*   **Logistics Tracking**: Oversight of the delivery partner assignment and shipment statuses.

## 3. Technology Stack
*   **Frontend**: React.js with Vite for fast HMR.
*   **Icons**: Lucide-React for consistent, high-quality iconography.
*   **Animations**: Framer Motion for premium transitions and interactive elements.
*   **Styling**: Vanilla CSS with HSL color tokens for a professional, glass-themed design.

## 4. How to Run
1.  Navigate to the `marketplace_app` directory.
2.  Run `npm run dev` to start the development server.
3.  Access the platform at `http://localhost:5173`.
