import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiEdit, FiRefreshCw, FiTag, FiTrash2 } from "react-icons/fi";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const initialFormState = {
  code: "",
  discountType: "percentage",
  discountValue: "",
  minPurchase: "",
  maxDiscount: "",
  validUntil: "",
  usageLimit: "",
  isActive: true,
  vendorId: "",
};

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const AdminCoupons = () => {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(initialFormState);

  const isAdmin = user?.userType === "admin";
  const isVendor = user?.userType === "vendor";

  const fetchCoupons = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/coupons`, {
        headers: getAuthHeaders(),
      });
      setCoupons(response.data?.coupons || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    if (!isAdmin) return;
    try {
      const response = await axios.get(`${baseUrl}/vendors/admin/all`, {
        headers: getAuthHeaders(),
      });
      setVendors(response.data?.vendors || []);
    } catch {
      setVendors([]);
    }
  };

  useEffect(() => {
    if (isAdmin || isVendor) {
      fetchCoupons();
      fetchVendors();
    }
  }, [isAdmin, isVendor]);

  const resetForm = () => {
    setForm(initialFormState);
    setEditingId("");
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const buildPayload = () => ({
    code: form.code.trim().toUpperCase(),
    discountType: form.discountType,
    discountValue: Number(form.discountValue),
    minPurchase: form.minPurchase === "" ? 0 : Number(form.minPurchase),
    maxDiscount: form.maxDiscount === "" ? null : Number(form.maxDiscount),
    validUntil: form.validUntil,
    usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
    isActive: Boolean(form.isActive),
    ...(isAdmin ? { vendorId: form.vendorId || null } : {}),
  });

  const validateForm = () => {
    if (!form.code.trim()) {
      toast.error("Coupon code is required");
      return false;
    }

    if (!form.discountValue || Number(form.discountValue) <= 0) {
      toast.error("Discount value must be greater than 0");
      return false;
    }

    if (!form.validUntil) {
      toast.error("Expiry date is required");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = buildPayload();

      if (editingId) {
        await axios.put(`${baseUrl}/coupons/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Coupon updated");
      } else {
        await axios.post(`${baseUrl}/coupons`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Coupon created");
      }

      resetForm();
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save coupon");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (coupon) => {
    setEditingId(coupon._id);
    setForm({
      code: coupon.code || "",
      discountType: coupon.discountType || "percentage",
      discountValue: String(coupon.discountValue ?? ""),
      minPurchase: String(coupon.minPurchase ?? ""),
      maxDiscount:
        coupon.maxDiscount === null || coupon.maxDiscount === undefined
          ? ""
          : String(coupon.maxDiscount),
      validUntil: toDateInputValue(coupon.validUntil),
      usageLimit:
        coupon.usageLimit === null || coupon.usageLimit === undefined
          ? ""
          : String(coupon.usageLimit),
      isActive: Boolean(coupon.isActive),
      vendorId: coupon.vendor?._id || "",
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;

    try {
      setDeleting(true);
      await axios.delete(`${baseUrl}/coupons/${deleteTarget._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Coupon deleted");
      setDeleteTarget(null);
      fetchCoupons();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete coupon");
    } finally {
      setDeleting(false);
    }
  };

  if (!isAdmin && !isVendor) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin or vendor can manage coupons.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-indigo-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiTag className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">
          {isAdmin ? "Coupon Management" : "Vendor Coupon Management"}
        </h1>
        <p className="text-gray-200 mt-1">
          {isAdmin
            ? "Create, edit, and delete marketplace or vendor coupons"
            : "Create and manage coupons for your store"}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-5 md:p-6"
      >
        <h2 className="text-lg font-semibold text-black mb-4">
          {editingId ? "Edit Coupon" : "Create Coupon"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <input
            name="code"
            value={form.code}
            onChange={handleInputChange}
            placeholder="Code (e.g. SAVE10)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <select
            name="discountType"
            value={form.discountType}
            onChange={handleInputChange}
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed</option>
          </select>

          <input
            type="number"
            min="0"
            step="0.01"
            name="discountValue"
            value={form.discountValue}
            onChange={handleInputChange}
            placeholder="Discount value"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            name="minPurchase"
            value={form.minPurchase}
            onChange={handleInputChange}
            placeholder="Minimum purchase"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            name="maxDiscount"
            value={form.maxDiscount}
            onChange={handleInputChange}
            placeholder="Max discount (optional)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            type="date"
            name="validUntil"
            value={form.validUntil}
            onChange={handleInputChange}
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            type="number"
            min="1"
            step="1"
            name="usageLimit"
            value={form.usageLimit}
            onChange={handleInputChange}
            placeholder="Usage limit (optional)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          {isAdmin && (
            <select
              name="vendorId"
              value={form.vendorId}
              onChange={handleInputChange}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="">Global Coupon</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.storeName}
                </option>
              ))}
            </select>
          )}

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="isActive"
              checked={form.isActive}
              onChange={handleInputChange}
            />
            Active
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 border border-gray-300 rounded-lg font-medium"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Coupons ({coupons.length})</h2>
          <button
            onClick={fetchCoupons}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="text-gray-600">No coupons found.</p>
        ) : (
          <div className="space-y-3">
            {coupons.map((coupon) => (
              <div
                key={coupon._id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-black">{coupon.code}</span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        coupon.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {coupon.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {coupon.discountType === "percentage"
                      ? `${coupon.discountValue}%`
                      : `${coupon.discountValue} TK`}{" "}
                    discount, min {coupon.minPurchase || 0} TK, used {coupon.usedCount || 0}
                    {coupon.usageLimit ? `/${coupon.usageLimit}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Scope: {coupon.vendor?.storeName || "Global"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Expires: {toDateInputValue(coupon.validUntil) || "N/A"}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(coupon)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  >
                    <FiEdit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(coupon)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete coupon"
        message={
          deleteTarget?.code
            ? `Delete coupon ${deleteTarget.code}?`
            : "Delete this coupon?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger
        isLoading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminCoupons;
