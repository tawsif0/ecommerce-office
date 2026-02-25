/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import { FiLogOut } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// Components
import Sidebar from "../components/Dashboard/Sidebar";
import MobileHeader from "../components/Dashboard/MobileHeader";
import Settings from "../components/Dashboard/Settings";
import AdminPaymentMethods from "./AdminPaymentMethods";
import DashboardHome from "./DashboardHome";
import CreateCategory from "./Category/CreateCategory";
import ModifyCategory from "./Category/ModifyCategory";
import ProductModify from "./Product/ProductModify";
import BulkProductUpload from "./Product/BulkProductUpload";
import CreateBanner from "./Banner/CreateBanner";
import ModifyBanner from "./Banner/ModifyBanner";
import AdminOrderList from "./AdminOrderList";
import UserOrders from "./UserOrders";
import AdminCoupons from "./AdminCoupons";
import AdminVendors from "./AdminVendors";
import VendorDashboardHome from "./VendorDashboardHome";
import VendorStoreSettings from "./VendorStoreSettings";
import VendorOrders from "./VendorOrders";
import AdminProductApprovals from "./AdminProductApprovals";
import AdminShippingZones from "./AdminShippingZones";
import VendorShippingZones from "./VendorShippingZones";
import VendorMessages from "./VendorMessages";
import AdminVendorReports from "./AdminVendorReports";
import AdminVendorReviews from "./AdminVendorReviews";
import AdminProductReports from "./AdminProductReports";
import MyWishlist from "./MyWishlist";
import ModuleSubscriptions from "./ModuleSubscriptions";
import ModuleBookings from "./ModuleBookings";
import ModuleAuctions from "./ModuleAuctions";
import ModuleStaff from "./ModuleStaff";
import ModuleVerifications from "./ModuleVerifications";
import ModuleAds from "./ModuleAds";
import ModuleSupportTickets from "./ModuleSupportTickets";
import ModuleGeolocation from "./ModuleGeolocation";

// Memoized content components
const TabContent = React.memo(({ activeTab, user }) => {
  if (user?.userType === "admin" && activeTab === "dashboard") {
    return <DashboardHome user={user} />;
  }

  if (user?.userType === "vendor" && activeTab === "dashboard") {
    return <VendorDashboardHome />;
  }

  if (user?.userType !== "admin" && activeTab === "dashboard") {
    return <DashboardHome user={user} />;
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
    case "bulk-product-upload":
      return user?.userType === "admin" || user?.userType === "vendor" ? (
        <BulkProductUpload />
      ) : null;
    case "product-approvals":
      return user?.userType === "admin" ? <AdminProductApprovals /> : null;
    case "order-list":
      return user?.userType === "admin" ? <AdminOrderList /> : null;
    case "vendor-store":
      return user?.userType === "vendor" ? <VendorStoreSettings /> : null;
    case "vendor-orders":
      return user?.userType === "vendor" ? <VendorOrders /> : null;
    case "vendor-dashboard":
      return user?.userType === "vendor" ? <VendorDashboardHome /> : null;
    case "coupons":
      return user?.userType === "admin" || user?.userType === "vendor" ? (
        <AdminCoupons />
      ) : null;
    case "shipping-zones":
      return user?.userType === "admin" ? <AdminShippingZones /> : null;
    case "vendor-shipping":
      return user?.userType === "vendor" ? <VendorShippingZones /> : null;
    case "vendor-messages":
      return user?.userType === "vendor" ? <VendorMessages /> : null;
    case "vendor-reports":
      return user?.userType === "admin" ? <AdminVendorReports /> : null;
    case "product-reports":
      return user?.userType === "admin" ? <AdminProductReports /> : null;
    case "vendor-reviews":
      return user?.userType === "admin" ? <AdminVendorReviews /> : null;
    case "my-orders":
      return user?.userType !== "admin" ? <UserOrders /> : null;
    case "wishlist":
      return user?.userType === "user" ? <MyWishlist /> : null;
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
    default:
      return <DashboardHome user={user} />;
  }
});

TabContent.displayName = "TabContent";

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("dashboardActiveTab") || "dashboard";
  });

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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

  const handleTabChange = (tab) => {
    // If it's "home" tab, navigate to homepage
    if (tab === "home") {
      navigate("/");
      return;
    }
    // Check if user has permission for this tab
    const adminOnlyTabs = [
      "payment-methods",
      "vendors-admin",
      "create-category",
      "modify-category",
      "create-banner",
      "modify-banner",
      "order-list",
      "product-approvals",
      "shipping-zones",
      "vendor-reports",
      "product-reports",
      "vendor-reviews",
    ];

    if (adminOnlyTabs.includes(tab) && user?.userType !== "admin") {
      toast.error("Admin access required");
      return;
    }

    setActiveTab(tab);
    if (isMobile) {
      setIsMobileOpen(false);
    }
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
    <div className="bg-linear-to-br from-gray-50 to-gray-100 min-h-screen flex items-center justify-center p-2 md:p-4 relative">
      {/* Mobile Header */}
      {isMobile && <MobileHeader toggleSidebar={toggleSidebar} />}

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobile && isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 md:hidden"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Content */}
      <div
        className={`flex w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 relative ${
          isMobile ? "mt-16 mb-2 h-[calc(100vh-5rem)]" : "h-[95vh]"
        }`}
      >
        {/* Sidebar */}
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

        {/* Main Content Area */}
        <div className="flex-1 h-full overflow-auto relative bg-linear-to-br from-gray-50 to-white">
          {/* Rendered Content */}
          <div className="p-4 md:p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <TabContent activeTab={activeTab} user={user} />
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
              className="bg-white rounded-xl shadow-2xl overflow-hidden w-full max-w-md border border-gray-300"
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
