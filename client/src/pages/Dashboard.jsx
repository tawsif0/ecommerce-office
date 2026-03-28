/* eslint-disable no-unused-vars */
import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// Components
import Sidebar from "../components/Dashboard/Sidebar";
import MobileHeader from "../components/Dashboard/MobileHeader";
import { fetchPublicSettings } from "../utils/publicSettings";
import {
  canAccessDashboardTab,
  isSuperAdminUser,
  normalizeMarketplaceMode,
  SINGLE_VENDOR_DISABLED_TABS,
} from "../utils/dashboardAccess";
import { getDashboardTabMeta } from "../utils/dashboardPresentation";

const Settings = React.lazy(() => import("../components/Dashboard/Settings"));
const AdminPaymentMethods = React.lazy(() => import("./AdminPaymentMethods"));
const DashboardHome = React.lazy(() => import("./DashboardHome"));
const AdminAddOrder = React.lazy(() => import("./AdminAddOrder"));
const CreateCategory = React.lazy(() => import("./Category/CreateCategory"));
const ModifyCategory = React.lazy(() => import("./Category/ModifyCategory"));
const ProductModify = React.lazy(() => import("./Product/ProductModify"));
const CreateBanner = React.lazy(() => import("./Banner/CreateBanner"));
const ModifyBanner = React.lazy(() => import("./Banner/ModifyBanner"));
const AdminOrderList = React.lazy(() => import("./AdminOrderList"));
const UserOrders = React.lazy(() => import("./UserOrders"));
const AdminCoupons = React.lazy(() => import("./AdminCoupons"));
const AdminVendors = React.lazy(() => import("./AdminVendors"));
const VendorDashboardHome = React.lazy(() => import("./VendorDashboardHome"));
const VendorStoreSettings = React.lazy(() => import("./VendorStoreSettings"));
const VendorOrders = React.lazy(() => import("./VendorOrders"));
const AdminProductApprovals = React.lazy(() => import("./AdminProductApprovals"));
const AdminShippingZones = React.lazy(() => import("./AdminShippingZones"));
const VendorShippingZones = React.lazy(() => import("./VendorShippingZones"));
const VendorMessages = React.lazy(() => import("./VendorMessages"));
const AdminVendorReports = React.lazy(() => import("./AdminVendorReports"));
const AdminVendorReviews = React.lazy(() => import("./AdminVendorReviews"));
const AdminProductReports = React.lazy(() => import("./AdminProductReports"));
const AdminCustomerRisk = React.lazy(() => import("./AdminCustomerRisk"));
const MyAddresses = React.lazy(() => import("./MyAddresses"));
const MyWishlist = React.lazy(() => import("./MyWishlist"));
const ModuleSubscriptions = React.lazy(() => import("./ModuleSubscriptions"));
const ModuleBookings = React.lazy(() => import("./ModuleBookings"));
const ModuleAuctions = React.lazy(() => import("./ModuleAuctions"));
const ModuleStaff = React.lazy(() => import("./ModuleStaff"));
const ModuleVerifications = React.lazy(() => import("./ModuleVerifications"));
const ModuleAds = React.lazy(() => import("./ModuleAds"));
const ModuleSupportTickets = React.lazy(() => import("./ModuleSupportTickets"));
const ModuleGeolocation = React.lazy(() => import("./ModuleGeolocation"));
const ModuleAbandonedOrders = React.lazy(() => import("./ModuleAbandonedOrders"));
const ModuleSuppliers = React.lazy(() => import("./ModuleSuppliers"));
const ModulePurchases = React.lazy(() => import("./ModulePurchases"));
const ModuleInventoryCenter = React.lazy(() => import("./ModuleInventoryCenter"));
const ModuleAccounts = React.lazy(() => import("./ModuleAccounts"));
const ModuleBrands = React.lazy(() => import("./ModuleBrands"));
const ModuleVendorPayouts = React.lazy(() => import("./ModuleVendorPayouts"));
const ModuleVoiceAssistant = React.lazy(() => import("./ModuleVoiceAssistant"));
const ModuleBusinessReports = React.lazy(() => import("./ModuleBusinessReports"));
const ModuleWebsiteSetup = React.lazy(() => import("./ModuleWebsiteSetup"));
const ModuleCampaignOffers = React.lazy(() => import("./ModuleCampaignOffers"));
const ModuleAdminUsers = React.lazy(() => import("./ModuleAdminUsers"));
const ModuleSuperAdminControl = React.lazy(() => import("./ModuleSuperAdminControl"));
const AdminContactedUsers = React.lazy(() => import("./AdminContactedUsers"));

const TabLoadingFallback = () => (
  <div className="app-panel-soft flex min-h-[260px] items-center justify-center">
    <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-black" />
  </div>
);

// Memoized content components
const TabContent = React.memo(({
  activeTab,
  user,
  onTabChange,
  onMarketplaceModeChange,
  marketplaceMode,
}) => {
  if (
    activeTab !== "dashboard" &&
    !canAccessDashboardTab({
      user,
      tab: activeTab,
      marketplaceMode,
    })
  ) {
    return (
      <div className="app-panel p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-black">Access Restricted</h2>
        <p className="text-gray-600">
          You do not have permission to access this module.
        </p>
      </div>
    );
  }

  if (user?.userType === "admin" && activeTab === "dashboard") {
    return <DashboardHome user={user} onTabChange={onTabChange} />;
  }

  if (user?.userType === "vendor" && activeTab === "dashboard") {
    return <VendorDashboardHome onTabChange={onTabChange} />;
  }

  if (user?.userType !== "admin" && activeTab === "dashboard") {
    return <DashboardHome user={user} onTabChange={onTabChange} />;
  }

  switch (activeTab) {
    case "settings":
      return <Settings user={user} />;
    case "payment-methods":
      return user?.userType === "admin" ? <AdminPaymentMethods /> : null;
    case "vendors-admin":
      return user?.userType === "admin" ? <AdminVendors /> : null;
    case "create-category":
      return user?.userType === "admin" ? <CreateCategory /> : null;
    case "modify-category":
      return user?.userType === "admin" ? <ModifyCategory /> : null;
    case "create-banner":
      return user?.userType === "admin" ? <CreateBanner /> : null;
    case "modify-banner":
      return user?.userType === "admin" ? <ModifyBanner /> : null;
    case "create-product":
      return user?.userType === "admin" || user?.userType === "vendor" ? (
        <ProductModify initialMode="create" />
      ) : null;
    case "modify-product":
      return user?.userType === "admin" || user?.userType === "vendor" ? (
        <ProductModify initialMode="list" />
      ) : null;
    case "product-approvals":
      return user?.userType === "admin" ? <AdminProductApprovals /> : null;
    case "order-list":
      return user?.userType === "admin" ? <AdminOrderList /> : null;
    case "add-order":
      return user?.userType === "admin" ? <AdminAddOrder /> : null;
    case "vendor-store":
      return user?.userType === "vendor" ? <VendorStoreSettings /> : null;
    case "vendor-orders":
      return user?.userType === "vendor" ? <VendorOrders /> : null;
    case "vendor-dashboard":
      return user?.userType === "vendor" ? <VendorDashboardHome onTabChange={onTabChange} /> : null;
    case "coupons":
      return user?.userType === "admin" || user?.userType === "vendor" ? (
        <AdminCoupons />
      ) : null;
    case "shipping-zones":
      return user?.userType === "admin" ? <AdminShippingZones /> : null;
    case "vendor-shipping":
      return user?.userType === "vendor" ? <VendorShippingZones /> : null;
    case "vendor-messages":
      return ["vendor", "staff", "user", "admin"].includes(user?.userType) ? (
        <VendorMessages />
      ) : null;
    case "vendor-reports":
      return user?.userType === "admin" ? <AdminVendorReports /> : null;
    case "product-reports":
      return user?.userType === "admin" ? <AdminProductReports /> : null;
    case "vendor-reviews":
      return user?.userType === "admin" ? <AdminVendorReviews /> : null;
    case "customer-risk":
      return user?.userType === "admin" ? <AdminCustomerRisk /> : null;
    case "customers":
      return user?.userType === "admin" ? <AdminCustomerRisk /> : null;
    case "my-orders":
      return user?.userType !== "admin" ? <UserOrders /> : null;
    case "wishlist":
      return user?.userType === "user" ? <MyWishlist /> : null;
    case "my-addresses":
      return user?.userType === "user" ? <MyAddresses /> : null;
    case "module-subscriptions":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleSubscriptions />
      ) : null;
    case "module-bookings":
      return <ModuleBookings />;
    case "module-auctions":
      return <ModuleAuctions />;
    case "module-staff":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleStaff />
      ) : null;
    case "module-verifications":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleVerifications />
      ) : null;
    case "module-ads":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleAds />
      ) : null;
    case "module-support":
      return <ModuleSupportTickets />;
    case "module-geolocation":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleGeolocation />
      ) : null;
    case "module-abandoned":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleAbandonedOrders />
      ) : null;
    case "module-suppliers":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleSuppliers />
      ) : null;
    case "module-purchases":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModulePurchases />
      ) : null;
    case "module-inventory":
      return user?.userType === "admin" || user?.userType === "vendor" ? (
        <ModuleInventoryCenter />
      ) : null;
    case "module-accounts":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleAccounts />
      ) : null;
    case "module-brands":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleBrands />
      ) : null;
    case "module-vendor-payouts":
      return user?.userType === "admin" ? <ModuleVendorPayouts /> : null;
    case "module-campaign-offers":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleCampaignOffers onOpenTab={onTabChange} />
      ) : null;
    case "module-voice":
      return (
        <ModuleVoiceAssistant
          user={user}
          onTabChange={onTabChange}
        />
      );
    case "module-admin-users":
      return user?.userType === "admin" ? <ModuleAdminUsers /> : null;
    case "module-super-admin":
      return user?.userType === "admin" && isSuperAdminUser(user) ? (
        <ModuleSuperAdminControl onMarketplaceModeChange={onMarketplaceModeChange} />
      ) : null;
    case "module-business-reports":
      return user?.userType === "admin" || user?.userType === "vendor" || user?.userType === "staff" ? (
        <ModuleBusinessReports />
      ) : null;
    case "module-website-setup":
      return user?.userType === "admin" ? <ModuleWebsiteSetup /> : null;
    case "contacted-list":
      return user?.userType === "admin" ? <AdminContactedUsers /> : null;
    default:
      return <DashboardHome user={user} onTabChange={onTabChange} />;
  }
});

TabContent.displayName = "TabContent";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("dashboardActiveTab") || "dashboard";
  });
  const [marketplaceMode, setMarketplaceMode] = useState("multi");

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const pageMeta = getDashboardTabMeta(activeTab, user);

  // Check screen size
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) {
        setIsMobileOpen(false);
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);

    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Set default tab based on user status
  useEffect(() => {
    if (user) {
      const savedTab = localStorage.getItem("dashboardActiveTab");
      if (!savedTab || savedTab === "home") {
        setActiveTab("dashboard");
        localStorage.setItem("dashboardActiveTab", "dashboard");
      }
    }
  }, [user]);

  // Update localStorage whenever activeTab changes
  useEffect(() => {
    if (activeTab && activeTab !== "home") {
      localStorage.setItem("dashboardActiveTab", activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;

    const loadMarketplaceMode = async () => {
      if (!user) return;
      try {
        const settings = await fetchPublicSettings();
        if (!mounted) return;
        setMarketplaceMode(normalizeMarketplaceMode(settings?.marketplaceMode));
      } catch (_error) {
        if (!mounted) return;
        setMarketplaceMode("multi");
      }
    };

    loadMarketplaceMode();
    return () => {
      mounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (activeTab === "dashboard" || activeTab === "home") return;

    if (
      canAccessDashboardTab({
        user,
        tab: activeTab,
        marketplaceMode,
      })
    ) {
      return;
    }

    setActiveTab("dashboard");
    localStorage.setItem("dashboardActiveTab", "dashboard");

    if (
      normalizeMarketplaceMode(marketplaceMode) === "single" &&
      SINGLE_VENDOR_DISABLED_TABS.has(activeTab)
    ) {
      toast.error("This module is disabled in single-vendor mode");
      return;
    }

    if (activeTab === "module-super-admin") {
      toast.error("Super admin access required");
      return;
    }

    toast.error("You do not have access to this module");
  }, [marketplaceMode, activeTab, user]);

  const handleTabChange = useCallback((tab) => {
    // If it's "home" tab, navigate to homepage
    if (tab === "home") {
      navigate("/");
      return;
    }

    if (
      normalizeMarketplaceMode(marketplaceMode) === "single" &&
      SINGLE_VENDOR_DISABLED_TABS.has(tab)
    ) {
      toast.error("This module is disabled in single-vendor mode");
      setActiveTab("dashboard");
      return;
    }

    if (
      !canAccessDashboardTab({
        user,
        tab,
        marketplaceMode,
      })
    ) {
      if (tab === "module-super-admin") {
        toast.error("Super admin access required");
      } else {
        toast.error("You do not have access to this module");
      }
      return;
    }

    setActiveTab(tab);
    if (isMobile) {
      setIsMobileOpen(false);
    }
  }, [isMobile, marketplaceMode, navigate, user]);

  useEffect(() => {
    const handleVoiceTabChange = (event) => {
      const tab = String(event?.detail?.tab || "").trim();
      if (!tab) return;
      handleTabChange(tab);
    };

    window.addEventListener("voiceDashboardTabChange", handleVoiceTabChange);
    return () => {
      window.removeEventListener("voiceDashboardTabChange", handleVoiceTabChange);
    };
  }, [handleTabChange]);

  const handleMarketplaceModeChange = (mode) => {
    setMarketplaceMode(normalizeMarketplaceMode(mode));
  };

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      setSidebarOpen(!sidebarOpen);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    // Dismiss any existing toasts first
    toast.dismiss();

    localStorage.removeItem("dashboardActiveTab");
    logout();
    setShowLogoutConfirm(false);
  };

  return (
    <div className="dashboard-ui app-shell relative p-2 md:p-4">
      {/* Mobile Header */}
      {isMobile && (
        <MobileHeader
          toggleSidebar={toggleSidebar}
          user={user}
          pageMeta={pageMeta}
        />
      )}

      {isMobile && (
        <Sidebar
          isMobile={isMobile}
          isMobileOpen={isMobileOpen}
          sidebarOpen={sidebarOpen}
          activeTab={activeTab}
          user={user}
          handleTabChange={handleTabChange}
          toggleSidebar={toggleSidebar}
          setIsMobileOpen={setIsMobileOpen}
          handleLogout={handleLogout}
          isHovered={isHovered}
          setIsHovered={setIsHovered}
        />
      )}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        className={`app-frame flex relative ${
          isMobile ? "mb-2 mt-16 h-[calc(100vh-5rem)]" : "h-[calc(100vh-2rem)]"
        }`}
      >
        {!isMobile && (
          <Sidebar
            isMobile={isMobile}
            isMobileOpen={isMobileOpen}
            sidebarOpen={sidebarOpen}
            activeTab={activeTab}
            user={user}
            handleTabChange={handleTabChange}
            toggleSidebar={toggleSidebar}
            setIsMobileOpen={setIsMobileOpen}
            handleLogout={handleLogout}
            isHovered={isHovered}
            setIsHovered={setIsHovered}
          />
        )}

        {/* Main Content Area */}
        <div className="app-scrollbar relative h-full min-w-0 flex-1 overflow-auto bg-linear-to-br from-slate-50 via-white to-slate-100">
          {/* Rendered Content */}
          <div className="dashboard-content-shell w-full p-4 md:p-4 lg:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="dashboard-page-shell w-full min-w-0 space-y-6"
              >
                <div className="dashboard-page-bar app-panel-soft w-full px-5 py-5 md:px-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                      <p className="app-kicker">{pageMeta.section}</p>
                      <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 md:text-3xl">
                        {pageMeta.title}
                      </h1>
                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 md:text-[0.95rem]">
                        {pageMeta.description}
                      </p>
                    </div>
                    <div className="app-panel-muted inline-flex items-center rounded-[22px] px-4 py-3 text-sm font-medium text-slate-600">
                      Active module: <span className="ml-2 font-semibold text-slate-950">{pageMeta.title}</span>
                    </div>
                  </div>
                </div>
                <Suspense fallback={<TabLoadingFallback />}>
                  <TabContent
                    activeTab={activeTab}
                    user={user}
                    onTabChange={handleTabChange}
                    onMarketplaceModeChange={handleMarketplaceModeChange}
                    marketplaceMode={marketplaceMode}
                  />
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -20, opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="app-panel w-full max-w-md overflow-hidden"
            >
              <div className="p-8 text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-black mb-4">
                  <FiLogOut className="h-5 w-5 text-white" />
                </div>

                <h3 className="text-lg font-medium text-black mb-2">
                  Ready to leave?
                </h3>
                <p className="text-gray-700 mb-6">
                  Are you sure you want to sign out of your account?
                </p>

                <div className="flex justify-center space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowLogoutConfirm(false)}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-all"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmLogout}
                    className="px-5 py-2.5 text-sm font-medium rounded-lg bg-black text-white hover:bg-gray-800 transition-all"
                  >
                    Logout
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
