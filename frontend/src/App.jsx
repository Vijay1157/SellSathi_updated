import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MarketplaceHome from '@/modules/marketplace/pages/Home';
import ProductListing from '@/modules/marketplace/pages/ProductListing';
import ProductDetail from '@/modules/marketplace/pages/ProductDetail';
import Checkout from '@/modules/marketplace/pages/Checkout';
import OrderTracking from '@/modules/marketplace/pages/OrderTracking';
import Invoice from '@/modules/marketplace/pages/Invoice';
import Deals from '@/modules/marketplace/pages/Deals';
import NewArrivals from '@/modules/marketplace/pages/NewArrivals';
import Trending from '@/modules/marketplace/pages/Trending';
import CategoryPage from '@/modules/marketplace/pages/CategoryPage';
import Wishlist from '@/modules/marketplace/pages/Wishlist';
import SellerRegistration from '@/modules/seller/pages/Registration';
import SellerDashboard from '@/modules/seller/pages/Dashboard';
import AddProduct from '@/modules/seller/pages/AddProduct';
import AdminDashboard from '@/modules/admin/pages/Dashboard';
import AdminLogin from '@/modules/admin/pages/Login';
import ConsumerDashboard from '@/modules/consumer/pages/Dashboard';
import Navbar from '@/modules/shared/components/layout/Navbar';
import Footer from '@/modules/shared/components/layout/Footer';
import ProtectedRoute from '@/modules/shared/components/common/ProtectedRoute';

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
        <main className="main-content">
          <Routes>
            {/* Marketplace Routes */}
            <Route path="/" element={<MarketplaceHome />} />
            <Route path="/products" element={<ProductListing />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute requiredRole="CONSUMER">
                  <Checkout />
                </ProtectedRoute>
              }
            />
            <Route path="/track" element={<OrderTracking />} />
            <Route path="/invoice" element={<Invoice />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/new-arrivals" element={<NewArrivals />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="/category/:categoryName" element={<CategoryPage />} />
            <Route
              path="/wishlist"
              element={
                <ProtectedRoute requiredRole="CONSUMER">
                  <Wishlist />
                </ProtectedRoute>
              }
            />

            {/* Consumer Routes */}
            <Route
              path="/dashboard/*"
              element={
                <ProtectedRoute requiredRole="CONSUMER">
                  <ConsumerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Seller Routes */}
            <Route path="/seller/register" element={<SellerRegistration />} />
            <Route
              path="/seller/add-product"
              element={
                <ProtectedRoute requiredRole="SELLER">
                  <AddProduct />
                </ProtectedRoute>
              }
            />
            <Route
              path="/seller/dashboard/*"
              element={
                <ProtectedRoute requiredRole="SELLER">
                  <SellerDashboard />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute requiredRole="ADMIN">
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router >
  );
}

export default App;
