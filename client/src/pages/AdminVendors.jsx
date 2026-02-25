import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiCheckCircle,
  FiPauseCircle,
  FiRefreshCw,
  FiSave,
  FiXCircle,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const COMMISSION_TYPE_OPTIONS = [
  { value: "inherit", label: "Inherit Global" },
  { value: "percentage", label: "Percentage" },
  { value: "fixed", label: "Fixed" },
  { value: "hybrid", label: "Hybrid" },
];

const sanitizeCommissionDraft = (draft = {}) => {
  const type = String(draft.commissionType || "inherit").toLowerCase();
  const value = Number(draft.commissionValue || 0);
  const fixed = Number(draft.commissionFixed || 0);

  return {
    commissionType: ["inherit", "percentage", "fixed", "hybrid"].includes(type)
      ? type
      : "inherit",
    commissionValue: Number.isFinite(value) && value >= 0 ? value : 0,
    commissionFixed: Number.isFinite(fixed) && fixed >= 0 ? fixed : 0,
  };
};

const AdminVendors = () => {
  const { user } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [commissionDrafts, setCommissionDrafts] = useState({});
  const [globalCommission, setGlobalCommission] = useState({
    commissionType: "percentage",
    commissionValue: 10,
    commissionFixed: 0,
  });
  const [isSavingGlobal, setIsSavingGlobal] = useState(false);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const hydrateDrafts = (vendorList = []) => {
    const next = {};
    vendorList.forEach((vendor) => {
      next[vendor._id] = sanitizeCommissionDraft({
        commissionType: vendor.commissionType || "inherit",
        commissionValue: vendor.commissionValue || 0,
        commissionFixed: vendor.commissionFixed || 0,
      });
    });
    setCommissionDrafts(next);
  };

  const fetchGlobalCommission = async () => {
    const response = await axios.get(`${baseUrl}/auth/admin/settings`, {
      headers: getAuthHeaders(),
    });

    const rule = sanitizeCommissionDraft(
      response.data?.marketplaceCommission || {
        commissionType: "percentage",
        commissionValue: 10,
        commissionFixed: 0,
      },
    );
    setGlobalCommission(rule);
  };

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const [vendorsResponse] = await Promise.all([
        axios.get(`${baseUrl}/vendors/admin/all`, {
          headers: getAuthHeaders(),
        }),
        fetchGlobalCommission(),
      ]);
      const vendorList = vendorsResponse.data?.vendors || [];
      setVendors(vendorList);
      hydrateDrafts(vendorList);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userType === "admin") {
      fetchVendors();
    }
  }, [user]);

  const updateStatus = async (vendorId, status) => {
    try {
      setSavingId(vendorId);
      await axios.patch(
        `${baseUrl}/vendors/admin/${vendorId}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      toast.success("Vendor status updated");
      await fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update vendor");
    } finally {
      setSavingId("");
    }
  };

  const saveVendorCommission = async (vendorId) => {
    const draft = sanitizeCommissionDraft(commissionDrafts[vendorId] || {});
    try {
      setSavingId(vendorId);
      await axios.patch(
        `${baseUrl}/vendors/admin/${vendorId}/commission`,
        draft,
        { headers: getAuthHeaders() },
      );
      toast.success("Vendor commission updated");
      await fetchVendors();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update commission");
    } finally {
      setSavingId("");
    }
  };

  const saveGlobalCommission = async () => {
    const payload = sanitizeCommissionDraft(globalCommission);
    try {
      setIsSavingGlobal(true);
      await axios.put(
        `${baseUrl}/auth/admin/settings`,
        {
          marketplaceCommission: payload,
        },
        { headers: getAuthHeaders() },
      );
      setGlobalCommission(payload);
      toast.success("Global commission rule updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update global commission");
    } finally {
      setIsSavingGlobal(false);
    }
  };

  const setVendorDraft = (vendorId, patch) => {
    setCommissionDrafts((prev) => ({
      ...prev,
      [vendorId]: {
        ...prev[vendorId],
        ...patch,
      },
    }));
  };

  const sortedVendors = useMemo(
    () => [...vendors].sort((a, b) => String(a.storeName || "").localeCompare(String(b.storeName || ""))),
    [vendors],
  );

  if (user?.userType !== "admin") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admins can manage vendors.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Vendor Management</h1>
        <p className="text-zinc-200 mt-2">
          Manage vendor approval and commission rules (global, vendor specific and hybrid).
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4">
        <h2 className="text-lg font-semibold text-black">Global Commission Rule</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={globalCommission.commissionType}
            onChange={(event) =>
              setGlobalCommission((prev) => ({ ...prev, commissionType: event.target.value }))
            }
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            {COMMISSION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            min="0"
            step="0.01"
            value={globalCommission.commissionValue}
            onChange={(event) =>
              setGlobalCommission((prev) => ({
                ...prev,
                commissionValue: event.target.value,
              }))
            }
            disabled={
              globalCommission.commissionType === "inherit" ||
              globalCommission.commissionType === "fixed"
            }
            className="px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-100"
            placeholder="Percentage"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={globalCommission.commissionFixed}
            onChange={(event) =>
              setGlobalCommission((prev) => ({
                ...prev,
                commissionFixed: event.target.value,
              }))
            }
            disabled={
              globalCommission.commissionType === "inherit" ||
              globalCommission.commissionType === "percentage"
            }
            className="px-3 py-2 border border-gray-200 rounded-lg disabled:bg-gray-100"
            placeholder="Fixed TK"
          />
          <button
            onClick={saveGlobalCommission}
            disabled={isSavingGlobal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg disabled:opacity-60"
          >
            <FiSave className="w-4 h-4" />
            {isSavingGlobal ? "Saving..." : "Save Global"}
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">All Vendors ({vendors.length})</h2>
          <button
            onClick={fetchVendors}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading vendors...</p>
        ) : sortedVendors.length === 0 ? (
          <p className="text-gray-600">No vendors found.</p>
        ) : (
          <div className="space-y-3">
            {sortedVendors.map((vendor) => {
              const draft = sanitizeCommissionDraft(commissionDrafts[vendor._id] || {});
              return (
                <div
                  key={vendor._id}
                  className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center"
                >
                  <div className="xl:col-span-4">
                    <p className="font-semibold text-black">{vendor.storeName}</p>
                    <p className="text-sm text-gray-600">{vendor.user?.email || vendor.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Slug: {vendor.slug}</p>
                  </div>

                  <div className="xl:col-span-2">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${
                        vendor.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : vendor.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : vendor.status === "suspended"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </div>

                  <div className="xl:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-2">
                    <select
                      value={draft.commissionType}
                      onChange={(event) =>
                        setVendorDraft(vendor._id, { commissionType: event.target.value })
                      }
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm md:col-span-2"
                      disabled={savingId === vendor._id}
                    >
                      {COMMISSION_TYPE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.commissionValue}
                      onChange={(event) =>
                        setVendorDraft(vendor._id, {
                          commissionValue: event.target.value,
                        })
                      }
                      disabled={
                        savingId === vendor._id ||
                        draft.commissionType === "inherit" ||
                        draft.commissionType === "fixed"
                      }
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
                      placeholder="%"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draft.commissionFixed}
                      onChange={(event) =>
                        setVendorDraft(vendor._id, {
                          commissionFixed: event.target.value,
                        })
                      }
                      disabled={
                        savingId === vendor._id ||
                        draft.commissionType === "inherit" ||
                        draft.commissionType === "percentage"
                      }
                      className="px-2 py-2 border border-gray-200 rounded-lg text-sm disabled:bg-gray-100"
                      placeholder="Fixed"
                    />
                  </div>

                  <div className="xl:col-span-2 flex flex-wrap items-center justify-start xl:justify-end gap-2">
                    <button
                      onClick={() => saveVendorCommission(vendor._id)}
                      disabled={savingId === vendor._id}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs rounded-lg border border-black text-black"
                    >
                      <FiSave className="w-4 h-4" />
                      Save
                    </button>
                    <button
                      onClick={() => updateStatus(vendor._id, "approved")}
                      disabled={savingId === vendor._id}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs rounded-lg border border-green-200 text-green-700"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(vendor._id, "rejected")}
                      disabled={savingId === vendor._id}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs rounded-lg border border-gray-200 text-gray-700"
                    >
                      <FiXCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => updateStatus(vendor._id, "suspended")}
                      disabled={savingId === vendor._id}
                      className="inline-flex items-center gap-1 px-2.5 py-2 text-xs rounded-lg border border-red-200 text-red-700"
                    >
                      <FiPauseCircle className="w-4 h-4" />
                      Suspend
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminVendors;
