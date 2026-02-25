const express = require("express");
const auth = require("../middlewares/auth");
const {
  getMyVerification,
  submitMyVerification,
  getAdminVerifications,
  reviewVerification,
} = require("../controllers/verificationController");

const router = express.Router();

router.get("/me", auth, getMyVerification);
router.post("/me", auth, submitMyVerification);

router.get("/admin", auth, getAdminVerifications);
router.patch("/admin/:id/status", auth, reviewVerification);

module.exports = router;
