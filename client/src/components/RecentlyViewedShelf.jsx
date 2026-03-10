import React from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiClock, FiEye } from "react-icons/fi";
import { getProductPricingDisplay } from "../utils/productPricing";

const baseUrl = import.meta.env.VITE_API_URL;

const getFullImageUrl = (imagePath) => {
  const value = Array.isArray(imagePath) ? imagePath[0] : imagePath;
  if (!value) return null;

  if (
    String(value).startsWith("http://") ||
    String(value).startsWith("https://") ||
    String(value).startsWith("data:")
  ) {
    return value;
  }

  if (String(value).startsWith("/")) {
    return baseUrl ? `${baseUrl}${value}` : value;
  }

  return baseUrl ? `${baseUrl}/uploads/products/${value}` : `/uploads/products/${value}`;
};

const RecentlyViewedShelf = ({
  title = "Recently viewed",
  subtitle = "Jump back into the products you checked most recently.",
  excludeProductId = "",
  limit = 6,
  className = "",
}) => {
  const items = useSelector((state) => state.recentlyViewed.items || []);
  const filteredItems = items
    .filter((item) => String(item?._id || "") !== String(excludeProductId || ""))
    .slice(0, limit);

  if (filteredItems.length === 0) {
    return null;
  }

  return (
    <section className={className}>
      <div className="rounded-[32px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-gray-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
              <FiClock className="h-4 w-4" />
              Shopper memory
            </p>
            <h2 className="mt-3 text-2xl font-black text-black">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{subtitle}</p>
          </div>
          <Link
            to="/shop"
            className="inline-flex rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-black transition hover:border-black"
          >
            Continue Shopping
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {filteredItems.map((item) => {
            const image = getFullImageUrl(item?.images?.[0]);
            const pricing = getProductPricingDisplay(item);
            return (
              <Link
                key={item._id}
                to={`/product/${item._id}`}
                className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-gray-200 bg-gray-50 transition hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg"
              >
                <div className="aspect-square overflow-hidden bg-white">
                  {image ? (
                    <img
                      src={image}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col px-3 py-3">
                  <p className="line-clamp-2 text-sm font-semibold text-black">{item.title}</p>
                  <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                    {item?.vendor?.storeName || item?.category?.name || "Marketplace"}
                  </p>
                  <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                    <span className="text-sm font-bold text-black">
                      {pricing.isTba
                        ? "TBA"
                        : `${Number(pricing.currentPrice || 0).toFixed(2)} TK`}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <FiEye className="h-3.5 w-3.5" />
                      View
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default RecentlyViewedShelf;

