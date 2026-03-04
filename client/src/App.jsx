import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { Toaster } from "react-hot-toast";
import { GLOBAL_TOAST_OPTIONS } from "./utils/globalToast";

// Home components
import Navbar from "./Home/components/Navbar";
import Footer from "./Home/components/Footer";
import { fetchPublicSettings } from "./utils/publicSettings";
import { pushDataLayerEvent } from "./utils/marketingDataLayer";
import GlobalVoiceAssistant from "./components/GlobalVoiceAssistant";

const normalizeThemeColor = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw;
  }

  return "#000000";
};

const normalizeFontFamily = (value) => {
  const raw = String(value || "").trim();
  if (!raw || raw.toLowerCase() === "inherit") return "inherit";
  return raw;
};

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Registration"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Banner = lazy(() => import("./Home/pages/Banner"));
const BestSellingProducts = lazy(() => import("./Home/pages/BestSellingProducts"));
const FAQ = lazy(() => import("./Home/pages/FAQ"));
const Contact = lazy(() => import("./Home/pages/Contact"));
const FeaturedProducts = lazy(() => import("./Home/pages/FeaturedProducts"));
const LatestProducts = lazy(() => import("./Home/pages/LatestProducts"));
const PopularCategory = lazy(() => import("./Home/pages/PopularCategory"));
const MarketplaceAds = lazy(() => import("./Home/pages/MarketplaceAds"));
const ProductDetails = lazy(() => import("./Home/subPages/ProductDetails"));
const ProductGrid = lazy(() => import("./Home/subPages/ProductGrid"));
const AddToCart = lazy(() => import("./Home/components/AddToCart"));
const CheckOut = lazy(() => import("./Home/components/CheckOut"));
const AboutUs = lazy(() => import("./Home/pages/AboutUs"));
const ThankYou = lazy(() => import("./Home/components/ThankYou"));
const HotDeals = lazy(() => import("./Home/pages/HotDeals"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const VendorStore = lazy(() => import("./pages/VendorStore"));
const LandingPageView = lazy(() => import("./Home/pages/LandingPageView"));
const PolicyPage = lazy(() => import("./Home/pages/PolicyPage"));

function HomePage() {
  return (
    <>
      <Banner />
      <MarketplaceAds placement="home_sidebar" limit={3} />
      <PopularCategory />
      <HotDeals />
      <FeaturedProducts />
      <BestSellingProducts />
      <LatestProducts />
    </>
  );
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
    </div>
  );
}

// Layout component for public pages (with Navbar and Footer)
function PublicLayout() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <Suspense fallback={<RouteLoadingFallback />}>
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
            <Route path="/lp/:slug" element={<LandingPageView />} />
            <Route path="/policy/:policyType" element={<PolicyPage />} />

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
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function PageViewTracker() {
  const location = useLocation();

  useEffect(() => {
    pushDataLayerEvent("page_view", {
      page_path: `${location.pathname}${location.search || ""}`,
      page_title: typeof document !== "undefined" ? document.title : "",
      page_location:
        typeof window !== "undefined" ? window.location.href : "",
    });
  }, [location.pathname, location.search]);

  return null;
}

function App() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    let cancelled = false;

    const applyWebsiteTheme = async (force = false) => {
      const settings = await fetchPublicSettings({ force });
      if (cancelled) return;

      const website = settings?.website || {};
      const themeColor = normalizeThemeColor(website?.themeColor);
      const fontFamily = normalizeFontFamily(website?.fontFamily);

      if (typeof document !== "undefined") {
        document.documentElement.style.setProperty("--brand-theme-color", themeColor);
        document.documentElement.style.setProperty("--brand-font-family", fontFamily);
      }
    };

    applyWebsiteTheme(false);

    const handleSettingsUpdated = () => {
      applyWebsiteTheme(true);
    };

    window.addEventListener("publicSettingsUpdated", handleSettingsUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("publicSettingsUpdated", handleSettingsUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const appendScriptOnce = (id, src, options = {}) => {
      if (document.getElementById(id)) return;
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = options.async !== undefined ? options.async : true;
      if (options.defer) script.defer = true;
      document.head.appendChild(script);
    };

    const appendInlineScriptOnce = (id, scriptBody) => {
      const code = String(scriptBody || "").trim();
      if (!code || document.getElementById(id)) return;
      const script = document.createElement("script");
      script.id = id;
      script.text = code;
      document.head.appendChild(script);
    };

    const sanitizeInlineScript = (rawCode) =>
      String(rawCode || "")
        .replace(/<script[^>]*>/gi, "")
        .replace(/<\/script>/gi, "")
        .trim();

    const initTracking = async () => {
      const settings = await fetchPublicSettings();
      if (cancelled) return;

      const integrations = settings?.integrations || {};
      const gaId = String(integrations.googleAnalyticsId || "").trim();
      const gtmId = String(integrations.gtmId || "").trim();
      const fbPixelId = String(integrations.facebookPixelId || "").trim();
      const customTrackingCode = sanitizeInlineScript(
        integrations.customTrackingCode || "",
      );

      if (gaId) {
        appendScriptOnce("ga-script-src", `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
        appendInlineScriptOnce(
          "ga-script-inline",
          `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`,
        );
      }

      if (gtmId) {
        appendInlineScriptOnce(
          "gtm-script-inline",
          `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
        );
      }

      if (fbPixelId) {
        appendInlineScriptOnce(
          "fb-pixel-inline",
          `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${fbPixelId}');fbq('track', 'PageView');`,
        );
      }

      if (customTrackingCode) {
        appendInlineScriptOnce("custom-tracking-inline", customTrackingCode);
      }
    };

    initTracking();

    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <Router>
      <PageViewTracker />
      <Toaster
        position="top-center"
        gutter={10}
        toastOptions={GLOBAL_TOAST_OPTIONS}
      />
      <GlobalVoiceAssistant />
      <Suspense fallback={<RouteLoadingFallback />}>
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
      </Suspense>
    </Router>
  );
}

export default App;
