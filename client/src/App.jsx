import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import Register from "./pages/Registration";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import { Toaster } from "react-hot-toast";
import { GLOBAL_TOAST_OPTIONS } from "./utils/globalToast";

// Home components
import Navbar from "./Home/components/Navbar";
import Footer from "./Home/components/Footer";
import Banner from "./Home/pages/Banner";
import BestSellingProducts from "./Home/pages/BestSellingProducts";
import FAQ from "./Home/pages/FAQ";
import Contact from "./Home/pages/Contact";
import FeaturedProducts from "./Home/pages/FeaturedProducts";
import LatestProducts from "./Home/pages/LatestProducts";
import PopularCategory from "./Home/pages/PopularCategory";
import ProductDetails from "./Home/subPages/ProductDetails";
import ProductGrid from "./Home/subPages/ProductGrid";
import AddToCart from "./Home/components/AddToCart";
import CheckOut from "./Home/components/CheckOut";
import AboutUs from "./Home/pages/AboutUs";
import ThankYou from "./Home/components/ThankYou";
import HotDeals from "./Home/pages/HotDeals";
import OrderTracking from "./pages/OrderTracking";
import VendorStore from "./pages/VendorStore";

function HomePage() {
  return (
    <>
      <Banner />
      <PopularCategory />
      <HotDeals />
      <FeaturedProducts />
      <BestSellingProducts />
      <LatestProducts />
    </>
  );
}

// Layout component for public pages (with Navbar and Footer)
function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Routes>
          {/* Redirect all root paths to home */}
          <Route path="/" element={<HomePage />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/index" element={<Navigate to="/" replace />} />
          <Route path="/index.html" element={<Navigate to="/" replace />} />

          {/* Shop / product listing */}
          <Route path="/shop" element={<ProductGrid />} />
          <Route path="/products" element={<Navigate to="/shop" replace />} />

          {/* Single product */}
          <Route path="/product/:id" element={<ProductDetails />} />

          {/* About Us */}
          <Route path="/about" element={<AboutUs />} />
          <Route path="/about-us" element={<Navigate to="/about" replace />} />

          {/* Static pages */}
          <Route path="/contact" element={<Contact />} />
          <Route
            path="/contact-us"
            element={<Navigate to="/contact" replace />}
          />
          <Route path="/faqs" element={<FAQ />} />
          <Route path="/faq" element={<Navigate to="/faqs" replace />} />
          <Route path="/vendors" element={<Navigate to="/shop" replace />} />
          <Route path="/store/:slug" element={<VendorStore />} />

          {/* Cart / checkout */}
          <Route path="/cart" element={<AddToCart />} />
          <Route path="/added-to-cart" element={<AddToCart />} />
          <Route path="/checkout" element={<CheckOut />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route
            path="/success"
            element={<Navigate to="/thank-you" replace />}
          />
          <Route path="/track-order/:orderNumber" element={<OrderTracking />} />
          {/* Catch-all route - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

function App() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <Router>
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={GLOBAL_TOAST_OPTIONS}
      />

      <Routes>
        {/* Auth routes - redirect if already logged in */}
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route
          path="/forgot-password"
          element={
            user ? <Navigate to="/dashboard" replace /> : <ForgotPassword />
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            user ? <Navigate to="/dashboard" replace /> : <ResetPassword />
          }
        />

        {/* Dashboard (protected) */}
        <Route
          path="/dashboard/*"
          element={user ? <Dashboard /> : <Navigate to="/login" replace />}
        />

        {/* Public site routes */}
        <Route path="/*" element={<PublicLayout />} />
      </Routes>
    </Router>
  );
}

export default App;
