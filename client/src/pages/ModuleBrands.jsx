import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiEdit2, FiPlus, FiRefreshCw, FiSave, FiTag, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import usePublicSettings from "../hooks/usePublicSettings";
import RichTextEditor from "../components/RichTextEditor";
import { stripHtml } from "../utils/richText";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const emptyForm = {
  name: "",
  description: "",
  logoUrl: "",
  isActive: true,
  vendorId: "",
};

const ModuleBrands = () => {
  const { user } = useAuth();
  const { settings: publicSettings } = usePublicSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [brands, setBrands] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");
  const [vendorScope, setVendorScope] = useState("global");
  const [vendorSearch, setVendorSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef(null);

  const role = String(user?.userType || "").toLowerCase();
  const isAdmin = role === "admin";
  const canAccess = ["admin", "vendor", "staff"].includes(role);
  const isMultiVendor =
    String(publicSettings?.marketplaceMode || "multi").trim().toLowerCase() !== "single";
  const filteredVendors = useMemo(() => {
    const query = String(vendorSearch || "").trim().toLowerCase();
    if (!query) return vendors;
    return vendors.filter((vendor) => {
      const haystack = [
        vendor?.storeName,
        vendor?.businessName,
        vendor?.user?.name,
        vendor?.user?.email,
      ]
        .map((entry) => String(entry || "").trim().toLowerCase())
        .join(" ");
      return haystack.includes(query);
    });
  }, [vendorSearch, vendors]);

  const fetchData = useCallback(async () => {
    if (!canAccess) return;

    try {
      setLoading(true);
      const params = {
        limit: 200,
        search: search || undefined,
        vendorId:
          isAdmin && isMultiVendor && vendorFilter ? vendorFilter : undefined,
      };

      const [brandResponse, vendorResponse] = await Promise.all([
        axios.get(`${baseUrl}/brands`, {
          headers: getAuthHeaders(),
          params,
        }),
        isAdmin && isMultiVendor
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
  }, [canAccess, isAdmin, isMultiVendor, search, vendorFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (isMultiVendor) return;
    setVendorFilter("");
    setVendorSearch("");
    setVendorScope("global");
    setForm((prev) =>
      prev.vendorId ? { ...prev, vendorId: "" } : prev,
    );
  }, [isMultiVendor]);

  const resetForm = () => {
    setEditingId("");
    setForm(emptyForm);
    setVendorScope("global");
    setVendorSearch("");
  };

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLogoUploading(true);
      const payload = new FormData();
      payload.append("logo", file);
      const response = await axios.post(`${baseUrl}/brands/logo-upload`, payload, {
        headers: getAuthHeaders(),
      });
      const nextLogoUrl = String(response?.data?.logoUrl || "").trim();
      setForm((prev) => ({ ...prev, logoUrl: nextLogoUrl }));
      toast.success(response?.data?.message || "Brand logo uploaded");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to upload brand logo");
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!String(form.name || "").trim()) {
      toast.error("Brand name is required");
      return;
    }

    if (isAdmin && isMultiVendor && vendorScope === "vendor" && !String(form.vendorId || "").trim()) {
      toast.error("Select a vendor for this vendor brand");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: String(form.name || "").trim(),
        description: String(form.description || "").trim(),
        logoUrl: String(form.logoUrl || "").trim(),
        isActive: Boolean(form.isActive),
        vendorId:
          isAdmin && isMultiVendor && vendorScope === "vendor"
            ? String(form.vendorId || "").trim()
            : "",
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
    const nextVendorId = String(brand?.vendor?._id || brand?.vendor || "");
    setEditingId(String(brand?._id || ""));
    setForm({
      name: String(brand?.name || ""),
      description: String(brand?.description || ""),
      logoUrl: String(brand?.logoUrl || ""),
      isActive: brand?.isActive !== false,
      vendorId: nextVendorId,
    });
    setVendorScope(nextVendorId ? "vendor" : "global");
    setVendorSearch("");
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

          {isAdmin && isMultiVendor ? (
            <>
              <select
                value={vendorScope}
                onChange={(event) => {
                  const nextScope = event.target.value === "vendor" ? "vendor" : "global";
                  setVendorScope(nextScope);
                  if (nextScope === "global") {
                    setForm((prev) => ({ ...prev, vendorId: "" }));
                  }
                }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
              >
                <option value="global">Global brand</option>
                <option value="vendor">Vendor brand</option>
              </select>

              {vendorScope === "vendor" ? (
                <div className="space-y-2">
                  <input
                    value={vendorSearch}
                    onChange={(event) => setVendorSearch(event.target.value)}
                    placeholder="Search vendor"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  />
                  <select
                    value={form.vendorId}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, vendorId: event.target.value }))
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
                  >
                    <option value="">Select vendor</option>
                    {filteredVendors.map((vendor) => (
                      <option key={vendor._id} value={vendor._id}>
                        {vendor.storeName || vendor.businessName || vendor.user?.name || "Vendor"}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}
            </>
          ) : null}

          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Brand name"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={logoUploading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 disabled:opacity-60"
              >
                {logoUploading ? "Uploading..." : "Upload Logo"}
              </button>
              {form.logoUrl ? (
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, logoUrl: "" }))}
                  className="inline-flex h-10 items-center rounded-lg border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700"
                >
                  Remove Logo
                </button>
              ) : null}
            </div>
            <div className="flex h-28 items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white p-4">
              {form.logoUrl ? (
                <img src={form.logoUrl} alt={form.name || "Brand logo"} className="h-16 w-auto max-w-full object-contain" />
              ) : (
                <p className="text-sm text-gray-500">No brand logo uploaded yet.</p>
              )}
            </div>
          </div>

          <RichTextEditor
            value={form.description}
            onChange={(value) => setForm((prev) => ({ ...prev, description: value }))}
            placeholder="Description (optional)"
            minHeight={160}
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
              {isAdmin && isMultiVendor ? (
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
                          {brand.description ? stripHtml(brand.description).slice(0, 80) : "-"}
                        </p>
                      </td>
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
