import React, { useMemo, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { FiHeart, FiShoppingBag, FiShuffle } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { getProductPricingDisplay } from "../../utils/productPricing";
import {
  getPublicStockBadgeText,
  isPublicStockVisible,
} from "../../utils/publicProduct";
import { selectPublicSettings } from "../../store/publicSettingsSlice";
import {
  selectWishlistPendingIds,
  toggleWishlistItem,
} from "../../store/wishlistSlice";
import { toggleCompareItem } from "../../store/compareSlice";
import { createProductSnapshot } from "../../utils/productSnapshot";
import { useCart } from "../../context/CartContext";

const baseUrl = import.meta.env.VITE_API_URL;

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }

  if (imagePath.startsWith("/")) {
    return baseUrl ? `${baseUrl}${imagePath}` : imagePath;
  }

  return baseUrl
    ? `${baseUrl}/uploads/products/${imagePath}`
    : `/uploads/products/${imagePath}`;
};

const FallbackImage = ({ className, alt }) => (
  <div
    className={`${className} flex items-center justify-center bg-linear-to-br from-gray-50 to-gray-100`}
  >
    <svg
      className="h-8 w-8 text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <span className="sr-only">{alt || "No image available"}</span>
  </div>
);

const ProductImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getFullImageUrl(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(getFullImageUrl(src));
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    if (src && src.startsWith("/uploads/products/")) {
      const altUrl = `${baseUrl}${src}`;
      if (altUrl !== imgSrc) {
        setImgSrc(altUrl);
        setHasError(false);
      }
    }
  };

  if (hasError || !imgSrc) {
    return <FallbackImage className={className} alt={alt} />;
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      crossOrigin={
        imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://")
          ? "anonymous"
          : undefined
      }
    />
  );
};

const buildDiscountLabel = (pricing) => {
  if (!pricing?.hasDiscount) return "";
  const previous = Number(pricing.previousPrice || 0);
  const current = Number(pricing.currentPrice || 0);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || previous <= 0) {
    return "";
  }

  const percent = Math.round(((previous - current) / previous) * 100);
  return percent > 0 ? `-${percent}%` : "";
};

const getCardMetaLine = (product, metaLine) => {
  if (metaLine !== undefined) return metaLine;
  return product?.dimensions ? `Dim: ${product.dimensions}` : "";
};

const getCategoryLabel = (product, badgeText = "") => {
  if (typeof product?.category === "object" && product?.category?.name) {
    return String(product.category.name).trim();
  }

  if (typeof product?.category === "string" && String(product.category).trim()) {
    return String(product.category).trim();
  }

  if (String(product?.productType || "").trim()) {
    return String(product.productType).trim();
  }

  if (String(badgeText || "").trim()) {
    return String(badgeText).trim();
  }

  return "General";
};

const getPreviewColors = (product) => {
  const directColors = Array.isArray(product?.colors)
    ? product.colors.filter((color) => /^#[0-9a-fA-F]{6}$/.test(String(color || "").trim()))
    : [];

  const variantColors = Array.isArray(product?.variantDefinitions)
    ? product.variantDefinitions
        .filter(
          (variant) =>
            String(variant?.preset || "").trim().toLowerCase() === "color" ||
            String(variant?.name || "").trim().toLowerCase() === "color",
        )
        .flatMap((variant) => variant.options || [])
        .map((option) =>
          String(option?.colorHex || option?.value || "").trim().toLowerCase(),
        )
        .filter((color) => /^#[0-9a-fA-F]{6}$/.test(color))
    : [];

  return [...new Set([...variantColors, ...directColors])];
};

const StorefrontProductCard = ({
  product,
  title,
  badgeText = "",
  badgeClassName = "",
  topRightSlot = null,
  metaLine,
  buttonLabel = "View",
  className = "",
  onViewDetails,
  showCompareButton = true,
  showWishlistButton = true,
  showCartButton = true,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const settings = useSelector(selectPublicSettings);
  const compareItems = useSelector((state) => state.compare.items || []);
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const wishlistPendingIds = useSelector(selectWishlistPendingIds);
  const pricing = useMemo(() => getProductPricingDisplay(product), [product]);
  const displayMetaLine = getCardMetaLine(product, metaLine);
  const allPreviewColors = useMemo(() => getPreviewColors(product), [product]);
  const previewColors = allPreviewColors.slice(0, 4);
  const hasMoreColors = allPreviewColors.length > 4;
  const discountLabel = buildDiscountLabel(pricing);
  const categoryLabel = getCategoryLabel(product, badgeText);
  const sectionBadgeLabel =
    String(badgeText || "").trim() &&
    String(badgeText || "").trim().toLowerCase() !== categoryLabel.toLowerCase()
      ? String(badgeText).trim()
      : "";
  const stockBadgeText = useMemo(
    () => getPublicStockBadgeText(product, null, settings),
    [product, settings],
  );
  const showStockBadge = Boolean(stockBadgeText) && isPublicStockVisible(product, settings);
  const productId = String(product?._id || product?.id || "").trim();
  const isCompared = compareItems.some(
    (item) => String(item?._id || "") === productId,
  );
  const isWishlisted = wishlistItems.some(
    (item) => String(item?._id || "") === productId,
  );
  const wishlistLoading = wishlistPendingIds.includes(productId);

  const handleViewDetails = () => {
    if (typeof onViewDetails === "function") {
      onViewDetails(product);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleViewDetails();
    }
  };

  const handleToggleCompare = (event) => {
    event.stopPropagation();
    const snapshot = createProductSnapshot(product);
    if (!snapshot) return;
    dispatch(toggleCompareItem(snapshot));
  };

  const handleToggleWishlist = async (event) => {
    event.stopPropagation();
    if (wishlistLoading) return;
    try {
      await dispatch(toggleWishlistItem(product)).unwrap();
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error(error || "Failed to update wishlist");
    }
  };

  const handleAddToCart = async (event) => {
    event.stopPropagation();

    const marketplaceType = String(product?.marketplaceType || "simple").trim().toLowerCase();
    if (["variable", "grouped"].includes(marketplaceType)) {
      toast("Choose options on the product details page first.");
      navigate(`/products/${productId || product?._id || product?.id}`);
      return;
    }

    const result = await addToCart(product, 1);
    if (!result?.success && result?.error) {
      toast.error(result.error);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={handleViewDetails}
      onKeyDown={handleKeyDown}
      className={`storefront-product-card group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-[22px] border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-[2px] hover:border-gray-300 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40 ${className}`}
    >
      <div className="relative overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-100 p-2.5">
        <div className="absolute left-3 top-3 z-10 flex max-w-[calc(100%-5rem)] flex-col items-start gap-1.5">
          <span className="inline-flex max-w-full items-center rounded-full border border-gray-200 bg-white/95 px-3 py-1 text-[10px] font-semibold text-gray-700 shadow-sm">
            <span className="truncate">{categoryLabel}</span>
          </span>
          {sectionBadgeLabel ? (
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] shadow-sm ${badgeClassName || "bg-black text-white"}`}
            >
              {sectionBadgeLabel}
            </span>
          ) : null}
        </div>

        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-2">
          {discountLabel ? (
            <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white shadow-sm">
              {discountLabel}
            </span>
          ) : null}
          {showCompareButton ? (
            <button
              type="button"
              onClick={handleToggleCompare}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition ${
                isCompared
                  ? "border-black bg-black text-white"
                  : "border-gray-200 text-gray-700 hover:border-black hover:text-black"
              }`}
              aria-label={isCompared ? "Remove from compare" : "Add to compare"}
              title={isCompared ? "Remove from compare" : "Add to compare"}
            >
              <FiShuffle className="h-4 w-4" />
            </button>
          ) : null}
          {topRightSlot}
        </div>

        <div className="relative aspect-square overflow-hidden rounded-[18px] bg-white ring-1 ring-gray-200/60">
          <ProductImage
            src={product?.images?.[0] || product?.image}
            alt={product?.title}
            className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
          />
        </div>
      </div>

      <div className="flex flex-1 flex-col px-3.5 py-3 text-left sm:px-4">
        <div className="space-y-1.5">
          <h3
            title={String(product?.title || "").trim()}
            className="line-clamp-1 text-[13px] font-semibold leading-snug text-black transition-colors group-hover:text-gray-700 sm:text-sm"
          >
            {title || product?.title}
          </h3>

          {product?.brand ? (
            <p className="line-clamp-1 text-[11px] text-gray-500 sm:text-xs">{`Brand: ${product.brand}`}</p>
          ) : null}

          {previewColors.length > 0 || displayMetaLine ? (
            <div className="flex items-center gap-2">
              {previewColors.length > 0 ? (
                <div className="flex shrink-0 items-center gap-1">
                  {previewColors.map((color, index) => (
                    <span
                      key={`${color}-${index}`}
                      className="h-3 w-3 rounded-full border border-gray-300"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  {hasMoreColors ? (
                    <span className="inline-flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-linear-to-br from-black to-gray-700 text-[8px] font-bold text-white shadow-sm">
                      4+
                    </span>
                  ) : null}
                </div>
              ) : null}

              {displayMetaLine ? (
                <p className="line-clamp-1 text-[11px] text-gray-500 sm:text-xs">{displayMetaLine}</p>
              ) : null}
            </div>
          ) : null}

          {showStockBadge || pricing.isTba ? (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {showStockBadge ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                  {stockBadgeText}
                </span>
              ) : null}
              {pricing.isTba ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                  TBA
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="mt-auto flex flex-col gap-3 border-t border-gray-100 pt-3">
          <div className="flex items-baseline justify-start gap-2">
            {pricing.isTba ? (
              <span className="text-base font-black text-gray-950 sm:text-lg">TBA</span>
            ) : (
              <>
                {pricing.hasDiscount ? (
                  <span className="text-xs text-gray-400 line-through sm:text-sm">
                    {Number(pricing.previousPrice || 0).toFixed(2)} Tk
                  </span>
                ) : null}
                <span className="text-base font-black text-gray-950 sm:text-lg">
                  {Number(pricing.currentPrice || 0).toFixed(2)}
                </span>
                <span className="text-xs font-semibold text-gray-600 sm:text-sm">Tk</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {showCartButton ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-gray-200 bg-white text-black transition hover:border-black hover:bg-gray-50 sm:h-[42px] sm:w-[42px]"
                aria-label="Add to cart"
                title="Add to cart"
              >
                <FiShoppingBag className="h-4 w-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleViewDetails();
              }}
              className="mt-auto flex-1 rounded-[14px] bg-gray-900 py-2.5 text-xs font-semibold text-white transition hover:bg-black sm:text-sm"
            >
              {buttonLabel}
            </button>
            {showWishlistButton ? (
              <button
                type="button"
                onClick={handleToggleWishlist}
                disabled={wishlistLoading}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-[14px] border transition sm:h-[42px] sm:w-[42px] ${
                  isWishlisted
                    ? "border-red-500 bg-red-50 text-red-600"
                    : "border-black bg-white text-black hover:border-red-500 hover:text-red-500"
                } disabled:cursor-not-allowed disabled:opacity-60`}
                aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
                title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              >
                <FiHeart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
};

export default StorefrontProductCard;
