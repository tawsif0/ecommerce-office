const normalizeEmbeddedValue = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

export const createProductSnapshot = (product) => {
  if (!product?._id) return null;

  return {
    _id: String(product._id),
    title: normalizeEmbeddedValue(product.title, "Product"),
    images: Array.isArray(product.images) ? product.images.filter(Boolean) : [],
    price: product.price ?? 0,
    salePrice: product.salePrice ?? null,
    priceType: normalizeEmbeddedValue(product.priceType, "single"),
    showStockToPublic: Boolean(product.showStockToPublic),
    stock: Number(product.stock || 0),
    colors: Array.isArray(product.colors) ? product.colors.filter(Boolean) : [],
    marketplaceType: normalizeEmbeddedValue(product.marketplaceType, "simple"),
    deliveryMinDays: Number(product.deliveryMinDays || 0),
    deliveryMaxDays: Number(product.deliveryMaxDays || 0),
    ratingAverage: Number(product.ratingAverage || 0),
    ratingCount: Number(product.ratingCount || 0),
    category:
      product.category && typeof product.category === "object"
        ? {
            _id: String(product.category._id || ""),
            name: normalizeEmbeddedValue(product.category.name),
          }
        : null,
    vendor:
      product.vendor && typeof product.vendor === "object"
        ? {
            _id: String(product.vendor._id || ""),
            storeName: normalizeEmbeddedValue(product.vendor.storeName),
            slug: normalizeEmbeddedValue(product.vendor.slug),
          }
        : null,
  };
};

