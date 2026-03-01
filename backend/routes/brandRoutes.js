const express = require("express");
const auth = require("../middlewares/auth");
const {
  createBrand,
  getBrands,
  updateBrand,
  deleteBrand,
  getPublicBrands,
} = require("../controllers/brandController");

const router = express.Router();

router.get("/public", getPublicBrands);

router.use(auth);

router.get("/", getBrands);
router.post("/", createBrand);
router.patch("/:id", updateBrand);
router.delete("/:id", deleteBrand);

module.exports = router;
