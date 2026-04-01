const TAB_META = {
  settings: {
    section: "Account",
    title: "Settings",
    description: "Manage your profile, password, and account preferences.",
  },
  "payment-methods": {
    section: "Commerce",
    title: "Payment Methods",
    description: "Configure the payment options customers can use at checkout.",
  },
  notifications: {
    section: "Updates",
    title: "Notifications",
    description: "Review live order, payment, review, and contact updates from one place.",
  },
  "vendors-admin": {
    section: "Marketplace",
    title: "Vendor Management",
    description: "Review seller accounts, performance, and marketplace access.",
  },
  "create-category": {
    section: "Catalog & Inventory",
    title: "Create Category",
    description: "Add a new catalog category and organize the storefront structure.",
  },
  "modify-category": {
    section: "Catalog & Inventory",
    title: "Modify Categories",
    description: "Update category names, hierarchy, and storefront visibility.",
  },
  "create-banner": {
    section: "Brand & Storefront",
    title: "Create Slider Banner",
    description: "Publish new hero slides and storefront promotion banners.",
  },
  "modify-banner": {
    section: "Brand & Storefront",
    title: "Manage Slider Banners",
    description: "Edit existing hero slides and storefront promotion banners.",
  },
  "create-product": {
    section: "Catalog & Inventory",
    title: "Create Product",
    description: "Add a new product with pricing, stock, media, and marketplace details.",
  },
  "modify-product": {
    section: "Catalog & Inventory",
    title: "Manage Products",
    description: "Update product listings, pricing modes, stock, and approval status.",
  },
  "product-approvals": {
    section: "Catalog & Inventory",
    title: "Product Approvals",
    description: "Approve or reject submitted products before they go live.",
  },
  "order-list": {
    section: "Commerce",
    title: "Order List",
    description: "Monitor order flow, update statuses, and review payment details.",
  },
  "add-order": {
    section: "Commerce",
    title: "Add Order",
    description: "Create manual orders directly from the dashboard workspace.",
    hideShellHeader: true,
  },
  "vendor-store": {
    section: "Storefront",
    title: "Store Profile",
    description: "Manage vendor branding, policies, and storefront presentation.",
  },
  "vendor-orders": {
    section: "Commerce",
    title: "Vendor Orders",
    description: "Track orders that include your vendor catalog products.",
  },
  coupons: {
    section: "Commerce",
    title: "Coupons",
    description: "Create discount codes and control promotional redemptions.",
  },
  "shipping-zones": {
    section: "Commerce",
    title: "Shipping Zones",
    description: "Define delivery regions, rates, and shipping rules.",
  },
  "vendor-shipping": {
    section: "Commerce",
    title: "Vendor Shipping",
    description: "Maintain vendor shipping rates and delivery coverage.",
  },
  "vendor-messages": {
    section: "Support",
    title: "Messages",
    description: "Review customer and seller conversations from one inbox.",
  },
  "vendor-reports": {
    section: "Reports & Insights",
    title: "Vendor Reports",
    description: "Analyze seller performance, sales, and marketplace health.",
  },
  "product-reports": {
    section: "Reports & Insights",
    title: "Product Reports",
    description: "Review catalog sales, conversion, and product-level performance.",
  },
  "vendor-reviews": {
    section: "Marketplace",
    title: "Review Moderation",
    description: "Moderate marketplace reviews and quality feedback.",
  },
  "product-reviews": {
    section: "Catalog & Inventory",
    title: "Product Reviews",
    description: "Approve, reject, and monitor product review submissions before they go live.",
  },
  "customer-risk": {
    section: "Reports & Insights",
    title: "Customer Risk",
    description: "Inspect high-risk customers and suspicious order behavior.",
  },
  customers: {
    section: "Commerce",
    title: "Customers",
    description: "Review customer profiles, activity, and order relationships.",
  },
  "my-orders": {
    section: "Orders & Lists",
    title: "My Orders",
    description: "Track your orders, statuses, payments, and delivery progress.",
  },
  wishlist: {
    section: "Orders & Lists",
    title: "My Wishlist",
    description: "Keep saved products ready for later purchase decisions.",
  },
  "my-addresses": {
    section: "Orders & Lists",
    title: "Saved Addresses",
    description: "Manage delivery locations for faster checkout.",
  },
  "module-subscriptions": {
    section: "Advanced Modules",
    title: "Subscriptions",
    description: "Manage seller or service subscription plans and limits.",
  },
  "module-bookings": {
    section: "Advanced Modules",
    title: "Bookings",
    description: "Coordinate booking availability, reservations, and customer activity.",
  },
  "module-staff": {
    section: "Advanced Modules",
    title: "Staff Roles",
    description: "Control internal access, assignments, and staff permissions.",
  },
  "module-verifications": {
    section: "Advanced Modules",
    title: "Verification",
    description: "Review KYC and seller verification requests from one queue.",
  },
  "module-ads": {
    section: "Growth & Marketing",
    title: "Ad Campaigns",
    description: "Launch and measure paid promotional placements in the marketplace.",
  },
  "module-support": {
    section: "Support",
    title: "Support Tickets",
    description: "Manage support requests, replies, and ticket status updates.",
  },
  "module-geolocation": {
    section: "Advanced Modules",
    title: "Geolocation",
    description: "Work with map, location, and service-area features.",
  },
  "module-abandoned": {
    section: "Advanced Modules",
    title: "Abandoned Orders",
    description: "Review recovery opportunities for incomplete checkouts and orders.",
  },
  "module-suppliers": {
    section: "Operations",
    title: "Suppliers",
    description: "Manage supplier records, sourcing, and procurement relationships.",
  },
  "module-inventory": {
    section: "Catalog & Inventory",
    title: "Inventory Center",
    description: "Control stock levels, low-stock alerts, and public stock visibility.",
  },
  "module-accounts": {
    section: "Operations",
    title: "Accounts",
    description: "Track business accounts, ledger movement, and financial records.",
  },
  "module-brands": {
    section: "Catalog & Inventory",
    title: "Brands",
    description: "Create and maintain brand entities used across the catalog.",
  },
  "module-vendor-payouts": {
    section: "Marketplace",
    title: "Vendor Payouts",
    description: "Review and process seller earnings and payout schedules.",
  },
  "module-campaign-offers": {
    section: "Growth & Marketing",
    title: "Campaign Center",
    description: "Configure offers, campaigns, and promotional merchandising rules.",
  },
  "module-admin-users": {
    section: "Administration",
    title: "Admin Users",
    description: "Create and manage admin accounts from the super-admin console.",
  },
  "module-super-admin": {
    section: "Administration",
    title: "Super Admin Control",
    description: "Control system-wide marketplace mode and super-admin settings.",
  },
  "module-business-reports": {
    section: "Reports & Insights",
    title: "Business Reports",
    description: "Review revenue, operations, and commerce performance metrics.",
  },
  "contacted-list": {
    section: "Support",
    title: "Contacted Users",
    description: "Review public contact submissions, follow-up status, and saved admin notes.",
  },
  "module-website-setup": {
    section: "Brand & Storefront",
    title: "Website Setup & Config",
    description: "Control branding, integrations, policies, and storefront behavior.",
  },
};

const toStartCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

export const getDashboardTabMeta = (tab, user) => {
  const normalizedTab = String(tab || "dashboard").trim();
  if (!normalizedTab || normalizedTab === "dashboard" || normalizedTab === "home") {
    const role = String(user?.userType || "user").toLowerCase();
    if (role === "admin") {
      return {
        section: "Overview",
        title: isSuperAdminUser(user) ? "Super Admin Dashboard" : "Admin Dashboard",
        description: "See a complete operational view of orders, catalog, inventory, and marketplace activity.",
      };
    }

    if (role === "vendor") {
      return {
        section: "Overview",
        title: "Vendor Dashboard",
        description: "Track store performance, orders, products, and seller-side operations from one place.",
      };
    }

    if (role === "staff") {
      return {
        section: "Overview",
        title: "Staff Dashboard",
        description: "Handle assigned operations, support, and commerce workflows from one workspace.",
      };
    }

    return {
      section: "Overview",
      title: "Customer Dashboard",
      description: "Manage your orders, wishlist, addresses, and account activity from one dashboard.",
    };
  }

  return (
    TAB_META[normalizedTab] || {
      section: "Workspace",
      title: toStartCase(normalizedTab),
      description: "Manage this dashboard module from the same organized workspace.",
    }
  );
};
import { isSuperAdminUser } from "./dashboardAccess";
