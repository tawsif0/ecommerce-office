import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiEdit2, FiPlus, FiRefreshCw, FiSave, FiTag, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  logoUrl: "",
  isActive: true,
  vendorId: "",
};

const ModuleBrands = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [brands, setBrands] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [form, setForm] = useState(emptyForm);

  const role = String(user?.userType || "").toLowerCase();
  const isAdmin = role === "admin";
  const canAccess = ["admin", "vendor", "staff"].includes(role);

  const fetchData = useCallback(async () => {
    if (!canAccess) return;

    try {
      setLoading(true);
      const params = {
        limit: 200,
        search: search || undefined,
        vendorId: isAdmin && vendorFilter ? vendorFilter : undefined,
      };

      const [brandResponse, vendorResponse] = await Promise.all([
        axios.get(`${baseUrl}/brands`, {
          headers: getAuthHeaders(),
          params,
        }),
        isAdmin
          ? axios.get(`${baseUrl}/vendors/admin/all`, {
              headers: getAuthHeaders(),
            })
          : Promise.resolve({ data: { vendors: [] } }),
      ]);

      setBrands(Array.isArray(brandResponse.data?.brands) ? brandResponse.data.brands : []);
      setVendors(Array.isArray(vendorResponse.data?.vendors) ? vendorResponse.data.vendors : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load brands");
      setBrands([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess, isAdmin, search, vendorFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!String(form.name || "").trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: String(form.name || "").trim(),
        slug: String(form.slug || "").trim(),
        description: String(form.description || "").trim(),
        logoUrl: String(form.logoUrl || "").trim(),
        isActive: Boolean(form.isActive),
        vendorId: isAdmin ? String(form.vendorId || "").trim() : undefined,
      };

      if (editingId) {
        await axios.patch(`${baseUrl}/brands/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Brand updated");
      } else {
        await axios.post(`${baseUrl}/brands`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Brand created");
      }

      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brand) => {
    setEditingId(String(brand?._id || ""));
    setForm({
      name: String(brand?.name || ""),
      slug: String(brand?.slug || ""),
      description: String(brand?.description || ""),
      logoUrl: String(brand?.logoUrl || ""),
      isActive: brand?.isActive !== false,
      vendorId: String(brand?.vendor?._id || brand?.vendor || ""),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (brand) => {
    const ok = window.confirm(`Delete brand ${brand?.name || ""}?`);
    if (!ok) return;

    try {
      await axios.delete(`${baseUrl}/brands/${brand._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Brand deleted");
      if (editingId === String(brand._id)) {
        resetForm();
      }
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete brand");
    }
  };

  const brandCountLabel = useMemo(() => `${brands.length}`, [brands.length]);

  if (!canAccess) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can access brands.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiTag className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Brand Management</h1>
        <p className="text-zinc-200 mt-2">Create and manage brand catalog for products.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form
          onSubmit={handleSubmit}
          className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3"
        >
          <h2 className="text-lg font-semibold text-black">
            {editingId ? "Edit Brand" : "Create Brand"}
          </h2>

          {isAdmin ? (
            <select
              value={form.vendorId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, vendorId: event.target.value }))
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="">Global brand (all vendors)</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.storeName || vendor.businessName || vendor.user?.name || "Vendor"}
                </option>
              ))}
            </select>
          ) : null}

          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Brand name"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            value={form.slug}
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
            placeholder="Slug (optional)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            value={form.logoUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, logoUrl: event.target.value }))}
            placeholder="Logo URL (optional)"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <textarea
            value={form.description}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, description: event.target.value }))
            }
            placeholder="Description (optional)"
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            Active brand
          </label>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 px-4 bg-black text-white rounded-lg font-medium disabled:opacity-60"
            >
              {editingId ? <FiSave className="w-4 h-4" /> : <FiPlus className="w-4 h-4" />}
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
            <h2 className="text-lg font-semibold text-black">Brands ({brandCountLabel})</h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search brand"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              {isAdmin ? (
                <select
                  value={vendorFilter}
                  onChange={(event) => setVendorFilter(event.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">All vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.storeName || vendor.businessName || vendor.user?.name || "Vendor"}
                    </option>
                  ))}
                </select>
              ) : null}
              <button
                type="button"
                onClick={fetchData}
                className="inline-flex h-10 items-center gap-2 px-3 border border-gray-300 rounded-lg text-sm"
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading brands...</p>
          ) : brands.length === 0 ? (
            <p className="text-gray-600">No brands found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Brand</th>
                    <th className="py-2 pr-3">Slug</th>
                    <th className="py-2 pr-3">Vendor</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {brands.map((brand) => (
                    <tr key={brand._id} className="border-b border-gray-100">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-black">{brand.name}</p>
                        <p className="text-xs text-gray-500">
                          {brand.description ? brand.description.slice(0, 80) : "-"}
                        </p>
                      </td>
                      <td className="py-3 pr-3 font-mono text-xs">/{brand.slug}</td>
                      <td className="py-3 pr-3 text-xs text-gray-700">
                        {brand.vendor?.storeName || "Global"}
                      </td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[11px] font-semibold ${
                            brand.isActive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {brand.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(brand)}
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-gray-300"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(brand)}
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
    </div>
  );
};

export default ModuleBrands;
