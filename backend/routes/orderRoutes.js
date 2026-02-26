// routes/orderRoutes.js
const express = require("express");
const {
  createOrder,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  getUserOrders,
  guestCheckout,
  getAllOrders, // NEW
  getAdminProductReports,
  trackOrder, // NEW
  searchOrders, // NEW
  generateCourierConsignment,
  syncCourierTracking,
  getCourierLabel,
  getAdminCustomerInsights,
  createAdminOrder,
} = require("../controllers/orderController.js");
const auth = require("../middlewares/auth.js");

const router = express.Router();

// Public routes
router.post("/guest-checkout", guestCheckout);
router.get("/track/:orderNumber", trackOrder); // NEW - Public tracking
router.get("/search", searchOrders); // NEW - Search for navbar

// All other routes require auth
router.use(auth);

// User routes
router.post("/", createOrder);
router.get("/user", getUserOrders);
router.get("/:id", getOrder);
router.patch("/:id/cancel", cancelOrder);

// Admin routes
router.get("/admin/all", getAllOrders); // NEW - Admin order list
router.get("/admin/product-reports", getAdminProductReports);
router.patch("/admin/:id/status", updateOrderStatus); // UPDATED - Admin status update
router.post("/admin/customer-insights", getAdminCustomerInsights);
router.post("/admin/manual", createAdminOrder);
router.post("/admin/:id/courier/consignment", generateCourierConsignment);
router.post("/admin/:id/courier/sync", syncCourierTracking);
router.get("/admin/:id/courier/label", getCourierLabel);

module.exports = router;
