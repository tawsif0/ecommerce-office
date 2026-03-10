import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiArrowLeft, FiShuffle, FiTrash2 } from "react-icons/fi";
import { clearCompareItems, removeCompareItem } from "../store/compareSlice";
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

const formatPrice = (product) => {
  const pricing = getProductPricingDisplay(product);
  if (pricing.isTba) return "TBA";
  if (pricing.hasDiscount) {
    return `${Number(pricing.currentPrice || 0).toFixed(2)} TK`;
  }
  return `${Number(pricing.currentPrice || 0).toFixed(2)} TK`;
};

const CompareProducts = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const items = useSelector((state) => state.compare.items || []);

  const rows = [
    {
      label: "Price",
      render: (item) => {
        const pricing = getProductPricingDisplay(item);
        if (pricing.isTba) {
          return <span className="font-semibold text-amber-700">TBA</span>;
        }

        return (
          <div className="space-y-1">
            {pricing.hasDiscount ? (
              <p className="text-xs text-gray-400 line-through">
                {Number(pricing.previousPrice || 0).toFixed(2)} TK
              </p>
            ) : null}
            <p className="text-base font-bold text-black">
              {Number(pricing.currentPrice || 0).toFixed(2)} TK
            </p>
          </div>
        );
      },
    },
    {
      label: "Pricing Type",
      render: (item) => String(item?.priceType || "single").toUpperCase(),
    },
    {
      label: "Seller",
      render: (item) => item?.vendor?.storeName || "Marketplace",
    },
    {
      label: "Category",
      render: (item) => item?.category?.name || "General",
    },
    {
      label: "Colors",
      render: (item) =>
        Array.isArray(item?.colors) && item.colors.length > 0
          ? `${item.colors.length} option${item.colors.length > 1 ? "s" : ""}`
          : "N/A",
    },
    {
      label: "Marketplace Type",
      render: (item) => item?.marketplaceType || "simple",
    },
    {
      label: "Public Stock",
      render: (item) =>
        item?.showStockToPublic ? `${Number(item?.stock || 0)} units` : "Hidden",
    },
    {
      label: "Delivery Window",
      render: (item) => {
        const min = Number(item?.deliveryMinDays || 0);
        const max = Number(item?.deliveryMaxDays || 0);
        if (max <= 0) return "Standard";
        if (min > 0) return `${min}-${max} days`;
        return `${max} days`;
      },
    },
  ];

  return (
    <div className="site-shell py-8">
      <div className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-sm text-gray-500 transition hover:text-black"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-black text-white">
                <FiShuffle className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-black">Product Compare</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Compare price, seller, delivery, and stock visibility before buying.
                </p>
              </div>
            </div>
          </div>

          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => dispatch(clearCompareItems())}
              className="app-btn-danger px-4 py-2 text-sm"
            >
              <FiTrash2 className="h-4 w-4" />
              Clear Compare
            </button>
          ) : null}
        </div>

        {items.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gray-100 text-gray-500">
              <FiShuffle className="h-7 w-7" />
            </div>
            <h2 className="mt-5 text-xl font-bold text-black">No products in compare</h2>
            <p className="mt-2 text-sm text-gray-600">
              Add up to four products from the shop or product page to compare them side by side.
            </p>
            <Link
              to="/shop"
              className="app-btn-primary mt-6 px-5 py-3 text-sm"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto pt-6">
            <div className="min-w-[760px]">
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `220px repeat(${items.length}, minmax(0, 1fr))`,
                }}
              >
                <div />
                {items.map((item) => {
                  const image = getFullImageUrl(item?.images?.[0]);
                  return (
                    <div
                      key={item._id}
                      className="app-panel-soft p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to={`/product/${item._id}`}
                          className="block overflow-hidden rounded-2xl bg-white shadow-sm"
                        >
                          {image ? (
                            <img
                              src={image}
                              alt={item.title}
                              className="h-40 w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-40 w-full items-center justify-center bg-gray-100 text-xs text-gray-400">
                              No image
                            </div>
                          )}
                        </Link>
                        <button
                          type="button"
                          onClick={() => dispatch(removeCompareItem(item._id))}
                          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition hover:border-red-200 hover:text-red-600"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4 space-y-2">
                        <Link
                          to={`/product/${item._id}`}
                          className="line-clamp-2 text-base font-bold text-black transition hover:text-gray-700"
                        >
                          {item.title}
                        </Link>
                        <p className="text-sm text-gray-500">{formatPrice(item)}</p>
                        <Link
                          to={`/product/${item._id}`}
                          className="app-btn-secondary px-4 py-2 text-xs"
                        >
                          View Product
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {rows.map((row) => (
                  <React.Fragment key={row.label}>
                    <div className="app-panel-soft px-4 py-4">
                      <p className="text-sm font-semibold text-gray-700">{row.label}</p>
                    </div>
                    {items.map((item) => (
                      <div
                        key={`${row.label}-${item._id}`}
                        className="app-panel-soft px-4 py-4 text-sm text-gray-700"
                      >
                        {row.render(item)}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompareProducts;
