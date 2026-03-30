import React, { Suspense, lazy, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useDispatch } from "react-redux";
import { useAuth } from "./hooks/useAuth";
import usePublicSettings from "./hooks/usePublicSettings";
import { Toaster } from "react-hot-toast";
import { GLOBAL_TOAST_OPTIONS } from "./utils/globalToast";

// Home components
import Navbar from "./Home/components/Navbar";
import Footer from "./Home/components/Footer";
import { pushDataLayerEvent } from "./utils/marketingDataLayer";
import {
  clearNotifications,
  fetchNotifications,
  startNotificationStream,
  stopNotificationStream,
} from "./store/notificationsSlice";
import { loadPublicSettings } from "./store/publicSettingsSlice";
import { loadWishlist } from "./store/wishlistSlice";
import { applyPublicSettingsDocument } from "./utils/publicSettings";

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
  if (!raw || raw.toLowerCase() === "inherit") {
    return '"Space Grotesk", "Sora", system-ui, -apple-system, sans-serif';
  }
  return raw;
};

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Registration"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./Home/pages/Home"));
const MarketplaceHomeFloors = lazy(() => import("./Home/pages/MarketplaceHomeFloors"));
const FAQ = lazy(() => import("./Home/pages/FAQ"));
const Contact = lazy(() => import("./Home/pages/Contact"));
const ProductDetails = lazy(() => import("./Home/subPages/ProductDetails"));
const ProductGrid = lazy(() => import("./Home/subPages/ProductGrid"));
const AddToCart = lazy(() => import("./Home/components/AddToCart"));
const CheckOut = lazy(() => import("./Home/components/CheckOut"));
const AboutUs = lazy(() => import("./Home/pages/AboutUs"));
const ThankYou = lazy(() => import("./Home/components/ThankYou"));
const OrderTracking = lazy(() => import("./pages/OrderTracking"));
const VendorStore = lazy(() => import("./pages/VendorStore"));
const LandingPageView = lazy(() => import("./Home/pages/LandingPageView"));
const PolicyPage = lazy(() => import("./Home/pages/PolicyPage"));
const CompareProducts = lazy(() => import("./pages/CompareProducts"));
const MyWishlist = lazy(() => import("./pages/MyWishlist"));

function HomePage() {
  return <Home />;
}

function RouteLoadingFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900" />
    </div>
  );
}

function HashScrollHandler() {
  const location = useLocation();

  useEffect(() => {
    const hash = String(location.hash || "").replace(/^#/, "").trim();
    if (!hash) return;

    const timer = window.setTimeout(() => {
      const element = document.getElementById(hash);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, location.search]);

  return null;
}

function RouteScrollHandler() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return null;
}

function DashboardTabRedirect({ tab }) {
  try {
    if (tab) localStorage.setItem("dashboardActiveTab", tab);
  } catch {
    // ignore storage errors
  }

  return <Navigate to="/dashboard" replace />;
}

// Layout component for public pages (with Navbar and Footer)
function PublicLayout() {
  return (
    <>
      <Navbar />
      <RouteScrollHandler />
      <HashScrollHandler />
      <main className="min-h-screen">
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Redirect all root paths to home */}
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<MarketplaceHomeFloors />} />
            <Route path="/index" element={<Navigate to="/" replace />} />
            <Route path="/index.html" element={<Navigate to="/" replace />} />

            {/* Shop / product listing */}
            <Route path="/shop" element={<ProductGrid />} />
            <Route path="/products" element={<Navigate to="/shop" replace />} />
            <Route path="/compare" element={<CompareProducts />} />
            <Route path="/wishlist" element={<MyWishlist />} />

            {/* Single product */}
            <Route path="/product/:id" element={<ProductDetails />} />

            {/* About Us */}
            <Route path="/about" element={<AboutUs />} />
            <Route path="/about-us" element={<Navigate to="/about" replace />} />
            <Route path="/blog" element={<AboutUs />} />

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
            <Route path="/track-order" element={<OrderTracking />} />
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
  const dispatch = useDispatch();
  const { user, token, isLoading } = useAuth();
  const { settings } = usePublicSettings();

  useEffect(() => {
    dispatch(loadWishlist());
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleSettingsUpdated = () => {
      dispatch(loadPublicSettings({ force: true }));
    };
    const handleWishlistSync = () => {
      dispatch(loadWishlist());
    };

    window.addEventListener("publicSettingsUpdated", handleSettingsUpdated);
    window.addEventListener("userLoggedIn", handleWishlistSync);
    window.addEventListener("userLoggedOut", handleWishlistSync);
    window.addEventListener("wishlistUpdated", handleWishlistSync);
    return () => {
      window.removeEventListener("publicSettingsUpdated", handleSettingsUpdated);
      window.removeEventListener("userLoggedIn", handleWishlistSync);
      window.removeEventListener("userLoggedOut", handleWishlistSync);
      window.removeEventListener("wishlistUpdated", handleWishlistSync);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!user || !token) {
      dispatch(stopNotificationStream());
      dispatch(clearNotifications());
      return undefined;
    }

    dispatch(fetchNotifications());
    dispatch(startNotificationStream());

    return () => {
      dispatch(stopNotificationStream());
    };
  }, [dispatch, token, user]);

  useEffect(() => {
    const website = settings?.website || {};
    const themeColor = normalizeThemeColor(website?.themeColor);
    const fontFamily = normalizeFontFamily(website?.fontFamily);

    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty("--brand-theme-color", themeColor);
      document.documentElement.style.setProperty("--brand-font-family", fontFamily);
    }

    applyPublicSettingsDocument(settings);
  }, [settings]);

  useEffect(() => {
    const syncExternalScript = (id, src, options = {}) => {
      if (typeof document === "undefined") return;

      const normalizedSrc = String(src || "").trim();
      const existing = document.getElementById(id);
      if (!normalizedSrc) {
        existing?.remove();
        return;
      }

      if (existing instanceof HTMLScriptElement && existing.src === normalizedSrc) {
        existing.async = options.async !== undefined ? options.async : true;
        existing.defer = Boolean(options.defer);
        return;
      }

      existing?.remove();

      const script = document.createElement("script");
      script.id = id;
      script.src = normalizedSrc;
      script.async = options.async !== undefined ? options.async : true;
      script.defer = Boolean(options.defer);
      document.head.appendChild(script);
    };

    const syncInlineScript = (id, scriptBody) => {
      if (typeof document === "undefined") return;

      const code = String(scriptBody || "").trim();
      const existing = document.getElementById(id);

      if (!code) {
        existing?.remove();
        return;
      }

      const currentCode =
        existing instanceof HTMLScriptElement
          ? String(existing.text || existing.textContent || "").trim()
          : "";

      if (currentCode === code) {
        return;
      }

      existing?.remove();

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

    const integrations = settings?.integrations || {};
    const gaId = String(integrations.googleAnalyticsId || "").trim();
    const gtmId = String(integrations.gtmId || "").trim();
    const fbPixelId = String(integrations.facebookPixelId || "").trim();
    const customTrackingCode = sanitizeInlineScript(
      integrations.customTrackingCode || "",
    );

    if (gaId) {
      syncExternalScript("ga-script-src", `https://www.googletagmanager.com/gtag/js?id=${gaId}`);
      syncInlineScript(
        "ga-script-inline",
        `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${gaId}');`,
      );
    } else {
      syncExternalScript("ga-script-src", "");
      syncInlineScript("ga-script-inline", "");
    }

    if (gtmId) {
      syncInlineScript(
        "gtm-script-inline",
        `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtmId}');`,
      );
    } else {
      syncInlineScript("gtm-script-inline", "");
    }

    if (fbPixelId) {
      syncInlineScript(
        "fb-pixel-inline",
        `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init', '${fbPixelId}');fbq('track', 'PageView');`,
      );
    } else {
      syncInlineScript("fb-pixel-inline", "");
    }

    syncInlineScript("custom-tracking-inline", customTrackingCode);
  }, [settings]);

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
        containerStyle={{ zIndex: 130000 }}
        toastOptions={GLOBAL_TOAST_OPTIONS}
      />
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
