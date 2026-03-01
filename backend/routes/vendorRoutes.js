const express = require("express");
const auth = require("../middlewares/auth");
const { ensureMultiVendorMode } = require("../middlewares/marketplaceMode");
const {
  registerVendor,
  getMyVendorProfile,
  updateMyVendorProfile,
  getPublicVendors,
  getNearbyVendors,
  getVendorStore,
  getAdminVendors,
  updateVendorStatus,
  updateVendorCommission,
  getVendorDashboardStats,
  getVendorOrders,
  getAdminVendorReports,
} = require("../controllers/vendorController");
const {
  getVendorReviews,
  createVendorReview,
  deleteMyVendorReview,
  createVendorContactMessage,
  getMyVendorMessages,
  updateMyVendorMessageStatus,
  getAdminVendorReviews,
  updateVendorReviewStatus,
} = require("../controllers/vendorEngagementController");

const router = express.Router();

// Public route
router.get("/", getPublicVendors);
router.get("/nearby", getNearbyVendors);

// Authenticated vendor routes
router.post("/register", auth, ensureMultiVendorMode, registerVendor);
router.get("/me/profile", auth, ensureMultiVendorMode, getMyVendorProfile);
router.put("/me/profile", auth, ensureMultiVendorMode, updateMyVendorProfile);
router.get("/me/stats", auth, ensureMultiVendorMode, getVendorDashboardStats);
router.get("/me/orders", auth, ensureMultiVendorMode, getVendorOrders);
router.get(
  "/me/contact-messages",
  auth,
  ensureMultiVendorMode,
  getMyVendorMessages,
);
router.patch(
  "/me/contact-messages/:id/status",
  auth,
  ensureMultiVendorMode,
  updateMyVendorMessageStatus,
);

// Admin routes
router.get("/admin/all", auth, ensureMultiVendorMode, getAdminVendors);
router.get("/admin/reports", auth, ensureMultiVendorMode, getAdminVendorReports);
router.get("/admin/reviews", auth, ensureMultiVendorMode, getAdminVendorReviews);
router.patch("/admin/:id/status", auth, ensureMultiVendorMode, updateVendorStatus);
router.patch(
  "/admin/:id/commission",
  auth,
  ensureMultiVendorMode,
  updateVendorCommission,
);
router.patch(
  "/admin/reviews/:id/status",
  auth,
  ensureMultiVendorMode,
  updateVendorReviewStatus,
);

// Public store routes
router.get("/:slug/store", getVendorStore);
router.get("/:slug/reviews", getVendorReviews);
router.post("/:slug/contact", createVendorContactMessage);

// Authenticated customer review routes
router.post("/:slug/reviews", auth, createVendorReview);
router.delete("/:slug/reviews/me", auth, deleteMyVendorReview);

module.exports = router;
