const express = require("express");
const auth = require("../middlewares/auth");
const { ensureMultiVendorMode } = require("../middlewares/marketplaceMode");
const {
  getPublicAds,
  createVendorAd,
  getVendorAds,
  updateVendorAd,
  getAdminAds,
  reviewAdStatus,
  trackAdImpression,
  trackAdClick,
} = require("../controllers/adsController");

const router = express.Router();

router.get("/public", getPublicAds);
router.post("/public/:id/impression", trackAdImpression);
router.post("/public/:id/click", trackAdClick);

router.post("/", auth, ensureMultiVendorMode, createVendorAd);
router.get("/vendor", auth, ensureMultiVendorMode, getVendorAds);
router.put("/vendor/:id", auth, ensureMultiVendorMode, updateVendorAd);

router.get("/admin", auth, ensureMultiVendorMode, getAdminAds);
router.patch("/admin/:id/status", auth, ensureMultiVendorMode, reviewAdStatus);

module.exports = router;
