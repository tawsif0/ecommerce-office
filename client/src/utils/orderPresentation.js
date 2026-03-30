const isCashOnDeliveryValue = (value) =>
  /\bcod\b|cash[\s_-]*on[\s_-]*delivery/i.test(String(value || "").trim());

const toWholeNumber = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const readDeliveryWindow = (source = {}) => {
  const estimatedMinDays = toWholeNumber(
    source?.estimatedMinDays ?? source?.deliveryMinDays,
  );
  const estimatedMaxDays = Math.max(
    estimatedMinDays,
    toWholeNumber(source?.estimatedMaxDays ?? source?.deliveryMaxDays),
  );

  return {
    estimatedMinDays,
    estimatedMaxDays,
    hasEstimate: estimatedMaxDays > 0,
  };
};

const getItemDeliveryWindow = (items = []) => {
  let estimatedMinDays = 0;
  let estimatedMaxDays = 0;

  items.forEach((item) => {
    const product =
      item?.product && typeof item.product === "object" ? item.product : {};
    const deliveryWindow = readDeliveryWindow(product);

    if (!deliveryWindow.hasEstimate) return;

    estimatedMinDays = Math.max(
      estimatedMinDays,
      deliveryWindow.estimatedMinDays,
    );
    estimatedMaxDays = Math.max(
      estimatedMaxDays,
      deliveryWindow.estimatedMaxDays,
    );
  });

  return {
    estimatedMinDays,
    estimatedMaxDays,
    hasEstimate: estimatedMaxDays > 0,
  };
};

const addBusinessDays = (dateValue, businessDays) => {
  const startDate = new Date(dateValue);
  if (Number.isNaN(startDate.getTime())) return null;

  const result = new Date(startDate);
  let remainingDays = Math.max(0, toWholeNumber(businessDays));

  while (remainingDays > 0) {
    result.setDate(result.getDate() + 1);
    const weekday = result.getDay();
    if (weekday !== 0 && weekday !== 6) {
      remainingDays -= 1;
    }
  }

  return result;
};

export const formatPaymentMethodLabel = (value) => {
  const raw = String(value || "").trim();
  const normalized = raw.toLowerCase().replace(/[_-]+/g, " ");
  if (normalized === "cod" || normalized === "cash on delivery") {
    return "Cash on Delivery";
  }
  return raw.replace(/_/g, " ");
};

export const formatPaymentStatusLabel = (value) => {
  const normalized = String(value || "pending").trim().toLowerCase() || "pending";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

export const isCashOnDeliveryOrder = (order = {}) => {
  const paymentCategory = String(order?.paymentDetails?.paymentCategory || "")
    .trim()
    .toLowerCase();
  const providerType = String(order?.paymentDetails?.providerType || "")
    .trim()
    .toLowerCase();
  const paymentLookup = `${order?.paymentMethod || ""} ${order?.paymentDetails?.method || ""}`;

  return (
    paymentCategory === "cash_on_delivery" ||
    providerType === "cod" ||
    isCashOnDeliveryValue(paymentLookup)
  );
};

export const shouldShowPaymentStatus = (order = {}) => !isCashOnDeliveryOrder(order);

export const getOrderEstimatedDeliveryMeta = (order = {}) => {
  const shippingWindow = readDeliveryWindow(
    order?.shippingMeta && typeof order.shippingMeta === "object"
      ? order.shippingMeta
      : {},
  );

  if (shippingWindow.hasEstimate) {
    return shippingWindow;
  }

  return getItemDeliveryWindow(Array.isArray(order?.items) ? order.items : []);
};

export const formatOrderEstimatedDeliveryLabel = (order = {}) => {
  const { hasEstimate, estimatedMinDays, estimatedMaxDays } =
    getOrderEstimatedDeliveryMeta(order);

  if (!hasEstimate) {
    return "To be confirmed";
  }

  if (estimatedMinDays > 0 && estimatedMinDays < estimatedMaxDays) {
    return `${estimatedMinDays}-${estimatedMaxDays} business days`;
  }

  return `${estimatedMaxDays || estimatedMinDays} business days`;
};

export const formatOrderEstimatedDeliveryDate = (
  order = {},
  locale = "en-US",
) => {
  const { hasEstimate, estimatedMinDays, estimatedMaxDays } =
    getOrderEstimatedDeliveryMeta(order);

  if (!hasEstimate || !order?.createdAt) {
    return "To be confirmed";
  }

  const estimatedDate = addBusinessDays(
    order.createdAt,
    estimatedMaxDays || estimatedMinDays,
  );

  if (!estimatedDate) {
    return "To be confirmed";
  }

  return estimatedDate.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
  });
};

export const getOrderCustomerProfile = (order = {}) => {
  const customer =
    order?.customer && typeof order.customer === "object" ? order.customer : {};
  const shipping =
    order?.shippingAddress && typeof order.shippingAddress === "object"
      ? order.shippingAddress
      : {};

  const fallbackName =
    String(order?.customerName || "").trim() ||
    `${String(shipping?.firstName || "").trim()} ${String(
      shipping?.lastName || "",
    ).trim()}`.trim();

  return {
    name: String(customer?.name || fallbackName || "Customer").trim(),
    email: String(customer?.email || shipping?.email || "").trim(),
    phone: String(customer?.phone || shipping?.phone || "").trim(),
    accountType: String(
      customer?.accountType || (order?.user ? "Registered" : "Guest"),
    ).trim(),
  };
};
