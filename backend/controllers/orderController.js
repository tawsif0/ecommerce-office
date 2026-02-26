// controllers/orderController.js
const mongoose = require("mongoose");
const Order = require("../models/Order.js");
const Cart = require("../models/Cart.js");
const Product = require("../models/Product.js");
const Category = require("../models/Category.js");
const Vendor = require("../models/Vendor.js");
const axios = require("axios");
const LandingPage = require("../models/LandingPage");
const User = require("../models/User");
const PaymentMethod = require("../models/PaymentMethod");
const {
  sendOrderStatusEmail,
  sendOrderPlacedEmail,
} = require("../utils/emailTemplates");
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
const { initiateGatewayPayment } = require("../utils/paymentGatewayUtils");

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const timestamp = date.getTime();
  const random = Math.floor(Math.random() * 10000);
  return `ORD-${timestamp}-${random}`;
};

const GATEWAY_CHANNELS = new Set(["stripe", "paypal", "sslcommerz"]);

const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
];

const ORDER_STATUS_TRANSITIONS = {
  pending: new Set(["confirmed", "cancelled"]),
  confirmed: new Set(["processing", "cancelled"]),
  processing: new Set(["shipped", "cancelled"]),
  shipped: new Set(["delivered", "returned"]),
  delivered: new Set(["returned"]),
  cancelled: new Set([]),
  returned: new Set([]),
};

const COURIER_STATUS_TO_ORDER_STATUS = {
  created: "confirmed",
  confirmed: "confirmed",
  pending: "pending",
  assigned: "processing",
  processing: "processing",
  picked: "processing",
  picked_up: "processing",
  in_transit: "shipped",
  shipped: "shipped",
  out_for_delivery: "shipped",
  delivered: "delivered",
  returned: "returned",
  cancelled: "cancelled",
  failed: "cancelled",
};

const normalizeOrderStatus = (value) => String(value || "").trim().toLowerCase();

const canTransitionOrderStatus = (fromStatus, toStatus) => {
  const from = normalizeOrderStatus(fromStatus);
  const to = normalizeOrderStatus(toStatus);

  if (!from || !to) return false;
  if (from === to) return true;

  const allowed = ORDER_STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.has(to);
};

const buildOrderStatusTimelineEntry = ({
  status,
  note = "",
  user = null,
  changedAt = new Date(),
} = {}) => ({
  status: normalizeOrderStatus(status),
  note: String(note || "").trim().slice(0, 1000),
  changedAt,
  changedBy: user?._id || user?.id || null,
  changedByRole: String(user?.userType || user?.role || "system")
    .trim()
    .toLowerCase(),
});

const appendOrderStatusTimelineEntry = ({
  order,
  status,
  note = "",
  user = null,
  changedAt = new Date(),
} = {}) => {
  if (!order) return;

  if (!Array.isArray(order.statusTimeline)) {
    order.statusTimeline = [];
  }

  order.statusTimeline.push(
    buildOrderStatusTimelineEntry({
      status,
      note,
      user,
      changedAt,
    }),
  );
};

const getOrderStatusTimeline = (order = {}) => {
  const existing = Array.isArray(order?.statusTimeline)
    ? order.statusTimeline.filter((entry) => String(entry?.status || "").trim())
    : [];

  if (existing.length > 0) {
    return existing;
  }

  const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date();
  const currentStatus = normalizeOrderStatus(order?.orderStatus || "pending") || "pending";
  const timeline = [
    {
      status: "pending",
      note: "Order created",
      changedAt: createdAt,
      changedBy: null,
      changedByRole: "system",
    },
  ];

  if (currentStatus !== "pending") {
    timeline.push({
      status: currentStatus,
      note: `Current status: ${currentStatus}`,
      changedAt: createdAt,
      changedBy: null,
      changedByRole: "system",
    });
  }

  return timeline;
};

const isAdminUser = (user) =>
  String(user?.role || user?.userType || "")
    .trim()
    .toLowerCase() === "admin";

const getPrimaryAdminCourierSettings = async () => {
  const admin = await User.findOne({ userType: "admin" })
    .select("adminSettings.courier")
    .lean();

  const courier = admin?.adminSettings?.courier || {};

  return {
    enabled: courier?.enabled === undefined ? true : Boolean(courier.enabled),
    providerName: String(courier?.providerName || "").trim(),
    apiBaseUrl: String(courier?.apiBaseUrl || "")
      .trim()
      .replace(/\/+$/, ""),
    apiToken: String(courier?.apiToken || courier?.token || "").trim(),
    apiKey: String(courier?.apiKey || "").trim(),
    apiSecret: String(courier?.apiSecret || "").trim(),
    consignmentPath: String(courier?.consignmentPath || "/consignments")
      .trim()
      .replace(/^\/?/, "/"),
    trackingPath: String(courier?.trackingPath || "/track")
      .trim()
      .replace(/^\/?/, "/"),
    labelPath: String(courier?.labelPath || "/label")
      .trim()
      .replace(/^\/?/, "/"),
    timeoutMs: Math.max(1000, parseInt(courier?.timeoutMs, 10) || 12000),
  };
};

const buildCourierHeaders = (courierConfig = {}) => {
  const headers = {};

  if (courierConfig.apiToken) {
    headers.Authorization = `Bearer ${courierConfig.apiToken}`;
  }

  if (courierConfig.apiKey) {
    headers["x-api-key"] = courierConfig.apiKey;
  }

  if (courierConfig.apiSecret) {
    headers["x-api-secret"] = courierConfig.apiSecret;
  }

  return headers;
};

const joinBaseUrlWithPath = (baseUrl, path) => {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  const suffix = String(path || "").trim().replace(/^\/+/, "");
  if (!base) return "";
  if (!suffix) return base;
  return `${base}/${suffix}`;
};

const resolveResponseCandidates = (payload = null) => {
  const candidates = [payload];
  if (payload && typeof payload === "object") {
    candidates.push(payload.data, payload.result, payload.payload, payload.response);
  }

  return candidates.filter((entry) => entry && typeof entry === "object");
};

const pickResponseValue = (payload, keys = []) => {
  const candidates = resolveResponseCandidates(payload);
  const normalizedKeys = keys.map((key) => String(key || "").trim());

  for (const candidate of candidates) {
    for (const key of normalizedKeys) {
      if (!key) continue;
      if (candidate[key] !== undefined && candidate[key] !== null && candidate[key] !== "") {
        return candidate[key];
      }
    }
  }

  return null;
};

const normalizeCourierMeta = (courierMeta = {}) => ({
  providerName: String(courierMeta?.providerName || "").trim(),
  consignmentId: String(courierMeta?.consignmentId || "").trim(),
  trackingNumber: String(courierMeta?.trackingNumber || "").trim(),
  trackingUrl: String(courierMeta?.trackingUrl || "").trim(),
  labelUrl: String(courierMeta?.labelUrl || "").trim(),
  status: String(courierMeta?.status || "").trim().toLowerCase(),
  note: String(courierMeta?.note || "").trim(),
  syncedFromApi: Boolean(courierMeta?.syncedFromApi),
  generatedBy: String(courierMeta?.generatedBy || "").trim().toLowerCase(),
  createdAt: courierMeta?.createdAt || null,
  updatedAt: courierMeta?.updatedAt || null,
  lastSyncedAt: courierMeta?.lastSyncedAt || null,
  events: Array.isArray(courierMeta?.events) ? courierMeta.events : [],
});

const getOrderCourierMeta = (order = {}) =>
  normalizeCourierMeta(order?.shippingMeta?.courier || {});

const setOrderCourierMeta = (order, courierPatch = {}) => {
  const shippingMeta =
    order?.shippingMeta && typeof order.shippingMeta === "object" ? order.shippingMeta : {};
  const existingCourier =
    shippingMeta?.courier && typeof shippingMeta.courier === "object"
      ? shippingMeta.courier
      : {};

  const merged = {
    ...existingCourier,
    ...courierPatch,
    createdAt: existingCourier.createdAt || courierPatch.createdAt || new Date(),
    updatedAt: new Date(),
  };

  order.shippingMeta = {
    ...shippingMeta,
    courier: merged,
  };

  return normalizeCourierMeta(merged);
};

const generateFallbackConsignmentId = (order = {}) => {
  const orderKey = String(order?.orderNumber || Date.now())
    .replace(/[^A-Za-z0-9]/g, "")
    .slice(-14)
    .toUpperCase();
  const suffix = Math.floor(100 + Math.random() * 900);
  return `CSG-${orderKey}-${suffix}`;
};

const buildCourierConsignmentPayload = (order = {}) => {
  const shipping = order?.shippingAddress || {};
  const items = Array.isArray(order?.items) ? order.items : [];
  const customerName = `${String(shipping?.firstName || "").trim()} ${String(
    shipping?.lastName || "",
  ).trim()}`.trim();

  return {
    orderNumber: order?.orderNumber,
    amountToCollect: roundMoney(order?.total || 0),
    customerName,
    customerPhone: String(shipping?.phone || "").trim(),
    customerAddress: String(shipping?.address || "").trim(),
    city: String(shipping?.city || "").trim(),
    district: String(shipping?.district || "").trim(),
    postalCode: String(shipping?.postalCode || "").trim(),
    country: String(shipping?.country || "Bangladesh").trim(),
    note: String(order?.adminNotes || "").trim(),
    items: items.map((item) => ({
      title: String(item?.product?.title || item?.title || "Product").trim(),
      quantity: Number(item?.quantity || 0),
      unitPrice: roundMoney(item?.price || 0),
      subtotal: roundMoney(Number(item?.quantity || 0) * Number(item?.price || 0)),
      sku: String(item?.sku || "").trim(),
      variation: String(item?.variationLabel || "").trim(),
    })),
  };
};

const parseConsignmentResponse = (payload = {}) => {
  const consignmentId = String(
    pickResponseValue(payload, [
      "consignmentId",
      "consignment_id",
      "consignmentNo",
      "consignment_no",
      "id",
      "reference",
    ]) || "",
  ).trim();

  const trackingNumber = String(
    pickResponseValue(payload, [
      "trackingNumber",
      "tracking_number",
      "trackingNo",
      "tracking_no",
      "trackingId",
      "tracking_id",
      "waybill",
      "waybillNo",
    ]) || "",
  ).trim();

  const trackingUrl = String(
    pickResponseValue(payload, [
      "trackingUrl",
      "tracking_url",
      "trackingLink",
      "tracking_link",
      "trackUrl",
      "track_url",
      "url",
    ]) || "",
  ).trim();

  const labelUrl = String(
    pickResponseValue(payload, ["labelUrl", "label_url", "labelLink", "label_link"]) || "",
  ).trim();

  const status = String(
    pickResponseValue(payload, ["status", "state", "currentStatus", "current_status"]) || "created",
  )
    .trim()
    .toLowerCase();

  return {
    consignmentId,
    trackingNumber,
    trackingUrl,
    labelUrl,
    status,
  };
};

const parseTrackingResponse = (payload = {}) => {
  const trackingUrl = String(
    pickResponseValue(payload, [
      "trackingUrl",
      "tracking_url",
      "trackingLink",
      "tracking_link",
      "trackUrl",
      "track_url",
      "url",
    ]) || "",
  ).trim();

  const status = String(
    pickResponseValue(payload, [
      "status",
      "currentStatus",
      "current_status",
      "deliveryStatus",
      "delivery_status",
      "state",
    ]) || "",
  )
    .trim()
    .toLowerCase();

  const eventsValue = pickResponseValue(payload, [
    "events",
    "history",
    "trackingEvents",
    "tracking_events",
    "steps",
    "timeline",
  ]);

  const events = Array.isArray(eventsValue)
    ? eventsValue.map((entry) => ({
        status: String(entry?.status || entry?.state || "").trim(),
        note: String(entry?.note || entry?.description || entry?.message || "").trim(),
        time: entry?.time || entry?.date || entry?.createdAt || null,
        location: String(entry?.location || entry?.district || entry?.city || "").trim(),
      }))
    : [];

  return {
    trackingUrl,
    status,
    events,
  };
};

const mapCourierStatusToOrderStatus = (status = "") => {
  const normalized = String(status || "").trim().toLowerCase();
  return COURIER_STATUS_TO_ORDER_STATUS[normalized] || "";
};

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findBlacklistedCustomerByShippingAddress = async (shippingAddress = {}) => {
  const email = String(shippingAddress?.email || "").trim().toLowerCase();
  const phone = User.normalizePhone
    ? User.normalizePhone(String(shippingAddress?.phone || "").trim())
    : String(shippingAddress?.phone || "").trim();

  const conditions = [];
  if (email) conditions.push({ email });
  if (phone) {
    conditions.push({ phone });
    conditions.push({ originalPhone: String(shippingAddress?.phone || "").trim() });
  }

  if (!conditions.length) return null;

  return User.findOne({
    isBlacklisted: true,
    $or: conditions,
  })
    .select("_id name email phone originalPhone isBlacklisted blacklistReason")
    .lean();
};

const buildPhoneVariants = (...values) => {
  const variants = new Set();

  values.flat().forEach((raw) => {
    const trimmed = String(raw || "").trim();
    if (!trimmed) return;

    variants.add(trimmed);

    const normalized = User.normalizePhone
      ? User.normalizePhone(trimmed)
      : trimmed;
    if (normalized) {
      variants.add(normalized);

      if (normalized.startsWith("0") && normalized.length >= 11) {
        variants.add(`+88${normalized}`);
        variants.add(`880${normalized.slice(1)}`);
      }
    }
  });

  return Array.from(variants);
};

const classifyCustomerRiskLevel = ({
  successRate = 0,
  totalOrders = 0,
  isBlacklisted = false,
} = {}) => {
  if (isBlacklisted) return "blacklisted";
  if (!Number.isFinite(totalOrders) || totalOrders <= 0) return "new";
  if (successRate >= 80) return "trusted";
  if (successRate >= 60) return "medium";
  if (successRate >= 40) return "high";
  return "blacklisted";
};

const getCustomerOrderInsights = async ({
  email = "",
  phone = "",
  alternativePhone = "",
  userId = "",
} = {}) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const phoneVariants = buildPhoneVariants(phone, alternativePhone);
  const normalizedUserId = String(userId || "").trim();
  const validUserId = mongoose.Types.ObjectId.isValid(normalizedUserId)
    ? normalizedUserId
    : "";

  const userConditions = [];
  if (normalizedEmail) userConditions.push({ email: normalizedEmail });
  if (phoneVariants.length) {
    userConditions.push({ phone: { $in: phoneVariants } });
    userConditions.push({ originalPhone: { $in: phoneVariants } });
  }
  if (validUserId) {
    userConditions.push({ _id: validUserId });
  }

  const matchedUsers = userConditions.length
    ? await User.find({ $or: userConditions })
      .select("_id name email phone originalPhone isBlacklisted blacklistReason")
      .limit(10)
      .lean()
    : [];

  const matchedUserIds = matchedUsers.map((entry) => entry._id);
  if (validUserId && !matchedUserIds.some((entry) => String(entry) === validUserId)) {
    matchedUserIds.push(validUserId);
  }

  const orderConditions = [];
  if (matchedUserIds.length) {
    orderConditions.push({ user: { $in: matchedUserIds } });
  }
  if (normalizedEmail) {
    orderConditions.push({ "shippingAddress.email": normalizedEmail });
  }
  phoneVariants.forEach((variant) => {
    orderConditions.push({ "shippingAddress.phone": variant });
    orderConditions.push({ "shippingMeta.alternativePhone": variant });
  });

  const orders = orderConditions.length
    ? await Order.find({ $or: orderConditions })
      .select("orderNumber orderStatus total createdAt")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
    : [];

  const dedupedOrdersMap = new Map();
  orders.forEach((entry) => {
    dedupedOrdersMap.set(String(entry._id), entry);
  });

  const dedupedOrders = Array.from(dedupedOrdersMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  let deliveredOrders = 0;
  let cancelledOrders = 0;
  let returnedOrders = 0;
  let totalRevenue = 0;

  dedupedOrders.forEach((order) => {
    const status = String(order?.orderStatus || "").trim().toLowerCase();
    if (status === "delivered") {
      deliveredOrders += 1;
      totalRevenue += toNumber(order?.total, 0);
      return;
    }
    if (status === "cancelled") {
      cancelledOrders += 1;
      return;
    }
    if (status === "returned") {
      returnedOrders += 1;
    }
  });

  const totalOrders = dedupedOrders.length;
  const successRate =
    totalOrders > 0
      ? roundMoney((deliveredOrders / totalOrders) * 100)
      : 0;

  const blacklistedUser = matchedUsers.find((entry) => Boolean(entry?.isBlacklisted));
  const isBlacklisted = Boolean(blacklistedUser);
  const blacklistReason = String(blacklistedUser?.blacklistReason || "").trim();

  return {
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    returnedOrders,
    successRate,
    totalRevenue: roundMoney(totalRevenue),
    riskLevel: classifyCustomerRiskLevel({
      successRate,
      totalOrders,
      isBlacklisted,
    }),
    isBlacklisted,
    blacklistReason,
    lastOrderDate: dedupedOrders[0]?.createdAt || null,
    recentOrders: dedupedOrders.slice(0, 5).map((entry) => ({
      orderNumber: entry.orderNumber,
      orderStatus: entry.orderStatus,
      total: roundMoney(entry.total),
      createdAt: entry.createdAt,
    })),
    matchedCustomers: matchedUsers.slice(0, 5).map((entry) => ({
      _id: entry._id,
      name: entry.name || "",
      email: entry.email || "",
      phone: entry.originalPhone || entry.phone || "",
      isBlacklisted: Boolean(entry.isBlacklisted),
      blacklistReason: String(entry.blacklistReason || ""),
    })),
  };
};

const getOrderInventoryState = (order = {}) => {
  const inventory = order?.shippingMeta?.inventory || {};
  return {
    deducted: Boolean(inventory?.deducted),
    deductedAt: inventory?.deductedAt || null,
    restored: Boolean(inventory?.restored),
    restoredAt: inventory?.restoredAt || null,
    restoredReason: String(inventory?.restoredReason || "").trim(),
  };
};

const setOrderInventoryState = (order, patch = {}) => {
  if (!order) return;

  const shippingMeta =
    order.shippingMeta && typeof order.shippingMeta === "object"
      ? order.shippingMeta
      : {};

  order.shippingMeta = {
    ...shippingMeta,
    inventory: {
      ...getOrderInventoryState(order),
      ...patch,
    },
  };
};

const applyInventoryAdjustmentForItem = async ({
  item,
  direction = -1,
}) => {
  const quantity = Math.max(1, parseInt(item?.quantity, 10) || 1);
  const rawProductId = item?.product?._id || item?.product;
  const productId = String(rawProductId || "").trim();
  const variationId = String(item?.variationId || "").trim();

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    throw new Error("Invalid product for inventory adjustment");
  }

  const product = await Product.findById(productId)
    .select("_id title allowBackorder")
    .lean();
  if (!product) {
    throw new Error("Product not found while updating inventory");
  }

  if (direction < 0 && product.allowBackorder) {
    return {
      applied: false,
      productId: String(product._id),
      variationId: "",
      quantity,
    };
  }

  const query = { _id: product._id };
  const update = { $inc: { stock: direction * quantity } };

  if (variationId && mongoose.Types.ObjectId.isValid(variationId)) {
    query.variations = {
      $elemMatch:
        direction < 0
          ? { _id: variationId, stock: { $gte: quantity } }
          : { _id: variationId },
    };
    update.$inc["variations.$.stock"] = direction * quantity;
  } else if (direction < 0) {
    query.stock = { $gte: quantity };
  }

  if (direction < 0 && !query.stock) {
    query.stock = { $gte: quantity };
  }

  const result = await Product.updateOne(query, update);
  const modified = Number(result?.modifiedCount || result?.nModified || 0);
  if (modified <= 0) {
    throw new Error(`${product.title || "Product"} has insufficient stock`);
  }

  return {
    applied: true,
    productId: String(product._id),
    variationId:
      variationId && mongoose.Types.ObjectId.isValid(variationId)
        ? variationId
        : "",
    quantity,
  };
};

const rollbackInventoryAdjustments = async (adjustments = []) => {
  const queue = Array.isArray(adjustments) ? [...adjustments].reverse() : [];
  for (const adjustment of queue) {
    if (!adjustment?.applied || !adjustment?.productId) continue;

    const update = { $inc: { stock: Number(adjustment.quantity || 0) } };
    const query = { _id: adjustment.productId };

    if (adjustment.variationId) {
      query.variations = { $elemMatch: { _id: adjustment.variationId } };
      update.$inc["variations.$.stock"] = Number(adjustment.quantity || 0);
    }

    await Product.updateOne(query, update).catch(() => null);
  }
};

const applyOrderInventoryAdjustment = async ({
  items = [],
  direction = -1,
} = {}) => {
  const adjustments = [];
  const normalizedDirection = direction >= 0 ? 1 : -1;

  for (const item of Array.isArray(items) ? items : []) {
    try {
      const entry = await applyInventoryAdjustmentForItem({
        item,
        direction: normalizedDirection,
      });
      if (entry?.applied) {
        adjustments.push(entry);
      }
    } catch (error) {
      if (normalizedDirection < 0 && adjustments.length > 0) {
        await rollbackInventoryAdjustments(adjustments);
      }

      return {
        success: false,
        message: error.message || "Failed to update inventory",
      };
    }
  }

  return {
    success: true,
    adjustments,
  };
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

const normalizePaymentDetails = (
  paymentMethod,
  paymentDetails = {},
  { providerType = "", defaultAccountNo = "" } = {},
) => ({
  method: extractPaymentMethod(paymentMethod, paymentDetails),
  providerType: String(providerType || "").trim().toLowerCase(),
  transactionId: String(paymentDetails?.transactionId || "").trim(),
  gatewayPaymentId: String(paymentDetails?.gatewayPaymentId || "").trim(),
  paymentUrl: String(paymentDetails?.paymentUrl || "").trim(),
  accountNo: String(paymentDetails?.accountNo || defaultAccountNo || "").trim(),
  sentFrom: String(paymentDetails?.sentFrom || "").trim(),
  sentTo: String(paymentDetails?.sentTo || "").trim(),
  meta:
    paymentDetails?.meta && typeof paymentDetails.meta === "object"
      ? paymentDetails.meta
      : {},
});

const normalizeOrderSource = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 120);
  return normalized || "shop";
};

const resolveLandingAttribution = async ({ source = "shop", landingPageSlug = "" } = {}) => {
  const normalizedSource = normalizeOrderSource(source);
  const normalizedSlug = String(landingPageSlug || "")
    .trim()
    .toLowerCase()
    .slice(0, 220);

  if (!normalizedSlug) {
    return {
      source: normalizedSource,
      landingPage: null,
      landingPageSlug: "",
    };
  }

  const page = await LandingPage.findOne({
    slug: normalizedSlug,
    isActive: true,
  })
    .select("_id slug")
    .lean();

  return {
    source: normalizedSource,
    landingPage: page?._id || null,
    landingPageSlug: page?.slug || normalizedSlug,
  };
};

const resolvePaymentMethodSelection = async ({
  paymentMethodId,
  paymentMethod,
  paymentDetails,
}) => {
  const requestedMethod = extractPaymentMethod(paymentMethod, paymentDetails);
  let methodDoc = null;

  const normalizedMethodId = String(paymentMethodId || "").trim();
  if (/^[0-9a-fA-F]{24}$/.test(normalizedMethodId)) {
    methodDoc = await PaymentMethod.findOne({
      _id: normalizedMethodId,
      isActive: true,
    }).lean();
  }

  if (!methodDoc && requestedMethod) {
    const escaped = escapeRegExp(requestedMethod);
    methodDoc = await PaymentMethod.findOne({
      isActive: true,
      $or: [
        { code: requestedMethod.toLowerCase() },
        { type: { $regex: `^${escaped}$`, $options: "i" } },
      ],
    }).lean();
  }

  const channelType = String(methodDoc?.channelType || "manual")
    .trim()
    .toLowerCase();
  const requestedLower = String(requestedMethod || "").trim().toLowerCase();
  const inferredCod =
    !methodDoc && (requestedLower.includes("cod") || requestedLower.includes("cash on delivery"));
  const inferredChannel = methodDoc ? channelType : inferredCod ? "cod" : "manual";

  return {
    methodDoc,
    methodName: String(methodDoc?.type || requestedMethod || "").trim(),
    channelType: inferredChannel,
    defaultAccountNo: String(methodDoc?.accountNo || "").trim(),
    requiresTransactionProof: methodDoc
      ? methodDoc.requiresTransactionProof === undefined
        ? true
        : Boolean(methodDoc.requiresTransactionProof)
      : !inferredCod,
  };
};

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
  let freeShipping = false;

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
    freeShipping = Boolean(validation.freeShipping);
  }

  const effectiveShippingFee = freeShipping ? 0 : normalizedShippingFee;

  const total = roundMoney(
    Math.max(normalizedSubtotal + effectiveShippingFee - discount, 0),
  );

  return {
    success: true,
    subtotal: normalizedSubtotal,
    shippingFee: effectiveShippingFee,
    discount,
    couponCode: appliedCouponCode,
    total,
    couponDoc,
    freeShipping,
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
      source = "shop",
      landingPageSlug = "",
      paymentMethodId,
      paymentMethod,
      paymentDetails,
    } = req.body;

    const paymentSelection = await resolvePaymentMethodSelection({
      paymentMethodId,
      paymentMethod,
      paymentDetails,
    });

    const normalizedPaymentDetails = normalizePaymentDetails(
      paymentSelection.methodName,
      paymentDetails,
      {
        providerType: paymentSelection.channelType,
        defaultAccountNo: paymentSelection.defaultAccountNo,
      },
    );

    // Validate required fields
    if (!shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and items are required",
      });
    }

    if (req.user?.isBlacklisted) {
      return res.status(403).json({
        success: false,
        message: "This account is blacklisted and cannot place orders",
      });
    }

    const blacklistedByContact = await findBlacklistedCustomerByShippingAddress(shippingAddress);
    if (blacklistedByContact) {
      return res.status(403).json({
        success: false,
        message: "This customer is blacklisted and cannot place orders",
      });
    }

    if (!normalizedPaymentDetails.method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (
      paymentSelection.requiresTransactionProof &&
      !String(normalizedPaymentDetails.transactionId || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for this payment method",
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
    const attribution = await resolveLandingAttribution({
      source,
      landingPageSlug,
    });

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
      paymentMethod: paymentSelection.methodName || normalizedPaymentDetails.method,
      paymentDetails: normalizedPaymentDetails,
      paymentStatus: "pending",
      orderStatus: "pending",
      statusTimeline: [
        buildOrderStatusTimelineEntry({
          status: "pending",
          note: "Order created from checkout",
          user: req.user,
        }),
      ],
      source: attribution.source,
      landingPage: attribution.landingPage,
      landingPageSlug: attribution.landingPageSlug,
    });

    const inventoryDeduction = await applyOrderInventoryAdjustment({
      items: order.items,
      direction: -1,
    });
    if (!inventoryDeduction.success) {
      await Order.findByIdAndDelete(order._id).catch(() => null);
      return res.status(400).json({
        success: false,
        message: inventoryDeduction.message || "Failed to reserve product stock",
      });
    }

    if (pricing.couponDoc) {
      try {
        await incrementCouponUsage(pricing.couponDoc);
      } catch (couponError) {
        if (inventoryDeduction.adjustments?.length) {
          await rollbackInventoryAdjustments(inventoryDeduction.adjustments);
        }
        await Order.findByIdAndDelete(order._id).catch(() => null);

        return res.status(400).json({
          success: false,
          message: couponError.message || "Coupon is no longer valid",
        });
      }
    }

    setOrderInventoryState(order, {
      deducted: Array.isArray(inventoryDeduction.adjustments) &&
        inventoryDeduction.adjustments.length > 0,
      deductedAt: new Date(),
      restored: false,
      restoredAt: null,
      restoredReason: "",
    });
    await order.save();

    await createRecurringSubscriptionsFromOrder(order).catch(() => null);

    let paymentRedirectUrl = "";
    let gatewayInitError = "";

    if (paymentSelection.methodDoc && GATEWAY_CHANNELS.has(paymentSelection.channelType)) {
      try {
        const gatewaySession = await initiateGatewayPayment({
          order,
          paymentMethod: paymentSelection.methodDoc,
          customer: shippingAddress,
        });

        order.paymentDetails = {
          ...(order.paymentDetails?.toObject
            ? order.paymentDetails.toObject()
            : order.paymentDetails || {}),
          ...normalizedPaymentDetails,
          providerType: gatewaySession?.providerType || paymentSelection.channelType,
          gatewayPaymentId: String(gatewaySession?.gatewayPaymentId || ""),
          paymentUrl: String(gatewaySession?.paymentUrl || ""),
          meta:
            gatewaySession?.meta && typeof gatewaySession.meta === "object"
              ? gatewaySession.meta
              : {},
        };
        await order.save();

        paymentRedirectUrl = String(gatewaySession?.paymentUrl || "");
      } catch (gatewayError) {
        console.error("Create order gateway initialization error:", gatewayError);
        gatewayInitError = gatewayError?.message || "Failed to initialize payment gateway";
      }
    }

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

    sendOrderPlacedEmail(populatedOrder).catch((emailError) => {
      console.error("Order confirmation email error:", emailError);
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
      paymentRedirectUrl: paymentRedirectUrl || null,
      paymentProvider: paymentSelection.channelType || "manual",
      gatewayInitError: gatewayInitError || null,
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
      courier: getOrderCourierMeta(order),
      adminNotes: order.adminNotes || "",
      statusTimeline: getOrderStatusTimeline(order),
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
      orderStatus: { $nin: ["cancelled", "returned"] },
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
      courier: getOrderCourierMeta(orderData),
      statusTimeline: getOrderStatusTimeline(orderData),
      adminNotes: String(orderData.adminNotes || ""),
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
    const requestedStatus = normalizeOrderStatus(status);
    const noteText = String(notes || "").trim();

    if (!requestedStatus) {
      return res.status(400).json({
        success: false,
        message: "Status is required",
      });
    }

    if (!ORDER_STATUS_FLOW.includes(requestedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
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
    const oldStatus = normalizeOrderStatus(order.orderStatus);

    if (!canTransitionOrderStatus(oldStatus, requestedStatus)) {
      const nextOptions = Array.from(ORDER_STATUS_TRANSITIONS[oldStatus] || []);
      return res.status(400).json({
        success: false,
        message:
          nextOptions.length > 0
            ? `Invalid transition from ${oldStatus} to ${requestedStatus}. Allowed: ${nextOptions.join(", ")}`
            : `Order status ${oldStatus} is terminal and cannot be changed`,
      });
    }

    // Update order
    order.orderStatus = requestedStatus;

    if (requestedStatus === "shipped") {
      const courier = getOrderCourierMeta(order);
      if (!courier.consignmentId) {
        const fallbackConsignmentId = generateFallbackConsignmentId(order);
        setOrderCourierMeta(order, {
          providerName: courier.providerName || "Manual Courier",
          consignmentId: fallbackConsignmentId,
          trackingNumber: courier.trackingNumber || fallbackConsignmentId,
          status: courier.status || "shipped",
          generatedBy: courier.generatedBy || "local",
          syncedFromApi: Boolean(courier.syncedFromApi),
          note: "Consignment auto-generated after shipping status update",
        });
      }
    }

    // Keep payment in sync with operational status
    if (
      ["confirmed", "processing", "shipped", "delivered"].includes(requestedStatus) &&
      order.paymentStatus === "pending"
    ) {
      order.paymentStatus = "completed";
    }

    if (["cancelled", "returned"].includes(requestedStatus)) {
      order.paymentStatus = "failed";
    }

    if (
      oldStatus !== requestedStatus &&
      ["cancelled", "returned"].includes(requestedStatus)
    ) {
      const inventoryState = getOrderInventoryState(order);
      if (inventoryState.deducted && !inventoryState.restored) {
        const inventoryRestore = await applyOrderInventoryAdjustment({
          items: order.items,
          direction: 1,
        });

        if (!inventoryRestore.success) {
          return res.status(400).json({
            success: false,
            message:
              inventoryRestore.message ||
              "Failed to restore stock for cancelled/returned order",
          });
        }

        setOrderInventoryState(order, {
          restored: true,
          restoredAt: new Date(),
          restoredReason: requestedStatus,
        });
      }
    }

    if (noteText) {
      order.adminNotes = noteText;
    }

    if (oldStatus !== requestedStatus || noteText) {
      appendOrderStatusTimelineEntry({
        order,
        status: requestedStatus,
        note:
          noteText ||
          (oldStatus === requestedStatus
            ? `Status note updated at ${new Date().toLocaleString()}`
            : `Status changed from ${oldStatus} to ${requestedStatus}`),
        user: req.user,
      });
    }

    await order.save();

    // Send email notification
    if (oldStatus !== requestedStatus) {
      try {
        await sendOrderStatusEmail(order, requestedStatus, oldStatus);
      } catch (emailError) {
        console.error("Failed to send status email:", emailError);
        // Don't fail the request if email fails
      }
    }

    res.json({
      success: true,
      message: `Order status updated to ${requestedStatus}`,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.orderStatus,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        courier: getOrderCourierMeta(order),
        customerEmail: order.shippingAddress?.email,
        updatedAt: new Date(),
        statusTimeline: getOrderStatusTimeline(order),
        adminNotes: order.adminNotes || "",
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

exports.generateCourierConsignment = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const order = await Order.findById(req.params.id).populate({
      path: "items.product",
      select: "title",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const courierConfig = await getPrimaryAdminCourierSettings();
    const currentCourier = getOrderCourierMeta(order);
    const payload = buildCourierConsignmentPayload(order);

    let generatedCourier = null;
    let mode = "local";
    let warning = "";

    if (
      courierConfig.enabled &&
      courierConfig.apiBaseUrl &&
      courierConfig.consignmentPath
    ) {
      try {
        const endpoint = joinBaseUrlWithPath(
          courierConfig.apiBaseUrl,
          courierConfig.consignmentPath,
        );

        const response = await axios.post(endpoint, payload, {
          timeout: courierConfig.timeoutMs,
          headers: {
            "Content-Type": "application/json",
            ...buildCourierHeaders(courierConfig),
          },
        });

        const parsed = parseConsignmentResponse(response.data || {});
        const fallbackConsignmentId =
          parsed.consignmentId ||
          currentCourier.consignmentId ||
          generateFallbackConsignmentId(order);

        generatedCourier = setOrderCourierMeta(order, {
          providerName: courierConfig.providerName || currentCourier.providerName || "Courier",
          consignmentId: fallbackConsignmentId,
          trackingNumber:
            parsed.trackingNumber ||
            currentCourier.trackingNumber ||
            fallbackConsignmentId,
          trackingUrl: parsed.trackingUrl || currentCourier.trackingUrl,
          labelUrl: parsed.labelUrl || currentCourier.labelUrl,
          status: parsed.status || currentCourier.status || "created",
          syncedFromApi: true,
          generatedBy: "api",
          note: "Consignment generated from courier API",
        });
        mode = "api";
      } catch (apiError) {
        warning =
          apiError?.response?.data?.message ||
          apiError?.message ||
          "Courier API request failed, generated local consignment";
      }
    } else {
      warning = "Courier API not configured, generated local consignment";
    }

    if (!generatedCourier) {
      const fallbackConsignmentId =
        currentCourier.consignmentId || generateFallbackConsignmentId(order);
      generatedCourier = setOrderCourierMeta(order, {
        providerName: courierConfig.providerName || currentCourier.providerName || "Manual Courier",
        consignmentId: fallbackConsignmentId,
        trackingNumber:
          currentCourier.trackingNumber || fallbackConsignmentId,
        status: currentCourier.status || "created",
        syncedFromApi: false,
        generatedBy: "local",
        note: warning || "Consignment generated manually",
      });
    }

    appendOrderStatusTimelineEntry({
      order,
      status: order.orderStatus || "pending",
      note: `Courier consignment assigned: ${generatedCourier.consignmentId}`,
      user: req.user,
    });

    await order.save();

    return res.json({
      success: true,
      message:
        mode === "api"
          ? "Courier consignment generated"
          : "Local consignment generated",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        courier: getOrderCourierMeta(order),
        statusTimeline: getOrderStatusTimeline(order),
      },
      warning: warning || null,
    });
  } catch (error) {
    console.error("Generate courier consignment error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while generating courier consignment",
    });
  }
};

exports.syncCourierTracking = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const courierConfig = await getPrimaryAdminCourierSettings();
    if (!courierConfig.enabled || !courierConfig.apiBaseUrl) {
      return res.status(400).json({
        success: false,
        message: "Courier API is not configured",
      });
    }

    const currentCourier = getOrderCourierMeta(order);
    const referenceId =
      currentCourier.consignmentId || currentCourier.trackingNumber || "";

    if (!referenceId) {
      return res.status(400).json({
        success: false,
        message: "Consignment ID or tracking number is missing",
      });
    }

    let trackingUrl = joinBaseUrlWithPath(
      courierConfig.apiBaseUrl,
      courierConfig.trackingPath,
    );
    const params = {};

    if (trackingUrl.includes("{id}")) {
      trackingUrl = trackingUrl.replace("{id}", encodeURIComponent(referenceId));
    } else if (trackingUrl.includes(":id")) {
      trackingUrl = trackingUrl.replace(":id", encodeURIComponent(referenceId));
    } else {
      params.consignmentId = referenceId;
      params.orderNumber = order.orderNumber;
    }

    const response = await axios.get(trackingUrl, {
      timeout: courierConfig.timeoutMs,
      params,
      headers: {
        ...buildCourierHeaders(courierConfig),
      },
    });

    const parsed = parseTrackingResponse(response.data || {});
    const nextOrderStatus = mapCourierStatusToOrderStatus(parsed.status);
    const previousStatus = normalizeOrderStatus(order.orderStatus);

    const nextCourier = setOrderCourierMeta(order, {
      providerName: currentCourier.providerName || courierConfig.providerName || "Courier",
      status: parsed.status || currentCourier.status || "",
      trackingUrl: parsed.trackingUrl || currentCourier.trackingUrl || "",
      events: parsed.events.length ? parsed.events : currentCourier.events || [],
      syncedFromApi: true,
      generatedBy: currentCourier.generatedBy || "api",
      lastSyncedAt: new Date(),
      note: "Tracking synced from courier API",
    });

    if (
      nextOrderStatus &&
      nextOrderStatus !== previousStatus &&
      canTransitionOrderStatus(previousStatus, nextOrderStatus)
    ) {
      order.orderStatus = nextOrderStatus;

      if (
        ["confirmed", "processing", "shipped", "delivered"].includes(nextOrderStatus) &&
        order.paymentStatus === "pending"
      ) {
        order.paymentStatus = "completed";
      }

      if (["cancelled", "returned"].includes(nextOrderStatus)) {
        order.paymentStatus = "failed";
      }

      appendOrderStatusTimelineEntry({
        order,
        status: nextOrderStatus,
        note: `Status synced from courier tracking (${parsed.status || nextOrderStatus})`,
        user: req.user,
      });
    }

    await order.save();

    return res.json({
      success: true,
      message: "Courier tracking synced",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        courier: nextCourier,
        statusTimeline: getOrderStatusTimeline(order),
      },
    });
  } catch (error) {
    console.error("Sync courier tracking error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while syncing courier tracking",
    });
  }
};

exports.getCourierLabel = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const order = await Order.findById(req.params.id).populate({
      path: "items.product",
      select: "title",
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const courier = getOrderCourierMeta(order);
    const shipping = order.shippingAddress || {};
    const items = Array.isArray(order.items) ? order.items : [];
    const customerName = `${String(shipping?.firstName || "").trim()} ${String(
      shipping?.lastName || "",
    ).trim()}`.trim();

    const label = {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      courierProvider: courier.providerName || "Courier",
      consignmentId: courier.consignmentId || "",
      trackingNumber: courier.trackingNumber || "",
      trackingUrl: courier.trackingUrl || "",
      labelUrl: courier.labelUrl || "",
      customer: {
        name: customerName,
        phone: String(shipping?.phone || "").trim(),
        address: String(shipping?.address || "").trim(),
        city: String(shipping?.city || "").trim(),
        district: String(shipping?.district || "").trim(),
        postalCode: String(shipping?.postalCode || "").trim(),
        country: String(shipping?.country || "Bangladesh").trim(),
      },
      amountToCollect: roundMoney(order.total || 0),
      items: items.map((item) => ({
        title: String(item?.product?.title || "Product").trim(),
        quantity: Number(item?.quantity || 0),
      })),
    };

    return res.json({
      success: true,
      message: "Courier label data generated",
      label,
    });
  } catch (error) {
    console.error("Get courier label error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while preparing courier label",
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

    if (!canTransitionOrderStatus(order.orderStatus, "cancelled")) {
      return res.status(400).json({
        success: false,
        message: "Order can no longer be cancelled from current status",
      });
    }

    // Update order status to cancelled
    order.orderStatus = "cancelled";
    order.paymentStatus = "failed";
    appendOrderStatusTimelineEntry({
      order,
      status: "cancelled",
      note: "Order cancelled by customer",
      user: req.user,
    });
    await order.save();

    res.json({
      success: true,
      message: "Order cancelled successfully",
      order: {
        ...order.toObject(),
        courier: getOrderCourierMeta(order),
      },
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
      source = "shop",
      landingPageSlug = "",
      paymentMethodId,
      paymentMethod,
      paymentDetails,
    } = req.body;

    const paymentSelection = await resolvePaymentMethodSelection({
      paymentMethodId,
      paymentMethod,
      paymentDetails,
    });

    const normalizedPaymentDetails = normalizePaymentDetails(
      paymentSelection.methodName,
      paymentDetails,
      {
        providerType: paymentSelection.channelType,
        defaultAccountNo: paymentSelection.defaultAccountNo,
      },
    );

    // Validate required fields
    if (!shippingAddress || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Shipping address and items are required",
      });
    }

    const blacklistedByContact = await findBlacklistedCustomerByShippingAddress(shippingAddress);
    if (blacklistedByContact) {
      return res.status(403).json({
        success: false,
        message: "This customer is blacklisted and cannot place orders",
      });
    }

    // Validate payment method
    if (!normalizedPaymentDetails.method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (
      paymentSelection.requiresTransactionProof &&
      !String(normalizedPaymentDetails.transactionId || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for this payment method",
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
    const attribution = await resolveLandingAttribution({
      source,
      landingPageSlug,
    });

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
      paymentMethod: paymentSelection.methodName || normalizedPaymentDetails.method,
      paymentDetails: normalizedPaymentDetails,
      paymentStatus: "pending",
      orderStatus: "pending",
      statusTimeline: [
        buildOrderStatusTimelineEntry({
          status: "pending",
          note: "Order created from guest checkout",
          user: null,
        }),
      ],
      source: attribution.source,
      landingPage: attribution.landingPage,
      landingPageSlug: attribution.landingPageSlug,
    });

    const inventoryDeduction = await applyOrderInventoryAdjustment({
      items: order.items,
      direction: -1,
    });
    if (!inventoryDeduction.success) {
      await Order.findByIdAndDelete(order._id).catch(() => null);
      return res.status(400).json({
        success: false,
        message: inventoryDeduction.message || "Failed to reserve product stock",
      });
    }

    if (pricing.couponDoc) {
      try {
        await incrementCouponUsage(pricing.couponDoc);
      } catch (couponError) {
        if (inventoryDeduction.adjustments?.length) {
          await rollbackInventoryAdjustments(inventoryDeduction.adjustments);
        }
        await Order.findByIdAndDelete(order._id).catch(() => null);

        return res.status(400).json({
          success: false,
          message: couponError.message || "Coupon is no longer valid",
        });
      }
    }

    setOrderInventoryState(order, {
      deducted: Array.isArray(inventoryDeduction.adjustments) &&
        inventoryDeduction.adjustments.length > 0,
      deductedAt: new Date(),
      restored: false,
      restoredAt: null,
      restoredReason: "",
    });
    await order.save();

    await createRecurringSubscriptionsFromOrder(order).catch(() => null);

    let paymentRedirectUrl = "";
    let gatewayInitError = "";

    if (paymentSelection.methodDoc && GATEWAY_CHANNELS.has(paymentSelection.channelType)) {
      try {
        const gatewaySession = await initiateGatewayPayment({
          order,
          paymentMethod: paymentSelection.methodDoc,
          customer: shippingAddress,
        });

        order.paymentDetails = {
          ...(order.paymentDetails?.toObject
            ? order.paymentDetails.toObject()
            : order.paymentDetails || {}),
          ...normalizedPaymentDetails,
          providerType: gatewaySession?.providerType || paymentSelection.channelType,
          gatewayPaymentId: String(gatewaySession?.gatewayPaymentId || ""),
          paymentUrl: String(gatewaySession?.paymentUrl || ""),
          meta:
            gatewaySession?.meta && typeof gatewaySession.meta === "object"
              ? gatewaySession.meta
              : {},
        };
        await order.save();

        paymentRedirectUrl = String(gatewaySession?.paymentUrl || "");
      } catch (gatewayError) {
        console.error("Guest checkout gateway initialization error:", gatewayError);
        gatewayInitError = gatewayError?.message || "Failed to initialize payment gateway";
      }
    }

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

    sendOrderPlacedEmail(populatedOrder).catch((emailError) => {
      console.error("Order confirmation email error:", emailError);
    });

    res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
      paymentRedirectUrl: paymentRedirectUrl || null,
      paymentProvider: paymentSelection.channelType || "manual",
      gatewayInitError: gatewayInitError || null,
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

exports.getAdminCustomerInsights = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const {
      email = "",
      phone = "",
      alternativePhone = "",
      customerUserId = "",
    } = req.body || {};

    const hasAnyInput = Boolean(
      String(email || "").trim() ||
      String(phone || "").trim() ||
      String(alternativePhone || "").trim() ||
      String(customerUserId || "").trim(),
    );

    if (!hasAnyInput) {
      return res.status(400).json({
        success: false,
        message: "Customer phone, email, or user id is required",
      });
    }

    const insights = await getCustomerOrderInsights({
      email,
      phone,
      alternativePhone,
      userId: customerUserId,
    });

    return res.json({
      success: true,
      insights,
      blocked: Boolean(insights.isBlacklisted),
    });
  } catch (error) {
    console.error("Get admin customer insights error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching customer insights",
    });
  }
};

exports.createAdminOrder = async (req, res) => {
  try {
    if (!isAdminUser(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const {
      shippingAddress = {},
      items = [],
      shippingFee = 0,
      shippingMeta = {},
      couponCode = "",
      source = "manual_admin",
      landingPageSlug = "",
      paymentMethodId,
      paymentMethod,
      paymentDetails,
      customerUserId = "",
      adminNotes = "",
      courierProvider = "",
      courierTrackingNumber = "",
      courierConsignmentId = "",
    } = req.body || {};

    const normalizedShippingAddress = {
      firstName: String(shippingAddress?.firstName || "").trim(),
      lastName: String(shippingAddress?.lastName || "").trim(),
      email: String(shippingAddress?.email || "").trim().toLowerCase(),
      phone: String(shippingAddress?.phone || "").trim(),
      alternativePhone: String(
        shippingAddress?.alternativePhone || shippingAddress?.altPhone || "",
      ).trim(),
      address: String(shippingAddress?.address || "").trim(),
      city: String(shippingAddress?.city || "").trim(),
      subCity: String(shippingAddress?.subCity || "").trim(),
      district: String(
        shippingAddress?.district || shippingAddress?.subCity || "",
      ).trim(),
      postalCode: String(shippingAddress?.postalCode || "").trim(),
      country: String(shippingAddress?.country || "Bangladesh").trim(),
      notes: String(shippingAddress?.notes || "").trim(),
    };

    if (
      !normalizedShippingAddress.firstName ||
      !normalizedShippingAddress.lastName ||
      !normalizedShippingAddress.email ||
      !normalizedShippingAddress.phone ||
      !normalizedShippingAddress.address ||
      !normalizedShippingAddress.city ||
      !normalizedShippingAddress.postalCode
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Customer name, email, phone, address, city, and postal code are required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required to create an order",
      });
    }

    const blacklistedByContact = await findBlacklistedCustomerByShippingAddress(
      normalizedShippingAddress,
    );
    if (blacklistedByContact) {
      return res.status(403).json({
        success: false,
        message: "This customer is blacklisted and cannot place orders",
      });
    }

    let linkedCustomerId = "";
    const normalizedCustomerUserId = String(customerUserId || "").trim();
    if (mongoose.Types.ObjectId.isValid(normalizedCustomerUserId)) {
      const linkedUser = await User.findById(normalizedCustomerUserId)
        .select("_id userType isBlacklisted blacklistReason")
        .lean();
      if (linkedUser) {
        if (String(linkedUser.userType || "").toLowerCase() === "admin") {
          return res.status(400).json({
            success: false,
            message: "Admin account cannot be assigned as order customer",
          });
        }
        if (linkedUser.isBlacklisted) {
          return res.status(403).json({
            success: false,
            message: "Selected customer is blacklisted",
          });
        }
        linkedCustomerId = String(linkedUser._id);
      }
    }

    const customerInsights = await getCustomerOrderInsights({
      email: normalizedShippingAddress.email,
      phone: normalizedShippingAddress.phone,
      alternativePhone: normalizedShippingAddress.alternativePhone,
      userId: linkedCustomerId,
    });

    if (customerInsights.isBlacklisted) {
      return res.status(403).json({
        success: false,
        message:
          customerInsights.blacklistReason ||
          "This customer is blacklisted and cannot place orders",
      });
    }

    const paymentSelection = await resolvePaymentMethodSelection({
      paymentMethodId,
      paymentMethod,
      paymentDetails,
    });

    const normalizedPaymentDetails = normalizePaymentDetails(
      paymentSelection.methodName,
      paymentDetails,
      {
        providerType: paymentSelection.channelType,
        defaultAccountNo: paymentSelection.defaultAccountNo,
      },
    );

    if (!normalizedPaymentDetails.method) {
      return res.status(400).json({
        success: false,
        message: "Payment method is required",
      });
    }

    if (
      paymentSelection.requiresTransactionProof &&
      !String(normalizedPaymentDetails.transactionId || "").trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required for this payment method",
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

    const attribution = await resolveLandingAttribution({
      source,
      landingPageSlug,
    });

    const mergedShippingMeta =
      shippingMeta && typeof shippingMeta === "object"
        ? { ...shippingMeta }
        : {};

    mergedShippingMeta.alternativePhone = normalizedShippingAddress.alternativePhone;
    mergedShippingMeta.subCity = normalizedShippingAddress.subCity;
    mergedShippingMeta.createdByAdmin = true;
    mergedShippingMeta.createdByUser =
      req.user?._id || req.user?.id || null;

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      user: linkedCustomerId || null,
      items: builtItems.orderItems,
      shippingAddress: normalizedShippingAddress,
      subtotal: pricing.subtotal,
      shippingFee: pricing.shippingFee,
      shippingMeta: mergedShippingMeta,
      discount: pricing.discount,
      couponCode: pricing.couponCode,
      total: pricing.total,
      paymentMethod: paymentSelection.methodName || normalizedPaymentDetails.method,
      paymentDetails: normalizedPaymentDetails,
      paymentStatus: "pending",
      orderStatus: "pending",
      adminNotes: String(adminNotes || "").trim(),
      statusTimeline: [
        buildOrderStatusTimelineEntry({
          status: "pending",
          note: "Order created manually by admin",
          user: req.user,
        }),
      ],
      source: attribution.source || "manual_admin",
      landingPage: attribution.landingPage,
      landingPageSlug: attribution.landingPageSlug,
    });

    if (
      String(courierProvider || "").trim() ||
      String(courierTrackingNumber || "").trim() ||
      String(courierConsignmentId || "").trim()
    ) {
      setOrderCourierMeta(order, {
        providerName: String(courierProvider || "").trim(),
        trackingNumber: String(courierTrackingNumber || "").trim(),
        consignmentId: String(courierConsignmentId || "").trim(),
        status: "pending",
        generatedBy: "manual",
      });
    }

    const inventoryDeduction = await applyOrderInventoryAdjustment({
      items: order.items,
      direction: -1,
    });
    if (!inventoryDeduction.success) {
      await Order.findByIdAndDelete(order._id).catch(() => null);
      return res.status(400).json({
        success: false,
        message: inventoryDeduction.message || "Failed to reserve product stock",
      });
    }

    if (pricing.couponDoc) {
      try {
        await incrementCouponUsage(pricing.couponDoc);
      } catch (couponError) {
        if (inventoryDeduction.adjustments?.length) {
          await rollbackInventoryAdjustments(inventoryDeduction.adjustments);
        }
        await Order.findByIdAndDelete(order._id).catch(() => null);

        return res.status(400).json({
          success: false,
          message: couponError.message || "Coupon is no longer valid",
        });
      }
    }

    setOrderInventoryState(order, {
      deducted: Array.isArray(inventoryDeduction.adjustments) &&
        inventoryDeduction.adjustments.length > 0,
      deductedAt: new Date(),
      restored: false,
      restoredAt: null,
      restoredReason: "",
    });
    await order.save();

    await createRecurringSubscriptionsFromOrder(order).catch(() => null);

    const populatedOrder = await Order.findById(order._id)
      .populate({
        path: "items.product",
        select: "title images price dimensions vendor",
      })
      .lean();

    if (populatedOrder?.items?.length) {
      const products = populatedOrder.items
        .map((entry) => entry.product)
        .filter(Boolean);
      await attachImageDataToProducts(products);
    }

    sendOrderPlacedEmail(populatedOrder).catch((emailError) => {
      console.error("Manual order confirmation email error:", emailError);
    });

    return res.status(201).json({
      success: true,
      message: "Order created successfully",
      order: populatedOrder,
      customerInsights,
    });
  } catch (error) {
    console.error("Create admin order error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while creating admin order",
    });
  }
};

