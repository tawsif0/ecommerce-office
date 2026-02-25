// controllers/orderController.js
const Order = require("../models/Order.js");
const Cart = require("../models/Cart.js");
const Product = require("../models/Product.js");
const Category = require("../models/Category.js");
const Vendor = require("../models/Vendor.js");
const User = require("../models/User");
const { sendOrderStatusEmail } = require("../utils/emailTemplates");
const { attachImageDataToProducts } = require("../utils/imageUtils");
const {
  normalizeCommissionConfig,
  pickCommissionSource,
  calculateCommissionAmount,
} = require("../utils/commissionUtils");
const {
  normalizeCouponCode,
  validateCouponForSubtotal,
  incrementCouponUsage,
  roundMoney,
  toNumber,
} = require("../utils/couponUtils");
const {
  createRecurringSubscriptionsFromOrder,
} = require("../utils/recurringSubscriptionUtils");

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const timestamp = date.getTime();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
};

const extractPaymentMethod = (paymentMethod, paymentDetails = {}) => {
  const candidates = [
    paymentDetails?.method,
    paymentDetails?.paymentMethod,
    paymentMethod,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      const value = candidate.trim();
      if (value) return value;
      continue;
    }

    if (typeof candidate === "object") {
      const value = String(
        candidate.method ||
          candidate.type ||
          candidate.name ||
          candidate.value ||
          "",
      ).trim();
      if (value) return value;
    }
  }

  return "";
};

const normalizePaymentDetails = (paymentMethod, paymentDetails = {}) => ({
  method: extractPaymentMethod(paymentMethod, paymentDetails),
  transactionId: String(paymentDetails?.transactionId || "").trim(),
  accountNo: String(paymentDetails?.accountNo || "").trim(),
  sentFrom: String(paymentDetails?.sentFrom || "").trim(),
  sentTo: String(paymentDetails?.sentTo || "").trim(),
});

const normalizeOrderItem = (item) => ({
  productId: item?.productId || item?.product?._id || item?.product,
  quantity: Math.max(1, parseInt(item?.quantity, 10) || 1),
  variationId:
    item?.variationId || item?.variantId || item?.variation?._id || null,
  variationLabel: String(item?.variationLabel || item?.variantLabel || "").trim(),
  color: item?.color || "",
  dimensions: item?.dimensions || "",
});

const normalizeVariationId = (value) => {
  const parsed = String(value || "").trim();
  return /^[0-9a-fA-F]{24}$/.test(parsed) ? parsed : "";
};

const getBaseProductPrice = (product) => {
  const hasSalePrice =
    String(product?.priceType || "single") === "best" &&
    product?.salePrice !== null &&
    product?.salePrice !== undefined &&
    String(product.salePrice).trim() !== "";
  if (hasSalePrice) {
    const salePrice = toNumber(product.salePrice, NaN);
    if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
  }

  const regularPrice = toNumber(product?.price, NaN);
  if (Number.isFinite(regularPrice) && regularPrice >= 0) return regularPrice;

  return 0;
};

const getVariationContext = (product, variationId) => {
  const normalizedVariationId = normalizeVariationId(variationId);
  if (!normalizedVariationId || !Array.isArray(product?.variations)) {
    return null;
  }

  const variation =
    product.variations.find(
      (entry) =>
        String(entry?._id || "") === normalizedVariationId &&
        entry?.isActive !== false,
    ) || null;

  if (!variation) return null;

  const price =
    variation.salePrice !== null && variation.salePrice !== undefined
      ? toNumber(variation.salePrice, 0)
      : toNumber(variation.price, 0);

  return {
    variationId: normalizedVariationId,
    variationLabel: String(variation.label || "").trim(),
    sku: String(variation.sku || "").trim(),
    stock: Math.max(parseInt(variation.stock, 10) || 0, 0),
    price: roundMoney(Math.max(price, 0)),
  };
};

const getGlobalCommissionSettings = async () => {
  const admin = await User.findOne({ userType: "admin" })
    .select("adminSettings.marketplaceCommission")
    .lean();

  const globalConfig = normalizeCommissionConfig(
    admin?.adminSettings?.marketplaceCommission || {},
    {
      commissionType: "percentage",
      commissionValue: 10,
      commissionFixed: 0,
    },
  );

  if (globalConfig.commissionType === "inherit") {
    globalConfig.commissionType = "percentage";
    globalConfig.commissionValue = 10;
    globalConfig.commissionFixed = 0;
  }

  return globalConfig;
};

const calculateVendorAmounts = ({
  itemTotal,
  productDoc = null,
  categoryDoc = null,
  vendorDoc = null,
  globalCommission = null,
}) => {
  const safeItemTotal = roundMoney(Math.max(toNumber(itemTotal, 0), 0));

  const pickedRule = pickCommissionSource({
    product: productDoc,
    category: categoryDoc,
    vendor: vendorDoc,
    globalConfig: globalCommission,
  });

  const calculated = calculateCommissionAmount(safeItemTotal, pickedRule);

  return {
    commission: roundMoney(calculated.commission),
    net: roundMoney(calculated.net),
    source: pickedRule.source || "none",
    commissionType: calculated.commissionType,
    commissionValue: calculated.commissionValue,
    commissionFixed: calculated.commissionFixed,
  };
};

const buildOrderItems = async (
  rawItems = [],
  { globalCommissionSettings = null } = {},
) => {
  const normalizedItems = rawItems
    .map((item) => normalizeOrderItem(item))
    .filter((item) => item.productId);

  if (!normalizedItems.length || normalizedItems.length !== rawItems.length) {
    return {
      success: false,
      status: 400,
      message: "Invalid product data found in checkout items",
    };
  }

  const orderItems = [];
  const vendorCache = new Map();
  const categoryCache = new Map();
  const nonPurchasableTypes = new Set(["grouped"]);
  const globalCommission =
    globalCommissionSettings || (await getGlobalCommissionSettings());

  for (const item of normalizedItems) {
    const product = await Product.findById(item.productId).select(
      "title price salePrice priceType vendor category isActive approvalStatus marketplaceType stock allowBackorder variations commissionType commissionValue commissionFixed",
    );

    if (!product) {
      return {
        success: false,
        status: 400,
        message: "One or more products are no longer available",
      };
    }

    if (
      !product.isActive ||
      !["approved", undefined, null].includes(product.approvalStatus)
    ) {
      return {
        success: false,
        status: 400,
        message: "One or more products are not currently available",
      };
    }

    const marketplaceType = String(product.marketplaceType || "simple");
    const priceType = String(product.priceType || "single");
    if (nonPurchasableTypes.has(marketplaceType)) {
      return {
        success: false,
        status: 400,
        message: "Grouped products cannot be purchased directly",
      };
    }
    if (priceType === "tba") {
      return {
        success: false,
        status: 400,
        message: `${product.title || "Product"} is currently marked as TBA and cannot be purchased`,
      };
    }

    let variationContext = null;
    if (marketplaceType === "variable") {
      variationContext = getVariationContext(product, item.variationId);
      if (!variationContext) {
        return {
          success: false,
          status: 400,
          message: "Please select a valid variation for variable products",
        };
      }
    }

    const rawFallbackItem = rawItems?.find((raw) => {
      const rawProductId = raw?.productId || raw?.product?._id || raw?.product;
      const rawVariationId = normalizeVariationId(
        raw?.variationId || raw?.variantId || raw?.variation?._id,
      );
      if (String(rawProductId || "") !== String(item.productId)) return false;
      if (marketplaceType !== "variable") return true;
      return String(rawVariationId || "") === String(variationContext?.variationId || "");
    });

    const fallbackPrice = toNumber(rawFallbackItem?.price, NaN);
    const resolvedPrice = variationContext
      ? variationContext.price
      : getBaseProductPrice(product);

    const unitPrice = Number.isFinite(resolvedPrice)
      ? resolvedPrice
      : Number.isFinite(fallbackPrice)
        ? roundMoney(Math.max(fallbackPrice, 0))
        : 0;
    const itemTotal = roundMoney(Math.max(unitPrice, 0) * item.quantity);

    const allowBackorder = Boolean(product.allowBackorder);
    const availableStock = variationContext
      ? variationContext.stock
      : Math.max(parseInt(product.stock, 10) || 0, 0);

    if (!allowBackorder && item.quantity > availableStock) {
      return {
        success: false,
        status: 400,
        message: `${product.title || "Product"} has only ${availableStock} item(s) in stock`,
      };
    }

    let vendorDoc = null;
    if (product.vendor) {
      const vendorId = String(product.vendor);
      if (vendorCache.has(vendorId)) {
        vendorDoc = vendorCache.get(vendorId);
      } else {
        vendorDoc = await Vendor.findById(product.vendor)
          .select(
            "commissionType commissionValue commissionFixed status vacationMode storeName",
          )
          .lean();
        vendorCache.set(vendorId, vendorDoc);
      }

      if (!vendorDoc || vendorDoc.status !== "approved") {
        return {
          success: false,
          status: 400,
          message: "One or more vendor stores are currently unavailable",
        };
      }

      if (vendorDoc.vacationMode) {
        return {
          success: false,
          status: 400,
          message: `Store "${vendorDoc.storeName || "Vendor"}" is currently on vacation`,
        };
      }
    }

    let categoryDoc = null;
    if (product.category) {
      const categoryId = String(product.category);
      if (categoryCache.has(categoryId)) {
        categoryDoc = categoryCache.get(categoryId);
      } else {
        categoryDoc = await Category.findById(product.category)
          .select("commissionType commissionValue commissionFixed")
          .lean();
        categoryCache.set(categoryId, categoryDoc);
      }
    }

    const {
      commission,
      net,
      source: commissionSource,
      commissionType,
      commissionValue,
      commissionFixed,
    } = calculateVendorAmounts({
      itemTotal,
      productDoc: product,
      categoryDoc,
      vendorDoc,
      globalCommission,
    });

    orderItems.push({
      product: item.productId,
      vendor: product.vendor || null,
      quantity: item.quantity,
      price: roundMoney(Math.max(unitPrice, 0)),
      variationId: variationContext?.variationId || null,
      variationLabel:
        item.variationLabel ||
        variationContext?.variationLabel ||
        "",
      sku: variationContext?.sku || "",
      color: item.color,
      dimensions: item.dimensions,
      title: product?.title || "",
      vendorCommissionAmount: commission,
      vendorCommissionSource: commissionSource,
      vendorCommissionType: commissionType,
      vendorCommissionValue: commissionValue,
      vendorCommissionFixed: commissionFixed,
      vendorNetAmount: net,
    });
  }

  const subtotal = roundMoney(
    orderItems.reduce(
      (sum, item) => sum + toNumber(item.price, 0) * toNumber(item.quantity, 1),
      0,
    ),
  );

  return {
    success: true,
    orderItems,
    subtotal,
  };
};

const calculateOrderPricing = async ({
  subtotal,
  shippingFee,
  couponCode,
  items = [],
}) => {
  const normalizedSubtotal = roundMoney(Math.max(toNumber(subtotal, 0), 0));
  const normalizedShippingFee = roundMoney(Math.max(toNumber(shippingFee, 0), 0));

  let discount = 0;
  let appliedCouponCode = "";
  let couponDoc = null;

  if (couponCode) {
    const validation = await validateCouponForSubtotal(
      couponCode,
      normalizedSubtotal,
      items,
    );

    if (!validation.success) {
      return {
        success: false,
        status: validation.status,
        message: validation.message,
      };
    }

    discount = validation.discount;
    appliedCouponCode = validation.code;
    couponDoc = validation.coupon;
  }

  const total = roundMoney(
    Math.max(normalizedSubtotal + normalizedShippingFee - discount, 0),
  );

  return {
    success: true,
    subtotal: normalizedSubtotal,
    shippingFee: normalizedShippingFee,
    discount,
    couponCode: appliedCouponCode,
    total,
    couponDoc,
  };
};

// Create a new order
exports.createOrder = async (req, res) => {
  try {
    const {
      shippingAddress,
      items,
      shippingFee = 0,
      shippingMeta = {},
      couponCode = "",
      paymentMethod,
      paymentDetails,
    } = req.body;

    const normalizedPaymentDetails = normalizePaymentDetails(
      paymentMethod,
      paymentDetails,
    );

    // Validate required fields
    if (!shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and items are required",
      });
    }

    if (!normalizedPaymentDetails.method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    const globalCommissionSettings = await getGlobalCommissionSettings();
    const builtItems = await buildOrderItems(items, {
      globalCommissionSettings,
    });
    if (!builtItems.success) {
      return res.status(builtItems.status).json({
        success: false,
        message: builtItems.message,
      });
    }

    const pricing = await calculateOrderPricing({
      subtotal: builtItems.subtotal,
      shippingFee,
      couponCode: normalizeCouponCode(couponCode),
      items: builtItems.orderItems,
    });

    if (!pricing.success) {
      return res.status(pricing.status).json({
        success: false,
        message: pricing.message,
      });
    }

    const orderNumber = generateOrderNumber();

    const order = await Order.create({
      orderNumber,
      user: req.user?.id || null,
      items: builtItems.orderItems,
      shippingAddress,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      shippingMeta: shippingMeta || {},
      discount: pricing.discount,
      couponCode: pricing.couponCode,
      total: pricing.total,
      paymentMethod: normalizedPaymentDetails.method,
      paymentDetails: normalizedPaymentDetails,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    if (pricing.couponDoc) {
      try {
        await incrementCouponUsage(pricing.couponDoc);
      } catch (couponError) {
        await Order.findByIdAndDelete(order._id).catch(() => null);

        return res.status(400).json({
          success: false,
          message: couponError.message || "Coupon is no longer valid",
        });
      }
    }

    await createRecurringSubscriptionsFromOrder(order).catch(() => null);

    // Clear user's cart if logged in
    if (req.user?.id) {
      await Cart.findOneAndUpdate({ user: req.user.id }, { items: [] });
    }

    // Fetch the order with populated product data
    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "items.product",
        select: "title images price dimensions vendor",
      })
      .lean();

    if (populatedOrder?.items?.length) {
      const products = populatedOrder.items
        .map((item) => item.product)
        .filter(Boolean);
      await attachImageDataToProducts(products);
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Create order error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating order",
    });
  }
};

// Get user's orders
exports.getUserOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate({
        path: "items.product",
        select: "title images price dimensions vendor",
      })
      .sort({ createdAt: -1 });

    const ordersData = orders.map((order) => order.toObject());
    const products = ordersData
      .flatMap((order) => order.items || [])
      .map((item) => item.product)
      .filter(Boolean);
    await attachImageDataToProducts(products);

    res.json({
      success: true,
      orders: ordersData,
    });
  } catch (error) {
    console.error("Get user orders error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching orders",
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate({
      path: "items.product",
      select: "title images price dimensions vendor",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check authorization
    const isAdmin = req.user.userType === "admin";
    const isOwner =
      order.user && String(order.user) === String(req.user._id || req.user.id);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to view this order",
      });
    }

    const orderData = order.toObject();
    const products = (orderData.items || [])
      .map((item) => item.product)
      .filter(Boolean);
    await attachImageDataToProducts(products);

    res.json({
      success: true,
      order: orderData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while fetching order",
    });
  }
};
// Get all orders (admin only)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20, search } = req.query;

    if (req.user.role !== "admin" && req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    let query = {};

    // Filter by status
    if (status && status !== "all") {
      query.orderStatus = status;
    }

    // Search by order number or customer name/email
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.email": { $regex: search, $options: "i" } },
        { "shippingAddress.firstName": { $regex: search, $options: "i" } },
        { "shippingAddress.lastName": { $regex: search, $options: "i" } },
      ];
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);

    // Get orders with user and product population
    const orders = await Order.find(query)
      .populate({
        path: "user",
        select: "name email phone",
      })
      .populate({
        path: "items.product",
        select: "title images price dimensions vendor",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // Format response with payment method and transaction ID
    const formattedOrders = orders.map((order) => ({
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      customer: order.user
        ? {
            name: `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
            email: order.shippingAddress?.email,
            phone: order.shippingAddress?.phone,
            accountType: "Registered",
          }
        : {
            name: `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
            email: order.shippingAddress?.email,
            phone: order.shippingAddress?.phone,
            accountType: "Guest",
          },
      items: order.items.map((item) => ({
        product: item.product?.title || "Product not found",
        quantity: item.quantity,
        price: item.price,
        variationLabel: item.variationLabel || "",
        sku: item.sku || "",
        color: item.color || "",
        dimensions: item.dimensions || "",
        total: item.quantity * item.price,
      })),
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
      couponCode: order.couponCode || "",
      total: order.total,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      transactionId: order.paymentDetails?.transactionId || "N/A",
      shippingAddress: order.shippingAddress,
      paymentDetails: order.paymentDetails,
    }));

    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalOrders / limitNum),
        totalOrders,
        hasNextPage: pageNum * limitNum < totalOrders,
        hasPrevPage: pageNum > 1,
      },
    });
  } catch (error) {
    console.error("Get all orders error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching orders",
    });
  }
};

exports.getAdminProductReports = async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const fromDate = req.query.from ? new Date(req.query.from) : null;
    const toDate = req.query.to ? new Date(req.query.to) : null;

    const match = {
      orderStatus: { $ne: "cancelled" },
    };

    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      match.createdAt = {
        ...(match.createdAt || {}),
        $gte: fromDate,
      };
    }

    if (toDate && !Number.isNaN(toDate.getTime())) {
      match.createdAt = {
        ...(match.createdAt || {}),
        $lte: toDate,
      };
    }

    const reports = await Order.aggregate([
      { $match: match },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          quantitySold: { $sum: "$items.quantity" },
          grossRevenue: {
            $sum: { $multiply: ["$items.quantity", "$items.price"] },
          },
          orders: { $addToSet: "$_id" },
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product",
        },
      },
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "vendors",
          localField: "product.vendor",
          foreignField: "_id",
          as: "vendor",
        },
      },
      {
        $unwind: {
          path: "$vendor",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id",
          title: { $ifNull: ["$product.title", "Product Removed"] },
          vendorName: { $ifNull: ["$vendor.storeName", "N/A"] },
          quantitySold: 1,
          grossRevenue: 1,
          orderCount: { $size: "$orders" },
        },
      },
      { $sort: { grossRevenue: -1 } },
      { $limit: 200 },
    ]);

    const normalizedReports = reports.map((row) => ({
      ...row,
      quantitySold: Number(row.quantitySold || 0),
      grossRevenue: roundMoney(Number(row.grossRevenue || 0)),
      orderCount: Number(row.orderCount || 0),
    }));

    const summary = normalizedReports.reduce(
      (acc, row) => {
        acc.totalProducts += 1;
        acc.totalQuantitySold += row.quantitySold;
        acc.totalRevenue += row.grossRevenue;
        return acc;
      },
      {
        totalProducts: 0,
        totalQuantitySold: 0,
        totalRevenue: 0,
      },
    );

    summary.totalRevenue = roundMoney(summary.totalRevenue);

    res.json({
      success: true,
      summary,
      reports: normalizedReports,
    });
  } catch (error) {
    console.error("Get admin product reports error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching product reports",
    });
  }
};

exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    if (!orderNumber) {
      return res.status(400).json({
        success: false,
        message: "Order number is required",
      });
    }

    const order = await Order.findOne({ orderNumber })
      .populate({
        path: "items.product",
        select: "title images price category dimensions vendor",
      })
      .populate({
        path: "user",
        select: "name email",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Format response for tracking
    const orderData = order.toObject();
    const products = (orderData.items || [])
      .map((item) => item.product)
      .filter(Boolean);
    await attachImageDataToProducts(products);

    const trackingInfo = {
      _id: order._id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      transactionId: order.paymentDetails?.transactionId || "N/A",
      items: orderData.items.map((item) => ({
        product: item.product
          ? {
              _id: item.product._id,
              title: item.product.title,
              image: item.product.images?.[0] || null,
              price: item.price,
            }
          : {
              title: "Product information not available",
              price: item.price,
            },
        quantity: item.quantity,
        variationLabel: item.variationLabel || "",
        sku: item.sku || "",
        color: item.color,
        dimensions: item.dimensions,
        itemTotal: item.quantity * item.price,
      })),
      shippingAddress: order.shippingAddress,
      subtotal: order.subtotal,
      shippingFee: order.shippingFee,
      discount: order.discount,
      total: order.total,
      isGuest: !order.user,
      customerName: order.user
        ? order.user.name
        : `${order.shippingAddress.firstName} ${order.shippingAddress.lastName}`,
    };

    res.json({
      success: true,
      order: trackingInfo,
    });
  } catch (error) {
    console.error("Track order error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while tracking order",
    });
  }
};

// Search orders for navbar suggestions
exports.searchOrders = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.length < 3) {
      return res.json({
        success: true,
        suggestions: [],
      });
    }

    const orders = await Order.find({
      orderNumber: { $regex: query, $options: "i" },
    })
      .select("orderNumber shippingAddress items orderStatus createdAt")
      .populate({
        path: "items.product",
        select: "title",
      })
      .limit(10);

    const suggestions = orders.map((order) => ({
      type: "order",
      _id: order._id,
      orderNumber: order.orderNumber,
      customerName:
        `${order.shippingAddress?.firstName || ""} ${order.shippingAddress?.lastName || ""}`.trim(),
      productName: order.items[0]?.product?.title || "Product",
      status: order.orderStatus,
      date: order.createdAt,
    }));

    res.json({
      success: true,
      suggestions,
    });
  } catch (error) {
    console.error("Search orders error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching orders",
    });
  }
};
// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    // Check admin access
    if (req.user.role !== "admin" && req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const order = await Order.findById(id)
      .populate({
        path: "items.product",
        select: "title images price dimensions vendor",
      })
      .populate({
        path: "user",
        select: "email name",
      });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Store old status for logging
    const oldStatus = order.orderStatus;

    // Update order
    order.orderStatus = status;

    // Update payment status when moving from pending to processing
    if (oldStatus === "pending" && status === "processing") {
      order.paymentStatus = "completed";
    }

    // Update payment status when cancelling
    if (status === "cancelled") {
      order.paymentStatus = "failed";
    }

    if (notes) {
      order.adminNotes = notes;
    }

    await order.save();

    // Send email notification
    try {
      await sendOrderStatusEmail(order, status, oldStatus);
    } catch (emailError) {
      console.error("Failed to send status email:", emailError);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: `Order status updated to ${status}`,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        paymentStatus: order.paymentStatus, // Include payment status in response
        customerEmail: order.shippingAddress?.email,
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Update order status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating order status",
    });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    // Check if user owns this order
    if (!order.user || String(order.user) !== String(req.user._id || req.user.id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      });
    }

    // Update order status to cancelled
    order.orderStatus = "cancelled";
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order,
    });
  } catch (error) {
    console.error("Cancel order error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while cancelling order",
    });
  }
};

// In cartController.js - Add guest checkout endpoint
exports.guestCheckout = async (req, res) => {
  try {
    const {
      shippingAddress,
      items,
      shippingFee = 0,
      shippingMeta = {},
      couponCode = "",
      paymentMethod,
      paymentDetails,
    } = req.body;

    const normalizedPaymentDetails = normalizePaymentDetails(
      paymentMethod,
      paymentDetails,
    );

    // Validate required fields
    if (!shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and items are required",
      });
    }

    // Validate payment method
    if (!normalizedPaymentDetails.method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    const globalCommissionSettings = await getGlobalCommissionSettings();
    const builtItems = await buildOrderItems(items, {
      globalCommissionSettings,
    });
    if (!builtItems.success) {
      return res.status(builtItems.status).json({
        success: false,
        message: builtItems.message,
      });
    }

    const pricing = await calculateOrderPricing({
      subtotal: builtItems.subtotal,
      shippingFee,
      couponCode: normalizeCouponCode(couponCode),
      items: builtItems.orderItems,
    });

    if (!pricing.success) {
      return res.status(pricing.status).json({
        success: false,
        message: pricing.message,
      });
    }

    const orderNumber = generateOrderNumber();

    // Create order for guest
    const order = await Order.create({
      orderNumber,
      items: builtItems.orderItems,
      shippingAddress,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      shippingMeta: shippingMeta || {},
      discount: pricing.discount,
      couponCode: pricing.couponCode,
      total: pricing.total,
      paymentMethod: normalizedPaymentDetails.method,
      paymentDetails: normalizedPaymentDetails,
      paymentStatus: "pending",
      orderStatus: "pending",
    });

    if (pricing.couponDoc) {
      try {
        await incrementCouponUsage(pricing.couponDoc);
      } catch (couponError) {
        await Order.findByIdAndDelete(order._id).catch(() => null);

        return res.status(400).json({
          success: false,
          message: couponError.message || "Coupon is no longer valid",
        });
      }
    }

    await createRecurringSubscriptionsFromOrder(order).catch(() => null);

    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "items.product",
        select: "title images price dimensions vendor",
      })
      .lean();

    if (populatedOrder?.items?.length) {
      const products = populatedOrder.items
        .map((item) => item.product)
        .filter(Boolean);
      await attachImageDataToProducts(products);
    }

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
    });
  } catch (error) {
    console.error("Guest checkout error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating order",
      error: error.message,
    });
  }
};

