import {
  canAccessDashboardTab,
  normalizeMarketplaceMode,
  resolveUserRole,
} from "./dashboardAccess";

export const normalizeCommandText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const hasAnyKeyword = (text, keywords) =>
  Array.isArray(keywords) &&
  keywords.some((keyword) => text.includes(String(keyword || "").toLowerCase()));

const KEYWORDS = {
  stopListening: ["stop listening", "stop voice", "বন্ধ কর", "শুনা বন্ধ", "চুপ", "থামো"],
  home: ["home", "homepage", "landing", "হোম", "হোম পেজ", "বাড়ি", "বাড়ি পেজ"],
  shop: ["shop", "store", "products", "শপ", "দোকান", "প্রোডাক্ট", "পণ্য"],
  cart: ["cart", "bag", "basket", "কার্ট", "ব্যাগ"],
  checkout: ["checkout", "place order", "চেকআউট", "অর্ডার দাও", "অর্ডার করুন"],
  login: ["login", "sign in", "লগইন", "সাইন ইন"],
  register: ["register", "sign up", "create account", "রেজিস্টার", "সাইন আপ"],
  contact: ["contact", "contact us", "যোগাযোগ", "যোগাযোগ করুন"],
  about: ["about", "about us", "আমাদের সম্পর্কে", "এবাউট"],
  faq: ["faq", "faqs", "questions", "জিজ্ঞাসা", "প্রশ্ন"],
  dashboard: ["dashboard", "dash", "overview", "ড্যাশবোর্ড", "ড্যাশ"],
  support: ["support", "ticket", "help", "সহায়তা", "টিকিট", "হেল্প"],
  landingPages: ["landing page", "campaign page", "lp", "ল্যান্ডিং পেজ", "ক্যাম্পেইন"],
  suppliers: ["suppliers", "supplier", "সরবরাহকারী", "সাপ্লায়ার"],
  purchases: ["purchases", "purchase", "ক্রয়", "পারচেজ"],
  brands: ["brands", "brand", "ব্র্যান্ড"],
  reports: ["reports", "report", "analytics", "রিপোর্ট", "এনালিটিক্স"],
  accounts: ["accounts", "accounting", "ledger", "হিসাব", "অ্যাকাউন্ট"],
  payouts: ["payouts", "payout", "vendor payout", "পেআউট", "ভেন্ডর পেমেন্ট"],
  productPage: [
    "product page",
    "create product page",
    "product form",
    "create product form",
    "প্রোডাক্ট পেজ",
    "পণ্যের পেজ",
    "প্রোডাক্ট ফর্ম",
  ],
  products: ["products", "product", "catalog", "পণ্য", "প্রোডাক্ট", "ক্যাটালগ"],
  create: ["create", "add", "new", "তৈরি", "যোগ", "নতুন"],
  orders: ["orders", "order", "আমার অর্ডার", "অর্ডার"],
  customerRisk: ["customer risk", "high risk", "risky", "ঝুঁকি", "রিস্ক"],
  wishlist: ["wishlist", "favorite", "favourite", "ইচ্ছা তালিকা", "পছন্দ"],
  logout: ["logout", "sign out", "log out", "লগআউট", "সাইন আউট"],
};

const DASHBOARD_HINTS = [
  "open dashboard",
  "go to product page",
  "open support tickets",
  "open landing pages",
  "open purchases",
  "open suppliers",
  "open accounts",
  "open brands",
  "open reports",
  "create product",
  "set product name to Apple",
  "price is 20",
  "open file manager",
  "submit product",
  "open product list",
  "ড্যাশবোর্ড খুলুন",
  "শপ খুলুন",
];

export const getVoiceCommandHints = (role) => {
  const normalizedRole = String(role || "user").toLowerCase();
  if (normalizedRole === "admin") {
    return [...DASHBOARD_HINTS, "open order list", "open vendor payouts", "show customer risk"];
  }
  if (normalizedRole === "vendor" || normalizedRole === "staff") {
    return [...DASHBOARD_HINTS, "open vendor orders"];
  }
  return [
    "open dashboard",
    "open support tickets",
    "open my orders",
    "open wishlist",
    "হোম পেজ খুলুন",
  ];
};

export const executeVoiceCommand = ({
  rawText,
  user,
  marketplaceMode = "multi",
  navigateToPath,
  openDashboardTab,
  setAction,
  logout,
  voiceDataset,
}) => {
  const text = normalizeCommandText(rawText);
  const normalizedMode = normalizeMarketplaceMode(marketplaceMode);
  const role = resolveUserRole(user);

  const applyAction = (message, options = {}) => {
    if (typeof setAction === "function") {
      setAction(message, options);
    }
  };

  const goToPath = (path, successMessage) => {
    if (typeof navigateToPath === "function") {
      navigateToPath(path);
    }
    applyAction(successMessage, { speak: true });
    return { handled: true, navigated: true };
  };

  const ensureLoggedIn = () => {
    if (user) return true;
    applyAction("Please login first to access dashboard modules");
    if (typeof navigateToPath === "function") {
      navigateToPath("/login");
    }
    return false;
  };

  const openTab = (tab, successMessage) => {
    if (!ensureLoggedIn()) return { handled: true };

    const allowed = canAccessDashboardTab({
      user,
      tab,
      marketplaceMode: normalizedMode,
    });

    if (!allowed) {
      applyAction("You do not have access to this module");
      return { handled: true };
    }

    if (typeof openDashboardTab === "function") {
      openDashboardTab(tab, successMessage);
    } else {
      if (typeof navigateToPath === "function") {
        navigateToPath("/dashboard");
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dashboardActiveTab", tab);
      }
    }

    applyAction(successMessage, { speak: true });
    return { handled: true, navigated: true };
  };

  const tryDatasetModuleCommands = () => {
    const moduleCommands = Array.isArray(voiceDataset?.moduleCommands)
      ? voiceDataset.moduleCommands
      : [];

    for (const command of moduleCommands) {
      const tab = String(command?.tab || "").trim();
      if (!tab) continue;
      const aliases = Array.isArray(command?.aliases) ? command.aliases : [];
      if (!aliases.length) continue;

      const matched = aliases.some((alias) =>
        text.includes(String(alias || "").toLowerCase()),
      );

      if (!matched) continue;

      const successMessage = String(command?.successMessage || "").trim() || "Opened module";
      return openTab(tab, successMessage);
    }

    return null;
  };

  const tryDatasetResourceCommands = () => {
    const resources = Array.isArray(voiceDataset?.resources)
      ? voiceDataset.resources
      : [];

    if (!resources.length) return null;

    const createVerbDetected =
      text.includes("create") ||
      text.includes("add ") ||
      text.includes("new ");
    const listVerbDetected =
      text.includes("list") ||
      text.includes("all ") ||
      text.includes("open") ||
      text.includes("show");

    for (const resource of resources) {
      const aliases = Array.isArray(resource?.aliases) ? resource.aliases : [];
      const matched = aliases.some((alias) =>
        text.includes(String(alias || "").toLowerCase()),
      );
      if (!matched) continue;

      const createTab = String(resource?.tabs?.create || "").trim();
      const listTab = String(resource?.tabs?.list || "").trim();
      const resourceLabel = String(resource?.singular || "resource");

      if (createVerbDetected && createTab) {
        return openTab(createTab, `Opened create ${resourceLabel}`);
      }

      if (listVerbDetected && listTab) {
        return openTab(listTab, `Opened ${resourceLabel} list`);
      }

      if (listTab) {
        return openTab(listTab, `Opened ${resourceLabel} list`);
      }

      if (createTab) {
        return openTab(createTab, `Opened create ${resourceLabel}`);
      }
    }

    return null;
  };

  if (!text) return { handled: false };

  if (hasAnyKeyword(text, KEYWORDS.stopListening)) {
    applyAction("Voice listening stopped");
    return { handled: true, stopListening: true };
  }

  if (hasAnyKeyword(text, KEYWORDS.home)) return goToPath("/", "Opened home page");
  if (hasAnyKeyword(text, KEYWORDS.shop)) return goToPath("/shop", "Opened shop");
  if (hasAnyKeyword(text, KEYWORDS.cart)) return goToPath("/cart", "Opened cart");
  if (hasAnyKeyword(text, KEYWORDS.checkout)) return goToPath("/checkout", "Opened checkout");
  if (hasAnyKeyword(text, KEYWORDS.login)) return goToPath("/login", "Opened login page");
  if (hasAnyKeyword(text, KEYWORDS.register)) return goToPath("/register", "Opened registration page");
  if (hasAnyKeyword(text, KEYWORDS.contact)) return goToPath("/contact", "Opened contact page");
  if (hasAnyKeyword(text, KEYWORDS.about)) return goToPath("/about", "Opened about page");
  if (hasAnyKeyword(text, KEYWORDS.faq)) return goToPath("/faqs", "Opened FAQ page");

  if (hasAnyKeyword(text, KEYWORDS.logout)) {
    if (typeof logout === "function" && user) {
      logout();
      applyAction("Logged out successfully", { speak: true });
    } else {
      applyAction("No active account is logged in");
    }
    return { handled: true };
  }

  if (hasAnyKeyword(text, KEYWORDS.productPage)) {
    return openTab("create-product", "Opened create product page");
  }

  if (hasAnyKeyword(text, KEYWORDS.dashboard)) return openTab("dashboard", "Opened dashboard");
  if (hasAnyKeyword(text, KEYWORDS.support)) return openTab("module-support", "Opened support tickets");
  if (hasAnyKeyword(text, KEYWORDS.landingPages)) {
    return openTab("module-landing-pages", "Opened landing pages");
  }
  if (hasAnyKeyword(text, KEYWORDS.suppliers)) return openTab("module-suppliers", "Opened suppliers");
  if (hasAnyKeyword(text, KEYWORDS.purchases)) return openTab("module-purchases", "Opened purchases");
  if (hasAnyKeyword(text, KEYWORDS.brands)) return openTab("module-brands", "Opened brands");
  if (hasAnyKeyword(text, KEYWORDS.reports)) {
    return openTab("module-business-reports", "Opened business reports");
  }
  if (hasAnyKeyword(text, KEYWORDS.accounts)) return openTab("module-accounts", "Opened accounts");

  if (hasAnyKeyword(text, KEYWORDS.payouts)) {
    if (role !== "admin") {
      applyAction("Vendor payouts are available for admin only");
      return { handled: true };
    }
    return openTab("module-vendor-payouts", "Opened vendor payouts");
  }

  if (hasAnyKeyword(text, KEYWORDS.products)) {
    if (hasAnyKeyword(text, KEYWORDS.create)) {
      return openTab("create-product", "Opened create product");
    }
    return openTab("modify-product", "Opened product list");
  }

  if (hasAnyKeyword(text, KEYWORDS.orders)) {
    if (role === "admin") return openTab("order-list", "Opened order list");
    if (role === "vendor") return openTab("vendor-orders", "Opened vendor orders");
    return openTab("my-orders", "Opened my orders");
  }

  if (hasAnyKeyword(text, KEYWORDS.customerRisk)) {
    if (role !== "admin") {
      applyAction("Customer risk module is available for admin only");
      return { handled: true };
    }
    return openTab("customer-risk", "Opened customer risk");
  }

  if (hasAnyKeyword(text, KEYWORDS.wishlist)) {
    if (role !== "user") {
      applyAction("Wishlist is available for customer account only");
      return { handled: true };
    }
    return openTab("wishlist", "Opened wishlist");
  }

  const moduleResult = tryDatasetModuleCommands();
  if (moduleResult) return moduleResult;

  const resourceResult = tryDatasetResourceCommands();
  if (resourceResult) return resourceResult;

  applyAction("Command not mapped. Try one of the suggested commands.");
  return { handled: false };
};
