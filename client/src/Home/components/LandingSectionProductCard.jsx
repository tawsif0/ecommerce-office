import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiHeart,
  FiShoppingBag,
  FiShuffle,
  FiStar,
} from "react-icons/fi";
import { toast } from "react-hot-toast";
import { getProductPricingDisplay } from "../../utils/productPricing";
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
    className={`${className} flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200`}
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

const formatPrice = (value) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "TBA";
  const isWhole = Math.abs(amount % 1) < 0.001;
  return `Tk${amount.toLocaleString("en-US", {
    minimumFractionDigits: isWhole ? 0 : 2,
    maximumFractionDigits: isWhole ? 0 : 2,
  })}`;
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

const getSectionBadgeLabel = (categoryLabel, badgeText) => {
  const normalizedBadge = String(badgeText || "").trim();
  if (!normalizedBadge) return "";
  if (normalizedBadge.toLowerCase() === categoryLabel.toLowerCase()) return "";
  return normalizedBadge;
};

const useProductCardState = (product) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const compareItems = useSelector((state) => state.compare.items || []);
  const wishlistItems = useSelector((state) => state.wishlist.items || []);
  const wishlistPendingIds = useSelector(selectWishlistPendingIds);
  const pricing = useMemo(() => getProductPricingDisplay(product), [product]);
  const productId = String(product?._id || product?.id || "").trim();

  const isCompared = compareItems.some(
    (item) => String(item?._id || item?.id || "") === productId,
  );
  const isWishlisted = wishlistItems.some(
    (item) => String(item?._id || item?.id || "") === productId,
  );
  const wishlistLoading = wishlistPendingIds.includes(productId);

  const toggleCompare = (event) => {
    event.stopPropagation();
    const snapshot = createProductSnapshot(product);
    if (!snapshot) return;
    dispatch(toggleCompareItem(snapshot));
  };

  const toggleWishlist = async (event) => {
    event.stopPropagation();
    if (wishlistLoading) return;

    try {
      await dispatch(toggleWishlistItem(product)).unwrap();
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    } catch (error) {
      toast.error(error || "Failed to update wishlist");
    }
  };

  const addProductToCart = async (event) => {
    event.stopPropagation();

    const marketplaceType = String(product?.marketplaceType || "simple")
      .trim()
      .toLowerCase();
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

  return {
    pricing,
    isCompared,
    isWishlisted,
    wishlistLoading,
    addProductToCart,
    toggleCompare,
    toggleWishlist,
  };
};

const IconButton = ({
  label,
  onClick,
  children,
  className = "",
  disabled = false,
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    onClick={onClick}
    disabled={disabled}
    className={className}
  >
    {children}
  </button>
);

const getWishlistIconButtonClassName = (isWishlisted, extraClassName = "") =>
  `${extraClassName} ${
    isWishlisted
      ? "border-white bg-white text-red-600 shadow-sm"
      : "border-white bg-white text-black shadow-sm hover:text-red-500"
  }`;

const PopularCard = ({
  product,
  categoryLabel,
  sectionBadgeLabel,
  discountLabel,
  pricing,
  isCompared,
  isWishlisted,
  wishlistLoading,
  addProductToCart,
  onViewDetails,
  toggleCompare,
  toggleWishlist,
}) => (
  <article
    role="button"
    tabIndex={0}
    onClick={onViewDetails}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onViewDetails();
      }
    }}
    className="home-spotlight-card home-showcase-font group relative flex h-full min-h-[17rem] cursor-pointer flex-col overflow-hidden rounded-xl border border-white/6 bg-[#262722] transition duration-300 hover:-translate-y-[2px] hover:border-[#D4AF37]/25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40 md:min-h-[18.25rem] lg:min-h-[19.5rem]"
  >
    <div className="relative aspect-square overflow-hidden bg-black">
      <IconButton
        label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={toggleWishlist}
        disabled={wishlistLoading}
        className={`${getWishlistIconButtonClassName(
          isWishlisted,
          "absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
        )} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <FiHeart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
      </IconButton>
      <ProductImage
        src={product?.images?.[0] || product?.image}
        alt={product?.title}
        className="h-full w-full object-cover opacity-90 transition-transform duration-1000 group-hover:scale-110"
      />
    </div>

    <div className="flex flex-1 flex-col gap-3 p-5">
      <div>
        <div className="mb-3 flex min-h-[1.75rem] flex-wrap items-center gap-2">
          <span className="home-showcase-label rounded-full border border-white/10 px-2 py-0.5 text-[8px] font-medium uppercase tracking-[0.3em] text-white/45">
            {categoryLabel}
          </span>
          {sectionBadgeLabel ? (
            <span className="home-showcase-label rounded-full border border-white/14 bg-white/6 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-white/82">
              {sectionBadgeLabel}
            </span>
          ) : null}
          {discountLabel ? (
            <span className="home-showcase-label rounded-full border border-white/14 bg-white/6 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-white">
              {discountLabel}
            </span>
          ) : null}
        </div>
        <h3 className="line-clamp-1 text-base font-extrabold leading-tight text-white md:text-lg">
          {product?.title}
        </h3>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-white/6 pt-4">
        <span className="home-showcase-label text-sm font-bold text-white">
          {pricing.isTba ? "TBA" : formatPrice(pricing.currentPrice)}
        </span>
        <div className="flex items-center gap-3">
          <IconButton
            label="Add to cart"
            onClick={addProductToCart}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/14 bg-white/6 text-white/55 shadow-sm transition hover:border-white/28 hover:bg-white/10 hover:text-white"
          >
            <FiShoppingBag className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={isCompared ? "Remove from compare" : "Add to compare"}
            onClick={toggleCompare}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
              isCompared
                ? "bg-white text-[#1B1C18]"
                : "text-white/45 hover:text-white"
            }`}
          >
            <FiShuffle className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="View details"
            onClick={(event) => {
            event.stopPropagation();
            onViewDetails();
          }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/45 transition-transform duration-300 hover:translate-x-1 hover:text-white"
          >
            <FiArrowRight className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
    </div>
  </article>
);

const HotDealCard = ({
  product,
  categoryLabel,
  sectionBadgeLabel,
  discountLabel,
  pricing,
  isCompared,
  isWishlisted,
  wishlistLoading,
  addProductToCart,
  onViewDetails,
  toggleCompare,
  toggleWishlist,
}) => (
  <article
    role="button"
    tabIndex={0}
    onClick={onViewDetails}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onViewDetails();
      }
    }}
    className="home-showcase-font home-showcase-shadow group flex h-full min-h-[16.5rem] cursor-pointer flex-col rounded-xl bg-white p-3 transition duration-300 hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40 md:min-h-[17.5rem] lg:min-h-[18.75rem]"
  >
    <div className="relative mb-3 aspect-square overflow-hidden rounded-lg bg-[#F5F3ED]">
      {discountLabel ? (
        <span className="home-showcase-label absolute right-2 top-2 z-10 rounded-sm bg-[#1B1C18] px-1.5 py-0.5 text-[9px] font-bold text-white">
          {discountLabel}
        </span>
      ) : null}
      <ProductImage
        src={product?.images?.[0] || product?.image}
        alt={product?.title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
    </div>

    <div className="flex flex-1 flex-col text-left">
      <div className="mb-3 flex min-h-[1.7rem] flex-wrap items-center gap-2">
        <span className="home-showcase-label rounded-full bg-[#FBF9F3] px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.22em] text-[#6B665B]">
          {categoryLabel}
        </span>
        {sectionBadgeLabel ? (
          <span className="home-showcase-label rounded-full border border-black/10 bg-black/5 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.22em] text-[#1B1C18]">
            {sectionBadgeLabel}
          </span>
        ) : null}
      </div>
      <h3 className="line-clamp-1 text-sm font-extrabold text-[#1B1C18]">
        {product?.title}
      </h3>

      <div className="mt-auto flex items-end justify-between pt-4">
        <div className="space-y-1">
          <p className="home-showcase-label text-sm font-bold text-[#1B1C18]">
            {pricing.isTba ? "TBA" : formatPrice(pricing.currentPrice)}
          </p>
          {pricing.hasDiscount ? (
            <p className="home-showcase-label text-[10px] text-[#8B8579] line-through">
              {formatPrice(pricing.previousPrice)}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <IconButton
            label="Add to cart"
            onClick={addProductToCart}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E0D4] bg-white text-[#5A564C] transition hover:border-[#1B1C18] hover:text-[#1B1C18]"
          >
            <FiShoppingBag className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={isCompared ? "Remove from compare" : "Add to compare"}
            onClick={toggleCompare}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E7E0D4] transition ${
              isCompared
                ? "bg-[#1B1C18] text-white"
                : "text-[#5A564C] hover:text-[#1B1C18]"
            }`}
          >
            <FiShuffle className="h-4 w-4" />
          </IconButton>
          <IconButton
            label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
            onClick={toggleWishlist}
            disabled={wishlistLoading}
            className={`${getWishlistIconButtonClassName(
              isWishlisted,
              "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
            )} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            <FiHeart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
          </IconButton>
        </div>
      </div>
    </div>
  </article>
);

const FeaturedCard = ({
  product,
  categoryLabel,
  pricing,
  isCompared,
  isWishlisted,
  wishlistLoading,
  addProductToCart,
  onViewDetails,
  toggleCompare,
  toggleWishlist,
}) => (
  <article
    role="button"
    tabIndex={0}
    onClick={onViewDetails}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onViewDetails();
      }
    }}
    className="home-showcase-font group flex h-full min-h-[18.5rem] cursor-pointer flex-col rounded-2xl bg-white p-3 transition duration-300 hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/35 md:min-h-[19.75rem] lg:min-h-[21rem]"
  >
    <div className="relative aspect-[4/5] overflow-hidden rounded-[1rem] bg-[#F5F3ED] home-showcase-shadow">
      <span className="home-showcase-label absolute left-3 top-3 z-10 rounded-full bg-white/90 px-2 py-1 text-[8px] uppercase tracking-[0.26em] text-[#5C5346]">
        {categoryLabel}
      </span>
      <IconButton
        label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        onClick={toggleWishlist}
        disabled={wishlistLoading}
        className={`${getWishlistIconButtonClassName(
          isWishlisted,
          "absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
        )} disabled:cursor-not-allowed disabled:opacity-60`}
      >
        <FiHeart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
      </IconButton>
      <ProductImage
        src={product?.images?.[0] || product?.image}
        alt={product?.title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
    </div>

    <div className="flex flex-1 flex-col px-1 pt-4 text-left">
      <span className="home-showcase-label text-[10px] uppercase tracking-[0.3em] text-[#807462]">
        {pricing.isTba ? "Price on request" : `From ${formatPrice(pricing.currentPrice)}`}
      </span>
      <h3 className="mt-2 line-clamp-1 text-lg font-extrabold text-[#1B1C18]">
        {product?.title}
      </h3>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onViewDetails();
        }}
        className="home-showcase-label mt-4 self-start border-b border-[#1B1C18] pb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#1B1C18]"
      >
        View Details
      </button>
      <div className="mt-auto flex items-center gap-4 pt-4">
        <IconButton
          label="Add to cart"
          onClick={addProductToCart}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#62594C] transition hover:text-[#1B1C18]"
        >
          <FiShoppingBag className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={isCompared ? "Remove from compare" : "Add to compare"}
          onClick={toggleCompare}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
            isCompared
              ? "bg-[#1B1C18] text-white"
              : "text-[#62594C] hover:text-[#1B1C18]"
          }`}
        >
          <FiShuffle className="h-4 w-4" />
        </IconButton>
        <IconButton
          label="View details"
          onClick={(event) => {
            event.stopPropagation();
            onViewDetails();
          }}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#62594C] transition hover:text-[#1B1C18]"
        >
          <FiArrowRight className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  </article>
);

const BestSellingCard = ({
  product,
  categoryLabel,
  pricing,
  isCompared,
  isWishlisted,
  wishlistLoading,
  addProductToCart,
  onViewDetails,
  toggleCompare,
  toggleWishlist,
}) => {
  const ratingValue = Number(product?.averageRating || product?.rating || 0);
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onViewDetails}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onViewDetails();
        }
      }}
      className="home-showcase-font group flex h-full min-h-[16.75rem] cursor-pointer flex-col text-left transition duration-300 hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/35 md:min-h-[17.75rem] lg:min-h-[19rem]"
    >
      <div className="home-showcase-shadow relative mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white p-6">
        <ProductImage
          src={product?.images?.[0] || product?.image}
          alt={product?.title}
          className="max-h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
        />
        <div className="home-showcase-label absolute left-3 top-3 rounded px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.28em] text-[#575042] backdrop-blur-sm bg-[#F5F3ED]/90">
          {categoryLabel}
        </div>
      </div>

      <div className="px-1">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="line-clamp-1 text-sm font-extrabold text-[#1B1C18]">
            {product?.title}
          </h3>
          <div className="flex items-center text-[10px] font-bold text-[#1B1C18]">
            {hasRating ? (
              <>
                <FiStar className="mr-1 h-3.5 w-3.5 fill-current" />
                {ratingValue.toFixed(1)}
              </>
            ) : null}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="home-showcase-label text-sm font-bold text-[#1B1C18]">
            {pricing.isTba ? "TBA" : formatPrice(pricing.currentPrice)}
          </span>
          <div className="flex items-center gap-2">
            <IconButton
              label="Add to cart"
              onClick={addProductToCart}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5A5448] transition hover:text-[#1B1C18]"
            >
              <FiShoppingBag className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={isCompared ? "Remove from compare" : "Add to compare"}
              onClick={toggleCompare}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-full transition ${
                isCompared
                  ? "bg-[#1B1C18] text-white"
                  : "text-[#5A5448] hover:text-[#1B1C18]"
              }`}
            >
              <FiShuffle className="h-4 w-4" />
            </IconButton>
            <IconButton
              label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
              onClick={toggleWishlist}
              disabled={wishlistLoading}
              className={`${getWishlistIconButtonClassName(
                isWishlisted,
                "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
              )} disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <FiHeart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
            </IconButton>
          </div>
        </div>
      </div>
    </article>
  );
};

const LatestCard = ({
  product,
  pricing,
  isCompared,
  isWishlisted,
  wishlistLoading,
  addProductToCart,
  onViewDetails,
  toggleCompare,
  toggleWishlist,
}) => (
  <article
    role="button"
    tabIndex={0}
    onClick={onViewDetails}
    onKeyDown={(event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onViewDetails();
      }
    }}
    className="home-showcase-font group flex h-full min-h-[16.75rem] cursor-pointer flex-col text-center transition duration-300 hover:-translate-y-[2px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/35 md:min-h-[17.75rem] lg:min-h-[19rem]"
  >
    <div className="home-showcase-shadow relative mb-4 aspect-square overflow-hidden rounded-2xl bg-[#F5F3ED]">
      <div className="home-showcase-label absolute right-3 top-3 z-10 rounded-full bg-white/80 px-2 py-1 text-[8px] font-bold uppercase tracking-[0.28em] text-[#1B1C18] backdrop-blur-md">
        New
      </div>
      <ProductImage
        src={product?.images?.[0] || product?.image}
        alt={product?.title}
        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="absolute bottom-3 right-3 flex gap-2">
        <IconButton
          label="Add to cart"
          onClick={addProductToCart}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white bg-white text-black transition hover:border-black hover:text-black"
        >
          <FiShoppingBag className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={isCompared ? "Remove from compare" : "Add to compare"}
          onClick={toggleCompare}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm transition ${
            isCompared
              ? "text-[#1B1C18]"
              : "text-[#535A63] hover:text-[#1B1C18]"
          }`}
        >
          <FiShuffle className="h-4 w-4" />
        </IconButton>
        <IconButton
          label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          onClick={toggleWishlist}
          disabled={wishlistLoading}
          className={`${getWishlistIconButtonClassName(
            isWishlisted,
            "inline-flex h-9 w-9 items-center justify-center rounded-full border transition",
          )} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          <FiHeart className={`h-4 w-4 ${isWishlisted ? "fill-current" : ""}`} />
        </IconButton>
      </div>
    </div>

    <div className="px-2">
      <span className="home-showcase-label mb-1 block text-[9px] font-bold uppercase tracking-[0.34em] text-[#1B1C18]">
        Fresh Arrival
      </span>
      <h3 className="line-clamp-1 text-sm font-extrabold text-[#1B1C18]">
        {product?.title}
      </h3>
      <p className="home-showcase-label mt-1 text-xs font-bold text-[#1B1C18]">
        {pricing.isTba ? "TBA" : formatPrice(pricing.currentPrice)}
      </p>
    </div>
  </article>
);

const LandingSectionProductCard = ({
  product,
  variant,
  badgeText = "",
  onViewDetails,
}) => {
  const {
    pricing,
    isCompared,
    isWishlisted,
    wishlistLoading,
    addProductToCart,
    toggleCompare,
    toggleWishlist,
  } = useProductCardState(product);
  const discountLabel = buildDiscountLabel(pricing);
  const categoryLabel = getCategoryLabel(product, badgeText);
  const sectionBadgeLabel = getSectionBadgeLabel(categoryLabel, badgeText);
  const handleViewDetails = () => {
    if (typeof onViewDetails === "function") {
      onViewDetails(product);
    }
  };

  const sharedProps = {
    product,
    categoryLabel,
    sectionBadgeLabel,
    discountLabel,
    pricing,
    isCompared,
    isWishlisted,
    wishlistLoading,
    addProductToCart,
    onViewDetails: handleViewDetails,
    toggleCompare,
    toggleWishlist,
  };

  switch (variant) {
    case "hot-deals":
      return <HotDealCard {...sharedProps} />;
    case "featured":
      return <FeaturedCard {...sharedProps} />;
    case "best-selling":
      return <BestSellingCard {...sharedProps} />;
    case "latest":
      return <LatestCard {...sharedProps} />;
    case "popular":
    default:
      return <PopularCard {...sharedProps} />;
  }
};

export default LandingSectionProductCard;
