import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw, FiSave } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { isSuperAdminUser } from "../utils/dashboardAccess";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ROLE_OPTIONS = ["admin", "staff", "vendor", "user"];
const STATUS_OPTIONS = ["active", "pending", "inactive", "suspended"];
const ADMIN_PERMISSION_OPTIONS = [
  { key: "manageOrders", label: "Orders" },
  { key: "manageProducts", label: "Products" },
  { key: "manageUsers", label: "Users" },
  { key: "manageReports", label: "Reports" },
  { key: "manageWebsite", label: "Website" },
];

const ModuleAdminUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [search, setSearch] = useState("");

  const isAdmin = String(user?.userType || "").toLowerCase() === "admin";
  const isSuperAdmin = isSuperAdminUser(user);
  const currentUserId = String(user?._id || "");

  const initDraft = (row) => ({
    userType: String(row?.userType || "user").toLowerCase(),
    status: String(row?.status || "active").toLowerCase(),
    isBlacklisted: Boolean(row?.isBlacklisted),
    blacklistReason: String(row?.blacklistReason || ""),
    adminNotes: String(row?.adminNotes || ""),
    adminPermissions: ADMIN_PERMISSION_OPTIONS.reduce((acc, permission) => {
      acc[permission.key] = Boolean(row?.adminSettings?.permissions?.[permission.key]);
      return acc;
    }, {}),
  });

  const fetchUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/auth/admin/all-users`, {
        headers: getAuthHeaders(),
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      setUsers(rows);
      setDrafts(
        rows.reduce((acc, row) => {
          acc[String(row._id)] = initDraft(row);
          return acc;
        }, {}),
      );
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load users");
      setUsers([]);
      setDrafts({});
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const term = String(search || "").trim().toLowerCase();
    if (!term) return users;
    return users.filter((row) =>
      [row?.name, row?.email, row?.phone, row?.userType, row?.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [users, search]);

  const summary = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((row) => String(row?.userType || "").toLowerCase() === "admin").length,
      vendors: users.filter((row) => String(row?.userType || "").toLowerCase() === "vendor").length,
      staff: users.filter((row) => String(row?.userType || "").toLowerCase() === "staff").length,
      blacklisted: users.filter((row) => Boolean(row?.isBlacklisted)).length,
    }),
    [users],
  );

  const updateDraft = (userId, key, value) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [key]: value,
      },
    }));
  };

  const updatePermissionDraft = (userId, permissionKey, checked) => {
    setDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        adminPermissions: {
          ...((prev[userId] || {}).adminPermissions || {}),
          [permissionKey]: checked,
        },
      },
    }));
  };

  const saveUser = async (row) => {
    const userId = String(row?._id || "");
    if (!userId) return;

    const payload = drafts[userId];
    if (!payload) return;

    try {
      setSavingId(userId);
      const response = await axios.patch(`${baseUrl}/auth/admin/users/${userId}`, payload, {
        headers: getAuthHeaders(),
      });

      const updated = response.data?.user;
      if (updated) {
        setUsers((prev) => prev.map((item) => (String(item._id) === userId ? updated : item)));
        setDrafts((prev) => ({
          ...prev,
          [userId]: initDraft(updated),
        }));
      }
      toast.success("User updated");
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to update user");
    } finally {
      setSavingId("");
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admin can manage user access levels.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Admin User Management</h1>
        <p className="text-zinc-200 mt-2">
          Manage admin/staff/vendor/customer access, status, and blacklist controls.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Users</p>
          <p className="text-xl font-bold text-black mt-1">{summary.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Admins</p>
          <p className="text-xl font-bold text-black mt-1">{summary.admins}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Vendors</p>
          <p className="text-xl font-bold text-black mt-1">{summary.vendors}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Staff</p>
          <p className="text-xl font-bold text-black mt-1">{summary.staff}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500">Blacklisted</p>
          <p className="text-xl font-bold text-black mt-1">{summary.blacklisted}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-semibold text-black">Users ({filteredUsers.length})</h2>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, phone, role"
              className="h-10 px-3 text-sm border border-gray-300 rounded-lg min-w-[220px]"
            />
            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 px-4 border border-gray-300 rounded-lg text-sm"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading users...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="text-gray-600">No users found.</p>
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600 border-b border-gray-200">
                <tr>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Permissions</th>
                  <th className="py-2 pr-3">Blacklist</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((row) => {
                  const userId = String(row._id);
                  const draft = drafts[userId] || initDraft(row);
                  const self = userId === currentUserId;
                  const rowSaving = savingId === userId;
                  const rowIsAdmin = String(row?.userType || "").toLowerCase() === "admin";
                  const rowIsSuperAdmin = Boolean(row?.adminSettings?.isSuperAdmin);
                  const roleOptions =
                    !isSuperAdmin && !rowIsAdmin
                      ? ROLE_OPTIONS.filter((role) => role !== "admin")
                      : ROLE_OPTIONS;
                  const restrictAdminRow = rowIsAdmin && !isSuperAdmin;

                  return (
                    <tr key={userId} className="border-b border-gray-100 align-top">
                      <td className="py-3 pr-3 min-w-[220px]">
                        <p className="font-medium text-black">
                          {row.name}
                          {rowIsSuperAdmin ? (
                            <span className="ml-2 inline-flex rounded-full bg-black px-2 py-0.5 text-[10px] uppercase tracking-wide text-white">
                              Super Admin
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-gray-500">{row.email}</p>
                        <p className="text-xs text-gray-500">{row.phone || "-"}</p>
                      </td>
                      <td className="py-3 pr-3 min-w-[150px]">
                        <select
                          value={draft.userType}
                          onChange={(event) => updateDraft(userId, "userType", event.target.value)}
                          disabled={self || restrictAdminRow}
                          className="h-9 w-full border border-gray-300 rounded-lg px-2 text-sm disabled:bg-gray-100"
                        >
                          {roleOptions.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3 min-w-[150px]">
                        <select
                          value={draft.status}
                          onChange={(event) => updateDraft(userId, "status", event.target.value)}
                          disabled={self}
                          className="h-9 w-full border border-gray-300 rounded-lg px-2 text-sm disabled:bg-gray-100"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 pr-3 min-w-[220px]">
                        {draft.userType === "admin" || draft.userType === "staff" ? (
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                            {ADMIN_PERMISSION_OPTIONS.map((permission) => (
                              <label
                                key={permission.key}
                                className="inline-flex items-center gap-1.5 text-xs text-gray-700"
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(
                                    draft.adminPermissions?.[permission.key],
                                  )}
                                  onChange={(event) =>
                                    updatePermissionDraft(
                                      userId,
                                      permission.key,
                                      event.target.checked,
                                    )
                                  }
                                  disabled={restrictAdminRow}
                                />
                                {permission.label}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">N/A</p>
                        )}
                      </td>
                      <td className="py-3 pr-3 min-w-[220px]">
                        <label className="inline-flex items-center gap-2 text-xs text-gray-700 mb-2">
                          <input
                            type="checkbox"
                            checked={Boolean(draft.isBlacklisted)}
                            onChange={(event) =>
                              updateDraft(userId, "isBlacklisted", event.target.checked)
                            }
                            disabled={draft.userType === "admin"}
                          />
                          Blacklist
                        </label>
                        <input
                          value={draft.blacklistReason}
                          onChange={(event) =>
                            updateDraft(userId, "blacklistReason", event.target.value)
                          }
                          disabled={!draft.isBlacklisted}
                          placeholder="Blacklist reason"
                          className="h-9 w-full border border-gray-300 rounded-lg px-2 text-xs disabled:bg-gray-100"
                        />
                      </td>
                      <td className="py-3 pr-3 min-w-[220px]">
                        <textarea
                          value={draft.adminNotes}
                          onChange={(event) => updateDraft(userId, "adminNotes", event.target.value)}
                          rows={2}
                          className="w-full border border-gray-300 rounded-lg p-2 text-xs"
                        />
                      </td>
                      <td className="py-3 pr-3 min-w-[110px]">
                        <button
                          type="button"
                          onClick={() => saveUser(row)}
                          disabled={rowSaving}
                          className="inline-flex h-9 items-center gap-1.5 px-3 border border-gray-300 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-60"
                        >
                          <FiSave className="w-3.5 h-3.5" />
                          {rowSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleAdminUsers;
