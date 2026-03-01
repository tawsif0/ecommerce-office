const DATALAYER_DEFAULT_ENABLED =
  String(import.meta.env.VITE_ENABLE_DATALAYER || "true").toLowerCase() !== "false";
const PUBLIC_SETTINGS_CACHE_KEY = "publicStoreSettings";

const isDataLayerEnabledFromSettings = () => {
  if (typeof window === "undefined") return DATALAYER_DEFAULT_ENABLED;

  try {
    const cached = window.localStorage.getItem(PUBLIC_SETTINGS_CACHE_KEY);
    if (!cached) return DATALAYER_DEFAULT_ENABLED;

    const parsed = JSON.parse(cached);
    const fromSettings = parsed?.settings?.integrations?.enableDataLayer;
    if (fromSettings === undefined || fromSettings === null) {
      return DATALAYER_DEFAULT_ENABLED;
    }
    return Boolean(fromSettings);
  } catch (_error) {
    return DATALAYER_DEFAULT_ENABLED;
  }
};

export const pushDataLayerEvent = (eventName, payload = {}) => {
  if (!isDataLayerEnabledFromSettings()) return false;
  if (typeof window === "undefined") return false;

  const name = String(eventName || "").trim();
  if (!name) return false;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: name,
    timestamp: Date.now(),
    ...payload,
  });
  return true;
};

export const buildDataLayerItem = (source = {}) => {
  const productId = String(
    source.productId || source._id || source.id || source.product || "",
  ).trim();
  const title = String(source.title || source.name || "Product").trim();
  const price = Number(
    source.unitPrice ??
      source.price ??
      source.salePrice ??
      source.currentPrice ??
      0,
  );
  const quantity = Math.max(1, Number(source.quantity || 1));
  const category = String(
    source.category?.name || source.category || source.productType || "",
  ).trim();
  const brand = String(source.brand || "").trim();
  const variation = String(source.variationLabel || source.variation || "").trim();
  const vendor = String(source.vendor?.storeName || source.vendorName || "").trim();

  return {
    item_id: productId,
    item_name: title,
    price: Number.isFinite(price) ? price : 0,
    quantity,
    item_category: category || undefined,
    item_brand: brand || undefined,
    item_variant: variation || undefined,
    item_seller: vendor || undefined,
  };
};

export const getDataLayerCurrency = () =>
  String(import.meta.env.VITE_STORE_CURRENCY || "BDT").trim().toUpperCase();
