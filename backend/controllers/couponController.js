const Coupon = require("../models/Coupon.js");
const Vendor = require("../models/Vendor.js");
const {
  normalizeCouponCode,
  validateCouponForSubtotal,
  toNumber,
} = require("../utils/couponUtils.js");

const isAdminUser = (user) =>
  user && (user.userType === "admin" || user.role === "admin");

const isVendorUser = (user) => user && user.userType === "vendor";

const ensureCouponManager = (req, res) => {
  if (isAdminUser(req.user) || isVendorUser(req.user)) return true;

  res.status(403).json({
    success: false,
    message: "Admin or vendor access required",
  });
  return false;
};

const parseUsageLimit = (value) => {
  if (value === null || value === "" || value === undefined) {
    return { value: null };
  }

  const parsed = parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed < 1) {
    return { error: "Usage limit must be at least 1" };
  }

  return { value: parsed };
};

const getVendorForRequester = async (req) =>
  Vendor.findOne({ user: req.user.id || req.user._id })
    .select("_id storeName status")
    .lean();

const resolveCouponVendorForPayload = async (req, vendorIdFromPayload) => {
  if (isVendorUser(req.user) && !isAdminUser(req.user)) {
    const requesterVendor = await getVendorForRequester(req);
    if (!requesterVendor) {
      return {
        error: "Vendor profile not found",
      };
    }

    if (requesterVendor.status !== "approved") {
      return {
        error: "Vendor profile is not approved yet",
      };
    }

    return {
      vendorId: requesterVendor._id,
      vendor: requesterVendor,
    };
  }

  if (isAdminUser(req.user) && vendorIdFromPayload) {
    const vendor = await Vendor.findById(vendorIdFromPayload)
      .select("_id storeName status")
      .lean();

    if (!vendor) {
      return {
        error: "Vendor not found",
      };
    }

    return {
      vendorId: vendor._id,
      vendor,
    };
  }

  return {
    vendorId: null,
    vendor: null,
  };
};

// Apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { code, subtotal, items = [] } = req.body;
    const validation = await validateCouponForSubtotal(code, subtotal, items);

    if (!validation.success) {
      return res.status(validation.status).json({
        success: false,
        message: validation.message,
      });
    }

    res.json({
      success: true,
      message: "Coupon applied successfully",
      code: validation.code,
      discount: validation.discount,
      finalAmount: validation.finalAmount,
      eligibleSubtotal: validation.eligibleSubtotal,
      appliesToVendor: validation.appliesToVendor,
      coupon: {
        _id: validation.coupon._id,
        code: validation.coupon.code,
        discountType: validation.coupon.discountType,
        discountValue: validation.coupon.discountValue,
        vendor: validation.coupon.vendor || null,
      },
    });
  } catch (error) {
    console.error("Apply coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while applying coupon",
    });
  }
};

// Create coupon (admin/vendor)
exports.createCoupon = async (req, res) => {
  try {
    if (!ensureCouponManager(req, res)) return;

    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validUntil,
      usageLimit,
      isActive,
      vendorId,
    } = req.body;

    if (!code || !discountValue || !validUntil) {
      return res.status(400).json({
        success: false,
        message: "Code, discount value, and valid until date are required",
      });
    }

    const normalizedCode = normalizeCouponCode(code);
    if (!normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "Valid coupon code is required",
      });
    }

    const normalizedDiscountValue = toNumber(discountValue, NaN);
    if (!Number.isFinite(normalizedDiscountValue) || normalizedDiscountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value must be greater than zero",
      });
    }

    const parsedValidUntil = new Date(validUntil);
    if (Number.isNaN(parsedValidUntil.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Valid expiry date is required",
      });
    }

    const usageLimitResult = parseUsageLimit(usageLimit);
    if (usageLimitResult.error) {
      return res.status(400).json({
        success: false,
        message: usageLimitResult.error,
      });
    }

    const vendorResolution = await resolveCouponVendorForPayload(req, vendorId);
    if (vendorResolution.error) {
      return res.status(400).json({
        success: false,
        message: vendorResolution.error,
      });
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      discountType: discountType || "percentage",
      discountValue: normalizedDiscountValue,
      minPurchase: toNumber(minPurchase, 0),
      maxDiscount:
        maxDiscount === null || maxDiscount === "" || maxDiscount === undefined
          ? null
          : toNumber(maxDiscount, 0),
      validUntil: parsedValidUntil,
      usageLimit: usageLimitResult.value,
      isActive: typeof isActive === "boolean" ? isActive : true,
      vendor: vendorResolution.vendorId,
      createdBy: req.user.id || req.user._id,
    });

    const populatedCoupon = await Coupon.findById(coupon._id)
      .populate("vendor", "storeName slug")
      .lean();

    res.status(201).json({
      success: true,
      message: "Coupon created successfully",
      coupon: populatedCoupon,
    });
  } catch (error) {
    console.error("Create coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating coupon",
    });
  }
};

// Get coupons (admin gets all, vendor gets own)
exports.getCoupons = async (req, res) => {
  try {
    if (!ensureCouponManager(req, res)) return;

    const query = {};

    if (isVendorUser(req.user) && !isAdminUser(req.user)) {
      const requesterVendor = await getVendorForRequester(req);
      if (!requesterVendor) {
        return res.status(404).json({
          success: false,
          message: "Vendor profile not found",
        });
      }
      query.vendor = requesterVendor._id;
    }

    const coupons = await Coupon.find(query)
      .populate("vendor", "storeName slug")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      coupons,
    });
  } catch (error) {
    console.error("Get coupons error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching coupons",
    });
  }
};

const ensureCanManageCoupon = async (req, couponId) => {
  const coupon = await Coupon.findById(couponId);
  if (!coupon) {
    return {
      status: 404,
      message: "Coupon not found",
    };
  }

  if (isAdminUser(req.user)) {
    return { coupon };
  }

  if (!isVendorUser(req.user)) {
    return {
      status: 403,
      message: "Admin or vendor access required",
    };
  }

  const requesterVendor = await getVendorForRequester(req);
  if (!requesterVendor) {
    return {
      status: 404,
      message: "Vendor profile not found",
    };
  }

  if (String(coupon.vendor || "") !== String(requesterVendor._id)) {
    return {
      status: 403,
      message: "You can manage only your own vendor coupons",
    };
  }

  return { coupon, requesterVendor };
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    if (!ensureCouponManager(req, res)) return;

    const permission = await ensureCanManageCoupon(req, req.params.id);
    if (!permission.coupon) {
      return res.status(permission.status).json({
        success: false,
        message: permission.message,
      });
    }

    const {
      code,
      discountType,
      discountValue,
      minPurchase,
      maxDiscount,
      validUntil,
      usageLimit,
      isActive,
      vendorId,
    } = req.body;

    const updateData = {
      updatedAt: new Date(),
    };

    if (code !== undefined) {
      const normalizedCode = normalizeCouponCode(code);
      if (!normalizedCode) {
        return res.status(400).json({
          success: false,
          message: "Valid coupon code is required",
        });
      }
      updateData.code = normalizedCode;
    }

    if (discountType !== undefined) {
      updateData.discountType = discountType;
    }

    if (discountValue !== undefined) {
      const normalizedDiscountValue = toNumber(discountValue, NaN);
      if (!Number.isFinite(normalizedDiscountValue) || normalizedDiscountValue <= 0) {
        return res.status(400).json({
          success: false,
          message: "Discount value must be greater than zero",
        });
      }
      updateData.discountValue = normalizedDiscountValue;
    }

    if (minPurchase !== undefined) {
      updateData.minPurchase = toNumber(minPurchase, 0);
    }

    if (maxDiscount !== undefined) {
      updateData.maxDiscount =
        maxDiscount === null || maxDiscount === ""
          ? null
          : toNumber(maxDiscount, 0);
    }

    if (validUntil !== undefined) {
      const parsedValidUntil = new Date(validUntil);
      if (Number.isNaN(parsedValidUntil.getTime())) {
        return res.status(400).json({
          success: false,
          message: "Valid expiry date is required",
        });
      }
      updateData.validUntil = parsedValidUntil;
    }

    if (usageLimit !== undefined) {
      const usageLimitResult = parseUsageLimit(usageLimit);
      if (usageLimitResult.error) {
        return res.status(400).json({
          success: false,
          message: usageLimitResult.error,
        });
      }
      updateData.usageLimit = usageLimitResult.value;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    if (vendorId !== undefined && isAdminUser(req.user)) {
      if (!vendorId) {
        updateData.vendor = null;
      } else {
        const vendor = await Vendor.findById(vendorId).select("_id").lean();
        if (!vendor) {
          return res.status(400).json({
            success: false,
            message: "Vendor not found",
          });
        }
        updateData.vendor = vendor._id;
      }
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("vendor", "storeName slug");

    res.json({
      success: true,
      message: "Coupon updated successfully",
      coupon,
    });
  } catch (error) {
    console.error("Update coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating coupon",
    });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    if (!ensureCouponManager(req, res)) return;

    const permission = await ensureCanManageCoupon(req, req.params.id);
    if (!permission.coupon) {
      return res.status(permission.status).json({
        success: false,
        message: permission.message,
      });
    }

    await permission.coupon.deleteOne();

    res.json({
      success: true,
      message: "Coupon deleted successfully",
    });
  } catch (error) {
    console.error("Delete coupon error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting coupon",
    });
  }
};
