const User = require("../models/User");

const CACHE_TTL_MS = 15 * 1000;

let cachedMode = "multi";
let cacheExpiresAt = 0;

const normalizeMarketplaceMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "single"
    ? "single"
    : "multi";

const readMarketplaceMode = async ({ force = false } = {}) => {
  if (!force && Date.now() < cacheExpiresAt) {
    return cachedMode;
  }

  const primaryAdmin = await User.findOne({ userType: "admin" })
    .sort({ createdAt: 1, _id: 1 })
    .select("adminSettings")
    .lean();

  const settings = primaryAdmin?.adminSettings || {};
  const marketplace = settings?.marketplace || {};
  cachedMode = normalizeMarketplaceMode(
    marketplace.marketplaceMode || settings.marketplaceMode || "multi",
  );
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
  return cachedMode;
};

const ensureMultiVendorMode = async (req, res, next) => {
  try {
    const mode = await readMarketplaceMode();
    req.marketplaceMode = mode;

    if (mode !== "multi") {
      return res.status(403).json({
        success: false,
        message: "This module is disabled in single-vendor mode",
      });
    }

    return next();
  } catch (error) {
    console.error("Marketplace mode guard error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while verifying marketplace mode",
    });
  }
};

module.exports = {
  ensureMultiVendorMode,
  readMarketplaceMode,
};
