const express = require("express");
const router = express.Router();
const {
  createCategory,
  getPublicCategories,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const auth = require("../middlewares/auth");
const responseCache = require("../middlewares/responseCache");

// Public
router.get("/public", responseCache(120000), getPublicCategories);

// Protected
router.get("/", auth, getCategories);
router.get("/:id", auth, getCategory);

// Admin
router.post("/", auth, createCategory);
router.put("/:id", auth, updateCategory);
router.delete("/:id", auth, deleteCategory);

module.exports = router;
