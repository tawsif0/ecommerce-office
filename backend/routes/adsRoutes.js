const express = require("express");
const auth = require("../middlewares/auth");
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

router.post("/", auth, createVendorAd);
router.get("/vendor", auth, getVendorAds);
router.put("/vendor/:id", auth, updateVendorAd);

router.get("/admin", auth, getAdminAds);
router.patch("/admin/:id/status", auth, reviewAdStatus);

module.exports = router;
