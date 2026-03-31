import React, { useEffect, useMemo } from "react";
import { FiArrowLeft, FiHeart, FiTrash2 } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearWishlist, loadWishlist } from "../store/wishlistSlice";
import StorefrontProductCard from "../Home/components/StorefrontProductCard";
import { useCart } from "../context/CartContext";
import {
  getDefaultSelectedVariants,
  getProductPricingForSelectedVariants,
} from "../utils/productVariants";
import { removeWishlistItem } from "../store/wishlistSlice";

const baseUrl = import.meta.env.VITE_API_URL;

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return "";

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

  return baseUrl ? `${baseUrl}/uploads/products/${imagePath}` : imagePath;
};

const getWishlistPreviewImage = (product) => {
  if (!Array.isArray(product?.images)) return getFullImageUrl(product?.image || "");
  return getFullImageUrl(product.images.find(Boolean) || product?.image || "");
};

export default function MyWishlist() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.wishlist.items || []);
  const status = useSelector((state) => state.wishlist.status);
  const source = useSelector((state) => state.wishlist.source || "guest");
  const clearStatus = useSelector((state) => state.wishlist.clearStatus);
  const loading = status === "loading" && items.length === 0;
  const clearing = clearStatus === "loading";
  const { addToCart } = useCart();

  useEffect(() => {
    dispatch(loadWishlist());
  }, [dispatch]);

  const sourceLabel = useMemo(
    () => (source === "auth" ? "Saved to your account" : "Saved on this device"),
    [source],
  );

  const wishlistTotal = useMemo(
    () =>
      items.reduce((sum, product) => {
        const pricing = getProductPricingForSelectedVariants(
          product,
          getDefaultSelectedVariants(),
        );
        return sum + Number(pricing?.currentPrice || 0);
      }, 0),
    [items],
  );

  const previewItems = useMemo(() => items.slice(0, 3), [items]);

  const handleClear = async () => {
    try {
      await dispatch(clearWishlist()).unwrap();
      toast.success("Wishlist cleared");
    } catch (error) {
      toast.error(error || "Failed to clear wishlist");
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/shop");
  };

  const handleAddAllToCart = async () => {
    let addedCount = 0;
    let skippedCount = 0;
    const productsToRemove = [];

    for (const product of [...items]) {
      const marketplaceType = String(product?.marketplaceType || "simple")
        .trim()
        .toLowerCase();

      if (marketplaceType === "grouped") {
        skippedCount += 1;
        continue;
      }

      const result = await addToCart(product, 1, "", "", {
        silent: true,
        selectedVariants: getDefaultSelectedVariants(),
        unitPrice: getProductPricingForSelectedVariants(
          product,
          getDefaultSelectedVariants(),
        ).currentPrice,
      });

      if (result?.success) {
        addedCount += 1;
        productsToRemove.push(String(product?._id || "").trim());
      } else {
        skippedCount += 1;
      }
    }

    if (productsToRemove.length > 0) {
      await Promise.all(
        productsToRemove.map((productId) =>
          dispatch(removeWishlistItem(productId)).unwrap().catch(() => null),
        ),
      );
    }

    if (addedCount > 0) {
      toast.success(
        `${addedCount} wishlist ${addedCount === 1 ? "item" : "items"} moved to cart`,
      );
    }

    if (addedCount === 0 || skippedCount > 0) {
      toast(
        skippedCount > 0
          ? `${skippedCount} item${skippedCount === 1 ? "" : "s"} could not be added automatically`
          : "No wishlist items were added to cart",
      );
    }
  };

  return (
    <div className="site-shell py-8 sm:py-12 lg:py-20">
      <div className="mb-6 sm:mb-8">
        <button
          type="button"
          onClick={handleBack}
          className="group inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500 transition hover:-translate-x-1 hover:text-black"
        >
          <FiArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
      </div>

      <header className="mb-10 flex flex-col gap-6 border-b border-black/5 pb-8 sm:mb-14 sm:gap-8 sm:pb-10 lg:mb-20 lg:flex-row lg:items-end lg:justify-between lg:pb-12">
        <div className="space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
            Your Collection
          </span>
          <div className="space-y-3">
            <h1 className="text-3xl font-extrabold tracking-[-0.05em] text-black sm:text-5xl lg:text-7xl">
              My Wishlist
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-500 sm:text-base sm:leading-7">
              {sourceLabel}. Keep track of the products you want to revisit and move into your cart when you&apos;re ready.
            </p>
          </div>
        </div>

        {items.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={clearing}
            className="group inline-flex items-center gap-2 self-start text-[11px] font-bold uppercase tracking-[0.24em] text-zinc-500 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-60 lg:self-auto"
          >
            <FiTrash2 className="h-4 w-4 transition group-hover:rotate-6" />
            <span>{clearing ? "Clearing..." : "Clear Selection"}</span>
          </button>
        ) : null}
      </header>

      {loading ? (
        <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 px-6 py-16 text-center text-sm text-zinc-500">
          Loading wishlist...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-[2rem] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-16 text-center sm:px-10">
          <FiHeart className="mx-auto mb-5 h-10 w-10 text-zinc-400" />
          <h2 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Your wishlist is empty
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-500 sm:text-base">
            Save products here while you browse, then come back anytime to review them.
          </p>
          <Link
            to="/shop"
            className="mt-8 inline-flex items-center justify-center rounded-full border border-black bg-black px-7 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-zinc-900"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          <div className="storefront-card-grid gap-y-8 pt-2 sm:pt-4 lg:gap-y-10">
            {items.map((product) =>
              product?._id ? (
                <div key={String(product._id)} className="storefront-card-grid__item">
                  <StorefrontProductCard
                    product={product}
                    className="w-full!"
                    onCartActionComplete={async (result, currentProduct) => {
                      if (!result?.success || result?.removed) return;
                      const productId = String(currentProduct?._id || "").trim();
                      if (!productId) return;
                      await dispatch(removeWishlistItem(productId)).unwrap();
                    }}
                    onViewDetails={() => {
                      navigate(`/product/${product._id}`);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              ) : null,
            )}
          </div>

          <section className="mt-12 border-t border-black/10 pt-8 sm:mt-16 sm:pt-12 lg:mt-24 lg:pt-16">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-8">
                <div className="flex -space-x-4 overflow-x-auto pb-1 sm:overflow-visible">
                  {previewItems.map((product, index) => (
                    <div
                      key={`wishlist-preview-${String(product?._id || index)}`}
                      className="h-20 w-16 shrink-0 overflow-hidden border border-white bg-zinc-100 shadow-sm sm:h-28 sm:w-24"
                    >
                      <img
                        src={getWishlistPreviewImage(product)}
                        alt={product?.title || "Wishlist product"}
                        className="h-full w-full object-contain p-3 mix-blend-multiply grayscale transition duration-500 hover:grayscale-0"
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-500">
                    Selection Summary
                  </p>
                  <p className="text-xl font-extrabold tracking-tight text-black sm:text-3xl">
                    {items.length} {items.length === 1 ? "Item" : "Items"} - Total Tk{" "}
                    {wishlistTotal.toFixed(2)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddAllToCart}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden bg-black px-10 py-4 text-xs font-black uppercase tracking-[0.28em] text-white transition hover:bg-zinc-900 sm:w-auto sm:px-14 sm:py-6"
              >
                <span className="relative z-10">Add to Cart</span>
                <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-500 group-hover:translate-y-0" />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
