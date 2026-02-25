const express = require("express");
const auth = require("../middlewares/auth");
const {
  getPublicAuctions,
  getAuctionById,
  createAuction,
  getVendorAuctions,
  getAdminAuctions,
  placeBid,
  getMyBids,
  updateAuctionStatus,
} = require("../controllers/auctionController");

const router = express.Router();

router.get("/public", getPublicAuctions);
router.get("/public/:id", getAuctionById);

router.post("/", auth, createAuction);
router.get("/vendor", auth, getVendorAuctions);
router.get("/admin", auth, getAdminAuctions);
router.post("/:id/bid", auth, placeBid);
router.get("/me/bids", auth, getMyBids);
router.patch("/:id/status", auth, updateAuctionStatus);

module.exports = router;
