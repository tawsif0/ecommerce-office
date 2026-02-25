const express = require("express");
const {
  createProduct,
  getProducts,
  getProduct,
  updateProduct,
  deleteProduct,
  getActiveProducts,
  getProductsByType,
  bulkCreateProducts,
  toggleProductActive,
  duplicateProduct,
  updateProductApprovalStatus,
  searchProducts,
  getSearchSuggestions,
} = require("../controllers/productController.js");
const {
  getProductReviews,
  getMyProductReview,
  createOrUpdateProductReview,
  deleteMyProductReview,
} = require("../controllers/productEngagementController.js");
const auth = require("../middlewares/auth.js");
const { upload, handleMulterError } = require("../middlewares/upload.js");

const router = express.Router();

// Public routes - SPECIFIC ROUTES FIRST
router.get("/public/search", searchProducts);
router.get("/public/suggestions", getSearchSuggestions);
router.get("/public/:id/reviews", getProductReviews);
router.get("/public", getActiveProducts);
router.get("/public/type/:productType", getProductsByType);
router.get("/public/:id", getProduct); // Parameterized routes LAST

// Protected routes
router.get("/:id/reviews/me", auth, getMyProductReview);
router.post("/:id/reviews", auth, createOrUpdateProductReview);
router.delete("/:id/reviews/me", auth, deleteMyProductReview);
router.post(
  "/",
  auth,
  upload.array("images", 5),
  handleMulterError,
  createProduct
);
router.post("/bulk-upload", auth, bulkCreateProducts);
router.get("/", auth, getProducts);
router.get("/:id", auth, getProduct);
router.put(
  "/:id",
  auth,
  upload.array("images", 5),
  handleMulterError,
  updateProduct
);
router.delete("/:id", auth, deleteProduct);
router.patch("/:id/toggle-active", auth, toggleProductActive);
router.post("/:id/duplicate", auth, duplicateProduct);
router.patch("/:id/approval-status", auth, updateProductApprovalStatus);

module.exports = router;
