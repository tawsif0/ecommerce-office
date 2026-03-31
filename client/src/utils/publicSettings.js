import axios from "axios";
import {
  DEFAULT_ABOUT_CARDS,
  DEFAULT_ABOUT_STORY_CONTENT,
  DEFAULT_ABOUT_STORY_TITLE,
  normalizeAboutCards,
} from "./aboutSection";

const baseUrl = import.meta.env.VITE_API_URL;
const CACHE_KEY = "publicStoreSettings";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;
const DEFAULT_NAV_LINK_PATHS = {
  "daily deals": "/shop?collection=deals",
  "top categories": "/#top-categories",
  "new arrivals": "/shop?collection=new-arrivals",
  "buyer protection": "/faqs#buyer-protection",
  "track order": "/track-order",
};
const LEGACY_CATALOG_TITLE = "{storeName} catalog with stock-aware shopping";
const LEGACY_CATALOG_DESCRIPTION =
  "Browse categories, compare pricing modes, and surface only the stock visibility you choose to publish.";
const DEFAULT_CATALOG_TITLE = "Shop the full {storeName} catalog";
const DEFAULT_CATALOG_DESCRIPTION =
  "Browse categories, compare pricing options, and discover curated deals across the marketplace.";
const DEFAULT_STOREFRONT_NAV_LINKS = [
  { label: "Daily Deals", path: DEFAULT_NAV_LINK_PATHS["daily deals"] },
  { label: "Top Categories", path: DEFAULT_NAV_LINK_PATHS["top categories"] },
  { label: "New Arrivals", path: DEFAULT_NAV_LINK_PATHS["new arrivals"] },
  { label: "Buyer Protection", path: DEFAULT_NAV_LINK_PATHS["buyer protection"] },
  { label: "Track Order", path: DEFAULT_NAV_LINK_PATHS["track order"] },
];
const DEFAULT_STOREFRONT_TRUST_BULLETS = [
  "COD-friendly Bangladesh checkout flow",
  "Product stock only shows publicly when enabled",
  "Orders and purchases already sync inventory",
];

const normalizeIdList = (value) => {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean)
      .filter((entry, index, list) => list.indexOf(entry) === index);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return normalizeIdList(parsed);
    } catch {
      return [];
    }
  }

  return [];
};

const cloneNavLinks = (links = DEFAULT_STOREFRONT_NAV_LINKS) =>
  links.map((entry) => ({
    label: String(entry?.label || "").trim(),
    path: String(entry?.path || "").trim() || "/",
  }));

const normalizeStorefrontText = (value, fallback, legacyValues = []) => {
  const normalized = String(value || "").trim();
  if (!normalized || legacyValues.includes(normalized)) {
    return fallback;
  }
  return normalized;
};

const normalizeStringList = (value, fallback = []) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\n,]+/)
      : [];
  const uniqueValues = new Set();

  source.forEach((entry) => {
    const normalized = String(entry || "").trim();
    if (normalized) {
      uniqueValues.add(normalized);
    }
  });

  const items = Array.from(uniqueValues);
  return items.length > 0 ? items : [...fallback];
};

const normalizeStorefrontNavLinks = (value) => {
  if (!Array.isArray(value)) {
    return cloneNavLinks();
  }

  const uniqueValues = new Map();
  value.forEach((entry) => {
    const label = String(entry?.label || "").trim();
    const normalizedLabel = label.toLowerCase();
    const inputPath = String(entry?.path || "").trim();
    const defaultPath = DEFAULT_NAV_LINK_PATHS[normalizedLabel] || "/";
    const path =
      !inputPath ||
      (normalizedLabel === "daily deals" && inputPath === "/shop") ||
      (normalizedLabel === "top categories" && inputPath === "/shop") ||
      (normalizedLabel === "new arrivals" && inputPath === "/shop") ||
      (normalizedLabel === "buyer protection" && inputPath === "/faqs") ||
      (normalizedLabel === "track order" && inputPath === "/contact")
        ? defaultPath
        : inputPath;
    if (!label) return;
    uniqueValues.set(`${label}|${path}`, { label, path });
  });

  const items = Array.from(uniqueValues.values());
  return items.length > 0 ? items : cloneNavLinks();
};

const DEFAULT_SETTINGS = {
  isInitialSetup: false,
  marketplaceMode: "multi",
  vendorRegistrationEnabled: true,
  publicStockSummaryEnabled: false,
  publicStockCategoryIds: [],
  marketplace: {
    marketplaceMode: "multi",
    vendorRegistrationEnabled: true,
    publicStockSummaryEnabled: false,
    publicStockCategoryIds: [],
  },
  website: {
    storeName: "E-Commerce",
    tagline: "",
    logoMode: "image",
    logoText: "",
    logoUrl: "",
    headerIconUrl: "",
    themeColor: "#000000",
    fontFamily: "inherit",
  },
  contact: {
    address: "",
    addressLink: "",
    phone1: "",
    phone2: "",
    email: "",
  },
  social: {
    facebook: "",
    whatsapp: "",
    instagram: "",
    youtube: "",
  },
  policies: {
    shipmentPolicy: "",
    deliveryPolicy: "",
    termsConditions: "",
    returnPolicy: "",
    privacyPolicy: "",
    cancellationPolicy: "",
    cancellationWindowDays: 1,
  },
  integrations: {
    facebookPixelId: "",
    googleAnalyticsId: "",
    gtmId: "",
    customTrackingCode: "",
    enableDataLayer: true,
    enableGoogleLogin: false,
    enableFacebookLogin: false,
  },
  invoice: {
    logo: "",
    address: "",
    footerText: "",
  },
  about: {
    storyTitle: DEFAULT_ABOUT_STORY_TITLE,
    storyContent: DEFAULT_ABOUT_STORY_CONTENT,
    cards: [...DEFAULT_ABOUT_CARDS],
  },
  courier: {
    providerName: "",
    apiBaseUrl: "",
    enabled: true,
    apiToken: "",
    apiKey: "",
    apiSecret: "",
    consignmentPath: "/consignments",
    trackingPath: "/track",
    labelPath: "/label",
    timeoutMs: 12000,
  },
  locations: {
    cityOptions: [],
    subCityOptions: [],
  },
  storefront: {
    marketLabel: "Bangladesh marketplace",
    categoryRailEyebrow: "Shop by Category",
    categoryRailTitle: "All Departments",
    categoryRailButtonLabel: "Explore marketplace",
    heroFallbackTitle: "{storeName} deals built for Bangladesh shoppers",
    heroFallbackDescription:
      "Organize campaigns, categories, and product discovery in a stronger marketplace-style landing flow.",
    heroPrimaryLabel: "Shop campaign",
    heroSecondaryLabel: "Browse all products",
    sidebarControlEyebrow: "Marketplace control",
    sidebarControlTitle: "Shop by stock, not guesswork",
    sidebarControlDescription:
      "Orders reserve stock, purchases increase stock, and public stock remains optional per product.",
    sidebarControlButtonLabel: "Open storefront",
    discoveryEyebrow: "Top discovery lanes",
    highlightsEyebrow: "Marketplace Highlights",
    highlightsTitle: "{storeName} shopping channels built for fast browsing",
    highlightsDescription:
      "Bring campaign-style discovery, category-led shelves, and strong stock visibility into one marketplace flow.",
    flashEyebrow: "Flash Picks",
    flashTitle: "Deal-driven shelves inspired by global marketplaces",
    flashDescription:
      "Build home discovery around campaigns, category lanes, and clear price states without breaking your current commerce wiring.",
    flashPrimaryLabel: "Open shop",
    flashSecondaryLabel: "Open dashboard",
    trustEyebrow: "Buyer trust",
    trustBullets: [...DEFAULT_STOREFRONT_TRUST_BULLETS],
    topCategoriesEyebrow: "Top categories",
    dealsEyebrow: "Limited-price shelves",
    dealsTitle: "Flash deal picks",
    dealsButtonLabel: "See all",
    categoryFloorEyebrow: "Category channel",
    categoryFloorDescription:
      "Discover the main shelf, active stock, and featured products in this category.",
    categoryFloorButtonLabel: "Browse category",
    categoryFloorPanelButtonLabel: "Shop now",
    recommendedEyebrow: "Recommended shelf",
    recommendedTitle: "New arrivals for the marketplace",
    recommendedButtonLabel: "View catalog",
    catalogTitle: DEFAULT_CATALOG_TITLE,
    catalogDescription: DEFAULT_CATALOG_DESCRIPTION,
    footerCaption: "Built for Bangladesh marketplace operations",
    navQuickLinks: cloneNavLinks(),
  },
};

let inMemorySettings = null;
let inMemoryTimestamp = 0;

const normalizeMarketplaceMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "single"
    ? "single"
    : "multi";

const normalizeLogoMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "text"
    ? "text"
    : "image";

const mergeSettings = (incoming = {}) => {
  const normalizedMarketplaceMode = normalizeMarketplaceMode(
    incoming?.marketplaceMode || incoming?.marketplace?.marketplaceMode,
  );
  const vendorRegistrationSource =
    incoming?.vendorRegistrationEnabled === undefined
      ? incoming?.marketplace?.vendorRegistrationEnabled
      : incoming.vendorRegistrationEnabled;
  const vendorRegistrationEnabled =
    normalizedMarketplaceMode === "single"
      ? false
      : vendorRegistrationSource === undefined
        ? DEFAULT_SETTINGS.vendorRegistrationEnabled
        : Boolean(vendorRegistrationSource);
  const publicStockSummarySource =
    incoming?.publicStockSummaryEnabled === undefined
      ? incoming?.marketplace?.publicStockSummaryEnabled
      : incoming.publicStockSummaryEnabled;
  const publicStockSummaryEnabled = Boolean(publicStockSummarySource);
  const publicStockCategoryIds = normalizeIdList(
    incoming?.publicStockCategoryIds !== undefined
      ? incoming.publicStockCategoryIds
      : incoming?.marketplace?.publicStockCategoryIds,
  );

  return {
    ...DEFAULT_SETTINGS,
    ...incoming,
    isInitialSetup: Boolean(incoming?.isInitialSetup),
    marketplaceMode: normalizedMarketplaceMode,
    vendorRegistrationEnabled,
    publicStockSummaryEnabled,
    publicStockCategoryIds,
    marketplace: {
      ...DEFAULT_SETTINGS.marketplace,
      ...(incoming.marketplace || {}),
      marketplaceMode: normalizedMarketplaceMode,
      vendorRegistrationEnabled,
      publicStockSummaryEnabled,
      publicStockCategoryIds,
    },
    website: {
      ...DEFAULT_SETTINGS.website,
      ...(incoming.website || {}),
      logoMode: normalizeLogoMode(incoming?.website?.logoMode),
      logoText: String(incoming?.website?.logoText || "").trim(),
      logoUrl: String(incoming?.website?.logoUrl || "").trim(),
      headerIconUrl: String(
        incoming?.website?.headerIconUrl || incoming?.website?.headerIcon || "",
      ).trim(),
    },
    contact: { ...DEFAULT_SETTINGS.contact, ...(incoming.contact || {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(incoming.social || {}) },
    policies: {
      ...DEFAULT_SETTINGS.policies,
      ...(incoming.policies || {}),
      cancellationWindowDays: Number.isFinite(
        parseInt(incoming?.policies?.cancellationWindowDays, 10),
      )
        ? Math.max(0, parseInt(incoming?.policies?.cancellationWindowDays, 10))
        : 1,
    },
    integrations: {
      ...DEFAULT_SETTINGS.integrations,
      ...(incoming.integrations || {}),
    },
    invoice: { ...DEFAULT_SETTINGS.invoice, ...(incoming.invoice || {}) },
    about: {
      ...DEFAULT_SETTINGS.about,
      ...(incoming.about || {}),
      storyTitle:
        String(incoming?.about?.storyTitle || "").trim() ||
        DEFAULT_ABOUT_STORY_TITLE,
      storyContent:
        String(incoming?.about?.storyContent || "").trim() ||
        DEFAULT_ABOUT_STORY_CONTENT,
      cards: normalizeAboutCards(incoming?.about?.cards || DEFAULT_ABOUT_CARDS),
    },
    courier: { ...DEFAULT_SETTINGS.courier, ...(incoming.courier || {}) },
    locations: {
      ...DEFAULT_SETTINGS.locations,
      ...(incoming.locations || {}),
      cityOptions: Array.isArray(incoming?.locations?.cityOptions)
        ? incoming.locations.cityOptions
        : DEFAULT_SETTINGS.locations.cityOptions,
      subCityOptions: Array.isArray(incoming?.locations?.subCityOptions)
        ? incoming.locations.subCityOptions
        : DEFAULT_SETTINGS.locations.subCityOptions,
    },
    storefront: {
      ...DEFAULT_SETTINGS.storefront,
      ...(incoming.storefront || {}),
      catalogTitle: normalizeStorefrontText(
        incoming?.storefront?.catalogTitle,
        DEFAULT_SETTINGS.storefront.catalogTitle,
        [LEGACY_CATALOG_TITLE],
      ),
      catalogDescription: normalizeStorefrontText(
        incoming?.storefront?.catalogDescription,
        DEFAULT_SETTINGS.storefront.catalogDescription,
        [LEGACY_CATALOG_DESCRIPTION],
      ),
      trustBullets: normalizeStringList(
        incoming?.storefront?.trustBullets,
        DEFAULT_STOREFRONT_TRUST_BULLETS,
      ),
      navQuickLinks: normalizeStorefrontNavLinks(incoming?.storefront?.navQuickLinks),
    },
  };
};

const readCache = () => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.settings || !parsed?.timestamp) return null;

    if (Date.now() - Number(parsed.timestamp) > CACHE_MAX_AGE_MS) {
      return null;
    }

    return mergeSettings(parsed.settings);
  } catch {
    return null;
  }
};

const writeCache = (settings) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        settings,
        timestamp: Date.now(),
      }),
    );
  } catch {
    // ignore cache write issues
  }
};

export const fetchPublicSettings = async ({ force = false } = {}) => {
  if (!force && inMemorySettings && Date.now() - inMemoryTimestamp < CACHE_MAX_AGE_MS) {
    return inMemorySettings;
  }

  if (!force) {
    const cached = readCache();
    if (cached) {
      inMemorySettings = cached;
      inMemoryTimestamp = Date.now();
      return cached;
    }
  }

  try {
    const response = await axios.get(`${baseUrl}/auth/public/settings`, {
      timeout: 8000,
    });

    const settings = mergeSettings(response.data?.settings || {});
    inMemorySettings = settings;
    inMemoryTimestamp = Date.now();
    writeCache(settings);
    return settings;
  } catch {
    const fallback = mergeSettings();
    inMemorySettings = fallback;
    inMemoryTimestamp = Date.now();
    return fallback;
  }
};

export const normalizePublicSettingsPayload = (payload = {}) => mergeSettings(payload);

export const getDefaultPublicSettings = () => mergeSettings();

export const primePublicSettingsCache = (settings) => {
  const normalized = mergeSettings(settings || {});
  inMemorySettings = normalized;
  inMemoryTimestamp = Date.now();
  writeCache(normalized);
  return normalized;
};

export const broadcastPublicSettingsUpdated = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("publicSettingsUpdated"));
};

export const invalidatePublicSettingsCache = () => {
  inMemorySettings = null;
  inMemoryTimestamp = 0;

  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CACHE_KEY);
  } catch {
    // ignore cache reset issues
  }
};

export const toPublicAssetUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return baseUrl ? `${baseUrl}${raw}` : raw;
  }

  return baseUrl ? `${baseUrl}/${raw.replace(/^\/+/, "")}` : raw;
};

let defaultDocumentTitle = "";
let defaultFaviconHref = "";

export const formatDocumentTitle = (settingsOrStoreName = "", pageTitle = "") => {
  const resolvedStoreName =
    typeof settingsOrStoreName === "string"
      ? settingsOrStoreName
      : settingsOrStoreName?.website?.storeName;
  const storeName =
    String(resolvedStoreName || defaultDocumentTitle || "E-Commerce").trim() ||
    "E-Commerce";
  const resolvedPageTitle = String(pageTitle || "").trim();

  return resolvedPageTitle ? `${storeName} - ${resolvedPageTitle}` : storeName;
};

export const applyPublicSettingsDocument = (settings = {}) => {
  if (typeof document === "undefined") return;

  const website = settings?.website || {};
  const iconValue = String(website?.headerIconUrl || website?.logoUrl || "").trim();

  if (!defaultDocumentTitle) {
    defaultDocumentTitle = String(document.title || "E-Commerce").trim() || "E-Commerce";
  }

  if (!defaultFaviconHref) {
    defaultFaviconHref =
      document
        .querySelector("link[data-website-favicon='true']")
        ?.getAttribute("href") || "/vite.png";
  }

  const resolvedIcon = toPublicAssetUrl(iconValue) || defaultFaviconHref || "/vite.png";
  let faviconLink = document.querySelector("link[data-website-favicon='true']");

  if (!faviconLink) {
    faviconLink = document.createElement("link");
    faviconLink.setAttribute("rel", "icon");
    faviconLink.setAttribute("data-website-favicon", "true");
    document.head.appendChild(faviconLink);
  }

  faviconLink.setAttribute("rel", "icon");
  faviconLink.setAttribute("href", resolvedIcon);
};
