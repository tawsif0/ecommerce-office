const ADMIN_PERMISSION_KEYS = [
  "manageOrders",
  "manageProducts",
  "manageUsers",
  "manageReports",
  "manageWebsite",
];

export const normalizeMarketplaceMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "single"
    ? "single"
    : "multi";

export const SINGLE_VENDOR_DISABLED_TABS = new Set([
  "vendors-admin",
  "product-approvals",
  "vendor-reports",
  "vendor-reviews",
  "vendor-store",
  "vendor-orders",
  "vendor-dashboard",
  "vendor-shipping",
  "vendor-messages",
  "module-subscriptions",
  "module-staff",
  "module-verifications",
  "module-ads",
  "module-geolocation",
  "module-vendor-payouts",
]);

export const resolveUserRole = (user) => {
  const role = String(user?.userType || "user")
    .trim()
    .toLowerCase();
  if (["admin", "vendor", "staff", "user"].includes(role)) return role;
  return "user";
};

const hasAnyAdminPermissionConfigured = (permissions) =>
  ADMIN_PERMISSION_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(permissions || {}, key),
  );

export const isSuperAdminUser = (user) => {
  const role = resolveUserRole(user);
  if (role !== "admin") return false;
  return user?.adminSettings?.isSuperAdmin === true;
};

export const hasAdminPermission = (user, key) => {
  if (resolveUserRole(user) !== "admin") return false;
  if (!key) return true;

  const permissions =
    user?.adminSettings?.permissions &&
    typeof user.adminSettings.permissions === "object"
      ? user.adminSettings.permissions
      : {};

  if (!hasAnyAdminPermissionConfigured(permissions)) {
    return true;
  }

  return Boolean(permissions[key]);
};

const ADMIN_ALLOWED_TABS = new Set([
  "dashboard",
  "settings",
  "home",
  "add-order",
  "order-list",
  "shipping-zones",
  "payment-methods",
  "coupons",
  "customers",
  "vendors-admin",
  "vendor-reviews",
  "product-approvals",
  "create-category",
  "modify-category",
  "create-product",
  "modify-product",
  "bulk-product-upload",
  "create-banner",
  "modify-banner",
  "module-brands",
  "module-campaign-offers",
  "module-landing-pages",
  "module-ads",
  "module-suppliers",
  "module-purchases",
  "module-accounts",
  "vendor-reports",
  "product-reports",
  "module-business-reports",
  "customer-risk",
  "module-website-setup",
  "module-vendor-payouts",
  "module-admin-users",
  "module-super-admin",
  "module-subscriptions",
  "module-bookings",
  "module-auctions",
  "module-staff",
  "module-verifications",
  "module-support",
  "module-geolocation",
  "module-abandoned",
  "module-voice",
  "vendor-messages",
]);

const VENDOR_ALLOWED_TABS = new Set([
  "dashboard",
  "settings",
  "home",
  "vendor-orders",
  "vendor-store",
  "vendor-shipping",
  "vendor-messages",
  "create-product",
  "modify-product",
  "bulk-product-upload",
  "coupons",
  "module-campaign-offers",
  "module-landing-pages",
  "module-suppliers",
  "module-purchases",
  "module-accounts",
  "module-brands",
  "module-business-reports",
  "module-subscriptions",
  "module-bookings",
  "module-auctions",
  "module-staff",
  "module-verifications",
  "module-ads",
  "module-support",
  "module-geolocation",
  "module-abandoned",
  "module-voice",
]);

const STAFF_ALLOWED_TABS = new Set([
  "dashboard",
  "settings",
  "home",
  "vendor-messages",
  "module-campaign-offers",
  "module-landing-pages",
  "module-suppliers",
  "module-purchases",
  "module-accounts",
  "module-brands",
  "module-business-reports",
  "module-subscriptions",
  "module-bookings",
  "module-auctions",
  "module-staff",
  "module-verifications",
  "module-ads",
  "module-support",
  "module-geolocation",
  "module-abandoned",
  "module-voice",
]);

const USER_ALLOWED_TABS = new Set([
  "dashboard",
  "settings",
  "home",
  "my-orders",
  "wishlist",
  "vendor-messages",
  "module-bookings",
  "module-auctions",
  "module-support",
  "module-voice",
]);

const ADMIN_TAB_PERMISSION_MAP = {
  "add-order": "manageOrders",
  "order-list": "manageOrders",
  "shipping-zones": "manageOrders",
  "payment-methods": "manageOrders",
  "create-product": "manageProducts",
  "modify-product": "manageProducts",
  "bulk-product-upload": "manageProducts",
  "create-category": "manageProducts",
  "modify-category": "manageProducts",
  "module-brands": "manageProducts",
  "product-approvals": "manageProducts",
  "vendors-admin": "manageUsers",
  customers: "manageUsers",
  "vendor-reviews": "manageUsers",
  "module-admin-users": "manageUsers",
  "vendor-reports": "manageReports",
  "product-reports": "manageReports",
  "module-business-reports": "manageReports",
  "customer-risk": "manageReports",
  "module-vendor-payouts": "manageReports",
  "create-banner": "manageWebsite",
  "modify-banner": "manageWebsite",
  "module-campaign-offers": "manageWebsite",
  "module-landing-pages": "manageWebsite",
  "module-ads": "manageWebsite",
  "module-website-setup": "manageWebsite",
};

export const canAccessDashboardTab = ({
  user,
  tab,
  marketplaceMode = "multi",
}) => {
  const role = resolveUserRole(user);
  const normalizedTab = String(tab || "").trim();

  if (!normalizedTab) return false;

  if (
    normalizeMarketplaceMode(marketplaceMode) === "single" &&
    SINGLE_VENDOR_DISABLED_TABS.has(normalizedTab)
  ) {
    return false;
  }

  if (role === "admin") {
    if (!ADMIN_ALLOWED_TABS.has(normalizedTab)) return false;

    if (normalizedTab === "module-super-admin") {
      return isSuperAdminUser(user);
    }

    const requiredPermission = ADMIN_TAB_PERMISSION_MAP[normalizedTab];
    if (!requiredPermission) return true;

    return hasAdminPermission(user, requiredPermission);
  }

  if (role === "vendor") {
    return VENDOR_ALLOWED_TABS.has(normalizedTab);
  }

  if (role === "staff") {
    return STAFF_ALLOWED_TABS.has(normalizedTab);
  }

  return USER_ALLOWED_TABS.has(normalizedTab);
};
