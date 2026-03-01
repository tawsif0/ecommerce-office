const express = require("express");
const auth = require("../middlewares/auth");
const {
  createSupplier,
  getSuppliers,
  updateSupplier,
  deleteSupplier,
} = require("../controllers/supplierController");

const router = express.Router();

router.use(auth);

router.post("/", createSupplier);
router.get("/", getSuppliers);
router.patch("/:id", updateSupplier);
router.delete("/:id", deleteSupplier);

module.exports = router;
