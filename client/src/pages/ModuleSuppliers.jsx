import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiPackage, FiRefreshCw, FiSave, FiTrash2, FiEdit2 } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  openingDue: "0",
  notes: "",
  isActive: true,
};

const ModuleSuppliers = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalDue: 0,
    totalPaid: 0,
    totalOpeningDue: 0,
  });
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const canAccess = useMemo(
    () => ["admin", "vendor", "staff"].includes(String(user?.userType || "").toLowerCase()),
    [user?.userType],
  );

  const fetchSuppliers = useCallback(async (nextSearch = search) => {
    if (!canAccess) return;

    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/suppliers`, {
        headers: getAuthHeaders(),
        params: {
          search: nextSearch || undefined,
          limit: 100,
        },
      });

      setSuppliers(response.data?.suppliers || []);
      setSummary(
        response.data?.summary || {
          count: 0,
          totalDue: 0,
          totalPaid: 0,
          totalOpeningDue: 0,
        },
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load suppliers");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess, search]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!String(form.name || "").trim()) {
      toast.error("Supplier name is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: String(form.name || "").trim(),
        phone: String(form.phone || "").trim(),
        email: String(form.email || "").trim(),
        address: String(form.address || "").trim(),
        openingDue: Number(form.openingDue || 0),
        notes: String(form.notes || "").trim(),
        isActive: Boolean(form.isActive),
      };

      if (editingId) {
        await axios.patch(`${baseUrl}/suppliers/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Supplier updated");
      } else {
        await axios.post(`${baseUrl}/suppliers`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Supplier created");
      }

      resetForm();
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (supplier) => {
    setEditingId(supplier._id);
    setForm({
      name: supplier.name || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      openingDue: String(Number(supplier.openingDue || 0)),
      notes: supplier.notes || "",
      isActive: supplier.isActive !== false,
    });
  };

  const handleDelete = async (supplier) => {
    const ok = window.confirm(`Delete supplier ${supplier.name}?`);
    if (!ok) return;

    try {
      await axios.delete(`${baseUrl}/suppliers/${supplier._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Supplier deleted");
      if (editingId === supplier._id) {
        resetForm();
      }
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete supplier");
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can access suppliers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiPackage className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Supplier Management</h1>
        <p className="text-zinc-200 mt-2">
          Manage supplier contacts, opening dues, and payment tracking.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Suppliers</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.count || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Total Due</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.totalDue || 0).toFixed(2)} TK</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.totalPaid || 0).toFixed(2)} TK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-black">
            {editingId ? "Edit Supplier" : "Add Supplier"}
          </h2>

          <input
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Supplier name"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder="Phone"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            placeholder="Email"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            value={form.address}
            onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
            placeholder="Address"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.openingDue}
            onChange={(event) => setForm((prev) => ({ ...prev, openingDue: event.target.value }))}
            placeholder="Opening due"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
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
            Active supplier
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
            <h2 className="text-lg font-semibold text-black">Suppliers ({suppliers.length})</h2>
            <div className="flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                type="button"
                onClick={() => fetchSuppliers()}
                className="inline-flex h-10 items-center gap-2 px-3 border border-gray-300 rounded-lg text-sm"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading suppliers...</p>
          ) : suppliers.length === 0 ? (
            <p className="text-gray-600">No suppliers found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Contact</th>
                    <th className="py-2 pr-3">Current Due</th>
                    <th className="py-2 pr-3">Total Paid</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {suppliers.map((supplier) => (
                    <tr key={supplier._id} className="border-b border-gray-100">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-black">{supplier.name}</p>
                        <p className="text-xs text-gray-500">{supplier.isActive ? "Active" : "Inactive"}</p>
                      </td>
                      <td className="py-3 pr-3 text-gray-700">
                        <p>{supplier.phone || "-"}</p>
                        <p className="text-xs text-gray-500">{supplier.email || "-"}</p>
                      </td>
                      <td className="py-3 pr-3 font-semibold text-black">
                        {Number(supplier.currentDue || 0).toFixed(2)} TK
                      </td>
                      <td className="py-3 pr-3">
                        {Number(supplier.totalPaid || 0).toFixed(2)} TK
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(supplier)}
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-gray-300"
                          >
                            <FiEdit2 className="w-3.5 h-3.5" />
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(supplier)}
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

export default ModuleSuppliers;
