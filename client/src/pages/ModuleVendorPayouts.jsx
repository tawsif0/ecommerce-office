import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiCreditCard,
  FiDollarSign,
  FiFilter,
  FiPlus,
  FiRefreshCw,
  FiTrash2,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const formatAmount = (value) => `${Number(value || 0).toFixed(2)} TK`;

const ModuleVendorPayouts = () => {
  const { user } = useAuth();
  const role = String(user?.userType || "").toLowerCase().trim();
  const canAccess = ["admin", "vendor", "staff"].includes(role);
  const canManage = role === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [rows, setRows] = useState([]);
  const [vendors, setVendors] = useState([]);

  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [vendorFilter, setVendorFilter] = useState("");

  const [form, setForm] = useState({
    vendorId: "",
    title: "Vendor payout",
    amount: "",
    entryDate: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const fetchData = useCallback(
    async (filters = {}) => {
      if (!canAccess) return;

      const nextSearch = filters.search !== undefined ? filters.search : search;
      const nextFromDate = filters.fromDate !== undefined ? filters.fromDate : fromDate;
      const nextToDate = filters.toDate !== undefined ? filters.toDate : toDate;
      const nextVendorFilter =
        filters.vendorFilter !== undefined ? filters.vendorFilter : vendorFilter;

      try {
        setLoading(true);
        const [entryResponse, vendorResponse] = await Promise.all([
          axios.get(`${baseUrl}/accounts/entries`, {
            headers: getAuthHeaders(),
            params: {
              type: "payout",
              limit: 100,
              search: nextSearch || undefined,
              from: nextFromDate || undefined,
              to: nextToDate || undefined,
              vendorId: canManage ? nextVendorFilter || undefined : undefined,
            },
          }),
          canManage
            ? axios.get(`${baseUrl}/vendors/admin/all`, {
                headers: getAuthHeaders(),
              })
            : Promise.resolve({ data: { vendors: [] } }),
        ]);

        setRows(Array.isArray(entryResponse.data?.entries) ? entryResponse.data.entries : []);
        setVendors(Array.isArray(vendorResponse.data?.vendors) ? vendorResponse.data.vendors : []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Failed to load vendor payouts");
        setRows([]);
      } finally {
        setLoading(false);
      }
    },
    [canAccess, canManage, fromDate, search, toDate, vendorFilter],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summary = useMemo(() => {
    const totalAmount = rows.reduce((sum, row) => sum + Number(row?.amount || 0), 0);
    const vendorCount = new Set(
      rows.map((row) => String(row?.vendor?._id || row?.vendor || "").trim()).filter(Boolean),
    ).size;

    return {
      totalAmount,
      count: rows.length,
      vendorCount,
    };
  }, [rows]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canManage) return;

    const amount = Number(form.amount);
    if (!form.vendorId) {
      toast.error("Vendor is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${baseUrl}/accounts/entries`,
        {
          type: "payout",
          vendorId: String(form.vendorId || "").trim(),
          title: String(form.title || "").trim() || "Vendor payout",
          category: "vendor_payout",
          amount,
          note: String(form.note || "").trim(),
          entryDate: form.entryDate || undefined,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      toast.success("Vendor payout recorded");
      setForm((prev) => ({
        ...prev,
        amount: "",
        note: "",
        title: "Vendor payout",
        entryDate: new Date().toISOString().slice(0, 10),
      }));
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save payout");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry) => {
    if (!canManage) return;
    const ok = window.confirm("Delete this payout entry?");
    if (!ok) return;

    try {
      await axios.delete(`${baseUrl}/accounts/entries/${entry._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Payout deleted");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete payout");
    }
  };

  const applyFilters = async () => {
    try {
      setIsApplying(true);
      await fetchData();
    } finally {
      setIsApplying(false);
    }
  };

  const clearFilters = async () => {
    setSearch("");
    setFromDate("");
    setToDate("");
    setVendorFilter("");
    try {
      setIsApplying(true);
      await fetchData({
        search: "",
        fromDate: "",
        toDate: "",
        vendorFilter: "",
      });
    } finally {
      setIsApplying(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can access vendor payouts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiCreditCard className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Vendor Payouts</h1>
        <p className="text-zinc-200 mt-2">
          Track payout transfers to vendors with full date and vendor filtering.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Total Payout Entries</p>
          <p className="text-2xl font-bold text-black mt-1">{summary.count}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-2xl font-bold text-black mt-1">{formatAmount(summary.totalAmount)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Vendors Covered</p>
          <p className="text-2xl font-bold text-black mt-1">{summary.vendorCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
            <FiFilter className="w-4 h-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-black">Filter Payouts</p>
            <p className="text-xs text-gray-500">Use date range, vendor, and search keywords.</p>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-linear-to-br from-white to-gray-50 p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">Search</span>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title or note"
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">From Date</span>
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-gray-600 mb-1 block">To Date</span>
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
              />
            </label>

            {canManage ? (
              <label className="block">
                <span className="text-xs font-medium text-gray-600 mb-1 block">Vendor</span>
                <select
                  value={vendorFilter}
                  onChange={(event) => setVendorFilter(event.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg bg-white"
                >
                  <option value="">All vendors</option>
                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.storeName || vendor.businessName || vendor.user?.name || "Vendor"}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div />
            )}

            <div className="flex items-end gap-2">
              <button
                type="button"
                onClick={applyFilters}
                disabled={isApplying}
                className="inline-flex h-10 items-center justify-center gap-2 px-4 bg-black text-white rounded-lg font-medium whitespace-nowrap disabled:opacity-60"
              >
                <FiRefreshCw className={`w-4 h-4 ${isApplying ? "animate-spin" : ""}`} />
                Apply
              </button>
              <button
                type="button"
                onClick={clearFilters}
                disabled={isApplying}
                className="inline-flex h-10 items-center justify-center gap-2 px-4 border border-gray-300 rounded-lg font-medium whitespace-nowrap hover:bg-gray-100 disabled:opacity-60"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {canManage ? (
          <form
            onSubmit={handleSubmit}
            className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3"
          >
            <h2 className="text-lg font-semibold text-black">Create Vendor Payout</h2>

            <select
              value={form.vendorId}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, vendorId: event.target.value }))
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="">Select vendor</option>
              {vendors.map((vendor) => (
                <option key={vendor._id} value={vendor._id}>
                  {vendor.storeName || vendor.businessName || vendor.user?.name || "Vendor"}
                </option>
              ))}
            </select>

            <input
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Payout title"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />

            <input
              type="number"
              min="0"
              step="0.01"
              value={form.amount}
              onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
              placeholder="Amount"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />

            <input
              type="date"
              value={form.entryDate}
              onChange={(event) => setForm((prev) => ({ ...prev, entryDate: event.target.value }))}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />

            <textarea
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Transfer note / reference"
              rows={3}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
            />

            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 items-center gap-2 px-4 bg-black text-white rounded-lg font-medium disabled:opacity-60"
            >
              <FiPlus className="w-4 h-4" />
              {saving ? "Saving..." : "Save Payout"}
            </button>
          </form>
        ) : (
          <div className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-lg font-semibold text-black mb-2">Read-only View</h2>
            <p className="text-sm text-gray-600">
              Only admin users can create or delete payouts. Your account can view payout history.
            </p>
          </div>
        )}

        <div className={`${canManage ? "xl:col-span-2" : "xl:col-span-2"} bg-white border border-gray-200 rounded-xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">Payout Ledger ({rows.length})</h2>
            <button
              type="button"
              onClick={() => fetchData()}
              className="inline-flex h-10 items-center gap-2 px-3 border border-gray-300 rounded-lg text-sm"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading payouts...</p>
          ) : rows.length === 0 ? (
            <p className="text-gray-600">No payout entries found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Vendor</th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Amount</th>
                    <th className="py-2 pr-3">Note</th>
                    {canManage ? <th className="py-2 pr-3">Action</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-3">
                        {row.entryDate ? new Date(row.entryDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 pr-3">
                        {row.vendor?.storeName || row.vendor?.businessName || "N/A"}
                      </td>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-black">{row.title || "Vendor payout"}</p>
                        <p className="text-xs text-gray-500">
                          By {row.createdBy?.name || row.createdBy?.email || "System"}
                        </p>
                      </td>
                      <td className="py-3 pr-3 font-semibold text-black">
                        <span className="inline-flex items-center gap-1">
                          <FiDollarSign className="w-4 h-4" />
                          {formatAmount(row.amount)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-gray-600 max-w-[320px]">
                        {row.note ? (
                          <p className="line-clamp-2">{row.note}</p>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      {canManage ? (
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-red-300 text-red-600"
                          >
                            <FiTrash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </td>
                      ) : null}
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

export default ModuleVendorPayouts;
