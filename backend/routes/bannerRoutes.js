const express = require("express");
const {
  createBanner,
  getBanners,
  getBanner,
  updateBanner,
  deleteBanner,
  getActiveBanners,
  toggleBannerActive,
} = require("../controllers/bannerController.js");
const auth = require("../middlewares/auth.js");
const { upload, handleMulterError } = require("../middlewares/bannerUpload.js");

const router = express.Router();

// Public routes
router.get("/public", getActiveBanners); // Get active banners for public view
router.get("/public/:id", getBanner); // Get single banner (public)

// Protected routes
router.post(
  "/",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumb", maxCount: 1 },
  ]),
  handleMulterError,
  createBanner
);
router.get("/", auth, getBanners);
router.get("/:id", auth, getBanner);
router.put(
  "/:id",
  auth,
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "thumb", maxCount: 1 },
  ]),
  handleMulterError,
  updateBanner
);
router.delete("/:id", auth, deleteBanner);
router.patch("/:id/toggle-active", auth, toggleBannerActive);

module.exports = router;
