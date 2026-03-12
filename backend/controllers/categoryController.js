const Category = require("../models/Category");
const { uploadImageBuffer, deleteImage } = require("../config/cloudinary");
const { clearResponseCacheByPrefix } = require("../middlewares/responseCache");

const CATEGORY_IMAGE_OPTIONS = {
  folder: "ecommerce/categories",
  resource_type: "image",
  transformation: [{ quality: "auto:best", fetch_format: "auto" }],
};

const invalidatePublicCategoryCache = () => {
  clearResponseCacheByPrefix("/api/categories/public");
  clearResponseCacheByPrefix("/api/products/public");
};

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

const normalizeCategoryImage = (value) => {
  const normalized = String(value || "").trim();
  return normalized;
};

const uploadCategoryImage = async (file) => {
  if (!file?.buffer) return null;
  return uploadImageBuffer(file.buffer, CATEGORY_IMAGE_OPTIONS);
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private (Admin only)
const createCategory = async (req, res) => {
  let uploadedImagePublicId = "";
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

    let image = "";
    let imagePublicId = "";

    if (req.file) {
      const uploadedImage = await uploadCategoryImage(req.file);
      if (uploadedImage?.secure_url) {
        image = uploadedImage.secure_url;
        imagePublicId = uploadedImage.public_id || "";
        uploadedImagePublicId = imagePublicId;
      }
    }

    // Create new category
    const category = await Category.create({
      name,
      type: type || "General",
      image: normalizeCategoryImage(image),
      imagePublicId,
      commissionType: normalizeCommissionType(commissionType),
      commissionValue: toNonNegativeNumber(commissionValue, 0),
      commissionFixed: toNonNegativeNumber(commissionFixed, 0),
      isActive: true,
      updatedAt: Date.now(),
    });
    invalidatePublicCategoryCache();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (uploadedImagePublicId) {
      await deleteImage(uploadedImagePublicId);
    }
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
      .select("name type image _id")
      .sort({ name: 1 })
      .lean();

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
  let uploadedImagePublicId = "";
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

    const previousImagePublicId = category.imagePublicId || "";
    let nextImage = category.image || "";
    let nextImagePublicId = previousImagePublicId;

    if (req.file) {
      const uploadedImage = await uploadCategoryImage(req.file);
      if (uploadedImage?.secure_url) {
        nextImage = uploadedImage.secure_url;
        nextImagePublicId = uploadedImage.public_id || "";
        uploadedImagePublicId = nextImagePublicId;
      }
    }

    category = await Category.findByIdAndUpdate(
      req.params.id,
      {
        name,
        type: type || category.type,
        image: normalizeCategoryImage(nextImage),
        imagePublicId: nextImagePublicId,
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

    if (req.file && previousImagePublicId && previousImagePublicId !== nextImagePublicId) {
      await deleteImage(previousImagePublicId);
    }
    invalidatePublicCategoryCache();

    res.json({
      success: true,
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    if (uploadedImagePublicId) {
      await deleteImage(uploadedImagePublicId);
    }
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

    if (category.imagePublicId) {
      await deleteImage(category.imagePublicId);
    }

    await category.deleteOne();
    invalidatePublicCategoryCache();

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
