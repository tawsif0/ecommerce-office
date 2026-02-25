const axios = require("axios");

const toBoolean = (value, fallback = false) => {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return fallback;
};

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const safeString = (value) => String(value || "").trim();

const resolveGatewayConfig = (paymentMethod) =>
  paymentMethod?.gatewayConfig && typeof paymentMethod.gatewayConfig === "object"
    ? paymentMethod.gatewayConfig
    : {};

const getFrontendBaseUrl = () =>
  safeString(process.env.FRONTEND_URL) || "http://localhost:5173";

const buildRedirectUrls = (order, paymentMethod) => {
  const config = resolveGatewayConfig(paymentMethod);
  const frontendBase = getFrontendBaseUrl();
  const channelType = safeString(paymentMethod?.channelType || "manual").toLowerCase();

  return {
    successUrl:
      safeString(config.successUrl) ||
      `${frontendBase}/thank-you?orderId=${order._id}&payment=success&provider=${channelType}`,
    cancelUrl:
      safeString(config.cancelUrl) ||
      `${frontendBase}/checkout?orderId=${order._id}&payment=cancel&provider=${channelType}`,
    failUrl:
      safeString(config.failUrl) ||
      `${frontendBase}/checkout?orderId=${order._id}&payment=failed&provider=${channelType}`,
  };
};

const sanitizePaymentMethodForPublic = (method) => {
  if (!method) return null;
  const config = resolveGatewayConfig(method);
  const channelType = safeString(method.channelType || "manual").toLowerCase();
  const publicConfig = {};

  if (channelType === "stripe") {
    publicConfig.publishableKey = safeString(config.publishableKey);
  } else if (channelType === "paypal") {
    publicConfig.clientId = safeString(config.clientId);
    publicConfig.sandbox = toBoolean(config.sandbox, true);
  } else if (channelType === "sslcommerz") {
    publicConfig.storeId = safeString(config.storeId);
    publicConfig.sandbox = toBoolean(config.sandbox, true);
  }

  return {
    _id: method._id,
    code: method.code,
    type: method.type,
    channelType,
    accountNo: method.accountNo || "",
    instructions: method.instructions || "",
    requiresTransactionProof: Boolean(method.requiresTransactionProof),
    displayOrder: Number(method.displayOrder || 0),
    isActive: Boolean(method.isActive),
    createdAt: method.createdAt,
    gatewayConfig: publicConfig,
  };
};

const createStripeSession = async ({ order, paymentMethod, customer }) => {
  const config = resolveGatewayConfig(paymentMethod);
  const secretKey = safeString(config.secretKey);
  if (!secretKey) {
    throw new Error("Stripe secret key is missing");
  }

  const { successUrl, cancelUrl } = buildRedirectUrls(order, paymentMethod);
  const totalAmount = Math.max(0, Math.round(toNumber(order.total, 0) * 100));

  const body = new URLSearchParams();
  body.append("mode", "payment");
  body.append("success_url", successUrl);
  body.append("cancel_url", cancelUrl);
  body.append("payment_method_types[]", "card");
  body.append("line_items[0][price_data][currency]", safeString(config.currency || "bdt"));
  body.append("line_items[0][price_data][product_data][name]", `Order ${order.orderNumber}`);
  body.append("line_items[0][price_data][unit_amount]", String(totalAmount));
  body.append("line_items[0][quantity]", "1");
  body.append("client_reference_id", String(order._id));
  body.append("metadata[orderId]", String(order._id));
  body.append("metadata[orderNumber]", String(order.orderNumber));
  if (customer?.email) {
    body.append("customer_email", String(customer.email).trim().toLowerCase());
  }

  const response = await axios.post("https://api.stripe.com/v1/checkout/sessions", body, {
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 20000,
  });

  const session = response.data || {};
  if (!safeString(session.url)) {
    throw new Error("Stripe did not return a checkout URL");
  }

  return {
    providerType: "stripe",
    gatewayPaymentId: safeString(session.id),
    paymentUrl: safeString(session.url),
    meta: {
      sessionId: safeString(session.id),
      mode: safeString(session.mode),
    },
  };
};

const createPayPalOrder = async ({ order, paymentMethod }) => {
  const config = resolveGatewayConfig(paymentMethod);
  const clientId = safeString(config.clientId);
  const clientSecret = safeString(config.clientSecret);
  if (!clientId || !clientSecret) {
    throw new Error("PayPal client credentials are missing");
  }

  const sandbox = toBoolean(config.sandbox, true);
  const baseUrl = sandbox
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";

  const tokenResponse = await axios.post(
    `${baseUrl}/v1/oauth2/token`,
    new URLSearchParams({ grant_type: "client_credentials" }),
    {
      auth: {
        username: clientId,
        password: clientSecret,
      },
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      timeout: 20000,
    },
  );

  const accessToken = safeString(tokenResponse.data?.access_token);
  if (!accessToken) {
    throw new Error("Failed to get PayPal access token");
  }

  const { successUrl, cancelUrl } = buildRedirectUrls(order, paymentMethod);
  const currencyCode = safeString(config.currency || "USD").toUpperCase();
  const orderPayload = {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: String(order.orderNumber || order._id),
        amount: {
          currency_code: currencyCode,
          value: toNumber(order.total, 0).toFixed(2),
        },
      },
    ],
    application_context: {
      return_url: successUrl,
      cancel_url: cancelUrl,
      user_action: "PAY_NOW",
    },
  };

  const createResponse = await axios.post(`${baseUrl}/v2/checkout/orders`, orderPayload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    timeout: 20000,
  });

  const paypalOrder = createResponse.data || {};
  const approveUrl =
    paypalOrder.links?.find((link) => safeString(link.rel).toLowerCase() === "approve")?.href ||
    "";

  if (!approveUrl) {
    throw new Error("PayPal did not return an approval URL");
  }

  return {
    providerType: "paypal",
    gatewayPaymentId: safeString(paypalOrder.id),
    paymentUrl: safeString(approveUrl),
    meta: {
      paypalOrderId: safeString(paypalOrder.id),
      sandbox,
    },
  };
};

const createSslCommerzSession = async ({ order, paymentMethod, customer }) => {
  const config = resolveGatewayConfig(paymentMethod);
  const storeId = safeString(config.storeId);
  const storePassword = safeString(config.storePassword);
  if (!storeId || !storePassword) {
    throw new Error("SSLCommerz credentials are missing");
  }

  const sandbox = toBoolean(config.sandbox, true);
  const baseUrl = sandbox
    ? "https://sandbox.sslcommerz.com"
    : "https://securepay.sslcommerz.com";

  const { successUrl, cancelUrl, failUrl } = buildRedirectUrls(order, paymentMethod);

  const body = new URLSearchParams({
    store_id: storeId,
    store_passwd: storePassword,
    total_amount: toNumber(order.total, 0).toFixed(2),
    currency: safeString(config.currency || "BDT").toUpperCase(),
    tran_id: String(order.orderNumber || order._id),
    success_url: successUrl,
    fail_url: failUrl,
    cancel_url: cancelUrl,
    ipn_url: safeString(config.ipnUrl),
    shipping_method: "NO",
    product_name: `Order ${order.orderNumber}`,
    product_category: "ecommerce",
    product_profile: "general",
    cus_name: safeString(customer?.name || `${customer?.firstName || ""} ${customer?.lastName || ""}`),
    cus_email: safeString(customer?.email),
    cus_phone: safeString(customer?.phone),
    cus_add1: safeString(customer?.address),
    cus_city: safeString(customer?.city),
    cus_country: safeString(customer?.country || "Bangladesh"),
    cus_postcode: safeString(customer?.postalCode),
    value_a: String(order._id),
    value_b: String(order.orderNumber),
  });

  const response = await axios.post(`${baseUrl}/gwprocess/v4/api.php`, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    timeout: 20000,
  });

  const payload = response.data || {};
  const paymentUrl = safeString(payload.GatewayPageURL || payload.gatewayPageURL);

  if (!paymentUrl) {
    throw new Error("SSLCommerz did not return gateway URL");
  }

  return {
    providerType: "sslcommerz",
    gatewayPaymentId: safeString(payload.sessionkey || payload.session_id || ""),
    paymentUrl,
    meta: {
      sandbox,
      status: safeString(payload.status),
    },
  };
};

const initiateGatewayPayment = async ({ order, paymentMethod, customer }) => {
  const channelType = safeString(paymentMethod?.channelType || "manual").toLowerCase();

  if (channelType === "stripe") {
    return createStripeSession({ order, paymentMethod, customer });
  }
  if (channelType === "paypal") {
    return createPayPalOrder({ order, paymentMethod, customer });
  }
  if (channelType === "sslcommerz") {
    return createSslCommerzSession({ order, paymentMethod, customer });
  }

  return {
    providerType: channelType || "manual",
    gatewayPaymentId: "",
    paymentUrl: "",
    meta: {},
  };
};

module.exports = {
  sanitizePaymentMethodForPublic,
  initiateGatewayPayment,
};
