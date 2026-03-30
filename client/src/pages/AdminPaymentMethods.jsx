import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import {
  FiCheckCircle,
  FiCreditCard,
  FiRefreshCw,
  FiShield,
  FiTrash2,
} from "react-icons/fi";
import ConfirmModal from "../components/ConfirmModal";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const channelOptions = [
  {
    value: "manual",
    label: "Manual Payment",
    description: "Use this for bKash, Nagad, bank transfer, or any wallet/account collection.",
  },
  {
    value: "cod",
    label: "Cash on Delivery",
    description: "Customer pays after delivery. No transaction ID or gateway setup is required.",
  },
  {
    value: "sslcommerz",
    label: "SSLCommerz API",
    description: "Redirect customers to SSLCommerz checkout with store credentials.",
  },
  {
    value: "stripe",
    label: "Stripe API",
    description: "Redirect customers to Stripe Checkout with publishable and secret keys.",
  },
  {
    value: "paypal",
    label: "PayPal API",
    description: "Optional online gateway if you also want PayPal in this project.",
  },
];

const createGatewayConfig = () => ({
  publishableKey: "",
  secretKey: "",
  webhookSecret: "",
  currency: "bdt",
  successUrl: "",
  cancelUrl: "",
  clientId: "",
  clientSecret: "",
  sandbox: true,
  storeId: "",
  storePassword: "",
  failUrl: "",
  ipnUrl: "",
});

const createInitialForm = () => ({
  code: "",
  type: "",
  channelType: "manual",
  accountNo: "",
  instructions: "",
  requiresTransactionProof: true,
  shippingCost: 0,
  displayOrder: 0,
  isActive: true,
  gatewayConfig: createGatewayConfig(),
});

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

const isGatewayChannel = (channelType) =>
  ["stripe", "paypal", "sslcommerz"].includes(String(channelType || "").trim().toLowerCase());

const getChannelMeta = (channelType) =>
  channelOptions.find((entry) => entry.value === channelType) || channelOptions[0];

const getMaskedValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "Not configured";
  if (raw.length <= 8) return raw;
  return `${raw.slice(0, 4)}...${raw.slice(-4)}`;
};

const formatCurrency = (value) => `Tk ${Number(value || 0).toFixed(2)}`;

const buildGatewaySummary = (method) => {
  const channelType = String(method?.channelType || "manual").trim().toLowerCase();
  const gatewayConfig =
    method?.gatewayConfig && typeof method.gatewayConfig === "object"
      ? method.gatewayConfig
      : {};

  if (channelType === "stripe") {
    return [
      `Publishable key: ${getMaskedValue(gatewayConfig.publishableKey)}`,
      `Secret key: ${getMaskedValue(gatewayConfig.secretKey)}`,
      `Currency: ${String(gatewayConfig.currency || "bdt").toUpperCase()}`,
    ];
  }

  if (channelType === "paypal") {
    return [
      `Client ID: ${getMaskedValue(gatewayConfig.clientId)}`,
      `Mode: ${gatewayConfig.sandbox === false ? "Live" : "Sandbox"}`,
      `Currency: ${String(gatewayConfig.currency || "USD").toUpperCase()}`,
    ];
  }

  if (channelType === "sslcommerz") {
    return [
      `Store ID: ${getMaskedValue(gatewayConfig.storeId)}`,
      `Mode: ${gatewayConfig.sandbox === false ? "Live" : "Sandbox"}`,
      `Currency: ${String(gatewayConfig.currency || "BDT").toUpperCase()}`,
    ];
  }

  return [];
};

const AdminPaymentMethods = () => {
  const { user } = useAuth();
  const isAdmin = user?.userType === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [form, setForm] = useState(createInitialForm());
  const [editingId, setEditingId] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const channelMeta = useMemo(
    () => getChannelMeta(form.channelType),
    [form.channelType],
  );
  const isManual = form.channelType === "manual";
  const isCod = form.channelType === "cod";
  const isStripe = form.channelType === "stripe";
  const isPayPal = form.channelType === "paypal";
  const isSslCommerz = form.channelType === "sslcommerz";
  const isGateway = isGatewayChannel(form.channelType);

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

  useEffect(() => {
    if (!isManual && form.requiresTransactionProof) {
      setForm((prev) => ({
        ...prev,
        requiresTransactionProof: false,
      }));
    }
  }, [form.requiresTransactionProof, isManual]);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingId("");
  };

  const updateGatewayConfig = (name, value) => {
    setForm((prev) => ({
      ...prev,
      gatewayConfig: {
        ...prev.gatewayConfig,
        [name]: value,
      },
    }));
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    const nextValue = type === "checkbox" ? checked : value;

    if (name === "channelType") {
      const nextChannel = String(value || "manual").trim().toLowerCase();
      setForm((prev) => ({
        ...prev,
        channelType: nextChannel,
        type:
          nextChannel === "cod"
            ? "Cash on Delivery"
            : prev.type === "Cash on Delivery"
              ? ""
              : prev.type,
        accountNo: nextChannel === "manual" ? prev.accountNo : "",
        requiresTransactionProof: nextChannel === "manual",
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

    if (isManual && !String(form.accountNo || "").trim()) {
      toast.error("Account number/details are required for manual payment");
      return false;
    }

    if (form.isActive && isStripe) {
      if (
        !String(form.gatewayConfig.publishableKey || "").trim() ||
        !String(form.gatewayConfig.secretKey || "").trim()
      ) {
        toast.error("Stripe publishable key and secret key are required");
        return false;
      }
    }

    if (form.isActive && isPayPal) {
      if (
        !String(form.gatewayConfig.clientId || "").trim() ||
        !String(form.gatewayConfig.clientSecret || "").trim()
      ) {
        toast.error("PayPal client ID and client secret are required");
        return false;
      }
    }

    if (form.isActive && isSslCommerz) {
      if (
        !String(form.gatewayConfig.storeId || "").trim() ||
        !String(form.gatewayConfig.storePassword || "").trim()
      ) {
        toast.error("SSLCommerz store ID and store password are required");
        return false;
      }
    }

    return true;
  };

  const buildGatewayPayload = () => {
    if (isStripe) {
      return {
        publishableKey: String(form.gatewayConfig.publishableKey || "").trim(),
        secretKey: String(form.gatewayConfig.secretKey || "").trim(),
        webhookSecret: String(form.gatewayConfig.webhookSecret || "").trim(),
        currency: String(form.gatewayConfig.currency || "bdt").trim() || "bdt",
        successUrl: String(form.gatewayConfig.successUrl || "").trim(),
        cancelUrl: String(form.gatewayConfig.cancelUrl || "").trim(),
      };
    }

    if (isPayPal) {
      return {
        clientId: String(form.gatewayConfig.clientId || "").trim(),
        clientSecret: String(form.gatewayConfig.clientSecret || "").trim(),
        sandbox: Boolean(form.gatewayConfig.sandbox),
        currency: String(form.gatewayConfig.currency || "USD").trim() || "USD",
        successUrl: String(form.gatewayConfig.successUrl || "").trim(),
        cancelUrl: String(form.gatewayConfig.cancelUrl || "").trim(),
      };
    }

    if (isSslCommerz) {
      return {
        storeId: String(form.gatewayConfig.storeId || "").trim(),
        storePassword: String(form.gatewayConfig.storePassword || "").trim(),
        sandbox: Boolean(form.gatewayConfig.sandbox),
        currency: String(form.gatewayConfig.currency || "BDT").trim() || "BDT",
        successUrl: String(form.gatewayConfig.successUrl || "").trim(),
        failUrl: String(form.gatewayConfig.failUrl || "").trim(),
        cancelUrl: String(form.gatewayConfig.cancelUrl || "").trim(),
        ipnUrl: String(form.gatewayConfig.ipnUrl || "").trim(),
      };
    }

    return {};
  };

  const buildPayload = () => ({
    code: sanitizeCode(form.code) || sanitizeCode(form.type),
    type: String(form.type || "").trim(),
    channelType: String(form.channelType || "manual").trim().toLowerCase(),
    accountNo: isManual ? String(form.accountNo || "").trim() : "",
    instructions: String(form.instructions || "").trim(),
    requiresTransactionProof: isManual ? Boolean(form.requiresTransactionProof) : false,
    shippingCost: isCod ? Math.max(0, Number(form.shippingCost || 0)) : 0,
    displayOrder: Number(form.displayOrder || 0),
    isActive: Boolean(form.isActive),
    gatewayConfig: buildGatewayPayload(),
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
    const channelType = String(method?.channelType || "manual").trim().toLowerCase();
    const gatewayConfig =
      method?.gatewayConfig && typeof method.gatewayConfig === "object"
        ? method.gatewayConfig
        : {};

    setEditingId(String(method?._id || ""));
    setForm({
      code: method?.code || "",
      type: method?.type || "",
      channelType,
      accountNo: method?.accountNo || "",
      instructions: method?.instructions || "",
      requiresTransactionProof:
        channelType === "manual"
          ? method?.requiresTransactionProof === undefined
            ? true
            : Boolean(method?.requiresTransactionProof)
          : false,
      shippingCost: Math.max(0, Number(method?.shippingCost || 0)),
      displayOrder: Number(method?.displayOrder || 0),
      isActive: method?.isActive !== false,
      gatewayConfig: {
        ...createGatewayConfig(),
        ...gatewayConfig,
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
      if (editingId === String(deleteConfirm._id)) {
        resetForm();
      }
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
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center">
        <h2 className="mb-2 text-xl font-semibold text-black">Admin Access Required</h2>
        <p className="text-gray-600">Only admin can manage payment methods.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-linear-to-r from-zinc-900 to-black p-6 text-white md:p-8">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <FiCreditCard className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold">Payment Methods</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-200 md:text-base">
          Use manual payment for bKash, Nagad, and bank transfer. Use Stripe or SSLCommerz
          when you want real gateway checkout from the office storefront.
        </p>
      </div>

      <form
        onSubmit={handleSave}
        className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">
              {editingId ? "Edit Payment Method" : "Create Payment Method"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">{channelMeta.description}</p>
          </div>
          <div className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-gray-600">
            {channelMeta.label}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select
            name="channelType"
            value={form.channelType}
            onChange={handleFormChange}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          >
            {channelOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            name="type"
            value={form.type}
            onChange={handleFormChange}
            placeholder="Display name"
            disabled={isCod}
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm disabled:bg-gray-100"
          />

          <input
            name="code"
            value={form.code}
            onChange={handleFormChange}
            placeholder="Code (auto from name)"
            className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
          />

          {isCod ? (
            <input
              name="shippingCost"
              type="number"
              min="0"
              step="0.01"
              value={form.shippingCost}
              onChange={handleFormChange}
              placeholder="COD shipping cost"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
          ) : (
            <input
              name="displayOrder"
              type="number"
              value={form.displayOrder}
              onChange={handleFormChange}
              placeholder="Display order"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white">
              {channelMeta.label}
            </span>
            {isManual ? (
              <>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5">
                  bKash
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5">
                  Nagad
                </span>
                <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 ring-1 ring-black/5">
                  Bank Transfer
                </span>
              </>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-gray-600">{channelMeta.description}</p>
        </div>

        {isManual ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              name="accountNo"
              value={form.accountNo}
              onChange={handleFormChange}
              placeholder="Account / wallet number / bank details"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                name="requiresTransactionProof"
                checked={Boolean(form.requiresTransactionProof)}
                onChange={handleFormChange}
              />
              Require transaction ID in checkout
            </label>
          </div>
        ) : null}

        {isStripe ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.gatewayConfig.publishableKey}
              onChange={(event) => updateGatewayConfig("publishableKey", event.target.value)}
              placeholder="Stripe publishable key"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.secretKey}
              onChange={(event) => updateGatewayConfig("secretKey", event.target.value)}
              placeholder="Stripe secret key"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.webhookSecret}
              onChange={(event) => updateGatewayConfig("webhookSecret", event.target.value)}
              placeholder="Webhook secret (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.currency}
              onChange={(event) => updateGatewayConfig("currency", event.target.value)}
              placeholder="Currency"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase"
            />
            <input
              value={form.gatewayConfig.successUrl}
              onChange={(event) => updateGatewayConfig("successUrl", event.target.value)}
              placeholder="Success URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm md:col-span-2"
            />
            <input
              value={form.gatewayConfig.cancelUrl}
              onChange={(event) => updateGatewayConfig("cancelUrl", event.target.value)}
              placeholder="Cancel URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm md:col-span-2"
            />
          </div>
        ) : null}

        {isPayPal ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.gatewayConfig.clientId}
              onChange={(event) => updateGatewayConfig("clientId", event.target.value)}
              placeholder="PayPal client ID"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.clientSecret}
              onChange={(event) => updateGatewayConfig("clientSecret", event.target.value)}
              placeholder="PayPal client secret"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.currency}
              onChange={(event) => updateGatewayConfig("currency", event.target.value)}
              placeholder="Currency"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(form.gatewayConfig.sandbox)}
                onChange={(event) => updateGatewayConfig("sandbox", event.target.checked)}
              />
              Use sandbox mode
            </label>
            <input
              value={form.gatewayConfig.successUrl}
              onChange={(event) => updateGatewayConfig("successUrl", event.target.value)}
              placeholder="Success URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm md:col-span-2"
            />
            <input
              value={form.gatewayConfig.cancelUrl}
              onChange={(event) => updateGatewayConfig("cancelUrl", event.target.value)}
              placeholder="Cancel URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm md:col-span-2"
            />
          </div>
        ) : null}

        {isSslCommerz ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              value={form.gatewayConfig.storeId}
              onChange={(event) => updateGatewayConfig("storeId", event.target.value)}
              placeholder="SSLCommerz store ID"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.storePassword}
              onChange={(event) => updateGatewayConfig("storePassword", event.target.value)}
              placeholder="SSLCommerz store password"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.currency}
              onChange={(event) => updateGatewayConfig("currency", event.target.value)}
              placeholder="Currency"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm uppercase"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={Boolean(form.gatewayConfig.sandbox)}
                onChange={(event) => updateGatewayConfig("sandbox", event.target.checked)}
              />
              Use sandbox mode
            </label>
            <input
              value={form.gatewayConfig.successUrl}
              onChange={(event) => updateGatewayConfig("successUrl", event.target.value)}
              placeholder="Success URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.failUrl}
              onChange={(event) => updateGatewayConfig("failUrl", event.target.value)}
              placeholder="Fail URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.cancelUrl}
              onChange={(event) => updateGatewayConfig("cancelUrl", event.target.value)}
              placeholder="Cancel URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <input
              value={form.gatewayConfig.ipnUrl}
              onChange={(event) => updateGatewayConfig("ipnUrl", event.target.value)}
              placeholder="IPN URL (optional)"
              className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>
        ) : null}

        <textarea
          name="instructions"
          value={form.instructions}
          onChange={handleFormChange}
          rows={3}
          placeholder={
            isCod
              ? "Optional COD instructions shown to customer"
              : isGateway
                ? "Optional gateway instructions shown in checkout"
                : "Optional checkout instructions"
          }
          className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
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
            className="rounded-lg bg-black px-5 py-2.5 font-medium text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editingId ? "Update Method" : "Create Method"}
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-gray-300 px-5 py-2.5"
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      <div className="rounded-xl border border-gray-200 bg-white p-5 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-black">
              Configured Methods ({paymentMethods.length})
            </h2>
            <p className="text-sm text-gray-500">
              Manual methods are best for bKash and Nagad. API methods are used for redirect
              checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={loadPaymentMethods}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"
          >
            <FiRefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-gray-600">Loading payment methods...</p>
        ) : paymentMethods.length === 0 ? (
          <p className="text-sm text-gray-600">No payment methods configured yet.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {paymentMethods.map((method) => {
              const channelType = String(method?.channelType || "manual").trim().toLowerCase();
              const summary = buildGatewaySummary(method);
              const isMethodManual = channelType === "manual";
              const isMethodCod = channelType === "cod";
              const isMethodGateway = isGatewayChannel(channelType);
              const methodMeta = getChannelMeta(channelType);

              return (
                <div
                  key={method._id}
                  className="rounded-xl border border-gray-200 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-black">{method.type}</p>
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-600">
                          {methodMeta.label}
                        </span>
                        {method.isActive === false ? (
                          <span className="rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-700">
                            Inactive
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
                            <FiCheckCircle className="h-3.5 w-3.5" />
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">Code: {method.code}</p>
                      {isMethodManual && method.accountNo ? (
                        <p className="text-sm text-gray-700">Collect to: {method.accountNo}</p>
                      ) : null}
                      {method.instructions ? (
                        <p className="text-sm text-gray-600">{method.instructions}</p>
                      ) : null}
                      {isMethodManual ? (
                        <p className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          <FiShield className="h-3.5 w-3.5" />
                          Transaction proof{" "}
                          {method.requiresTransactionProof ? "required" : "optional"}
                        </p>
                      ) : null}
                      {isMethodGateway && summary.length ? (
                        <div className="space-y-1 text-sm text-gray-600">
                          {summary.map((row) => (
                            <p key={row}>{row}</p>
                          ))}
                        </div>
                      ) : null}
                      {isMethodCod ? (
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>Shipping cost: {formatCurrency(method.shippingCost)}</p>
                          <p>
                            COD orders are paid after delivery and are marked paid
                            automatically when the order becomes delivered.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(method)}
                        className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirm(method)}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <FiTrash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
                    {isMethodCod
                      ? `Channel: ${channelType} • COD shipping: ${formatCurrency(method.shippingCost)}`
                      : `Channel: ${channelType} • Order: ${Number(method.displayOrder || 0)}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        onCancel={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title="Delete payment method?"
        message={`This will remove "${deleteConfirm?.type || "this payment method"}" from checkout.`}
        confirmLabel={isDeleting ? "Deleting..." : "Delete"}
        cancelLabel="Keep"
        isDanger
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AdminPaymentMethods;
