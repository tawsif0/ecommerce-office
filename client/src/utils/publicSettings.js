import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL;
const CACHE_KEY = "publicStoreSettings";
const CACHE_MAX_AGE_MS = 5 * 60 * 1000;

const DEFAULT_SETTINGS = {
  isInitialSetup: false,
  marketplaceMode: "multi",
  vendorRegistrationEnabled: true,
  website: {
    storeName: "E-Commerce",
    tagline: "",
    logoUrl: "",
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
};

let inMemorySettings = null;
let inMemoryTimestamp = 0;

const normalizeMarketplaceMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "single"
    ? "single"
    : "multi";

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

  return {
    ...DEFAULT_SETTINGS,
    ...incoming,
    isInitialSetup: Boolean(incoming?.isInitialSetup),
    marketplaceMode: normalizedMarketplaceMode,
    vendorRegistrationEnabled,
    website: { ...DEFAULT_SETTINGS.website, ...(incoming.website || {}) },
    contact: { ...DEFAULT_SETTINGS.contact, ...(incoming.contact || {}) },
    social: { ...DEFAULT_SETTINGS.social, ...(incoming.social || {}) },
    policies: { ...DEFAULT_SETTINGS.policies, ...(incoming.policies || {}) },
    integrations: {
      ...DEFAULT_SETTINGS.integrations,
      ...(incoming.integrations || {}),
    },
    invoice: { ...DEFAULT_SETTINGS.invoice, ...(incoming.invoice || {}) },
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

export const getDefaultPublicSettings = () => mergeSettings();

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
