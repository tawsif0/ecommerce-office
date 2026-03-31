const PaymentMethod = require("../models/PaymentMethod");
const { sanitizePaymentMethodForPublic } = require("../utils/paymentGatewayUtils");
const { clearResponseCacheByPrefix } = require("../middlewares/responseCache");

const CHANNEL_TYPES = ["manual", "cod", "stripe", "paypal", "sslcommerz"];

const isAdminUser = (user) =>
  user && (String(user.userType || "").toLowerCase() === "admin" || user.role === "admin");

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const toInteger = (value, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeString = (value) => String(value || "").trim();
const normalizeCodShippingCost = (value, fallback = 0) =>
  Math.max(0, toNumber(value, fallback));

const normalizeChannelType = (value) => {
  const normalized = safeString(value).toLowerCase();
  return CHANNEL_TYPES.includes(normalized) ? normalized : "manual";
};

const validateGatewayConfig = ({ channelType, gatewayConfig, isActive }) => {
  if (!isActive) return;

  if (channelType === "stripe") {
    if (!safeString(gatewayConfig?.publishableKey) || !safeString(gatewayConfig?.secretKey)) {
      const error = new Error(
        "Stripe publishable key and secret key are required before activating this method",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (channelType === "paypal") {
    if (!safeString(gatewayConfig?.clientId) || !safeString(gatewayConfig?.clientSecret)) {
      const error = new Error(
        "PayPal client ID and client secret are required before activating this method",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (channelType === "sslcommerz") {
    if (!safeString(gatewayConfig?.storeId) || !safeString(gatewayConfig?.storePassword)) {
      const error = new Error(
        "SSLCommerz store ID and store password are required before activating this method",
      );
      error.statusCode = 400;
      throw error;
    }
  }
};

const parseGatewayConfig = (value) => {
  if (!value) return {};
  if (typeof value === "object") return value;
  if (typeof value !== "string") return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const invalidatePublicPaymentMethodCache = () => {
  clearResponseCacheByPrefix("/api/auth/payment-methods");
};

const normalizeGatewayConfig = (input, channelType) => {
  const config = parseGatewayConfig(input);

  if (channelType === "stripe") {
    return {
      publishableKey: safeString(config.publishableKey),
      secretKey: safeString(config.secretKey),
      webhookSecret: safeString(config.webhookSecret),
      currency: safeString(config.currency || "bdt"),
      successUrl: safeString(config.successUrl),
      cancelUrl: safeString(config.cancelUrl),
    };
  }

  if (channelType === "paypal") {
    return {
      clientId: safeString(config.clientId),
      clientSecret: safeString(config.clientSecret),
      sandbox: toBoolean(config.sandbox, true),
      currency: safeString(config.currency || "USD"),
      successUrl: safeString(config.successUrl),
      cancelUrl: safeString(config.cancelUrl),
    };
  }

  if (channelType === "sslcommerz") {
    return {
      storeId: safeString(config.storeId),
      storePassword: safeString(config.storePassword),
      sandbox: toBoolean(config.sandbox, true),
      currency: safeString(config.currency || "BDT"),
      successUrl: safeString(config.successUrl),
      failUrl: safeString(config.failUrl),
      cancelUrl: safeString(config.cancelUrl),
      ipnUrl: safeString(config.ipnUrl),
    };
  }

  return {};
};

const buildCodShippingConfig = (payload = {}, fallbackMethod = null) => {
  const legacyShippingCost = normalizeCodShippingCost(
    payload?.shippingCost,
    fallbackMethod?.shippingCost || 0,
  );
  const insideDhakaShippingCost = normalizeCodShippingCost(
    payload?.insideDhakaShippingCost,
    payload?.insideDhakaDeliveryCharge ??
      fallbackMethod?.insideDhakaShippingCost ??
      fallbackMethod?.shippingCost ??
      legacyShippingCost,
  );
  const outsideDhakaShippingCost = normalizeCodShippingCost(
    payload?.outsideDhakaShippingCost,
    payload?.outsideDhakaDeliveryCharge ??
      fallbackMethod?.outsideDhakaShippingCost ??
      fallbackMethod?.shippingCost ??
      legacyShippingCost,
  );

  return {
    shippingCost: legacyShippingCost || insideDhakaShippingCost || outsideDhakaShippingCost || 0,
    insideDhakaShippingCost,
    outsideDhakaShippingCost,
  };
};

const ensureAdminAccess = (req, res) => {
  if (isAdminUser(req.user)) return true;
  res.status(403).json({ error: "Admin access required" });
  return false;
};

// Public: active payment methods for checkout
exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await PaymentMethod.find({ isActive: true })
      .sort({ displayOrder: 1, createdAt: -1 })
      .lean();

    const normalized = paymentMethods
      .map((method) => sanitizePaymentMethodForPublic(method))
      .filter(Boolean)
      .sort(
        (a, b) =>
          Number(a?.displayOrder || 0) - Number(b?.displayOrder || 0),
      );

    res.json(normalized);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: all payment methods
exports.getAllPaymentMethods = async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) return;

    const paymentMethods = await PaymentMethod.find().sort({
      displayOrder: 1,
      createdAt: -1,
    });

    res.json(paymentMethods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Admin: create payment method
exports.addPaymentMethod = async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) return;

    const type = safeString(req.body?.type);
    const channelType = normalizeChannelType(req.body?.channelType);
    const accountNo = safeString(req.body?.accountNo);
    const instructions = safeString(req.body?.instructions);
    const displayOrder = toInteger(req.body?.displayOrder, 0);
    const isActive = toBoolean(req.body?.isActive, true);

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    if (channelType === "manual" && !accountNo) {
      return res.status(400).json({
        error: "Account number/details are required for manual methods",
      });
    }

    const gatewayConfig = normalizeGatewayConfig(req.body?.gatewayConfig, channelType);
    validateGatewayConfig({ channelType, gatewayConfig, isActive });
    const codShipping = buildCodShippingConfig(req.body);

    const paymentMethod = new PaymentMethod({
      code: safeString(req.body?.code),
      type,
      channelType,
      accountNo: channelType === "manual" ? accountNo : "",
    instructions,
    requiresTransactionProof:
      channelType === "manual"
        ? toBoolean(req.body?.requiresTransactionProof, true)
        : false,
      shippingCost: channelType === "cod" ? codShipping.shippingCost : 0,
      insideDhakaShippingCost:
        channelType === "cod" ? codShipping.insideDhakaShippingCost : 0,
      outsideDhakaShippingCost:
        channelType === "cod" ? codShipping.outsideDhakaShippingCost : 0,
      gatewayConfig,
      displayOrder,
      isActive,
      createdBy: req.user._id,
    });

    await paymentMethod.save();
    invalidatePublicPaymentMethodCache();
    res.status(201).json(paymentMethod);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        error: "Payment method code already exists. Use a different code/type.",
      });
    }
    res.status(error?.statusCode || 500).json({ error: error.message });
  }
};

// Admin: update payment method
exports.updatePaymentMethod = async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) return;

    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    const channelType = normalizeChannelType(
      req.body?.channelType !== undefined ? req.body.channelType : paymentMethod.channelType,
    );
    const type =
      req.body?.type !== undefined ? safeString(req.body.type) : paymentMethod.type;
    const accountNo =
      req.body?.accountNo !== undefined
        ? safeString(req.body.accountNo)
        : paymentMethod.accountNo;

    if (!type) {
      return res.status(400).json({ error: "Type is required" });
    }

    if (channelType === "manual" && !accountNo) {
      return res.status(400).json({
        error: "Account number/details are required for manual methods",
      });
    }

    const nextGatewayConfig =
      req.body?.gatewayConfig !== undefined
        ? normalizeGatewayConfig(req.body.gatewayConfig, channelType)
        : paymentMethod.gatewayConfig;
    const nextIsActive =
      req.body?.isActive !== undefined
        ? toBoolean(req.body.isActive, paymentMethod.isActive)
        : paymentMethod.isActive;
    validateGatewayConfig({
      channelType,
      gatewayConfig: nextGatewayConfig,
      isActive: nextIsActive,
    });
    const codShipping = buildCodShippingConfig(req.body, paymentMethod);

    paymentMethod.code =
      req.body?.code !== undefined ? safeString(req.body.code) : paymentMethod.code;
    paymentMethod.type = type;
    paymentMethod.channelType = channelType;
    paymentMethod.accountNo = channelType === "manual" ? accountNo : "";
    paymentMethod.instructions =
      req.body?.instructions !== undefined
        ? safeString(req.body.instructions)
        : paymentMethod.instructions;
    paymentMethod.requiresTransactionProof =
      channelType === "manual"
        ? req.body?.requiresTransactionProof !== undefined
          ? toBoolean(req.body.requiresTransactionProof, true)
          : paymentMethod.requiresTransactionProof
        : false;
    paymentMethod.shippingCost =
      channelType === "cod"
        ? codShipping.shippingCost
        : 0;
    paymentMethod.insideDhakaShippingCost =
      channelType === "cod" ? codShipping.insideDhakaShippingCost : 0;
    paymentMethod.outsideDhakaShippingCost =
      channelType === "cod" ? codShipping.outsideDhakaShippingCost : 0;
    paymentMethod.gatewayConfig = nextGatewayConfig;
    paymentMethod.displayOrder =
      req.body?.displayOrder !== undefined
        ? toInteger(req.body.displayOrder, paymentMethod.displayOrder || 0)
        : paymentMethod.displayOrder;
    paymentMethod.isActive = nextIsActive;
    paymentMethod.updatedBy = req.user._id;
    paymentMethod.updatedAt = new Date();

    await paymentMethod.save();
    invalidatePublicPaymentMethodCache();
    res.json(paymentMethod);
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(400).json({
        error: "Payment method code already exists. Use a different code/type.",
      });
    }
    res.status(error?.statusCode || 500).json({ error: error.message });
  }
};

// Admin: delete payment method
exports.deletePaymentMethod = async (req, res) => {
  try {
    if (!ensureAdminAccess(req, res)) return;

    const { id } = req.params;
    const paymentMethod = await PaymentMethod.findById(id);
    if (!paymentMethod) {
      return res.status(404).json({ error: "Payment method not found" });
    }

    await paymentMethod.deleteOne();
    invalidatePublicPaymentMethodCache();
    res.json({ message: "Payment method deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
