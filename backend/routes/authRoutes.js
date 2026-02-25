const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const paymentController = require("../controllers/paymentController");
const auth = require("../middlewares/auth");

// Public routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser); // Accepts email OR phone
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.get("/payment-methods", paymentController.getPaymentMethods);

// Protected routes - All users
router.get("/profile", auth, authController.getUserProfile);
router.put("/profile", auth, authController.updateUserProfile);
router.put("/change-password", auth, authController.changePassword);
router.get("/admin/settings", auth, authController.getSettings);

// Admin only routes
router.put("/admin/settings", auth, authController.updateSettings);
router.get("/admin/all-users", auth, authController.getAllUsers);
router.get("/admin/system-stats", auth, authController.getSystemStats);
router.get(
  "/admin/payment-methods",
  auth,
  paymentController.getAllPaymentMethods
);
router.post("/admin/payment-methods", auth, paymentController.addPaymentMethod);
router.put(
  "/admin/payment-methods/:id",
  auth,
  paymentController.updatePaymentMethod
);
router.delete(
  "/admin/payment-methods/:id",
  auth,
  paymentController.deletePaymentMethod
);

module.exports = router;
