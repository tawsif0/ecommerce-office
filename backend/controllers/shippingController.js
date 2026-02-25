const ShippingZone = require("../models/ShippingZone");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const { isAdmin } = require("../utils/vendorUtils");

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeText = (value) => String(value || "").trim().toLowerCase();

const parseRulesInput = (rulesInput) => {
  let rules = rulesInput;
  if (typeof rules === "string") {
    try {
      rules = JSON.parse(rules);
    } catch {
      rules = [];
    }
  }

  if (!Array.isArray(rules)) return [];

  return rules
    .map((rule) => {
      const shippingFee = toNumber(rule?.shippingFee, NaN);
      if (!Number.isFinite(shippingFee) || shippingFee < 0) return null;

      const estimatedMinDays = Math.max(0, parseInt(rule?.estimatedMinDays, 10) || 0);
      const estimatedMaxDays = Math.max(
        estimatedMinDays,
        parseInt(rule?.estimatedMaxDays, 10) || estimatedMinDays,
      );

      const maxSubtotalRaw = rule?.maxSubtotal;
      const parsedMaxSubtotal =
        maxSubtotalRaw === null || maxSubtotalRaw === "" || maxSubtotalRaw === undefined
          ? null
          : Math.max(0, toNumber(maxSubtotalRaw, 0));

      return {
        label: String(rule?.label || "").trim(),
        country: String(rule?.country || "Bangladesh").trim(),
        district: String(rule?.district || "").trim(),
        city: String(rule?.city || "").trim(),
        minSubtotal: Math.max(0, toNumber(rule?.minSubtotal, 0)),
        maxSubtotal: parsedMaxSubtotal,
        shippingFee: Math.max(0, shippingFee),
        estimatedMinDays,
        estimatedMaxDays,
        isActive: rule?.isActive !== false,
      };
    })
    .filter(Boolean);
};

const getVendorForRequester = async (req) =>
  Vendor.findOne({ user: req.user.id || req.user._id })
    .select("_id storeName status")
    .lean();

const ensureAdmin = (req, res) => {
  if (!isAdmin(req.user)) {
    res.status(403).json({
      success: false,
      message: "Admin access required",
    });
    return false;
  }
  return true;
};

const ensureVendor = async (req, res) => {
  const vendor = await getVendorForRequester(req);
  if (!vendor) {
    res.status(404).json({
      success: false,
      message: "Vendor profile not found",
    });
    return null;
  }
  return vendor;
};

const getCandidateScore = (rule) => {
  let score = 0;
  if (normalizeText(rule?.city)) score += 4;
  if (normalizeText(rule?.district)) score += 2;
  if (normalizeText(rule?.country)) score += 1;
  return score;
};

const isRuleMatched = (rule, context) => {
  if (rule?.isActive === false) return false;

  const countryRule = normalizeText(rule?.country);
  const districtRule = normalizeText(rule?.district);
  const cityRule = normalizeText(rule?.city);

  const countryInput = normalizeText(context?.country || "Bangladesh");
  const districtInput = normalizeText(context?.district);
  const cityInput = normalizeText(context?.city);

  if (countryRule && countryRule !== countryInput) return false;
  if (districtRule && districtRule !== districtInput) return false;
  if (cityRule && cityRule !== cityInput) return false;

  const subtotal = Math.max(0, toNumber(context?.subtotal, 0));
  const minSubtotal = Math.max(0, toNumber(rule?.minSubtotal, 0));
  const maxSubtotal =
    rule?.maxSubtotal === null || rule?.maxSubtotal === undefined
      ? null
      : Math.max(0, toNumber(rule?.maxSubtotal, 0));

  if (subtotal < minSubtotal) return false;
  if (maxSubtotal !== null && subtotal > maxSubtotal) return false;

  return true;
};

const pickBestCandidate = (zones, context) => {
  const candidates = [];

  for (const zone of zones) {
    const rules = Array.isArray(zone.rules) ? zone.rules : [];
    for (const rule of rules) {
      if (!isRuleMatched(rule, context)) continue;

      candidates.push({
        zoneId: zone._id,
        zoneName: zone.name,
        zonePriority: toNumber(zone.priority, 100),
        ruleLabel: rule.label || "",
        shippingFee: Math.max(0, toNumber(rule.shippingFee, 0)),
        estimatedMinDays: Math.max(0, parseInt(rule.estimatedMinDays, 10) || 0),
        estimatedMaxDays: Math.max(
          Math.max(0, parseInt(rule.estimatedMinDays, 10) || 0),
          parseInt(rule.estimatedMaxDays, 10) || 0,
        ),
        score: getCandidateScore(rule),
      });
    }
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    if (a.zonePriority !== b.zonePriority) return a.zonePriority - b.zonePriority;
    if (a.score !== b.score) return b.score - a.score;
    if (a.shippingFee !== b.shippingFee) return a.shippingFee - b.shippingFee;
    return a.estimatedMaxDays - b.estimatedMaxDays;
  });

  return candidates[0];
};

const extractProductIdFromItem = (item) =>
  item?.productId || item?.product?._id || item?.product || null;

const extractVendorIdFromItem = (item) =>
  item?.vendor || item?.product?.vendor || null;

const normalizeEstimateItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => {
      const productId = extractProductIdFromItem(item);
      if (!productId) return null;

      const quantity = Math.max(1, parseInt(item?.quantity, 10) || 1);
      const unitPrice = Math.max(
        0,
        toNumber(item?.price ?? item?.product?.price ?? 0, 0),
      );

      return {
        productId: String(productId),
        quantity,
        unitPrice,
        vendor: extractVendorIdFromItem(item) ? String(extractVendorIdFromItem(item)) : "",
      };
    })
    .filter(Boolean);

const resolveVendorsForItems = async (items) => {
  const unresolvedProductIds = items
    .filter((item) => !item.vendor)
    .map((item) => item.productId);

  if (!unresolvedProductIds.length) return items;

  const products = await Product.find({
    _id: { $in: unresolvedProductIds },
  })
    .select("_id vendor")
    .lean();

  const productVendorMap = new Map(
    products.map((product) => [String(product._id), String(product.vendor || "")]),
  );

  return items.map((item) => ({
    ...item,
    vendor: item.vendor || productVendorMap.get(item.productId) || "",
  }));
};

const computeShippingEstimate = async ({ items, city, district, country }) => {
  const normalizedItems = normalizeEstimateItems(items);
  if (!normalizedItems.length) {
    return {
      success: false,
      status: 400,
      message: "Cart items are required for shipping estimate",
    };
  }

  const itemsWithVendors = await resolveVendorsForItems(normalizedItems);

  const groupMap = new Map();
  for (const item of itemsWithVendors) {
    const vendorKey = item.vendor || "global";
    const existing = groupMap.get(vendorKey) || {
      vendorId: vendorKey === "global" ? null : vendorKey,
      subtotal: 0,
      itemCount: 0,
    };
    existing.subtotal += item.unitPrice * item.quantity;
    existing.itemCount += item.quantity;
    groupMap.set(vendorKey, existing);
  }

  const vendorIds = Array.from(groupMap.values())
    .map((group) => group.vendorId)
    .filter(Boolean);

  let vendorNameMap = new Map();
  if (vendorIds.length > 0) {
    const vendors = await Vendor.find({ _id: { $in: vendorIds } })
      .select("_id storeName")
      .lean();
    vendorNameMap = new Map(
      vendors.map((vendor) => [String(vendor._id), vendor.storeName || "Vendor"]),
    );
  }

  const globalZones = await ShippingZone.find({
    scope: "global",
    isActive: true,
  })
    .sort({ priority: 1, createdAt: 1 })
    .lean();

  const breakdown = [];

  for (const group of groupMap.values()) {
    let candidate = null;
    if (group.vendorId) {
      const vendorZones = await ShippingZone.find({
        scope: "vendor",
        vendor: group.vendorId,
        isActive: true,
      })
        .sort({ priority: 1, createdAt: 1 })
        .lean();

      if (vendorZones.length) {
        candidate = pickBestCandidate(vendorZones, {
          city,
          district,
          country,
          subtotal: group.subtotal,
        });
      }
    }

    if (!candidate) {
      candidate = pickBestCandidate(globalZones, {
        city,
        district,
        country,
        subtotal: group.subtotal,
      });
    }

    if (candidate) {
      breakdown.push({
        vendor: group.vendorId,
        vendorName: group.vendorId ? vendorNameMap.get(String(group.vendorId)) || "Vendor" : "Global",
        zoneId: candidate.zoneId,
        zoneName: candidate.zoneName,
        ruleLabel: candidate.ruleLabel,
        itemCount: group.itemCount,
        subtotal: Math.round((group.subtotal + Number.EPSILON) * 100) / 100,
        shippingFee: candidate.shippingFee,
        estimatedMinDays: candidate.estimatedMinDays,
        estimatedMaxDays: candidate.estimatedMaxDays,
      });
      continue;
    }

    breakdown.push({
      vendor: group.vendorId,
      vendorName: group.vendorId ? vendorNameMap.get(String(group.vendorId)) || "Vendor" : "Global",
      zoneId: null,
      zoneName: "Default",
      ruleLabel: "Default shipping",
      itemCount: group.itemCount,
      subtotal: Math.round((group.subtotal + Number.EPSILON) * 100) / 100,
      shippingFee: 0,
      estimatedMinDays: 3,
      estimatedMaxDays: 7,
    });
  }

  const shippingFee = breakdown.reduce(
    (sum, row) => sum + Math.max(0, toNumber(row.shippingFee, 0)),
    0,
  );

  const estimatedMinDays = breakdown.reduce(
    (max, row) => Math.max(max, toNumber(row.estimatedMinDays, 0)),
    0,
  );
  const estimatedMaxDays = breakdown.reduce(
    (max, row) => Math.max(max, toNumber(row.estimatedMaxDays, 0)),
    0,
  );

  return {
    success: true,
    shippingFee: Math.round((shippingFee + Number.EPSILON) * 100) / 100,
    estimatedMinDays,
    estimatedMaxDays,
    breakdown,
    destination: {
      city: String(city || "").trim(),
      district: String(district || "").trim(),
      country: String(country || "Bangladesh").trim(),
    },
  };
};

exports.estimateShipping = async (req, res) => {
  try {
    const { items = [], city = "", district = "", country = "Bangladesh" } = req.body || {};

    const estimate = await computeShippingEstimate({
      items,
      city,
      district,
      country,
    });

    if (!estimate.success) {
      return res.status(estimate.status).json({
        success: false,
        message: estimate.message,
      });
    }

    res.json({
      success: true,
      ...estimate,
    });
  } catch (error) {
    console.error("Estimate shipping error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while estimating shipping",
    });
  }
};

exports.getAdminShippingZones = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const zones = await ShippingZone.find({ scope: "global" })
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      zones,
    });
  } catch (error) {
    console.error("Get admin shipping zones error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching shipping zones",
    });
  }
};

exports.createAdminShippingZone = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const rules = parseRulesInput(req.body?.rules);
    if (!rules.length) {
      return res.status(400).json({
        success: false,
        message: "At least one active shipping rule is required",
      });
    }

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Zone name is required",
      });
    }

    const zone = await ShippingZone.create({
      name,
      scope: "global",
      vendor: null,
      priority: Math.max(0, parseInt(req.body?.priority, 10) || 100),
      isActive: req.body?.isActive !== false,
      rules,
      createdBy: req.user.id || req.user._id,
      updatedBy: req.user.id || req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Shipping zone created successfully",
      zone,
    });
  } catch (error) {
    console.error("Create admin shipping zone error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating shipping zone",
    });
  }
};

exports.updateAdminShippingZone = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const zone = await ShippingZone.findOne({
      _id: req.params.id,
      scope: "global",
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    if (req.body?.name !== undefined) {
      zone.name = String(req.body.name || "").trim();
    }
    if (req.body?.priority !== undefined) {
      zone.priority = Math.max(0, parseInt(req.body.priority, 10) || 0);
    }
    if (req.body?.isActive !== undefined) {
      zone.isActive = Boolean(req.body.isActive);
    }
    if (req.body?.rules !== undefined) {
      const rules = parseRulesInput(req.body.rules);
      if (!rules.length) {
        return res.status(400).json({
          success: false,
          message: "At least one active shipping rule is required",
        });
      }
      zone.rules = rules;
    }

    zone.updatedBy = req.user.id || req.user._id;
    await zone.save();

    res.json({
      success: true,
      message: "Shipping zone updated successfully",
      zone,
    });
  } catch (error) {
    console.error("Update admin shipping zone error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating shipping zone",
    });
  }
};

exports.deleteAdminShippingZone = async (req, res) => {
  try {
    if (!ensureAdmin(req, res)) return;

    const deleted = await ShippingZone.findOneAndDelete({
      _id: req.params.id,
      scope: "global",
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    res.json({
      success: true,
      message: "Shipping zone deleted successfully",
    });
  } catch (error) {
    console.error("Delete admin shipping zone error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting shipping zone",
    });
  }
};

exports.getMyShippingZones = async (req, res) => {
  try {
    const vendor = await ensureVendor(req, res);
    if (!vendor) return;

    const zones = await ShippingZone.find({
      scope: "vendor",
      vendor: vendor._id,
    })
      .sort({ priority: 1, createdAt: -1 })
      .lean();

    res.json({
      success: true,
      zones,
    });
  } catch (error) {
    console.error("Get my shipping zones error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching shipping zones",
    });
  }
};

exports.createMyShippingZone = async (req, res) => {
  try {
    const vendor = await ensureVendor(req, res);
    if (!vendor) return;

    const rules = parseRulesInput(req.body?.rules);
    if (!rules.length) {
      return res.status(400).json({
        success: false,
        message: "At least one active shipping rule is required",
      });
    }

    const name = String(req.body?.name || "").trim();
    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Zone name is required",
      });
    }

    const zone = await ShippingZone.create({
      name,
      scope: "vendor",
      vendor: vendor._id,
      priority: Math.max(0, parseInt(req.body?.priority, 10) || 100),
      isActive: req.body?.isActive !== false,
      rules,
      createdBy: req.user.id || req.user._id,
      updatedBy: req.user.id || req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Shipping zone created successfully",
      zone,
    });
  } catch (error) {
    console.error("Create my shipping zone error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating shipping zone",
    });
  }
};

exports.updateMyShippingZone = async (req, res) => {
  try {
    const vendor = await ensureVendor(req, res);
    if (!vendor) return;

    const zone = await ShippingZone.findOne({
      _id: req.params.id,
      scope: "vendor",
      vendor: vendor._id,
    });

    if (!zone) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    if (req.body?.name !== undefined) {
      zone.name = String(req.body.name || "").trim();
    }
    if (req.body?.priority !== undefined) {
      zone.priority = Math.max(0, parseInt(req.body.priority, 10) || 0);
    }
    if (req.body?.isActive !== undefined) {
      zone.isActive = Boolean(req.body.isActive);
    }
    if (req.body?.rules !== undefined) {
      const rules = parseRulesInput(req.body.rules);
      if (!rules.length) {
        return res.status(400).json({
          success: false,
          message: "At least one active shipping rule is required",
        });
      }
      zone.rules = rules;
    }

    zone.updatedBy = req.user.id || req.user._id;
    await zone.save();

    res.json({
      success: true,
      message: "Shipping zone updated successfully",
      zone,
    });
  } catch (error) {
    console.error("Update my shipping zone error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating shipping zone",
    });
  }
};

exports.deleteMyShippingZone = async (req, res) => {
  try {
    const vendor = await ensureVendor(req, res);
    if (!vendor) return;

    const deleted = await ShippingZone.findOneAndDelete({
      _id: req.params.id,
      scope: "vendor",
      vendor: vendor._id,
    });

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Shipping zone not found",
      });
    }

    res.json({
      success: true,
      message: "Shipping zone deleted successfully",
    });
  } catch (error) {
    console.error("Delete my shipping zone error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting shipping zone",
    });
  }
};
