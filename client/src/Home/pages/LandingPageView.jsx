import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { FiArrowRight } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { setLandingAttribution } from "../../utils/landingAttribution";
import { pushDataLayerEvent } from "../../utils/marketingDataLayer";

const baseUrl = import.meta.env.VITE_API_URL;

const resolveImageValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return resolveImageValue(value[0]);
  if (typeof value === "object") {
    return value.data || value.url || value.secure_url || value.src || value.path || "";
  }
  return "";
};

const getFullImageUrl = (imagePath) => {
  const resolvedPath = resolveImageValue(imagePath);
  if (!resolvedPath) return "";

  if (
    resolvedPath.startsWith("http://") ||
    resolvedPath.startsWith("https://") ||
    resolvedPath.startsWith("data:")
  ) {
    return resolvedPath;
  }

  if (resolvedPath.startsWith("/")) {
    return baseUrl ? `${baseUrl}${resolvedPath}` : resolvedPath;
  }

  return baseUrl ? `${baseUrl}/uploads/products/${resolvedPath}` : `/uploads/products/${resolvedPath}`;
};

const getProductPriceLabel = (product) => {
  const priceType = String(product?.priceType || "single").toLowerCase();
  const price = Number(product?.price || 0);
  const salePrice = Number(product?.salePrice || 0);

  if (priceType === "tba") return "TBA";
  if (priceType === "best" && salePrice > 0 && salePrice < price) {
    return `${salePrice.toFixed(2)} TK`;
  }
  return `${price.toFixed(2)} TK`;
};

const sanitizeInlineScript = (rawCode) =>
  String(rawCode || "")
    .replace(/<script[^>]*>/gi, "")
    .replace(/<\/script>/gi, "")
    .trim();

const appendScriptOnce = (id, src, options = {}) => {
  if (typeof document === "undefined") return;
  if (!id || !src || document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = options.async !== undefined ? options.async : true;
  if (options.defer) script.defer = true;
  document.head.appendChild(script);
};

const appendInlineScriptOnce = (id, scriptBody) => {
  if (typeof document === "undefined") return;
  const code = String(scriptBody || "").trim();
  if (!id || !code || document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.text = code;
  document.head.appendChild(script);
};

const ensureMetaPixel = (pixelId) => {
  if (typeof window === "undefined") return;
  const normalizedPixelId = String(pixelId || "").trim();
  if (!normalizedPixelId) return;

  appendInlineScriptOnce(
    "landing-fb-pixel-bootstrap",
    `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');`,
  );

  const fbq = window.fbq;
  if (typeof fbq !== "function") return;

  window.__landingMetaPixels = window.__landingMetaPixels || new Set();
  if (!window.__landingMetaPixels.has(normalizedPixelId)) {
    fbq("init", normalizedPixelId);
    window.__landingMetaPixels.add(normalizedPixelId);
  }

  if (typeof fbq.callMethod === "function") {
    fbq("trackSingle", normalizedPixelId, "PageView");
  } else {
    fbq("track", "PageView");
  }
};

const ensureGoogleAnalytics = (gaId) => {
  const normalizedGaId = String(gaId || "").trim();
  if (!normalizedGaId || typeof window === "undefined") return;

  appendScriptOnce(
    `landing-ga-script-src-${normalizedGaId}`,
    `https://www.googletagmanager.com/gtag/js?id=${normalizedGaId}`,
  );
  appendInlineScriptOnce(
    `landing-ga-script-inline-${normalizedGaId}`,
    `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', '${normalizedGaId}');`,
  );

  if (typeof window.gtag === "function") {
    window.gtag("config", normalizedGaId, {
      page_path: window.location.pathname,
    });
  }
};

const ensureGoogleTagManager = (gtmId) => {
  const normalizedGtmId = String(gtmId || "").trim();
  if (!normalizedGtmId) return;

  appendInlineScriptOnce(
    `landing-gtm-script-inline-${normalizedGtmId}`,
    `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${normalizedGtmId}');`,
  );
};

const ensureTikTokPixel = (pixelId) => {
  const normalizedPixelId = String(pixelId || "").trim();
  if (!normalizedPixelId) return;

  appendInlineScriptOnce(
    "landing-tt-pixel-bootstrap",
    `!function (w, d, t) {w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=['page','track','identify','instances','debug','on','off','once','ready','alias','group','enableCookie','disableCookie'];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.load=function(e,n){var r='https://analytics.tiktok.com/i18n/pixel/events.js',o=n&&n.partner;ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var s=d.createElement('script');s.type='text/javascript';s.async=true;s.src=r+'?sdkid='+e+'&lib='+t;var a=d.getElementsByTagName('script')[0];a.parentNode.insertBefore(s,a)};ttq.load('${normalizedPixelId}');ttq.page();}(window, document, 'ttq');`,
  );
};

const ensureCustomTrackingCode = (customCode, key = "default") => {
  const code = sanitizeInlineScript(customCode);
  if (!code) return;

  const marker = String(key || "default")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .slice(0, 120);
  appendInlineScriptOnce(`landing-custom-tracking-${marker}`, code);
};

const LandingPageView = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(null);

  const products = useMemo(() => (Array.isArray(page?.products) ? page.products : []), [page]);

  useEffect(() => {
    const normalizedSlug = String(slug || "").trim().toLowerCase();
    if (!normalizedSlug) return;

    let cancelled = false;

    const loadPage = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/landing-pages/public/${normalizedSlug}`);
        if (cancelled) return;

        const landingPage = response.data?.landingPage || null;
        setPage(landingPage);

        if (landingPage?.slug) {
          setLandingAttribution({
            slug: landingPage.slug,
            source: "landing_page",
          });

          axios.post(`${baseUrl}/landing-pages/public/${landingPage.slug}/view`).catch(() => null);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error.response?.data?.message || "Ecommerce landing page not found");
          setPage(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!page) return;

    const metaPixelId = String(page.metaPixelId || page.pixelId || "").trim();
    const gaId = String(page.googleAnalyticsId || "").trim();
    const gtmId = String(page.gtmId || "").trim();
    const tiktokPixelId = String(page.tiktokPixelId || "").trim();
    const customTrackingCode = String(page.customTrackingCode || "").trim();

    ensureMetaPixel(metaPixelId);
    ensureGoogleAnalytics(gaId);
    ensureGoogleTagManager(gtmId);
    ensureTikTokPixel(tiktokPixelId);
    ensureCustomTrackingCode(customTrackingCode, page.slug || page._id || "default");

    pushDataLayerEvent("landing_page_view", {
      ecommerce: {
        landing_page: String(page.slug || "").trim(),
        item_list_name: String(page.title || "").trim(),
        items: products.map((product, index) => ({
          item_id: String(product?._id || "").trim(),
          item_name: String(product?.title || "Product").trim(),
          index,
        })),
      },
    });
  }, [
    page,
    products,
  ]);

  useEffect(() => {
    if (!page) return;

    const title = String(page.headline || page.title || "Ecommerce Landing Page").trim();
    document.title = title || "Ecommerce Landing Page";
  }, [page]);

  if (loading) {
    return (
      <section className="min-h-screen bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-gray-600">Loading ecommerce landing page...</p>
        </div>
      </section>
    );
  }

  if (!page) {
    return (
      <section className="min-h-screen bg-white py-12">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h1 className="text-2xl font-bold text-black mb-2">Ecommerce Landing Page Not Found</h1>
          <p className="text-gray-600">This ecommerce landing link is not active right now.</p>
        </div>
      </section>
    );
  }

  const heroBackground = getFullImageUrl(page.bannerImage);

  return (
    <section className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
        <div className="rounded-2xl border border-gray-200 overflow-hidden bg-linear-to-br from-gray-50 to-white">
          {heroBackground ? (
            <div
              className="h-56 md:h-72 bg-cover bg-center"
              style={{ backgroundImage: `url(${heroBackground})` }}
            />
          ) : null}
          <div className="p-6 md:p-8">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-500 mb-2">Ecommerce Landing</p>
            <h1 className="text-2xl md:text-4xl font-bold text-black">{page.headline || page.title}</h1>
            {page.subheadline ? (
              <p className="text-gray-600 mt-3 max-w-3xl">{page.subheadline}</p>
            ) : null}
            {page.description ? (
              <p className="text-gray-700 mt-4 max-w-3xl">{page.description}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-bold text-black">Products ({products.length})</h2>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 text-sm font-medium text-black hover:underline"
          >
            View full shop
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
            No products have been assigned to this ecommerce landing page.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {products.map((product) => {
              const imageUrl = getFullImageUrl(product?.images?.[0]);
              const priceLabel = getProductPriceLabel(product);
              const isTba = String(product?.priceType || "").toLowerCase() === "tba";

              return (
                <div
                  key={product._id}
                  className="border border-gray-200 rounded-xl overflow-hidden bg-white flex flex-col"
                >
                  <div className="aspect-square bg-gray-100 overflow-hidden">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-2 grow">
                    <h3 className="text-sm font-semibold text-black line-clamp-2">{product.title}</h3>
                    <p className="text-lg font-bold text-black">{priceLabel}</p>

                    <Link
                      to={`/product/${product._id}`}
                      onClick={() =>
                        setLandingAttribution({
                          slug: page.slug,
                          source: "landing_page",
                        })
                      }
                      className={`mt-auto inline-flex h-9 items-center justify-center rounded-lg text-sm font-medium ${
                        isTba
                          ? "bg-gray-200 text-gray-500 pointer-events-none"
                          : "bg-black text-white"
                      }`}
                    >
                      {isTba ? "TBA" : "View Product"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default LandingPageView;
