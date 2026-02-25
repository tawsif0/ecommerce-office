const Category = require("../models/Category");

const normalizeCommissionType = (value) => {
  const normalized = String(value || "inherit").trim().toLowerCase();
  if (["inherit", "percentage", "fixed", "hybrid"].includes(normalized)) {
    return normalized;
  }
  return "inherit";
};

const toNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin only)
const createCategory = async (req, res) => {
  try {
    const { name, type, commissionType, commissionValue, commissionFixed } = req.body;

    // Check if category already exists
    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    // Create new category
    const category = await Category.create({
      name,
      type: type || "General",
      commissionType: normalizeCommissionType(commissionType),
      commissionValue: toNonNegativeNumber(commissionValue, 0),
      commissionFixed: toNonNegativeNumber(commissionFixed, 0),
      isActive: true,
      updatedAt: Date.now(),
    });

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all categories (Public)
// @route   GET /api/categories/public
// @access  Public
const getPublicCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .select("name type _id")
      .sort({ name: 1 });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get public categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get all categories (Admin)
// @route   GET /api/categories
// @access  Private (Admin only)
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Private (Admin only)
const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      category,
    });
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private (Admin only)
const updateCategory = async (req, res) => {
  try {
    const { name, type, isActive, commissionType, commissionValue, commissionFixed } = req.body;

    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // Check if new name already exists
    if (name && name !== category.name) {
      const nameExists = await Category.findOne({ name });
      if (nameExists) {
        return res.status(400).json({
          success: false,
          message: "Category name already exists",
        });
      }
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type: type || category.type,
        commissionType:
          commissionType !== undefined
            ? normalizeCommissionType(commissionType)
            : category.commissionType || "inherit",
        commissionValue:
          commissionValue !== undefined
            ? toNonNegativeNumber(commissionValue, 0)
            : category.commissionValue || 0,
        commissionFixed:
          commissionFixed !== undefined
            ? toNonNegativeNumber(commissionFixed, 0)
            : category.commissionFixed || 0,
        isActive: isActive !== undefined ? isActive : category.isActive,
        updatedAt: Date.now(),
      },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private (Admin only)
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
};

module.exports = {
  createCategory,
  getPublicCategories,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};
