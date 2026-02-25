const Product = require("../models/Product");
const ProductReview = require("../models/ProductReview");
const Vendor = require("../models/Vendor");
const Order = require("../models/Order");

const isObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || "").trim());

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const isApprovedProduct = (product) =>
  Boolean(
    product &&
      product.isActive &&
      ["approved", undefined, null].includes(product.approvalStatus),
  );

const recalculateProductRating = async (productId) => {
  const result = await ProductReview.aggregate([
    {
      $match: {
        product: productId,
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$product",
        avgRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  const average = result[0]?.avgRating || 0;
  const count = result[0]?.reviewCount || 0;

  await Product.findByIdAndUpdate(productId, {
    ratingAverage: Math.round((toNumber(average, 0) + Number.EPSILON) * 100) / 100,
    ratingCount: count,
  });

  return {
    ratingAverage: Math.round((toNumber(average, 0) + Number.EPSILON) * 100) / 100,
    ratingCount: count,
  };
};

exports.getProductReviews = async (req, res) => {
  try {
    const productId = String(req.params.id || "").trim();
    if (!isObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const product = await Product.findById(productId)
      .select("title isActive approvalStatus ratingAverage ratingCount")
      .lean();

    if (!product || !isApprovedProduct(product)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(30, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      ProductReview.find({
        product: productId,
        isApproved: true,
      })
        .populate("user", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductReview.countDocuments({
        product: productId,
        isApproved: true,
      }),
    ]);

    const summary = await recalculateProductRating(productId);

    res.json({
      success: true,
      product: {
        _id: productId,
        title: product.title,
      },
      summary,
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    console.error("Get product reviews error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product reviews",
    });
  }
};

exports.getMyProductReview = async (req, res) => {
  try {
    const productId = String(req.params.id || "").trim();
    if (!isObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const userId = req.user.id || req.user._id;
    const review = await ProductReview.findOne({
      product: productId,
      user: userId,
    })
      .populate("user", "name")
      .lean();

    return res.json({
      success: true,
      review: review || null,
    });
  } catch (error) {
    console.error("Get my product review error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching your review",
    });
  }
};

exports.createOrUpdateProductReview = async (req, res) => {
  try {
    const productId = String(req.params.id || "").trim();
    if (!isObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const userId = req.user.id || req.user._id;
    const rating = Math.max(1, Math.min(5, parseInt(req.body?.rating, 10) || 0));
    const title = String(req.body?.title || "").trim();
    const comment = String(req.body?.comment || "").trim();

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: "Rating is required",
      });
    }

    if (!comment) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required",
      });
    }

    const product = await Product.findById(productId)
      .select("vendor isActive approvalStatus")
      .lean();

    if (!product || !isApprovedProduct(product)) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (product.vendor) {
      const vendor = await Vendor.findById(product.vendor).select("user").lean();
      if (vendor?.user && String(vendor.user) === String(userId)) {
        return res.status(400).json({
          success: false,
          message: "You cannot review your own product",
        });
      }
    }

    const verifiedOrder = await Order.findOne({
      user: userId,
      "items.product": productId,
      orderStatus: { $in: ["processing", "shipped", "delivered"] },
    })
      .select("_id")
      .lean();

    const existingReview = await ProductReview.findOne({
      product: productId,
      user: userId,
    });

    let review;
    if (existingReview) {
      existingReview.rating = rating;
      existingReview.title = title;
      existingReview.comment = comment;
      existingReview.reviewerName = req.user.name || "";
      existingReview.reviewerEmail = req.user.email || "";
      existingReview.verifiedPurchase = Boolean(verifiedOrder);
      existingReview.order = verifiedOrder?._id || null;
      existingReview.isApproved = true;
      review = await existingReview.save();
    } else {
      review = await ProductReview.create({
        product: productId,
        user: userId,
        order: verifiedOrder?._id || null,
        rating,
        title,
        comment,
        reviewerName: req.user.name || "",
        reviewerEmail: req.user.email || "",
        verifiedPurchase: Boolean(verifiedOrder),
        isApproved: true,
      });
    }

    const summary = await recalculateProductRating(productId);

    res.status(201).json({
      success: true,
      message: existingReview
        ? "Review updated successfully"
        : "Review submitted successfully",
      review,
      summary,
    });
  } catch (error) {
    console.error("Create or update product review error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while saving product review",
    });
  }
};

exports.deleteMyProductReview = async (req, res) => {
  try {
    const productId = String(req.params.id || "").trim();
    if (!isObjectId(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      });
    }

    const userId = req.user.id || req.user._id;

    const deleted = await ProductReview.findOneAndDelete({
      product: productId,
      user: userId,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const summary = await recalculateProductRating(productId);

    res.json({
      success: true,
      message: "Review deleted successfully",
      summary,
    });
  } catch (error) {
    console.error("Delete my product review error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting product review",
    });
  }
};

