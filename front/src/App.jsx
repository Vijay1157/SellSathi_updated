import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MarketplaceHome from './pages/marketplace/Home';
import ProductListing from './pages/marketplace/ProductListing';
import ProductDetail from './pages/marketplace/ProductDetail';
import Checkout from './pages/marketplace/Checkout';
import OrderTracking from './pages/marketplace/OrderTracking';
import Invoice from './pages/marketplace/Invoice';
import SellerRegistration from './pages/seller/Registration';
import SellerDashboard from './pages/seller/Dashboard';
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import ProtectedRoute from './components/common/ProtectedRoute';

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
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/track" element={<OrderTracking />} />
            <Route path="/invoice" element={<Invoice />} />

            {/* Seller Routes */}
            <Route path="/seller/register" element={<SellerRegistration />} />
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
