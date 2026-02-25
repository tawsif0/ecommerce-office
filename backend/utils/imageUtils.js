const mongoose = require("mongoose");
const ProductImage = require("../models/ProductImage");

const isObjectIdLike = (value) => {
  if (!value) return false;
  if (value instanceof mongoose.Types.ObjectId) return true;
  if (typeof value === "string") {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }
  return false;
};

const normalizeImageString = (value) => {
  if (!value || typeof value !== "string") return value;
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:")
  ) {
    return value;
  }
  return value.startsWith("/") ? value : `/${value}`;
};

const attachImageDataToProducts = async (products) => {
  const list = Array.isArray(products) ? products : [products];
  const imageIds = new Set();

  list.forEach((product) => {
    if (!product?.images) return;
    product.images.forEach((img) => {
      if (isObjectIdLike(img)) {
        imageIds.add(String(img));
      }
    });
  });

  let imageMap = new Map();
  if (imageIds.size > 0) {
    const imageDocs = await ProductImage.find({
      _id: { $in: Array.from(imageIds) },
    })
      .select("data")
      .lean();
    imageMap = new Map(imageDocs.map((doc) => [String(doc._id), doc.data]));
  }

  list.forEach((product) => {
    if (!product?.images) return;
    const mapped = product.images.map((img) => {
      if (!img) return { data: null, id: null };
      if (typeof img === "object" && img.data) {
        return { data: img.data, id: img.id || null };
      }
      if (isObjectIdLike(img)) {
        return { data: imageMap.get(String(img)) || null, id: String(img) };
      }
      if (typeof img === "string") {
        return { data: normalizeImageString(img), id: null };
      }
      return { data: null, id: null };
    });

    const filtered = mapped.filter((item) => Boolean(item.data));
    product.images = filtered.map((item) => item.data);
    product.imageIds = filtered.map((item) => item.id);
  });

  return products;
};

module.exports = {
  isObjectIdLike,
  normalizeImageString,
  attachImageDataToProducts,
};
