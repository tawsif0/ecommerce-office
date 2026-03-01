import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const initialForm = {
  title: "",
  description: "",
  bannerUrl: "",
  targetUrl: "",
  placement: "home_sidebar",
  budget: "",
  costModel: "fixed",
  bidAmount: "",
  startDate: "",
  endDate: "",
  status: "draft",
};

const vendorStatusOptions = ["draft", "pending", "paused"];
const adminStatusOptions = ["pending", "approved", "active", "paused", "rejected", "completed"];
const placementLabels = {
  home_hero: "Homepage Hero",
  home_sidebar: "Homepage Sidebar",
  category: "Category Page",
  search: "Search Page",
  product: "Product Details Page",
};

const statusBadgeClass = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "active") return "bg-emerald-100 text-emerald-700";
  if (normalized === "approved") return "bg-sky-100 text-sky-700";
  if (normalized === "pending") return "bg-amber-100 text-amber-700";
  if (normalized === "rejected") return "bg-red-100 text-red-700";
  if (normalized === "paused") return "bg-zinc-200 text-zinc-700";
  if (normalized === "completed") return "bg-indigo-100 text-indigo-700";
  return "bg-gray-100 text-gray-700";
};

const ModuleAds = () => {
  const { user } = useAuth();
  const [ads, setAds] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rejectionReasons, setRejectionReasons] = useState({});

  const isAdmin = user?.userType === "admin";
  const isVendorSide = user?.userType === "vendor" || user?.userType === "staff";

  const fetchAds = async () => {
    try {
      setLoading(true);

      const endpoint = isAdmin ? `${baseUrl}/ads/admin` : `${baseUrl}/ads/vendor`;
      const response = await axios.get(endpoint, { headers: getAuthHeaders() });
      setAds(response.data?.ads || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load ads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (!isAdmin && !isVendorSide) return;
    fetchAds();
  }, [user, isAdmin, isVendorSide]);

  const handleForm = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const createAd = async (event) => {
    event.preventDefault();

    if (!form.title.trim() || !form.bannerUrl.trim() || !form.startDate || !form.endDate) {
      toast.error("Title, banner URL, start date and end date are required");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${baseUrl}/ads`,
        {
          ...form,
          title: form.title.trim(),
          description: form.description.trim(),
          bannerUrl: form.bannerUrl.trim(),
          targetUrl: form.targetUrl.trim(),
          budget: Number(form.budget || 0),
          bidAmount: Number(form.bidAmount || 0),
        },
        { headers: getAuthHeaders() },
      );
      toast.success("Ad created");
      setForm(initialForm);
      fetchAds();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create ad");
    } finally {
      setSaving(false);
    }
  };

  const updateVendorAdStatus = async (adId, status) => {
    try {
      await axios.put(
        `${baseUrl}/ads/vendor/${adId}`,
        { status },
        { headers: getAuthHeaders() },
      );
      toast.success("Ad updated");
      fetchAds();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update ad");
    }
  };

  const reviewAd = async (adId, status) => {
    try {
      const rejectionReason = String(rejectionReasons?.[adId] || "").trim();
      await axios.patch(
        `${baseUrl}/ads/admin/${adId}/status`,
        {
          status,
          rejectionReason,
        },
        { headers: getAuthHeaders() },
      );
      toast.success("Ad status updated");
      setRejectionReasons((prev) => ({
        ...prev,
        [adId]: "",
      }));
      fetchAds();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update ad status");
    }
  };

  if (!isAdmin && !isVendorSide) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can manage ads.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Paid Ads Module</h1>
        <p className="text-zinc-200 mt-1">
          Standard ecommerce flow: Draft {"->"} Pending {"->"} Approved {"->"} Active {"->"} Completed.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <h2 className="text-sm font-semibold text-black">How ads work</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-5 gap-2">
          {["Draft", "Pending Review", "Approved", "Active", "Completed"].map((step, index) => (
            <div
              key={step}
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-center"
            >
              <p className="text-[11px] uppercase tracking-wide text-gray-500">Step {index + 1}</p>
              <p className="text-sm font-medium text-black mt-0.5">{step}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-600">
          Vendors create campaigns and submit for review. Admin approves/rejects and controls runtime status.
        </p>
      </div>

      {isVendorSide && (
        <form onSubmit={createAd} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Create Ad Campaign</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <input
              name="title"
              value={form.title}
              onChange={handleForm}
              placeholder="Ad title"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="bannerUrl"
              value={form.bannerUrl}
              onChange={handleForm}
              placeholder="Banner image URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              name="targetUrl"
              value={form.targetUrl}
              onChange={handleForm}
              placeholder="Target URL"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <select
              name="placement"
              value={form.placement}
              onChange={handleForm}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="home_hero">Home Hero</option>
              <option value="home_sidebar">Home Sidebar</option>
              <option value="category">Category</option>
              <option value="search">Search</option>
              <option value="product">Product</option>
            </select>
            <select
              name="costModel"
              value={form.costModel}
              onChange={handleForm}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="fixed">Fixed</option>
              <option value="cpc">CPC</option>
              <option value="cpm">CPM</option>
            </select>
            <input
              type="number"
              min="0"
              step="0.01"
              name="budget"
              value={form.budget}
              onChange={handleForm}
              placeholder="Budget"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              name="bidAmount"
              value={form.bidAmount}
              onChange={handleForm}
              placeholder="Bid amount"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleForm}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="date"
              name="endDate"
              value={form.endDate}
              onChange={handleForm}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <select
              name="status"
              value={form.status}
              onChange={handleForm}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="draft">Draft</option>
              <option value="pending">Submit for review</option>
            </select>
          </div>

          <textarea
            name="description"
            value={form.description}
            onChange={handleForm}
            rows={3}
            placeholder="Ad description"
            className="mt-4 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <button
            type="submit"
            disabled={saving}
            className="mt-4 px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : "Create Ad"}
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Campaigns ({ads.length})</h2>
          <button
            onClick={fetchAds}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading ad campaigns...</p>
        ) : ads.length === 0 ? (
          <p className="text-gray-600">No ad campaigns found.</p>
        ) : (
          <div className="space-y-3">
            {ads.map((ad) => (
              <div
                key={ad._id}
                className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center"
              >
                <div className="xl:col-span-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-black">{ad.title}</p>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusBadgeClass(ad.status)}`}
                    >
                      {String(ad.status || "draft")}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Vendor: {ad.vendor?.storeName || "N/A"} | Placement:{" "}
                    {placementLabels[ad.placement] || ad.placement}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(ad.startDate).toLocaleDateString()} - {new Date(ad.endDate).toLocaleDateString()}
                  </p>
                </div>

                <div className="xl:col-span-3 text-sm text-gray-700">
                  <p>Budget: {ad.budget || 0} TK</p>
                  <p>Impressions: {ad.impressions || 0}</p>
                  <p>Clicks: {ad.clicks || 0}</p>
                  <p>
                    CTR:{" "}
                    {ad.impressions > 0
                      ? `${((Number(ad.clicks || 0) / Number(ad.impressions || 1)) * 100).toFixed(2)}%`
                      : "0.00%"}
                  </p>
                </div>

                <div className="xl:col-span-4 flex flex-col gap-2">
                  {isAdmin ? (
                    <>
                      <select
                        value={ad.status}
                        onChange={(event) => reviewAd(ad._id, event.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        {adminStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <input
                        value={rejectionReasons?.[ad._id] || ""}
                        onChange={(event) =>
                          setRejectionReasons((prev) => ({
                            ...prev,
                            [ad._id]: event.target.value,
                          }))
                        }
                        placeholder="Rejection reason (if rejected)"
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                      />
                    </>
                  ) : (
                    <select
                      value={ad.status}
                      onChange={(event) => updateVendorAdStatus(ad._id, event.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    >
                      {vendorStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  )}
                  {ad.rejectionReason ? (
                    <p className="text-xs text-red-600">Reason: {ad.rejectionReason}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleAds;
