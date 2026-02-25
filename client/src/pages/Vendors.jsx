import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiClock, FiMapPin, FiSearch, FiStar, FiUsers } from "react-icons/fi";

const baseUrl = import.meta.env.VITE_API_URL;

const fallbackBanner =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";

const getFullVendorMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;
  if (
    mediaPath.startsWith("http://") ||
    mediaPath.startsWith("https://") ||
    mediaPath.startsWith("data:")
  ) {
    return mediaPath;
  }
  if (mediaPath.startsWith("/")) {
    return `${baseUrl}${mediaPath}`;
  }
  return `${baseUrl}/${mediaPath}`;
};

const Vendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchVendors = async (query = "") => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendors`, {
        params: query ? { search: query } : {},
      });
      setVendors(response.data?.vendors || []);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleSearch = (event) => {
    event.preventDefault();
    fetchVendors(search.trim());
  };

  return (
    <section className="min-h-screen bg-linear-to-b from-stone-50 via-white to-stone-100 py-10 md:py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-black text-white rounded-full mb-4">
            <FiUsers className="w-6 h-6" />
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-black">Vendor Marketplace</h1>
          <p className="text-gray-600 mt-3 max-w-2xl mx-auto">
            Explore curated stores from trusted sellers in one multi-vendor platform.
          </p>
        </div>

        <form onSubmit={handleSearch} className="max-w-2xl mx-auto mb-8">
          <div className="flex gap-2 bg-white border border-gray-200 rounded-xl p-2 shadow-sm">
            <FiSearch className="w-5 h-5 text-gray-500 mt-2 ml-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search vendor stores..."
              className="flex-1 px-2 py-1.5 outline-none"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold"
            >
              Search
            </button>
          </div>
        </form>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-12 h-12 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-600">No vendor stores found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {vendors.map((vendor) => (
              <Link
                key={vendor._id}
                to={`/store/${vendor.slug}`}
                className="group bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300"
              >
                <div className="h-44 overflow-hidden">
                  <img
                    src={getFullVendorMediaUrl(vendor.banner) || fallbackBanner}
                    alt={vendor.storeName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 shrink-0">
                      {vendor.logo ? (
                        <img
                          src={getFullVendorMediaUrl(vendor.logo)}
                          alt={vendor.storeName}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-black">{vendor.storeName}</h2>
                      <p className="text-xs text-gray-500">@{vendor.slug}</p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 line-clamp-2 min-h-10">
                    {vendor.description || "Trusted vendor store on this marketplace."}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <FiMapPin className="w-4 h-4" />
                      {vendor.city || "Bangladesh"}
                    </span>
                    <span className="font-semibold text-black">
                      {vendor.productCount || 0} products
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <FiStar className="w-3.5 h-3.5 text-yellow-500" />
                      {Number(vendor.ratingAverage || 0).toFixed(1)} (
                      {vendor.ratingCount || 0})
                    </span>
                    {vendor.openingHours && (
                      <span className="inline-flex items-center gap-1">
                        <FiClock className="w-3.5 h-3.5" />
                        {vendor.openingHours}
                      </span>
                    )}
                    {vendor.vacationMode && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                        Vacation Mode
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default Vendors;
