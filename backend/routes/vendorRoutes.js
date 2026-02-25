const express = require("express");
const auth = require("../middlewares/auth");
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
router.post("/register", auth, registerVendor);
router.get("/me/profile", auth, getMyVendorProfile);
router.put("/me/profile", auth, updateMyVendorProfile);
router.get("/me/stats", auth, getVendorDashboardStats);
router.get("/me/orders", auth, getVendorOrders);
router.get("/me/contact-messages", auth, getMyVendorMessages);
router.patch("/me/contact-messages/:id/status", auth, updateMyVendorMessageStatus);

// Admin routes
router.get("/admin/all", auth, getAdminVendors);
router.get("/admin/reports", auth, getAdminVendorReports);
router.get("/admin/reviews", auth, getAdminVendorReviews);
router.patch("/admin/:id/status", auth, updateVendorStatus);
router.patch("/admin/:id/commission", auth, updateVendorCommission);
router.patch("/admin/reviews/:id/status", auth, updateVendorReviewStatus);

// Public store routes
router.get("/:slug/store", getVendorStore);
router.get("/:slug/reviews", getVendorReviews);
router.post("/:slug/contact", createVendorContactMessage);

// Authenticated customer review routes
router.post("/:slug/reviews", auth, createVendorReview);
router.delete("/:slug/reviews/me", auth, deleteMyVendorReview);

module.exports = router;
