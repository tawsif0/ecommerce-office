import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

const baseUrl = import.meta.env.VITE_API_URL;

const MarketplaceAds = ({ placement = "home_sidebar", limit = 3 }) => {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchAds = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${baseUrl}/ads/public`, {
          params: { placement },
        });
        if (!mounted) return;

        const rows = Array.isArray(response?.data?.ads) ? response.data.ads : [];
        const picked = rows.slice(0, Math.max(1, Number(limit || 3)));
        setAds(picked);

        picked.forEach((ad) => {
          axios.post(`${baseUrl}/ads/public/${ad._id}/impression`).catch(() => null);
        });
      } catch (_error) {
        if (!mounted) return;
        setAds([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    fetchAds();
    return () => {
      mounted = false;
    };
  }, [placement, limit]);

  const visibleAds = useMemo(
    () => ads.filter((ad) => ad?.bannerUrl).slice(0, Math.max(1, Number(limit || 3))),
    [ads, limit],
  );

  const handleClick = (ad) => {
    axios.post(`${baseUrl}/ads/public/${ad._id}/click`).catch(() => null);
    const target = String(ad?.targetUrl || "").trim();
    if (target) {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  if (loading || visibleAds.length === 0) {
    return null;
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-3 md:px-6 mt-4 md:mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm md:text-base font-semibold text-black">Sponsored</h2>
        <p className="text-xs text-gray-500">Promoted vendor campaigns</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {visibleAds.map((ad) => (
          <button
            key={ad._id}
            type="button"
            onClick={() => handleClick(ad)}
            className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative aspect-[16/6] bg-gray-100">
              <img
                src={ad.bannerUrl}
                alt={ad.title || "Sponsored ad"}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                Ad
              </span>
            </div>
            <div className="px-3 py-2.5">
              <p className="line-clamp-1 text-sm font-semibold text-black">
                {ad.title || "Promoted Campaign"}
              </p>
              <p className="mt-1 line-clamp-1 text-xs text-gray-600">
                {ad.vendor?.storeName || "Marketplace Vendor"}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

export default MarketplaceAds;

