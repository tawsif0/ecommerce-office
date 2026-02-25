const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const Category = require("../models/Category");
const User = require("../models/User");
const Order = require("../models/Order");
const ProductSubscription = require("../models/ProductSubscription");
const { roundMoney, toNumber } = require("./couponUtils");
const {
  normalizeCommissionConfig,
  pickCommissionSource,
  calculateCommissionAmount,
} = require("./commissionUtils");

const BILLING_INTERVALS = new Set(["weekly", "monthly", "quarterly", "yearly"]);

const normalizeBillingInterval = (value, fallback = "monthly") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (BILLING_INTERVALS.has(normalized)) return normalized;
  return BILLING_INTERVALS.has(String(fallback || "").trim().toLowerCase())
    ? String(fallback || "").trim().toLowerCase()
    : "monthly";
};

const asPositiveInteger = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return parsed;
};

const addBillingInterval = (date, interval = "monthly", intervalCount = 1) => {
  const count = Math.max(1, asPositiveInteger(intervalCount, 1));
  const next = new Date(date instanceof Date ? date : new Date(date));
  const normalizedInterval = normalizeBillingInterval(interval, "monthly");

  if (normalizedInterval === "weekly") {
    next.setDate(next.getDate() + 7 * count);
    return next;
  }

  if (normalizedInterval === "quarterly") {
    next.setMonth(next.getMonth() + 3 * count);
    return next;
  }

  if (normalizedInterval === "yearly") {
    next.setFullYear(next.getFullYear() + count);
    return next;
  }

  next.setMonth(next.getMonth() + count);
  return next;
};

const buildSubscriptionNumber = () =>
  `SUB-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

const buildRenewalOrderNumber = () =>
  `REN-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

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
    return {
      commissionType: "percentage",
      commissionValue: 10,
      commissionFixed: 0,
    };
  }

  return globalConfig;
};

const calculateRenewalVendorAmounts = ({
  itemTotal,
  productDoc,
  categoryDoc,
  vendorDoc,
  globalCommission,
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

const toSafeShippingAddress = (address = {}, fallbackEmail = "") => ({
  firstName: String(address?.firstName || "Customer").trim() || "Customer",
  lastName: String(address?.lastName || "Subscription").trim() || "Subscription",
  email: String(address?.email || fallbackEmail || "guest@example.com")
    .trim()
    .toLowerCase(),
  phone: String(address?.phone || "01000000000").trim() || "01000000000",
  address: String(address?.address || "N/A").trim() || "N/A",
  city: String(address?.city || "Dhaka").trim() || "Dhaka",
  district: String(address?.district || "Dhaka").trim(),
  postalCode: String(address?.postalCode || "1200").trim() || "1200",
  country: String(address?.country || "Bangladesh").trim() || "Bangladesh",
  notes: String(address?.notes || "").trim(),
});

const createRecurringSubscriptionsFromOrder = async (orderDoc) => {
  if (!orderDoc?.items?.length) {
    return { created: 0, skipped: 0 };
  }

  const productIds = orderDoc.items
    .map((item) => String(item?.product || "").trim())
    .filter((id) => /^[0-9a-fA-F]{24}$/.test(id));

  if (!productIds.length) {
    return { created: 0, skipped: orderDoc.items.length };
  }

  const products = await Product.find({
    _id: { $in: productIds },
    isRecurring: true,
    isActive: true,
  })
    .select(
      "_id vendor priceType recurringInterval recurringIntervalCount recurringTotalCycles recurringTrialDays",
    )
    .lean();

  if (!products.length) {
    return { created: 0, skipped: orderDoc.items.length };
  }

  const productMap = new Map(products.map((entry) => [String(entry._id), entry]));
  const baseOrderDate = new Date(orderDoc.createdAt || Date.now());

  let created = 0;
  let skipped = 0;

  for (const [index, item] of orderDoc.items.entries()) {
    const product = productMap.get(String(item?.product || ""));
    if (!product) {
      skipped += 1;
      continue;
    }

    if (String(product.priceType || "") === "tba") {
      skipped += 1;
      continue;
    }

    const sourceItemKey = `${orderDoc._id}:${item?._id || index}`;
    const exists = await ProductSubscription.findOne({ sourceItemKey })
      .select("_id")
      .lean();

    if (exists) {
      skipped += 1;
      continue;
    }

    const trialDays = Math.max(0, Number(product.recurringTrialDays || 0));
    const startsAt = new Date(baseOrderDate);
    if (trialDays > 0) {
      startsAt.setDate(startsAt.getDate() + trialDays);
    }

    const nextBillingAt = addBillingInterval(
      startsAt,
      product.recurringInterval || "monthly",
      product.recurringIntervalCount || 1,
    );

    const guestEmail = String(orderDoc?.shippingAddress?.email || "").trim().toLowerCase();
    const userId = orderDoc.user || null;
    if (!userId && !guestEmail) {
      skipped += 1;
      continue;
    }

    const vendorId = item.vendor || product.vendor;
    if (!vendorId) {
      skipped += 1;
      continue;
    }

    await ProductSubscription.create({
      subscriptionNumber: buildSubscriptionNumber(),
      sourceItemKey,
      user: userId,
      guestEmail: userId ? "" : guestEmail,
      vendor: vendorId,
      product: product._id,
      sourceOrder: orderDoc._id,
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
      unitPrice: Math.max(0, toNumber(item.price, 0)),
      currency: "BDT",
      billingInterval: normalizeBillingInterval(product.recurringInterval, "monthly"),
      billingIntervalCount: asPositiveInteger(product.recurringIntervalCount, 1),
      totalCycles: Math.max(0, parseInt(product.recurringTotalCycles, 10) || 0),
      completedCycles: 0,
      trialDays,
      startsAt,
      nextBillingAt,
      status: "active",
      paymentMethod: String(orderDoc.paymentMethod || "manual").trim() || "manual",
      shippingAddress: toSafeShippingAddress(orderDoc.shippingAddress, guestEmail),
      createdBy: "order",
      metadata: {
        createdFromOrder: true,
      },
    });

    created += 1;
  }

  return { created, skipped };
};

const processRecurringRenewals = async ({ limit = 100 } = {}) => {
  const maxLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 300);
  const now = new Date();

  const dueSubscriptions = await ProductSubscription.find({
    status: "active",
    nextBillingAt: { $lte: now },
  })
    .sort({ nextBillingAt: 1 })
    .limit(maxLimit);

  if (!dueSubscriptions.length) {
    return { processed: 0, createdOrders: 0, completed: 0, skipped: 0, failed: 0 };
  }

  const globalCommission = await getGlobalCommissionSettings();

  let processed = 0;
  let createdOrders = 0;
  let completed = 0;
  let skipped = 0;
  let failed = 0;

  for (const subscription of dueSubscriptions) {
    processed += 1;

    try {
      if (subscription.totalCycles > 0 && subscription.completedCycles >= subscription.totalCycles) {
        subscription.status = "completed";
        subscription.nextBillingAt = null;
        await subscription.save();
        completed += 1;
        continue;
      }

      const product = await Product.findById(subscription.product)
        .select(
          "title category vendor commissionType commissionValue commissionFixed isActive priceType",
        )
        .lean();

      if (!product || !product.isActive || String(product.priceType || "") === "tba") {
        subscription.renewalHistory.push({
          billedAt: now,
          amount: 0,
          status: "skipped",
          note: "Product is inactive or not billable",
        });
        subscription.nextBillingAt = addBillingInterval(
          now,
          subscription.billingInterval,
          subscription.billingIntervalCount,
        );
        await subscription.save();
        skipped += 1;
        continue;
      }

      const [vendor, category] = await Promise.all([
        Vendor.findById(subscription.vendor)
          .select("commissionType commissionValue commissionFixed")
          .lean(),
        Category.findById(product.category)
          .select("commissionType commissionValue commissionFixed")
          .lean(),
      ]);

      const quantity = Math.max(1, parseInt(subscription.quantity, 10) || 1);
      const unitPrice = Math.max(0, toNumber(subscription.unitPrice, 0));
      const subtotal = roundMoney(unitPrice * quantity);

      const vendorAmounts = calculateRenewalVendorAmounts({
        itemTotal: subtotal,
        productDoc: product,
        categoryDoc: category,
        vendorDoc: vendor,
        globalCommission,
      });

      const shippingAddress = toSafeShippingAddress(
        subscription.shippingAddress,
        subscription.guestEmail,
      );

      const order = await Order.create({
        orderNumber: buildRenewalOrderNumber(),
        user: subscription.user || null,
        items: [
          {
            product: product._id,
            vendor: subscription.vendor || null,
            quantity,
            price: unitPrice,
            variationId: null,
            variationLabel: "",
            sku: "RECURRING",
            color: "",
            dimensions: "",
            vendorCommissionAmount: vendorAmounts.commission,
            vendorCommissionSource: vendorAmounts.source,
            vendorCommissionType: vendorAmounts.commissionType,
            vendorCommissionValue: vendorAmounts.commissionValue,
            vendorCommissionFixed: vendorAmounts.commissionFixed,
            vendorNetAmount: vendorAmounts.net,
          },
        ],
        shippingAddress,
        subtotal,
        shippingFee: 0,
        shippingMeta: {
          recurringRenewal: true,
          subscriptionId: subscription._id,
          subscriptionNumber: subscription.subscriptionNumber,
        },
        discount: 0,
        couponCode: "",
        total: subtotal,
        paymentMethod: String(subscription.paymentMethod || "manual").trim() || "manual",
        paymentDetails: {
          method: String(subscription.paymentMethod || "manual").trim() || "manual",
          transactionId: `AUTO-RENEWAL-${Date.now()}`,
          accountNo: "",
          sentFrom: "",
          sentTo: "",
        },
        paymentStatus: "pending",
        orderStatus: "pending",
      });

      subscription.completedCycles = Number(subscription.completedCycles || 0) + 1;
      subscription.lastBilledAt = now;
      subscription.renewalHistory.push({
        billedAt: now,
        amount: subtotal,
        order: order._id,
        status: "created",
        note: "Renewal order generated",
      });

      if (
        subscription.totalCycles > 0 &&
        subscription.completedCycles >= subscription.totalCycles
      ) {
        subscription.status = "completed";
        subscription.nextBillingAt = null;
        completed += 1;
      } else {
        subscription.nextBillingAt = addBillingInterval(
          subscription.nextBillingAt || now,
          subscription.billingInterval,
          subscription.billingIntervalCount,
        );
      }

      await subscription.save();
      createdOrders += 1;
    } catch (error) {
      subscription.renewalHistory.push({
        billedAt: now,
        amount: 0,
        status: "failed",
        note: String(error?.message || "Failed to create renewal order").slice(0, 500),
      });
      subscription.nextBillingAt = addBillingInterval(
        now,
        subscription.billingInterval,
        subscription.billingIntervalCount,
      );
      await subscription.save().catch(() => null);
      failed += 1;
    }
  }

  return { processed, createdOrders, completed, skipped, failed };
};

module.exports = {
  BILLING_INTERVALS,
  normalizeBillingInterval,
  addBillingInterval,
  createRecurringSubscriptionsFromOrder,
  processRecurringRenewals,
};
