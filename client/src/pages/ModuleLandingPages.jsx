import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiGlobe,
  FiBarChart2,
  FiEdit2,
  FiExternalLink,
  FiRefreshCw,
  FiSave,
  FiTrash2,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const emptyForm = {
  title: "",
  slug: "",
  headline: "",
  subheadline: "",
  bannerImage: "",
  pixelId: "",
  metaPixelId: "",
  googleAnalyticsId: "",
  gtmId: "",
  tiktokPixelId: "",
  customTrackingCode: "",
  description: "",
  products: [],
  isActive: true,
};

const ModuleLandingPages = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pages, setPages] = useState([]);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [statsTarget, setStatsTarget] = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const canAccess = useMemo(
    () => ["admin", "vendor", "staff"].includes(String(user?.userType || "").toLowerCase()),
    [user?.userType],
  );

  const fetchData = useCallback(async (nextSearch = search) => {
    if (!canAccess) return;

    try {
      setLoading(true);
      const [pagesResponse, productsResponse] = await Promise.all([
        axios.get(`${baseUrl}/landing-pages`, {
          headers: getAuthHeaders(),
          params: {
            search: nextSearch || undefined,
            limit: 100,
          },
        }),
        axios.get(`${baseUrl}/products`, {
          headers: getAuthHeaders(),
        }),
      ]);

      setPages(pagesResponse.data?.landingPages || []);
      setProducts(productsResponse.data?.products || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load ecommerce landing pages");
      setPages([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!String(form.title || "").trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: String(form.title || "").trim(),
        slug: String(form.slug || "").trim(),
        headline: String(form.headline || "").trim(),
        subheadline: String(form.subheadline || "").trim(),
        bannerImage: String(form.bannerImage || "").trim(),
        pixelId: String(form.pixelId || "").trim(),
        metaPixelId: String(form.metaPixelId || "").trim(),
        googleAnalyticsId: String(form.googleAnalyticsId || "").trim(),
        gtmId: String(form.gtmId || "").trim(),
        tiktokPixelId: String(form.tiktokPixelId || "").trim(),
        customTrackingCode: String(form.customTrackingCode || "").trim(),
        description: String(form.description || "").trim(),
        products: Array.isArray(form.products)
          ? form.products.filter(Boolean)
          : [],
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await axios.patch(`${baseUrl}/landing-pages/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Ecommerce landing page updated");
      } else {
        await axios.post(`${baseUrl}/landing-pages`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Ecommerce landing page created");
      }

      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save ecommerce landing page");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (page) => {
    try {
      const response = await axios.get(`${baseUrl}/landing-pages/${page._id}`, {
        headers: getAuthHeaders(),
      });

      const row = response.data?.landingPage;
      if (!row) return;

      setEditingId(row._id);
      setForm({
        title: row.title || "",
        slug: row.slug || "",
        headline: row.headline || "",
        subheadline: row.subheadline || "",
        bannerImage: row.bannerImage || "",
        pixelId: row.pixelId || row.metaPixelId || "",
        metaPixelId: row.metaPixelId || row.pixelId || "",
        googleAnalyticsId: row.googleAnalyticsId || "",
        gtmId: row.gtmId || "",
        tiktokPixelId: row.tiktokPixelId || "",
        customTrackingCode: row.customTrackingCode || "",
        description: row.description || "",
        products: Array.isArray(row.products) ? row.products.map((item) => item?._id || item) : [],
        isActive: row.isActive !== false,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load ecommerce landing page");
    }
  };

  const handleDelete = async (page) => {
    const ok = window.confirm(`Delete ecommerce landing page ${page.title}?`);
    if (!ok) return;

    try {
      await axios.delete(`${baseUrl}/landing-pages/${page._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Ecommerce landing page deleted");
      if (editingId === page._id) {
        resetForm();
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete ecommerce landing page");
    }
  };

  const openStats = async (page) => {
    setStatsTarget(page);
    setStatsData(null);
    try {
      setStatsLoading(true);
      const response = await axios.get(`${baseUrl}/landing-pages/${page._id}/stats`, {
        headers: getAuthHeaders(),
      });
      setStatsData(response.data?.stats || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load landing stats");
    } finally {
      setStatsLoading(false);
    }
  };

  const publicLandingUrl = (slug) => `${window.location.origin}/lp/${slug}`;

  if (!canAccess) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can access ecommerce landing pages.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiGlobe className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Ecommerce Landing Page Builder</h1>
        <p className="text-zinc-200 mt-2">
          Create ecommerce landing pages, assign products, and track page-level orders.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-black">
            {editingId ? "Edit Ecommerce Landing Page" : "Create Ecommerce Landing Page"}
          </h2>

          <input
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Title"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Slug (optional)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.headline}
            onChange={(event) => setForm((prev) => ({ ...prev, headline: event.target.value }))}
            placeholder="Headline"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.subheadline}
            onChange={(event) => setForm((prev) => ({ ...prev, subheadline: event.target.value }))}
            placeholder="Subheadline"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.bannerImage}
            onChange={(event) => setForm((prev) => ({ ...prev, bannerImage: event.target.value }))}
            placeholder="Banner image URL"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <div className="border border-gray-200 rounded-lg p-3 space-y-2.5">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-[0.08em]">
              Tracking & Pixel Setup
            </p>
            <input
              value={form.metaPixelId}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  metaPixelId: event.target.value,
                  pixelId: event.target.value,
                }))
              }
              placeholder="Meta Pixel ID"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              value={form.googleAnalyticsId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, googleAnalyticsId: event.target.value }))
              }
              placeholder="Google Analytics ID (G-XXXXXXXXXX)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              value={form.gtmId}
              onChange={(event) => setForm((prev) => ({ ...prev, gtmId: event.target.value }))}
              placeholder="Google Tag Manager ID (GTM-XXXXXXX)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              value={form.tiktokPixelId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, tiktokPixelId: event.target.value }))
              }
              placeholder="TikTok Pixel ID (optional)"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <textarea
              value={form.customTrackingCode}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, customTrackingCode: event.target.value }))
              }
              placeholder="Custom tracking script (optional)"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />
          </div>

          <select
            multiple
            value={form.products}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                products: Array.from(event.target.selectedOptions, (option) => option.value),
              }))
            }
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg min-h-32"
          >
            {products.map((product) => (
              <option key={product._id} value={product._id}>
                {product.title}
              </option>
            ))}
          </select>

          <textarea
            value={form.description}
            onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
            placeholder="Description"
            rows={4}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Ecommerce landing page active
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 px-4 bg-black text-white rounded-lg font-medium disabled:opacity-60"
            >
              <FiSave className="w-4 h-4" />
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="inline-flex h-10 items-center px-4 border border-gray-300 rounded-lg text-sm"
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-black">Ecommerce Landing Pages ({pages.length})</h2>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => fetchData()}
                className="inline-flex h-10 items-center gap-2 px-3 border border-gray-300 rounded-lg text-sm"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading ecommerce landing pages...</p>
          ) : pages.length === 0 ? (
            <p className="text-gray-600">No ecommerce landing pages found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Slug</th>
                    <th className="py-2 pr-3">Views</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page) => (
                    <tr key={page._id} className="border-b border-gray-100">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-black">{page.title}</p>
                        <p className="text-xs text-gray-500">Updated {new Date(page.updatedAt).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">/{page.slug}</td>
                      <td className="py-3 pr-3">{Number(page.viewCount || 0)}</td>
                      <td className="py-3 pr-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${page.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700"}`}>
                          {page.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <a
                            href={publicLandingUrl(page.slug)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-gray-300"
                          >
                            <FiExternalLink className="w-3.5 h-3.5" />
                            Open
                          </a>
                          <button
                            type="button"
                            onClick={() => openStats(page)}
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-gray-300"
                          >
                            <FiBarChart2 className="w-3.5 h-3.5" />
                            Stats
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEdit(page)}
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-gray-300"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(page)}
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-red-300 text-red-600"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {statsTarget ? (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-black">
              Landing Stats: {statsTarget.title}
            </h3>
            <button
              type="button"
              onClick={() => {
                setStatsTarget(null);
                setStatsData(null);
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5"
            >
              Close
            </button>
          </div>

          {statsLoading ? (
            <p className="text-gray-600">Loading stats...</p>
          ) : !statsData ? (
            <p className="text-gray-600">No stats available.</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Views</p>
                <p className="text-xl font-bold text-black">{Number(statsData.viewCount || 0)}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Orders</p>
                <p className="text-xl font-bold text-black">{Number(statsData.totalOrders || 0)}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Delivered</p>
                <p className="text-xl font-bold text-black">{Number(statsData.deliveredOrders || 0)}</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-xl font-bold text-black">{Number(statsData.deliveredRevenue || 0).toFixed(2)} TK</p>
              </div>
              <div className="border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Conversion</p>
                <p className="text-xl font-bold text-black">{Number(statsData.conversionRate || 0).toFixed(2)}%</p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default ModuleLandingPages;
