export const isPublicStockVisible = (product) => Boolean(product?.showStockToPublic);

export const getNumericStockValue = (value) => {
  const normalized = Number(value || 0);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0;
};

export const getPublicStockQuantity = (product, variation = null) => {
  if (!isPublicStockVisible(product)) {
    return null;
  }

  const source = variation && typeof variation === "object" ? variation : product;
  return getNumericStockValue(source?.stock);
};

export const getPublicStockBadgeText = (product, variation = null) => {
  const quantity = getPublicStockQuantity(product, variation);
  if (quantity === null) {
    return "";
  }
  return `Stock ${quantity}`;
};

export const hasPurchasableInventory = (product, variation = null) =>
  getNumericStockValue(variation?.stock ?? product?.stock) > 0;
