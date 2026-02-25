import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiTrash2 } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const permissionKeys = [
  "manageProducts",
  "manageOrders",
  "manageCoupons",
  "manageBookings",
  "manageAds",
  "manageSupport",
  "manageSettings",
];

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const initialForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  roleName: "staff",
  status: "active",
  notes: "",
  permissions: {
    manageProducts: false,
    manageOrders: false,
    manageCoupons: false,
    manageBookings: false,
    manageAds: false,
    manageSupport: false,
    manageSettings: false,
  },
};

const ModuleStaff = () => {
  const { user } = useAuth();
  const [staffMembers, setStaffMembers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const isAdmin = user?.userType === "admin";
  const canManage = isAdmin || user?.userType === "vendor" || user?.userType === "staff";

  const fetchVendors = async () => {
    if (!isAdmin) {
      setVendors([]);
      return;
    }

    try {
      const response = await axios.get(`${baseUrl}/vendors/admin/all`, {
        headers: getAuthHeaders(),
      });
      const vendorList = response.data?.vendors || [];
      setVendors(vendorList);
      if (!selectedVendorId && vendorList.length > 0) {
        setSelectedVendorId(vendorList[0]._id);
      }
    } catch {
      setVendors([]);
    }
  };

  const fetchStaff = async () => {
    if (!canManage) return;

    if (isAdmin && !selectedVendorId) {
      setStaffMembers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/staff`, {
        headers: getAuthHeaders(),
        params: isAdmin ? { vendorId: selectedVendorId } : undefined,
      });
      setStaffMembers(response.data?.staffMembers || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load staff members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchVendors();
  }, [user]);

  useEffect(() => {
    if (!user || (isAdmin && !selectedVendorId)) return;
    fetchStaff();
  }, [user, selectedVendorId]);

  const handleInput = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const togglePermission = (key) => {
    setForm((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const createStaff = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Name, email and phone are required");
      return;
    }

    if (!form.password || form.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (isAdmin && !selectedVendorId) {
      toast.error("Select vendor first");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${baseUrl}/staff`,
        {
          ...form,
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          notes: form.notes.trim(),
          ...(isAdmin ? { vendorId: selectedVendorId } : {}),
        },
        { headers: getAuthHeaders() },
      );

      toast.success("Staff member created");
      setForm(initialForm);
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create staff member");
    } finally {
      setSaving(false);
    }
  };

  const updateStaff = async (staffMember, updates) => {
    try {
      await axios.put(
        `${baseUrl}/staff/${staffMember._id}`,
        {
          ...updates,
          ...(isAdmin ? { vendorId: selectedVendorId } : {}),
        },
        { headers: getAuthHeaders() },
      );
      toast.success("Staff member updated");
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update staff member");
    }
  };

  const removeStaff = async (staffMemberId) => {
    if (!window.confirm("Remove this staff member?")) return;

    try {
      await axios.delete(`${baseUrl}/staff/${staffMemberId}`, {
        headers: getAuthHeaders(),
        params: isAdmin ? { vendorId: selectedVendorId } : undefined,
      });
      toast.success("Staff member removed");
      fetchStaff();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove staff member");
    }
  };

  if (!canManage) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can manage staff roles.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Staff Roles & Permissions</h1>
        <p className="text-zinc-200 mt-1">Create and manage vendor staff accounts.</p>
      </div>

      {isAdmin && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <label className="text-sm text-gray-700 block mb-2">Select Vendor</label>
          <select
            value={selectedVendorId}
            onChange={(event) => setSelectedVendorId(event.target.value)}
            className="px-3 py-2.5 border border-gray-200 rounded-lg w-full md:w-96"
          >
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor._id} value={vendor._id}>
                {vendor.storeName}
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={createStaff} className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Create Staff Member</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <input
            name="name"
            value={form.name}
            onChange={handleInput}
            placeholder="Full name"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            name="email"
            value={form.email}
            onChange={handleInput}
            placeholder="Email"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            name="phone"
            value={form.phone}
            onChange={handleInput}
            placeholder="Phone"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            name="password"
            value={form.password}
            onChange={handleInput}
            placeholder="Password"
            type="password"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <input
            name="roleName"
            value={form.roleName}
            onChange={handleInput}
            placeholder="Role name"
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          />
          <select
            name="status"
            value={form.status}
            onChange={handleInput}
            className="px-3 py-2.5 border border-gray-200 rounded-lg"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        <textarea
          name="notes"
          value={form.notes}
          onChange={handleInput}
          rows={2}
          placeholder="Notes"
          className="mt-4 w-full px-3 py-2.5 border border-gray-200 rounded-lg"
        />

        <div className="mt-4">
          <p className="text-sm font-medium text-gray-800 mb-2">Permissions</p>
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
            {permissionKeys.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.permissions[key]}
                  onChange={() => togglePermission(key)}
                />
                {key}
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-5 px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
        >
          {saving ? "Creating..." : "Create Staff"}
        </button>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Staff Members ({staffMembers.length})</h2>
          <button
            onClick={fetchStaff}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading staff members...</p>
        ) : staffMembers.length === 0 ? (
          <p className="text-gray-600">No staff members found.</p>
        ) : (
          <div className="space-y-3">
            {staffMembers.map((item) => (
              <div
                key={item._id}
                className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center"
              >
                <div className="xl:col-span-4">
                  <p className="font-semibold text-black">{item.user?.name || "Staff"}</p>
                  <p className="text-sm text-gray-600">{item.user?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">Role: {item.roleName}</p>
                </div>

                <div className="xl:col-span-4 flex flex-wrap gap-2">
                  {permissionKeys.map((key) => (
                    <span
                      key={key}
                      className={`text-xs px-2 py-1 rounded ${
                        item.permissions?.[key]
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {key}
                    </span>
                  ))}
                </div>

                <div className="xl:col-span-4 flex flex-wrap items-center gap-2">
                  <select
                    value={item.status}
                    onChange={(event) =>
                      updateStaff(item, {
                        status: event.target.value,
                      })
                    }
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>

                    <button
                      onClick={() =>
                        updateStaff(item, {
                        permissions: {
                          ...item.permissions,
                          manageSettings: !item.permissions?.manageSettings,
                        },
                      })
                      }
                    className="px-3 py-2 text-sm border border-gray-200 rounded-lg"
                  >
                    Toggle Settings
                  </button>

                  <button
                    onClick={() => removeStaff(item._id)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg"
                  >
                    <FiTrash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleStaff;
