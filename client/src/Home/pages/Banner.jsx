/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import usePublicSettings from "../../hooks/usePublicSettings";
import { getDefaultPublicSettings } from "../../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL || "";

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
    ? `${baseUrl}/uploads/banners/${imagePath}`
    : `/uploads/banners/${imagePath}`;
};

const FallbackImage = ({ className, alt }) => (
  <div className={`${className} relative overflow-hidden bg-white`}>
    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white/70"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-white/80 text-sm font-medium">{alt || "Featured"}</p>
      </div>
    </div>
  </div>
);

const DEFAULT_STOREFRONT = getDefaultPublicSettings().storefront;

const applyTemplate = (value, replacements = {}) => {
  let resolved = String(value || "").trim();
  Object.entries(replacements).forEach(([key, replacement]) => {
    resolved = resolved.replaceAll(`{${key}}`, String(replacement || "").trim());
  });
  return resolved;
};

const getSafeStoreName = (value) => {
  const normalized = String(value || "").trim();
  return normalized.length > 1 ? normalized : "E-Commerce";
};

const HeroImage = ({ src, fullSrc, alt, className, onClick }) => {
  const [imgSrc, setImgSrc] = useState(getFullImageUrl(src || fullSrc));
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initial = getFullImageUrl(src || fullSrc);
    setImgSrc(initial);
    setHasError(false);
    setIsLoading(true);

    if (fullSrc && src !== fullSrc) {
      const fullUrl = getFullImageUrl(fullSrc);
      if (fullUrl && fullUrl !== initial) {
        const preload = new Image();
        preload.onload = () => {
          setImgSrc(fullUrl);
          setIsLoading(false);
        };
        preload.src = fullUrl;
      }
    }
  }, [src, fullSrc]);

  if (hasError || !imgSrc) {
    return (
      <div onClick={onClick} className="cursor-pointer">
        <FallbackImage className={className} alt={alt} />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div
          className={`${className} bg-linear-to-br from-gray-900 to-gray-800 flex items-center justify-center`}
        >
          <div className="w-8 h-8 border-2 border-white/20 border-t-white/70 rounded-full animate-spin" />
        </div>
      )}
      <img
        src={imgSrc}
        alt={alt}
        className={`${className} cursor-pointer transition-all duration-700 ${isLoading ? "opacity-0 absolute" : "opacity-100"}`}
        onClick={onClick}
        onError={() => setHasError(true)}
        onLoad={() => setIsLoading(false)}
        crossOrigin={
          imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://")
            ? "anonymous"
            : undefined
        }
        loading="eager"
      />
    </>
  );
};

const Banner = () => {
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metrics, setMetrics] = useState({
    totalProducts: 0,
    dealCount: 0,
    tbaCount: 0,
    stockUnits: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progressKey, setProgressKey] = useState(Date.now()); // Key to reset animation
  const slideDurationMs = 5000;
  const navigate = useNavigate();
  const { settings } = usePublicSettings();
  const branding = useMemo(
    () => ({
      storeName: getSafeStoreName(settings?.website?.storeName),
      tagline: String(settings?.website?.tagline || "").trim(),
    }),
    [settings],
  );
  const storefront = useMemo(
    () => ({
      ...DEFAULT_STOREFRONT,
      ...(settings?.storefront || {}),
    }),
    [settings],
  );

  const fetchBanners = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${baseUrl}/banners/public`);
      const data = await response.json();

      let bannersData = [];
      if (data.success) bannersData = data.banners || [];
      else if (Array.isArray(data)) bannersData = data;
      else if (data?.data && Array.isArray(data.data)) bannersData = data.data;

      const activeBanners = bannersData.filter((b) => b?.isActive !== false);
      setBanners(activeBanners);
      if (activeBanners.length > 0) setActiveIndex(0);
    } catch (err) {
      console.error("Error fetching banners:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSupportingData = useCallback(async () => {
    try {
      const [categoryResponse, productResponse] = await Promise.allSettled([
        fetch(`${baseUrl}/categories/public`),
        fetch(`${baseUrl}/products/public`),
      ]);

      if (categoryResponse.status === "fulfilled") {
        const categoryData = await categoryResponse.value.json();
        const categoryRows = Array.isArray(categoryData?.categories)
          ? categoryData.categories
          : Array.isArray(categoryData)
            ? categoryData
            : Array.isArray(categoryData?.data)
              ? categoryData.data
              : [];
        setCategories(categoryRows.filter((row) => row?.isActive !== false));
      }

      if (productResponse.status === "fulfilled") {
        const productData = await productResponse.value.json();
        const productRows = Array.isArray(productData?.products)
          ? productData.products
          : Array.isArray(productData)
            ? productData
            : Array.isArray(productData?.data)
              ? productData.data
              : [];

        const dealCount = productRows.filter(
          (product) =>
            String(product?.priceType || "single").toLowerCase() === "best",
        ).length;
        const tbaCount = productRows.filter(
          (product) => String(product?.priceType || "single").toLowerCase() === "tba",
        ).length;
        const stockUnits = productRows.reduce((total, product) => {
          if (String(product?.priceType || "single").toLowerCase() === "tba") {
            return total;
          }

          const stock = Number(product?.stock || 0);
          return stock > 0 ? total + stock : total;
        }, 0);

        setMetrics({
          totalProducts: productRows.length,
          dealCount,
          tbaCount,
          stockUnits,
        });
      }
    } catch {
      setCategories([]);
      setMetrics({
        totalProducts: 0,
        dealCount: 0,
        tbaCount: 0,
        stockUnits: 0,
      });
    }
  }, []);

  useEffect(() => {
    fetchBanners();
    fetchSupportingData();
    const handleUpdate = () => fetchBanners();
    window.addEventListener("bannerCreated", handleUpdate);
    window.addEventListener("bannerUpdated", handleUpdate);
    return () => {
      window.removeEventListener("bannerCreated", handleUpdate);
      window.removeEventListener("bannerUpdated", handleUpdate);
    };
  }, [fetchBanners, fetchSupportingData]);

  // Infinite loop navigation functions
  const handlePrev = useCallback(() => {
    if (isTransitioning || banners.length <= 1) return;

    setIsTransitioning(true);
    setAutoPlay(false);
    setProgressKey(Date.now());

    // Calculate next index with infinite loop
    const nextIndex = activeIndex === 0 ? banners.length - 1 : activeIndex - 1;
    setActiveIndex(nextIndex);

    setTimeout(() => {
      setIsTransitioning(false);
      // Restart autoplay after a delay
      setTimeout(() => setAutoPlay(true), 1000);
    }, 600);
  }, [isTransitioning, banners.length, activeIndex]);

  const handleNext = useCallback(() => {
    if (isTransitioning || banners.length <= 1) return;

    setIsTransitioning(true);
    setProgressKey(Date.now());

    // Calculate next index with infinite loop
    const nextIndex = activeIndex === banners.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(nextIndex);

    setTimeout(() => {
      setIsTransitioning(false);
    }, 600);
  }, [isTransitioning, banners.length, activeIndex]);

  // Autoplay tied to progress duration
  useEffect(() => {
    if (!autoPlay || banners.length <= 1) return;
    if (isTransitioning) return;

    const timeout = setTimeout(() => {
      handleNext();
    }, slideDurationMs);

    return () => clearTimeout(timeout);
  }, [autoPlay, banners.length, isTransitioning, activeIndex, handleNext]);

  const handleDotClick = useCallback(
    (index) => {
      if (isTransitioning || index === activeIndex) return;
      setIsTransitioning(true);
      setActiveIndex(index);
      setAutoPlay(false);
      setProgressKey(Date.now());
      setTimeout(() => {
        setIsTransitioning(false);
        // Restart autoplay after a delay
        setTimeout(() => setAutoPlay(true), 1000);
      }, 600);
    },
    [isTransitioning, activeIndex],
  );

  const handleBannerClick = useCallback(
    (banner) => {
      if (banner.link) navigate(banner.link);
    },
    [navigate],
  );

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handlePrev, handleNext]);

  // Restart autoplay when user stops interacting
  useEffect(() => {
    if (!autoPlay) {
      const timeout = setTimeout(() => {
        setAutoPlay(true);
      }, 8000); // Resume autoplay after 8 seconds of inactivity
      return () => clearTimeout(timeout);
    }
  }, [autoPlay, activeIndex]);

  useEffect(() => {
    if (autoPlay) {
      setProgressKey(Date.now());
    }
  }, [autoPlay, activeIndex]);

  if (loading) {
    return (
      <section className="relative w-full bg-[#f5f5f5] overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="w-14 h-14 border-2 border-white/10 border-t-black rounded-full animate-spin" />
              <div
                className="absolute inset-2 border-2 border-white/5 border-b-black rounded-full animate-spin animate-reverse"
                style={{
                  animationDirection: "reverse",
                  animationDuration: "1.5s",
                }}
              />
            </div>
            <p className="mt-4 text-black text-sm font-light tracking-wide">
              Loading...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (banners.length === 0) {
    return (
      <section className="relative w-full min-h-[520px] bg-[#f5f5f5] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,var(--tw-gradient-stops))] from-violet-500/10 via-transparent to-transparent" />
        <div className="relative h-full flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-black/5 backdrop-blur border border-black/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-black mb-2">
              No Featured Content
            </h2>
            <p className="text-black text-sm">Check back soon for updates</p>
          </div>
        </div>
      </section>
    );
  }

  const currentBanner = banners[activeIndex];
  const featuredCategories = categories.slice(0, 10);
  const highlightedCategories = categories.slice(0, 4);
  const publicStockSummaryEnabled = Boolean(
    settings?.publicStockSummaryEnabled ?? settings?.marketplace?.publicStockSummaryEnabled,
  );
  const storeName = getSafeStoreName(branding.storeName);
  const tagline = String(branding.tagline || "").trim();
  const marketLabel =
    String(storefront?.marketLabel || DEFAULT_STOREFRONT.marketLabel).trim() ||
    DEFAULT_STOREFRONT.marketLabel;
  const heroFallbackTitle =
    applyTemplate(storefront?.heroFallbackTitle, { storeName }) ||
    applyTemplate(DEFAULT_STOREFRONT.heroFallbackTitle, { storeName });
  const heroFallbackDescription =
    String(
      storefront?.heroFallbackDescription || DEFAULT_STOREFRONT.heroFallbackDescription,
    ).trim() || DEFAULT_STOREFRONT.heroFallbackDescription;
  const categoryRailEyebrow =
    String(
      storefront?.categoryRailEyebrow || DEFAULT_STOREFRONT.categoryRailEyebrow,
    ).trim() || DEFAULT_STOREFRONT.categoryRailEyebrow;
  const categoryRailTitle =
    String(storefront?.categoryRailTitle || DEFAULT_STOREFRONT.categoryRailTitle).trim() ||
    DEFAULT_STOREFRONT.categoryRailTitle;
  const categoryRailButtonLabel =
    String(
      storefront?.categoryRailButtonLabel || DEFAULT_STOREFRONT.categoryRailButtonLabel,
    ).trim() || DEFAULT_STOREFRONT.categoryRailButtonLabel;
  const heroPrimaryLabel =
    String(storefront?.heroPrimaryLabel || DEFAULT_STOREFRONT.heroPrimaryLabel).trim() ||
    DEFAULT_STOREFRONT.heroPrimaryLabel;
  const heroSecondaryLabel =
    String(storefront?.heroSecondaryLabel || DEFAULT_STOREFRONT.heroSecondaryLabel).trim() ||
    DEFAULT_STOREFRONT.heroSecondaryLabel;
  const sidebarControlEyebrow =
    String(
      storefront?.sidebarControlEyebrow || DEFAULT_STOREFRONT.sidebarControlEyebrow,
    ).trim() || DEFAULT_STOREFRONT.sidebarControlEyebrow;
  const sidebarControlTitle =
    applyTemplate(storefront?.sidebarControlTitle, { storeName }) ||
    DEFAULT_STOREFRONT.sidebarControlTitle;
  const sidebarControlDescription =
    String(
      storefront?.sidebarControlDescription || DEFAULT_STOREFRONT.sidebarControlDescription,
    ).trim() || DEFAULT_STOREFRONT.sidebarControlDescription;
  const sidebarControlButtonLabel =
    String(
      storefront?.sidebarControlButtonLabel ||
        DEFAULT_STOREFRONT.sidebarControlButtonLabel,
    ).trim() || DEFAULT_STOREFRONT.sidebarControlButtonLabel;
  const discoveryEyebrow =
    String(storefront?.discoveryEyebrow || DEFAULT_STOREFRONT.discoveryEyebrow).trim() ||
    DEFAULT_STOREFRONT.discoveryEyebrow;
  const goToCategory = (categoryId) => {
    if (categoryId) {
      navigate(`/shop?category=${categoryId}`);
      return;
    }
    navigate("/shop");
  };

  return (
    <section className="bg-[#f5f5f5] py-3 md:py-4 lg:py-5">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
          <aside className="hidden lg:block rounded-[28px] border border-gray-200 bg-white px-4 py-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                  {categoryRailEyebrow}
                </p>
                <h2 className="mt-1 text-lg font-bold text-black">{categoryRailTitle}</h2>
              </div>
              <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                {featuredCategories.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {featuredCategories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => goToCategory(category._id)}
                  className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 hover:text-black"
                >
                  <span className="line-clamp-1">{category.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400">
                    {category.type || "All"}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => goToCategory("")}
              className="mt-4 inline-flex w-full items-center justify-center rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-black transition hover:border-black"
            >
              {categoryRailButtonLabel}
            </button>
          </aside>

          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
              {featuredCategories.map((category) => (
                <button
                  key={category._id}
                  type="button"
                  onClick={() => goToCategory(category._id)}
                  className="shrink-0 rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-700"
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="relative min-h-[280px] overflow-hidden rounded-[32px] bg-black sm:min-h-[320px] lg:min-h-[360px]">
              <div className="absolute inset-0">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="absolute inset-0"
                  >
                    <HeroImage
                      src={currentBanner.thumb || currentBanner.image}
                      fullSrc={currentBanner.image}
                      alt={currentBanner.title || "Banner"}
                      className="w-full h-full object-cover object-center"
                      onClick={() => handleBannerClick(currentBanner)}
                    />
                  </motion.div>
                </AnimatePresence>
                <div className="absolute inset-0 bg-linear-to-r from-black via-black/55 to-black/15" />
                <div className="absolute inset-0 bg-linear-to-t from-black/55 via-transparent to-transparent" />
              </div>

              <div className="relative flex h-full flex-col justify-between p-5 sm:p-6 lg:p-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`content-${activeIndex}`}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.55, delay: 0.15 }}
                    className="max-w-2xl pr-10"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2">
                      {currentBanner.subtitle ? (
                        <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
                          {currentBanner.subtitle}
                        </span>
                      ) : null}
                      <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-black">
                        {storeName}
                      </span>
                    </div>

                    <h1 className="max-w-xl text-2xl font-black leading-tight text-white sm:text-3xl lg:text-5xl">
                      {currentBanner.title || heroFallbackTitle}
                    </h1>

                    <p className="mt-3 max-w-lg text-sm leading-6 text-white/80 sm:text-base">
                      {currentBanner.description || tagline || heroFallbackDescription}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(currentBanner.link || "/shop");
                        }}
                        className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:scale-[1.02]"
                      >
                        {heroPrimaryLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => goToCategory("")}
                        className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/15"
                      >
                        {heroSecondaryLabel}
                      </button>
                    </div>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "Categories", value: featuredCategories.length },
                    { label: "Products", value: metrics.totalProducts },
                    { label: "Deals live", value: metrics.dealCount },
                    publicStockSummaryEnabled
                      ? { label: "Stock units", value: metrics.stockUnits || 0 }
                      : { label: "TBA items", value: metrics.tbaCount },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 backdrop-blur-sm"
                    >
                      <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xl font-black text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {banners.length > 1 && (
                <>
                  <button
                    onClick={handlePrev}
                    disabled={isTransitioning}
                    className="absolute left-3 top-1/2 z-10 -translate-y-1/2 group sm:left-4"
                    aria-label="Previous"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 backdrop-blur-md transition-all duration-300 group-hover:bg-white/10">
                      <svg
                        className="h-4 w-4 text-white/80 group-hover:text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M15 19l-7-7 7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  <button
                    onClick={handleNext}
                    disabled={isTransitioning}
                    className="absolute right-3 top-1/2 z-10 -translate-y-1/2 group sm:right-4"
                    aria-label="Next"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/25 backdrop-blur-md transition-all duration-300 group-hover:bg-white/10">
                      <svg
                        className="h-4 w-4 text-white/80 group-hover:text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                </>
              )}

              {banners.length > 1 && (
                <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-4 py-2 backdrop-blur-md">
                    {banners.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => handleDotClick(index)}
                        disabled={isTransitioning}
                        className="group relative p-1"
                        aria-label={`Go to slide ${index + 1}`}
                      >
                        <motion.div
                          className={`relative overflow-hidden rounded-full transition-all duration-500 ${
                            index === activeIndex ? "h-2 w-8" : "h-2 w-2"
                          }`}
                        >
                          <div
                            className={`absolute inset-0 rounded-full ${
                              index === activeIndex ? "bg-gray-700" : "bg-gray-500/70"
                            }`}
                          />
                          {index === activeIndex && autoPlay ? (
                            <motion.div
                              key={`progress-${progressKey}`}
                              className="absolute inset-0 origin-left rounded-full bg-white"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{
                                duration: slideDurationMs / 1000,
                                ease: "linear",
                              }}
                            />
                          ) : null}
                        </motion.div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[ 
                {
                  eyebrow: "Deal discovery",
                  title: `${metrics.dealCount} active deal listings`,
                  text: "Pricing modes, campaigns, and checkout stay wired to inventory without exposing hidden stock counts.",
                  action: "See all deals",
                  onClick: () => goToCategory(""),
                },
                {
                  eyebrow: "Category-first shopping",
                  title: `${featuredCategories.length} active categories`,
                  text: "Use category-driven browsing like a global marketplace, with campaigns and curated discovery blocks.",
                  action: "Open categories",
                  onClick: () => goToCategory(highlightedCategories[0]?._id || ""),
                },
                {
                  eyebrow: marketLabel,
                  title: `${storeName} shopping flow`,
                  text:
                    tagline ||
                    "Keep the ecommerce experience focused on support, checkout trust, and everyday deal browsing for Bangladesh.",
                  action: "Start shopping",
                  onClick: () => navigate("/shop"),
                },
              ].map((card) => (
                <button
                  key={card.title}
                  type="button"
                  onClick={card.onClick}
                  className="rounded-[24px] border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                    {card.eyebrow}
                  </p>
                  <h3 className="mt-2 text-lg font-black text-black">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-600">{card.text}</p>
                  <span className="mt-4 inline-flex text-sm font-semibold text-black">
                    {card.action}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[28px] bg-[linear-gradient(135deg,#050505_0%,#111111_55%,#1d1d1d_100%)] p-5 text-white shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/60">
                {sidebarControlEyebrow}
              </p>
              <h3 className="mt-2 text-2xl font-black">{sidebarControlTitle}</h3>
              <p className="mt-3 text-sm leading-6 text-white/75">
                {sidebarControlDescription}
              </p>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="mt-5 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black"
              >
                {sidebarControlButtonLabel}
              </button>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
                {discoveryEyebrow}
              </p>
              <div className="mt-4 space-y-2">
                {highlightedCategories.length > 0 ? (
                  highlightedCategories.map((category) => (
                    <button
                      key={category._id}
                      type="button"
                      onClick={() => goToCategory(category._id)}
                      className="flex w-full items-center justify-between rounded-2xl bg-gray-50 px-3 py-3 text-left transition hover:bg-gray-100"
                    >
                      <div>
                        <p className="text-sm font-semibold text-black">{category.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-gray-500">
                          {category.type || "General"}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-gray-400">View</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    Categories will appear here once category data is available.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default Banner;
