const Coupon = require("../models/Coupon.js");
const Product = require("../models/Product.js");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const roundMoney = (value) =>
  Math.round((toNumber(value, 0) + Number.EPSILON) * 100) / 100;

const normalizeCouponCode = (code) => String(code || "").trim().toUpperCase();

const extractProductIdFromItem = (item) =>
  item?.productId || item?.product?._id || item?.product || null;

const extractVendorIdFromItem = (item) =>
  item?.vendor || item?.product?.vendor || null;

const calculateEligibleSubtotalForVendor = async (vendorId, items = []) => {
  const normalizedVendorId = String(vendorId || "");
  if (!normalizedVendorId) return 0;

  const productIdsToResolve = [];

  for (const item of items) {
    const itemVendor = extractVendorIdFromItem(item);
    if (itemVendor) continue;

    const productId = extractProductIdFromItem(item);
    if (productId) {
      productIdsToResolve.push(String(productId));
    }
  }

  let productVendorMap = new Map();
  if (productIdsToResolve.length > 0) {
    const products = await Product.find({
      _id: { $in: productIdsToResolve },
    })
      .select("_id vendor")
      .lean();

    productVendorMap = new Map(
      products.map((product) => [String(product._id), String(product.vendor || "")]),
    );
  }

  let eligibleSubtotal = 0;

  for (const item of items) {
    const productId = String(extractProductIdFromItem(item) || "");
    const explicitVendor = String(extractVendorIdFromItem(item) || "");
    const resolvedVendor = explicitVendor || productVendorMap.get(productId) || "";

    if (resolvedVendor !== normalizedVendorId) continue;

    const quantity = Math.max(1, parseInt(item?.quantity, 10) || 1);
    const unitPrice = Math.max(
      0,
      toNumber(item?.price ?? item?.product?.price ?? 0, 0),
    );

    eligibleSubtotal += unitPrice * quantity;
  }

  return roundMoney(Math.max(eligibleSubtotal, 0));
};

const validateCouponForSubtotal = async (code, subtotal, items = []) => {
  const normalizedCode = normalizeCouponCode(code);
  const normalizedSubtotal = toNumber(subtotal, NaN);

  if (!normalizedCode) {
    return {
      success: false,
      status: 400,
      message: "Coupon code is required",
    };
  }

  if (!Number.isFinite(normalizedSubtotal) || normalizedSubtotal < 0) {
    return {
      success: false,
      status: 400,
      message: "Valid subtotal is required",
    };
  }

  const coupon = await Coupon.findOne({ code: normalizedCode });

  if (!coupon || !coupon.isActive) {
    return {
      success: false,
      status: 404,
      message: "Invalid or inactive coupon code",
    };
  }

  if (coupon.validUntil && new Date() > coupon.validUntil) {
    return {
      success: false,
      status: 400,
      message: "Coupon has expired",
    };
  }

  if (
    Number.isFinite(coupon.usageLimit) &&
    coupon.usedCount >= Number(coupon.usageLimit)
  ) {
    return {
      success: false,
      status: 400,
      message: "Coupon usage limit reached",
    };
  }

  let eligibleSubtotal = normalizedSubtotal;
  const couponVendorId = String(coupon.vendor || "");

  if (couponVendorId) {
    if (!Array.isArray(items) || items.length === 0) {
      return {
        success: false,
        status: 400,
        message: "This coupon requires cart item details",
      };
    }

    eligibleSubtotal = await calculateEligibleSubtotalForVendor(
      couponVendorId,
      items,
    );

    if (eligibleSubtotal <= 0) {
      return {
        success: false,
        status: 400,
        message: "Coupon is not applicable to selected cart items",
      };
    }
  }

  const minPurchase = toNumber(coupon.minPurchase, 0);
  if (eligibleSubtotal < minPurchase) {
    return {
      success: false,
      status: 400,
      message: `Minimum purchase of ${minPurchase} required`,
    };
  }

  let discount = 0;

  if (coupon.discountType === "percentage") {
    discount = (eligibleSubtotal * toNumber(coupon.discountValue, 0)) / 100;
    if (Number.isFinite(coupon.maxDiscount) && coupon.maxDiscount > 0) {
      discount = Math.min(discount, coupon.maxDiscount);
    }
  } else {
    discount = toNumber(coupon.discountValue, 0);
  }

  discount = roundMoney(Math.min(Math.max(discount, 0), eligibleSubtotal));
  const finalAmount = roundMoney(Math.max(normalizedSubtotal - discount, 0));

  return {
    success: true,
    coupon,
    code: normalizedCode,
    eligibleSubtotal,
    discount,
    finalAmount,
    appliesToVendor: couponVendorId || null,
  };
};

const incrementCouponUsage = async (couponDoc) => {
  if (!couponDoc?._id) return null;

  const filter = {
    _id: couponDoc._id,
    isActive: true,
    validUntil: { $gt: new Date() },
  };

  if (Number.isFinite(couponDoc.usageLimit)) {
    filter.usedCount = { $lt: couponDoc.usageLimit };
  }

  const updatedCoupon = await Coupon.findOneAndUpdate(
    filter,
    { $inc: { usedCount: 1 } },
    { new: true },
  );

  if (!updatedCoupon) {
    throw new Error("Coupon is no longer valid");
  }

  return updatedCoupon;
};

module.exports = {
  normalizeCouponCode,
  validateCouponForSubtotal,
  incrementCouponUsage,
  roundMoney,
  toNumber,
  calculateEligibleSubtotalForVendor,
};
