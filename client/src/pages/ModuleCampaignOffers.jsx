import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiTag,
  FiGlobe,
  FiImage,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const countBy = (rows = [], predicate = () => false) =>
  rows.reduce((sum, row) => (predicate(row) ? sum + 1 : sum), 0);

const ModuleCampaignOffers = ({ onOpenTab }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [couponRows, setCouponRows] = useState([]);
  const [landingRows, setLandingRows] = useState([]);
  const [adRows, setAdRows] = useState([]);

  const role = String(user?.userType || "").toLowerCase();
  const canAccess = useMemo(
    () => ["admin", "vendor", "staff"].includes(role),
    [role],
  );

  const loadData = useCallback(async () => {
    if (!canAccess) return;

    try {
      setLoading(true);
      const adEndpoint = role === "admin" ? "/ads/admin" : "/ads/vendor";

      const [couponResponse, landingResponse, adResponse] = await Promise.allSettled([
        axios.get(`${baseUrl}/coupons`, { headers: getAuthHeaders() }),
        axios.get(`${baseUrl}/landing-pages`, {
          headers: getAuthHeaders(),
          params: { limit: 100 },
        }),
        axios.get(`${baseUrl}${adEndpoint}`, { headers: getAuthHeaders() }),
      ]);

      if (couponResponse.status === "fulfilled") {
        setCouponRows(couponResponse.value.data?.coupons || []);
      } else {
        setCouponRows([]);
      }

      if (landingResponse.status === "fulfilled") {
        setLandingRows(landingResponse.value.data?.landingPages || []);
      } else {
        setLandingRows([]);
      }

      if (adResponse.status === "fulfilled") {
        setAdRows(adResponse.value.data?.ads || []);
      } else {
        setAdRows([]);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load campaign data");
    } finally {
      setLoading(false);
    }
  }, [canAccess, role]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const activeCoupons = countBy(couponRows, (row) => row?.isActive !== false);
    const freeDeliveryOffers = countBy(
      couponRows,
      (row) => String(row?.offerType || "discount").toLowerCase() === "free_shipping",
    );
    const comboOffers = countBy(
      couponRows,
      (row) => String(row?.offerType || "discount").toLowerCase() === "combo",
    );
    const publishedLanding = countBy(landingRows, (row) => row?.isActive !== false);
    const liveAds = countBy(adRows, (row) =>
      ["approved", "active"].includes(String(row?.status || "").toLowerCase()),
    );

    return {
      totalCoupons: couponRows.length,
      activeCoupons,
      freeDeliveryOffers,
      comboOffers,
      totalLanding: landingRows.length,
      publishedLanding,
      totalAds: adRows.length,
      liveAds,
    };
  }, [couponRows, landingRows, adRows]);

  if (!canAccess) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can access campaign offers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Campaign & Offer Center</h1>
        <p className="text-zinc-200 mt-2">
          Manage coupons, ecommerce landing pages, ads, and promotional assets from one place.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Coupons</p>
          <p className="text-xl font-bold text-black mt-1">{summary.totalCoupons}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Active Coupons</p>
          <p className="text-xl font-bold text-black mt-1">{summary.activeCoupons}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Free Delivery</p>
          <p className="text-xl font-bold text-black mt-1">{summary.freeDeliveryOffers}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Combo Offers</p>
          <p className="text-xl font-bold text-black mt-1">{summary.comboOffers}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Ecommerce Landing</p>
          <p className="text-xl font-bold text-black mt-1">{summary.totalLanding}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Published Ecommerce Landing</p>
          <p className="text-xl font-bold text-black mt-1">{summary.publishedLanding}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Ads</p>
          <p className="text-xl font-bold text-black mt-1">{summary.totalAds}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Live Ads</p>
          <p className="text-xl font-bold text-black mt-1">{summary.liveAds}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-black">Campaign Actions</h2>
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 px-4 border border-gray-300 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => onOpenTab?.("coupons")}
            className="h-11 inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
              <FiTag className="w-4 h-4" />
              Coupons
            </span>
            <FiArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenTab?.("create-banner")}
            className="h-11 inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
              <FiImage className="w-4 h-4" />
              Banners
            </span>
            <FiArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenTab?.("module-landing-pages")}
            className="h-11 inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
              <FiGlobe className="w-4 h-4" />
              Ecommerce Landing
            </span>
            <FiArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onOpenTab?.("module-ads")}
            className="h-11 inline-flex items-center justify-between rounded-lg border border-gray-200 px-4 hover:bg-gray-50"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium text-gray-800">
              <FiImage className="w-4 h-4" />
              Paid Ads
            </span>
            <FiArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModuleCampaignOffers;
