import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../hooks/useAuth";
import { FiCreditCard, FiRefreshCw, FiTrash2 } from "react-icons/fi";

const baseUrl = import.meta.env.VITE_API_URL;

const initialGatewayConfig = {
  publishableKey: "",
  secretKey: "",
  clientId: "",
  clientSecret: "",
  sandbox: true,
  storeId: "",
  storePassword: "",
  currency: "",
  successUrl: "",
  cancelUrl: "",
  failUrl: "",
  ipnUrl: "",
};

const initialForm = {
  code: "",
  type: "",
  channelType: "manual",
  accountNo: "",
  instructions: "",
  requiresTransactionProof: true,
  displayOrder: 0,
  isActive: true,
  gatewayConfig: initialGatewayConfig,
};

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const sanitizeCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const AdminPaymentMethods = () => {
  const { user } = useAuth();
  const isAdmin = user?.userType === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isGatewayType = useMemo(
    () => ["stripe", "paypal", "sslcommerz"].includes(form.channelType),
    [form.channelType],
  );

  const loadPaymentMethods = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/auth/admin/payment-methods`, {
        headers: getAuthHeaders(),
      });
      setPaymentMethods(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to load payment methods");
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadPaymentMethods();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setForm(initialForm);
    setEditingId("");
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    if (name.startsWith("gateway.")) {
      const key = name.replace("gateway.", "");
      setForm((prev) => ({
        ...prev,
        gatewayConfig: {
          ...prev.gatewayConfig,
          [key]: nextValue,
        },
      }));
      return;
    }

    if (name === "channelType") {
      setForm((prev) => ({
        ...prev,
        channelType: nextValue,
        requiresTransactionProof: nextValue === "manual",
        accountNo: nextValue === "manual" ? prev.accountNo : "",
      }));
      return;
    }

    if (name === "code") {
      setForm((prev) => ({ ...prev, code: sanitizeCode(nextValue) }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: nextValue }));
  };

  const validateForm = () => {
    if (!String(form.type || "").trim()) {
      toast.error("Payment method name is required");
      return false;
    }
    if (form.channelType === "manual" && !String(form.accountNo || "").trim()) {
      toast.error("Account details are required for manual payment");
      return false;
    }
    if (form.channelType === "stripe" && !String(form.gatewayConfig.secretKey || "").trim()) {
      toast.error("Stripe secret key is required");
      return false;
    }
    if (
      form.channelType === "paypal" &&
      (!String(form.gatewayConfig.clientId || "").trim() ||
        !String(form.gatewayConfig.clientSecret || "").trim())
    ) {
      toast.error("PayPal client ID and secret are required");
      return false;
    }
    if (
      form.channelType === "sslcommerz" &&
      (!String(form.gatewayConfig.storeId || "").trim() ||
        !String(form.gatewayConfig.storePassword || "").trim())
    ) {
      toast.error("SSLCommerz store ID and password are required");
      return false;
    }
    return true;
  };

  const buildPayload = () => ({
    code: sanitizeCode(form.code) || sanitizeCode(form.type),
    type: String(form.type || "").trim(),
    channelType: form.channelType,
    accountNo: form.channelType === "manual" ? String(form.accountNo || "").trim() : "",
    instructions: String(form.instructions || "").trim(),
    requiresTransactionProof:
      form.channelType === "manual" ? Boolean(form.requiresTransactionProof) : false,
    displayOrder: Number(form.displayOrder || 0),
    isActive: Boolean(form.isActive),
    gatewayConfig: form.gatewayConfig || {},
  });

  const handleSave = async (event) => {
    event.preventDefault();
    if (!validateForm()) return;

    try {
      setSaving(true);
      const payload = buildPayload();

      if (editingId) {
        await axios.put(`${baseUrl}/auth/admin/payment-methods/${editingId}`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Payment method updated");
      } else {
        await axios.post(`${baseUrl}/auth/admin/payment-methods`, payload, {
          headers: getAuthHeaders(),
        });
        toast.success("Payment method created");
      }

      resetForm();
      loadPaymentMethods();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to save payment method");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (method) => {
    setEditingId(String(method._id || ""));
    setForm({
      code: method.code || "",
      type: method.type || "",
      channelType: method.channelType || "manual",
      accountNo: method.accountNo || "",
      instructions: method.instructions || "",
      requiresTransactionProof: Boolean(method.requiresTransactionProof),
      displayOrder: Number(method.displayOrder || 0),
      isActive: method.isActive !== false,
      gatewayConfig: {
        ...initialGatewayConfig,
        ...(method.gatewayConfig || {}),
      },
    });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm?._id) return;
    try {
      setIsDeleting(true);
      await axios.delete(`${baseUrl}/auth/admin/payment-methods/${deleteConfirm._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Payment method deleted");
      setDeleteConfirm(null);
      loadPaymentMethods();
    } catch (error) {
      toast.error(error.response?.data?.error || "Failed to delete payment method");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admin can manage payment methods.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiCreditCard className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold">Payment Gateway Management</h1>
        <p className="text-zinc-200 mt-1">
          Configure manual/COD and Stripe, PayPal, SSLCommerz gateways for checkout.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 space-y-4"
      >
        <h2 className="text-lg font-semibold text-black">
          {editingId ? "Edit Payment Method" : "Create Payment Method"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <input
            name="type"
            value={form.type}
            onChange={handleFormChange}
            placeholder="Display name (e.g. bKash, Stripe)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          />
          <input
            name="code"
            value={form.code}
            onChange={handleFormChange}
            placeholder="code (auto from name)"
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          />
          <select
            name="channelType"
            value={form.channelType}
            onChange={handleFormChange}
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          >
            <option value="manual">Manual</option>
            <option value="cod">Cash on Delivery</option>
            <option value="stripe">Stripe</option>
            <option value="paypal">PayPal</option>
            <option value="sslcommerz">SSLCommerz</option>
          </select>
          <input
            name="displayOrder"
            type="number"
            value={form.displayOrder}
            onChange={handleFormChange}
            placeholder="Display order"
            className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
          />
        </div>

        {form.channelType === "manual" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="accountNo"
              value={form.accountNo}
              onChange={handleFormChange}
              placeholder="Account number/details"
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
            />
            <label className="inline-flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="requiresTransactionProof"
                checked={Boolean(form.requiresTransactionProof)}
                onChange={handleFormChange}
              />
              Require transaction ID in checkout
            </label>
          </div>
        )}

        {isGatewayType && (
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900">Gateway Credentials</p>
            {form.channelType === "stripe" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  name="gateway.publishableKey"
                  value={form.gatewayConfig.publishableKey}
                  onChange={handleFormChange}
                  placeholder="Publishable key (optional for frontend)"
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  name="gateway.secretKey"
                  value={form.gatewayConfig.secretKey}
                  onChange={handleFormChange}
                  placeholder="Secret key"
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
              </div>
            )}
            {form.channelType === "paypal" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  name="gateway.clientId"
                  value={form.gatewayConfig.clientId}
                  onChange={handleFormChange}
                  placeholder="PayPal client ID"
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  name="gateway.clientSecret"
                  value={form.gatewayConfig.clientSecret}
                  onChange={handleFormChange}
                  placeholder="PayPal client secret"
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="gateway.sandbox"
                    checked={Boolean(form.gatewayConfig.sandbox)}
                    onChange={handleFormChange}
                  />
                  Use sandbox
                </label>
              </div>
            )}
            {form.channelType === "sslcommerz" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  name="gateway.storeId"
                  value={form.gatewayConfig.storeId}
                  onChange={handleFormChange}
                  placeholder="Store ID"
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <input
                  name="gateway.storePassword"
                  value={form.gatewayConfig.storePassword}
                  onChange={handleFormChange}
                  placeholder="Store password"
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                />
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    name="gateway.sandbox"
                    checked={Boolean(form.gatewayConfig.sandbox)}
                    onChange={handleFormChange}
                  />
                  Use sandbox
                </label>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                name="gateway.currency"
                value={form.gatewayConfig.currency}
                onChange={handleFormChange}
                placeholder="Currency (BDT/USD)"
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
              <input
                name="gateway.successUrl"
                value={form.gatewayConfig.successUrl}
                onChange={handleFormChange}
                placeholder="Success URL (optional)"
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
              <input
                name="gateway.cancelUrl"
                value={form.gatewayConfig.cancelUrl}
                onChange={handleFormChange}
                placeholder="Cancel URL (optional)"
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
              />
              {form.channelType === "sslcommerz" && (
                <>
                  <input
                    name="gateway.failUrl"
                    value={form.gatewayConfig.failUrl}
                    onChange={handleFormChange}
                    placeholder="Fail URL (optional)"
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                  />
                  <input
                    name="gateway.ipnUrl"
                    value={form.gatewayConfig.ipnUrl}
                    onChange={handleFormChange}
                    placeholder="IPN URL (optional)"
                    className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
                  />
                </>
              )}
            </div>
          </div>
        )}

        <textarea
          name="instructions"
          value={form.instructions}
          onChange={handleFormChange}
          rows={2}
          placeholder="Optional instructions shown in checkout"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm"
        />

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              name="isActive"
              checked={Boolean(form.isActive)}
              onChange={handleFormChange}
            />
            Active in checkout
          </label>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Method" : "Create Method"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 border border-gray-300 rounded-lg"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">
            Configured Methods ({paymentMethods.length})
          </h2>
          <button
            type="button"
            onClick={loadPaymentMethods}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading payment methods...</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-sm text-gray-600">No payment methods configured yet.</p>
        ) : (
          <div className="space-y-3">
            {paymentMethods.map((method) => (
              <div
                key={method._id}
                className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
              >
                <div>
                  <p className="font-semibold text-black">
                    {method.type} ({String(method.channelType || "manual").toUpperCase()})
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Code: {method.code} | Order: {Number(method.displayOrder || 0)} |{" "}
                    {method.isActive ? "Active" : "Inactive"}
                  </p>
                  {method.accountNo ? (
                    <p className="text-xs text-gray-600 mt-1">Account: {method.accountNo}</p>
                  ) : (
                    <p className="text-xs text-gray-600 mt-1">
                      Gateway: credentials configured in admin panel
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(method)}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(method)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 rounded-lg text-sm"
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
        isOpen={Boolean(deleteConfirm)}
        title="Delete Payment Method"
        message={
          deleteConfirm?.type
            ? `Delete ${deleteConfirm.type} payment method?`
            : "Delete this payment method?"
        }
        confirmLabel="Delete"
        isDanger
        isLoading={isDeleting}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default AdminPaymentMethods;
