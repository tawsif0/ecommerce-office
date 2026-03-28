import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toPublicAssetUrl } from "../../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL;

const resolveBrandLogoUrl = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return "";

  if (
    normalized.startsWith("http://") ||
    normalized.startsWith("https://") ||
    normalized.startsWith("data:")
  ) {
    return normalized;
  }

  if (normalized.startsWith("/")) {
    return baseUrl ? `${baseUrl}${normalized}` : normalized;
  }

  return toPublicAssetUrl(normalized);
};

const normalizeBrandRecord = (brand, fallbackDescription = "") => ({
  ...brand,
  name: String(brand?.name || "").trim(),
  description: String(brand?.description || fallbackDescription || "").trim(),
  logoUrl: resolveBrandLogoUrl(brand?.logoUrl || brand?.logo),
});

const getBrandInitials = (name) =>
  String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("") || "BR";

const BrandLogoMarquee = () => {
  const navigate = useNavigate();
  const [brands, setBrands] = useState([]);
  const groupRef = useRef(null);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    let active = true;

    const fetchBrands = async () => {
      try {
        const [brandResponse, productResponse] = await Promise.allSettled([
          axios.get(`${baseUrl}/brands/public`),
          axios.get(`${baseUrl}/products/public`),
        ]);

        if (!active) return;

        const apiBrands =
          brandResponse.status === "fulfilled" && brandResponse.value.data?.success
            ? brandResponse.value.data.brands || []
            : [];

        const productBrands =
          productResponse.status === "fulfilled" && productResponse.value.data?.success
            ? (productResponse.value.data.products || [])
                .map((product) => ({
                  name: String(product?.brand || "").trim(),
                  description: "Shop brand collection",
                }))
                .filter((brand) => brand.name)
            : [];

        const merged = [];
        const seen = new Set();

        [...apiBrands, ...productBrands].forEach((brand) => {
          const normalized = normalizeBrandRecord(brand, "Shop brand collection");
          if (!normalized.name) return;
          const key = normalized.name.toLowerCase();
          if (seen.has(key)) return;
          seen.add(key);
          merged.push(normalized);
        });

        setBrands(merged);
      } catch (_error) {
        if (active) {
          setBrands([]);
        }
      }
    };

    fetchBrands();

    return () => {
      active = false;
    };
  }, []);

  const logoBrands = useMemo(() => {
    const seen = new Set();
    const unique = brands
      .map((brand) => normalizeBrandRecord(brand, "Shop brand collection"))
      .filter((brand) => brand.name)
      .filter((brand) => {
        const key = brand.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (!unique.length) return [];

    const repeated = [...unique];
    while (repeated.length < 10) {
      repeated.push(...unique);
    }

    return repeated.slice(0, Math.max(10, unique.length));
  }, [brands]);

  useEffect(() => {
    if (!logoBrands.length) {
      setScrollDistance(0);
      return undefined;
    }

    const node = groupRef.current;
    if (!node) return undefined;

    const updateWidth = () => {
      const nextWidth = Math.ceil(node.getBoundingClientRect().width);
      setScrollDistance(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }

    const observer = new ResizeObserver(() => updateWidth());
    observer.observe(node);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [logoBrands]);

  if (!logoBrands.length) return null;

  const duration = scrollDistance
    ? Math.max(18, Number((scrollDistance / 85).toFixed(2)))
    : Math.max(24, logoBrands.length * 3.5);

  const handleBrandClick = (brandName) => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    navigate(`/shop?brand=${encodeURIComponent(brandName)}`);
  };

  const renderLogoGroup = (suffix) =>
    logoBrands.map((brand, index) => (
      <button
        key={`${suffix}-${brand._id || brand.name}-${index}`}
        type="button"
        onClick={() => handleBrandClick(brand.name)}
        className={`group flex h-36 min-w-[190px] flex-col items-center justify-center rounded-[30px] px-6 py-5 text-center transition duration-300 hover:-translate-y-1.5 sm:h-40 sm:min-w-[220px] ${
          index % 2 === 0 ? "bg-slate-50" : "bg-slate-100/80"
        }`}
      >
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="h-12 w-auto max-w-[140px] object-contain grayscale transition group-hover:grayscale-0 sm:h-14 sm:max-w-[150px]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-bold tracking-[0.18em] text-white shadow-sm sm:h-16 sm:w-16">
            {getBrandInitials(brand.name)}
          </div>
        )}
        <div className="mt-3 flex min-w-0 flex-col items-center">
          <span className="max-w-full truncate text-sm font-semibold text-slate-900 sm:text-base">
            {brand.name}
          </span>
          <span
            className={`mt-1 max-w-full overflow-hidden whitespace-nowrap text-ellipsis text-[11px] text-slate-500 transition-all duration-300 sm:text-xs ${
              brand.description
                ? "max-h-0 opacity-0 group-hover:max-h-6 group-hover:opacity-100"
                : "max-h-0 opacity-0"
            }`}
            title={brand.description || ""}
          >
            {brand.description || ""}
          </span>
        </div>
      </button>
    ));

  return (
    <section id="top-brands" className="overflow-visible bg-white py-12 sm:py-14 lg:py-16">
      <style>
        {`
          @keyframes brand-logo-marquee-scroll {
            from { transform: translate3d(0, 0, 0); }
            to { transform: translate3d(calc(-1 * var(--brand-scroll-distance, 0px)), 0, 0); }
          }
        `}
      </style>
      <div className="site-shell">
        <div className="mb-8 text-center md:mb-10 lg:mb-12">
          <div className="mb-3 inline-flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900">
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Trending Brands
            </span>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-slate-900 sm:text-3xl md:mb-4 md:text-4xl lg:text-5xl">
            Trusted labels across the store
          </h2>

          <div className="mx-auto max-w-2xl">
            <p className="text-sm leading-relaxed text-slate-500 md:text-base lg:text-lg">
              Tap any logo to jump straight into matching products in the catalog.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <div className="h-px w-16 bg-slate-200" />
              <span className="text-xs uppercase tracking-wide text-slate-400">
                Brand Spotlight
              </span>
              <div className="h-px w-16 bg-slate-200" />
            </div>
          </div>
        </div>

        <div className="relative py-5 sm:py-6">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-white via-white/90 to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-white via-white/90 to-transparent sm:w-24" />
          <div className="overflow-hidden">
            <div
              className="flex w-max will-change-transform [backface-visibility:hidden] [transform:translate3d(0,0,0)]"
              style={{
                "--brand-scroll-distance": `${scrollDistance}px`,
                animation:
                  scrollDistance > 0
                    ? `brand-logo-marquee-scroll ${duration}s linear infinite`
                    : "none",
              }}
            >
              <div
                ref={groupRef}
                className="flex shrink-0 gap-4 px-4 py-3 sm:gap-5 sm:px-6 sm:py-4"
              >
                {renderLogoGroup("first")}
              </div>
              <div
                className="flex shrink-0 gap-4 px-4 py-3 sm:gap-5 sm:px-6 sm:py-4"
                aria-hidden="true"
              >
                {renderLogoGroup("second")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandLogoMarquee;
