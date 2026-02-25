import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiEdit, FiPlus, FiRefreshCw, FiTrash2, FiTruck } from "react-icons/fi";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const emptyRule = {
  label: "",
  country: "Bangladesh",
  district: "",
  city: "",
  minSubtotal: "0",
  maxSubtotal: "",
  shippingFee: "0",
  estimatedMinDays: "2",
  estimatedMaxDays: "5",
  isActive: true,
};

const emptyForm = {
  name: "",
  priority: "100",
  isActive: true,
  rules: [{ ...emptyRule }],
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const AdminShippingZones = () => {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchZones = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/shipping/admin/zones`, {
        headers: getAuthHeaders(),
      });
      setZones(response.data?.zones || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load shipping zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userType === "admin") {
      fetchZones();
    }
  }, [user]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId("");
  };

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRuleChange = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, [field]: value } : rule,
      ),
    }));
  };

  const addRule = () => {
    setForm((prev) => ({
      ...prev,
      rules: [...prev.rules, { ...emptyRule }],
    }));
  };

  const removeRule = (index) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.length > 1 ? prev.rules.filter((_, i) => i !== index) : prev.rules,
    }));
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    priority: Number(form.priority || 100),
    isActive: Boolean(form.isActive),
    rules: form.rules.map((rule) => ({
      label: String(rule.label || "").trim(),
      country: String(rule.country || "Bangladesh").trim(),
      district: String(rule.district || "").trim(),
      city: String(rule.city || "").trim(),
      minSubtotal: Number(rule.minSubtotal || 0),
      maxSubtotal:
        rule.maxSubtotal === "" || rule.maxSubtotal === null
          ? null
          : Number(rule.maxSubtotal),
      shippingFee: Number(rule.shippingFee || 0),
      estimatedMinDays: Number(rule.estimatedMinDays || 0),
      estimatedMaxDays: Number(rule.estimatedMaxDays || 0),
      isActive: Boolean(rule.isActive),
    })),
  });

  const validateForm = () => {
    if (!form.name.trim()) {
      toast.error("Zone name is required");
      return false;
    }

    if (!form.rules.length) {
      toast.error("At least one shipping rule is required");
      return false;
    }

    const invalidRule = form.rules.find(
      (rule) =>
        Number(rule.shippingFee) < 0 ||
        Number(rule.minSubtotal) < 0 ||
        (rule.maxSubtotal !== "" && Number(rule.maxSubtotal) < 0),
    );

    if (invalidRule) {
      toast.error("Shipping rules contain invalid numbers");
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
        await axios.put(`${baseUrl}/shipping/admin/zones/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Shipping zone updated");
      } else {
        await axios.post(`${baseUrl}/shipping/admin/zones`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Shipping zone created");
      }

      resetForm();
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save shipping zone");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (zone) => {
    setEditingId(zone._id);
    setForm({
      name: zone.name || "",
      priority: String(zone.priority ?? 100),
      isActive: Boolean(zone.isActive),
      rules:
        zone.rules?.length > 0
          ? zone.rules.map((rule) => ({
              label: rule.label || "",
              country: rule.country || "Bangladesh",
              district: rule.district || "",
              city: rule.city || "",
              minSubtotal: String(rule.minSubtotal ?? 0),
              maxSubtotal:
                rule.maxSubtotal === null || rule.maxSubtotal === undefined
                  ? ""
                  : String(rule.maxSubtotal),
              shippingFee: String(rule.shippingFee ?? 0),
              estimatedMinDays: String(rule.estimatedMinDays ?? 0),
              estimatedMaxDays: String(rule.estimatedMaxDays ?? 0),
              isActive: Boolean(rule.isActive),
            }))
          : [{ ...emptyRule }],
    });
  };

  const confirmDelete = async () => {
    if (!deleteTarget?._id) return;
    try {
      setIsDeleting(true);
      await axios.delete(`${baseUrl}/shipping/admin/zones/${deleteTarget._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Shipping zone deleted");
      setDeleteTarget(null);
      fetchZones();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete shipping zone");
    } finally {
      setIsDeleting(false);
    }
  };

  if (user?.userType !== "admin") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admins can manage global shipping zones.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-slate-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiTruck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Global Shipping Zones</h1>
        <p className="text-slate-200 mt-1">
          Configure delivery fees and estimated delivery time by location.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl border border-gray-200 p-5 md:p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-black">
            {editingId ? "Edit Zone" : "Create Zone"}
          </h2>
          <button
            type="button"
            onClick={resetForm}
            className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            name="name"
            value={form.name}
            onChange={handleInputChange}
            placeholder="Zone name"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            type="number"
            min="0"
            name="priority"
            value={form.priority}
            onChange={handleInputChange}
            placeholder="Priority (lower = first)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
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

        <div className="space-y-3">
          {form.rules.map((rule, index) => (
            <div key={`rule-${index}`} className="border border-gray-200 rounded-lg p-3">
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
                <input
                  value={rule.label}
                  onChange={(e) => handleRuleChange(index, "label", e.target.value)}
                  placeholder="Rule label"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <input
                  value={rule.country}
                  onChange={(e) => handleRuleChange(index, "country", e.target.value)}
                  placeholder="Country"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <input
                  value={rule.district}
                  onChange={(e) => handleRuleChange(index, "district", e.target.value)}
                  placeholder="District (optional)"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <input
                  value={rule.city}
                  onChange={(e) => handleRuleChange(index, "city", e.target.value)}
                  placeholder="City (optional)"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <input
                  type="number"
                  min="0"
                  value={rule.minSubtotal}
                  onChange={(e) => handleRuleChange(index, "minSubtotal", e.target.value)}
                  placeholder="Min subtotal"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <input
                  type="number"
                  min="0"
                  value={rule.maxSubtotal}
                  onChange={(e) => handleRuleChange(index, "maxSubtotal", e.target.value)}
                  placeholder="Max subtotal"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rule.shippingFee}
                  onChange={(e) => handleRuleChange(index, "shippingFee", e.target.value)}
                  placeholder="Shipping fee"
                  className="px-3 py-2 border border-gray-200 rounded-lg"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={rule.estimatedMinDays}
                    onChange={(e) => handleRuleChange(index, "estimatedMinDays", e.target.value)}
                    placeholder="Min days"
                    className="px-3 py-2 border border-gray-200 rounded-lg"
                  />
                  <input
                    type="number"
                    min="0"
                    value={rule.estimatedMaxDays}
                    onChange={(e) => handleRuleChange(index, "estimatedMaxDays", e.target.value)}
                    placeholder="Max days"
                    className="px-3 py-2 border border-gray-200 rounded-lg"
                  />
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <label className="text-sm flex items-center gap-2 text-gray-700">
                  <input
                    type="checkbox"
                    checked={Boolean(rule.isActive)}
                    onChange={(e) => handleRuleChange(index, "isActive", e.target.checked)}
                  />
                  Rule Active
                </label>
                <button
                  type="button"
                  onClick={() => removeRule(index)}
                  className="text-sm px-2.5 py-1.5 border border-red-200 text-red-600 rounded-lg"
                >
                  Remove Rule
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addRule}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiPlus className="w-4 h-4" />
            Add Rule
          </button>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
        >
          {saving ? "Saving..." : editingId ? "Update Zone" : "Create Zone"}
        </button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Zones ({zones.length})</h2>
          <button
            onClick={fetchZones}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading shipping zones...</p>
        ) : zones.length === 0 ? (
          <p className="text-gray-600">No shipping zones found.</p>
        ) : (
          <div className="space-y-3">
            {zones.map((zone) => (
              <div key={zone._id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-semibold text-black">{zone.name}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Priority: {zone.priority || 100} | Rules: {zone.rules?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Status: {zone.isActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(zone)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg"
                    >
                      <FiEdit className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(zone)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete shipping zone"
        message={
          deleteTarget?.name
            ? `Delete shipping zone "${deleteTarget.name}"?`
            : "Delete this shipping zone?"
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isDanger
        isLoading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminShippingZones;
