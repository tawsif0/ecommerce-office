const express = require("express");
const auth = require("../middlewares/auth");
const {
  getStaffPermissions,
  getVendorStaff,
  createStaffMember,
  updateStaffMember,
  deleteStaffMember,
} = require("../controllers/staffController");

const router = express.Router();

router.get("/me/permissions", auth, getStaffPermissions);
router.get("/", auth, getVendorStaff);
router.post("/", auth, createStaffMember);
router.put("/:id", auth, updateStaffMember);
router.delete("/:id", auth, deleteStaffMember);

module.exports = router;
