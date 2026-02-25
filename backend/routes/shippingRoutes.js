const express = require("express");
const auth = require("../middlewares/auth");
const {
  estimateShipping,
  getAdminShippingZones,
  createAdminShippingZone,
  updateAdminShippingZone,
  deleteAdminShippingZone,
  getMyShippingZones,
  createMyShippingZone,
  updateMyShippingZone,
  deleteMyShippingZone,
} = require("../controllers/shippingController");

const router = express.Router();

// Public
router.post("/estimate", estimateShipping);

// Vendor
router.get("/me/zones", auth, getMyShippingZones);
router.post("/me/zones", auth, createMyShippingZone);
router.put("/me/zones/:id", auth, updateMyShippingZone);
router.delete("/me/zones/:id", auth, deleteMyShippingZone);

// Admin
router.get("/admin/zones", auth, getAdminShippingZones);
router.post("/admin/zones", auth, createAdminShippingZone);
router.put("/admin/zones/:id", auth, updateAdminShippingZone);
router.delete("/admin/zones/:id", auth, deleteAdminShippingZone);

module.exports = router;
