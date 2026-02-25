const express = require("express");
const auth = require("../middlewares/auth");
const {
  createGuestBooking,
  createMyBooking,
  getMyBookings,
  getVendorBookings,
  getAdminBookings,
  updateBookingStatus,
} = require("../controllers/bookingController");

const router = express.Router();

router.post("/guest", createGuestBooking);

router.post("/", auth, createMyBooking);
router.get("/me", auth, getMyBookings);
router.get("/vendor", auth, getVendorBookings);
router.get("/admin", auth, getAdminBookings);
router.patch("/:id/status", auth, updateBookingStatus);

module.exports = router;
