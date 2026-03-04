const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const paymentController = require("../controllers/paymentController");
const auth = require("../middlewares/auth");
const responseCache = require("../middlewares/responseCache");

// Public routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser); // Accepts email OR phone
router.get("/social/google", authController.startGoogleLogin);
router.get("/social/google/callback", authController.handleGoogleLoginCallback);
router.get("/social/facebook", authController.startFacebookLogin);
router.get("/social/facebook/callback", authController.handleFacebookLoginCallback);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);
router.get("/payment-methods", responseCache(60000), paymentController.getPaymentMethods);
router.get("/public/settings", responseCache(60000), authController.getPublicSettings);

// Protected routes - All users
router.get("/profile", auth, authController.getUserProfile);
router.put("/profile", auth, authController.updateUserProfile);
router.put("/change-password", auth, authController.changePassword);
router.get("/admin/settings", auth, authController.getSettings);

// Admin only routes
router.put("/admin/settings", auth, authController.updateSettings);
router.get(
  "/admin/marketplace-control",
  auth,
  authController.getMarketplaceControlOverview
);
router.put(
  "/admin/marketplace-control",
  auth,
  authController.updateMarketplaceControl
);
router.post("/admin/create-admin", auth, authController.createAdminUser);
router.get("/admin/all-users", auth, authController.getAllUsers);
router.patch("/admin/users/:userId", auth, authController.updateUserByAdmin);
router.get("/admin/system-stats", auth, authController.getSystemStats);
router.get("/admin/customer-risk", auth, authController.getCustomerRiskProfiles);
router.get("/admin/voice-dataset", auth, authController.getVoiceDataset);
router.get(
  "/admin/customers/:userId/profile",
  auth,
  authController.getCustomerProfileByAdmin
);
router.patch(
  "/admin/customer-risk/:userId/blacklist",
  auth,
  authController.updateCustomerBlacklist
);
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
