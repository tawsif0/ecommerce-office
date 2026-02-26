import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiPlus, FiSearch, FiTrash2 } from "react-icons/fi";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const roundMoney = (value) => {
  const parsed = Number(value || 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.round((parsed + Number.EPSILON) * 100) / 100;
};

const qty = (value) => {
  const parsed = parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed;
};

const getPrice = (product = {}, variation = null) => {
  const source = variation || product;
  const base = Number(source?.price || 0);
  const sale =
    source?.salePrice === null || source?.salePrice === undefined
      ? null
      : Number(source.salePrice);
  if (Number.isFinite(sale) && sale > 0 && sale < base) return roundMoney(sale);
  return roundMoney(base);
};

const AdminAddOrder = () => {
  const [customer, setCustomer] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    alternativePhone: "",
    address: "",
    city: "",
    subCity: "",
    district: "",
    postalCode: "",
    country: "Bangladesh",
  });
  const [meta, setMeta] = useState({
    source: "shop",
    couponCode: "",
    adminNotes: "",
    courierProvider: "",
    courierTrackingNumber: "",
    courierConsignmentId: "",
  });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentMethodId, setPaymentMethodId] = useState("");
  const [paymentDetails, setPaymentDetails] = useState({
    transactionId: "",
    sentFrom: "",
    sentTo: "",
  });
  const [shippingFee, setShippingFee] = useState(0);

  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [items, setItems] = useState([]);

  const [insights, setInsights] = useState(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [customerUserId, setCustomerUserId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedMethod = useMemo(
    () => paymentMethods.find((entry) => String(entry._id) === String(paymentMethodId)) || null,
    [paymentMethods, paymentMethodId],
  );

  const subtotal = useMemo(
    () =>
      roundMoney(
        items.reduce(
          (sum, item) => sum + Number(item.unitPrice || 0) * Number(item.quantity || 0),
          0,
        ),
      ),
    [items],
  );

  const total = useMemo(
    () => roundMoney(subtotal + Number(shippingFee || 0)),
    [subtotal, shippingFee],
  );

  useEffect(() => {
    const loadMethods = async () => {
      try {
        const response = await axios.get(`${baseUrl}/auth/payment-methods`);
        const methods = Array.isArray(response.data) ? response.data : [];
        setPaymentMethods(methods);
        if (methods[0]?._id) {
          setPaymentMethodId(String(methods[0]._id));
        }
      } catch (error) {
        toast.error(error.response?.data?.error || "Failed to load payment methods");
      }
    };
    loadMethods();
  }, []);

  useEffect(() => {
    const query = String(search || "").trim();
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await axios.get(`${baseUrl}/products/public/search`, {
          params: { query },
        });
        setResults(Array.isArray(response.data?.products) ? response.data.products : []);
      } catch (_error) {
        setResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [search]);

  const checkRisk = async () => {
    if (!customer.phone.trim() && !customer.email.trim() && !customerUserId) {
      toast.error("Phone or email is required to check customer risk");
      return;
    }

    try {
      setInsightLoading(true);
      const response = await axios.post(
        `${baseUrl}/orders/admin/customer-insights`,
        {
          email: customer.email,
          phone: customer.phone,
          alternativePhone: customer.alternativePhone,
          customerUserId,
        },
        { headers: getAuthHeaders() },
      );
      setInsights(response.data?.insights || null);
      if (response.data?.insights?.isBlacklisted) {
        toast.error(response.data?.insights?.blacklistReason || "Customer is blacklisted");
      } else {
        toast.success("Customer risk loaded");
      }
    } catch (error) {
      setInsights(null);
      toast.error(error.response?.data?.message || "Failed to load customer risk");
    } finally {
      setInsightLoading(false);
    }
  };

  const addItem = (product) => {
    if (!product?._id) return;
    if (String(product.priceType || "").toLowerCase() === "tba") {
      toast.error("TBA products cannot be added");
      return;
    }

    const exists = items.some((entry) => String(entry.productId) === String(product._id));
    if (exists) {
      setItems((prev) =>
        prev.map((entry) =>
          String(entry.productId) === String(product._id)
            ? { ...entry, quantity: entry.quantity + 1 }
            : entry,
        ),
      );
      return;
    }

    const variations = Array.isArray(product.variations)
      ? product.variations.filter((entry) => entry?.isActive !== false)
      : [];
    const firstVariation = variations[0] || null;

    setItems((prev) => [
      ...prev,
      {
        productId: String(product._id),
        title: product.title || "Product",
        quantity: 1,
        unitPrice: getPrice(product, firstVariation),
        variationId: firstVariation?._id ? String(firstVariation._id) : "",
        variations: variations.map((entry) => ({
          _id: String(entry._id),
          label: entry.label || "Variation",
          price: Number(entry.price || 0),
          salePrice:
            entry.salePrice === null || entry.salePrice === undefined
              ? null
              : Number(entry.salePrice),
        })),
      },
    ]);
  };

  const submit = async (event) => {
    event.preventDefault();

    if (items.length === 0) {
      toast.error("Add at least one product");
      return;
    }

    if (!paymentMethodId) {
      toast.error("Select a payment method");
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post(
        `${baseUrl}/orders/admin/manual`,
        {
          customerUserId: customerUserId || undefined,
          shippingAddress: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            phone: customer.phone,
            alternativePhone: customer.alternativePhone,
            address: customer.address,
            city: customer.city,
            subCity: customer.subCity,
            district: customer.district || customer.subCity,
            postalCode: customer.postalCode,
            country: customer.country,
          },
          items: items.map((entry) => ({
            productId: entry.productId,
            quantity: qty(entry.quantity),
            variationId: entry.variationId || undefined,
          })),
          shippingFee: Number(shippingFee || 0),
          source: meta.source,
          couponCode: meta.couponCode || undefined,
          adminNotes: meta.adminNotes || "",
          courierProvider: meta.courierProvider || "",
          courierTrackingNumber: meta.courierTrackingNumber || "",
          courierConsignmentId: meta.courierConsignmentId || "",
          paymentMethodId,
          paymentDetails,
        },
        { headers: getAuthHeaders() },
      );

      toast.success(response.data?.message || "Order created");
      setItems([]);
      setSearch("");
      setResults([]);
      setMeta((prev) => ({ ...prev, couponCode: "", adminNotes: "" }));
      setPaymentDetails({ transactionId: "", sentFrom: "", sentTo: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Add Order</h1>
        <p className="text-zinc-200 mt-1">Manual order creation with customer risk check.</p>
      </div>

      <form onSubmit={submit} className="space-y-5">
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-black">Customer</h2>
            <button
              type="button"
              onClick={checkRisk}
              disabled={insightLoading}
              className="px-3 h-9 border border-gray-300 rounded-lg text-sm"
            >
              {insightLoading ? "Checking..." : "Check Risk"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input value={customer.firstName} onChange={(e) => setCustomer((p) => ({ ...p, firstName: e.target.value }))} placeholder="First name*" className="px-3 py-2.5 border border-gray-200 rounded-lg" required />
            <input value={customer.lastName} onChange={(e) => setCustomer((p) => ({ ...p, lastName: e.target.value }))} placeholder="Last name*" className="px-3 py-2.5 border border-gray-200 rounded-lg" required />
            <input type="email" value={customer.email} onChange={(e) => setCustomer((p) => ({ ...p, email: e.target.value }))} placeholder="Email*" className="px-3 py-2.5 border border-gray-200 rounded-lg" required />
            <input value={customer.phone} onChange={(e) => setCustomer((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone*" className="px-3 py-2.5 border border-gray-200 rounded-lg" required />
            <input value={customer.alternativePhone} onChange={(e) => setCustomer((p) => ({ ...p, alternativePhone: e.target.value }))} placeholder="Alternative phone" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={customer.postalCode} onChange={(e) => setCustomer((p) => ({ ...p, postalCode: e.target.value }))} placeholder="Postal code*" className="px-3 py-2.5 border border-gray-200 rounded-lg" required />
          </div>
          <input value={customer.address} onChange={(e) => setCustomer((p) => ({ ...p, address: e.target.value }))} placeholder="Address*" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg" required />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input value={customer.city} onChange={(e) => setCustomer((p) => ({ ...p, city: e.target.value }))} placeholder="City*" className="px-3 py-2.5 border border-gray-200 rounded-lg" required />
            <input value={customer.subCity} onChange={(e) => setCustomer((p) => ({ ...p, subCity: e.target.value }))} placeholder="Sub city" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={customer.district} onChange={(e) => setCustomer((p) => ({ ...p, district: e.target.value }))} placeholder="District" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={customer.country} onChange={(e) => setCustomer((p) => ({ ...p, country: e.target.value }))} placeholder="Country" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
          </div>

          {insights ? (
            <div className="border border-gray-200 rounded-lg p-3 text-sm text-gray-700">
              <p>Risk: <span className="font-semibold uppercase">{insights.riskLevel || "new"}</span> | Success: {Number(insights.successRate || 0).toFixed(2)}%</p>
              <p>Orders: {insights.totalOrders || 0} | Delivered: {insights.deliveredOrders || 0} | Returned: {insights.returnedOrders || 0}</p>
              {insights.blacklistReason ? <p className="text-red-600">{insights.blacklistReason}</p> : null}
              {Array.isArray(insights.matchedCustomers) && insights.matchedCustomers.length > 0 ? (
                <select
                  value={customerUserId}
                  onChange={(e) => setCustomerUserId(e.target.value)}
                  className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="">Do not link user account</option>
                  {insights.matchedCustomers.map((entry) => (
                    <option key={entry._id} value={entry._id}>
                      {entry.name} - {entry.phone}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-black">Products</h2>
          <div className="relative">
            <FiSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg" />
          </div>

          {search.trim().length >= 2 ? (
            <div className="border border-gray-200 rounded-lg max-h-56 overflow-auto">
              {searchLoading ? <p className="p-3 text-sm text-gray-600">Searching...</p> : (
                results.map((entry) => (
                  <div key={entry._id} className="p-3 border-b border-gray-100 flex items-center justify-between gap-3">
                    <p className="text-sm text-black">{entry.title}</p>
                    <button type="button" onClick={() => addItem(entry)} className="inline-flex items-center gap-1 px-3 h-8 bg-black text-white rounded-lg text-xs">
                      <FiPlus className="w-3.5 h-3.5" /> Add
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {items.length > 0 ? (
            <div className="space-y-2">
              {items.map((entry) => (
                <div key={entry.productId} className="grid grid-cols-1 md:grid-cols-12 gap-2 border border-gray-200 rounded-lg p-3">
                  <div className="md:col-span-4">
                    <p className="text-sm font-medium text-black">{entry.title}</p>
                  </div>
                  <div className="md:col-span-3">
                    {entry.variations.length > 0 ? (
                      <select
                        value={entry.variationId}
                        onChange={(e) =>
                          setItems((prev) =>
                            prev.map((row) => {
                              if (row.productId !== entry.productId) return row;
                              const nextVariation = row.variations.find((v) => v._id === e.target.value);
                              return {
                                ...row,
                                variationId: e.target.value,
                                unitPrice: getPrice(nextVariation || {}, null),
                              };
                            }),
                          )
                        }
                        className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm"
                      >
                        {entry.variations.map((variation) => (
                          <option key={variation._id} value={variation._id}>{variation.label}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-xs text-gray-500 py-2">No variations</p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <input type="number" min="1" value={entry.quantity} onChange={(e) => setItems((prev) => prev.map((row) => row.productId === entry.productId ? { ...row, quantity: qty(e.target.value) } : row))} className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm" />
                  </div>
                  <div className="md:col-span-2 text-sm font-semibold text-black flex items-center">
                    {Number(entry.unitPrice || 0).toFixed(2)} TK
                  </div>
                  <div className="md:col-span-1">
                    <button type="button" onClick={() => setItems((prev) => prev.filter((row) => row.productId !== entry.productId))} className="w-full h-9 border border-red-300 text-red-600 rounded-lg inline-flex items-center justify-center">
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No products selected.</p>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="font-semibold text-black">Payment & Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={meta.source} onChange={(e) => setMeta((p) => ({ ...p, source: e.target.value }))} className="px-3 py-2.5 border border-gray-200 rounded-lg">
              <option value="shop">Shop</option>
              <option value="landing">Landing</option>
              <option value="facebook">Facebook</option>
              <option value="messenger">Messenger</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="phone_call">Phone Call</option>
            </select>
            <select value={paymentMethodId} onChange={(e) => setPaymentMethodId(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-lg" required>
              <option value="">Payment method</option>
              {paymentMethods.map((entry) => (
                <option key={entry._id} value={entry._id}>{entry.type}</option>
              ))}
            </select>
            <input type="number" min="0" step="0.01" value={shippingFee} onChange={(e) => setShippingFee(roundMoney(e.target.value))} placeholder="Shipping fee" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={paymentDetails.transactionId} onChange={(e) => setPaymentDetails((p) => ({ ...p, transactionId: e.target.value }))} placeholder={selectedMethod?.requiresTransactionProof ? "Transaction ID*" : "Transaction ID"} className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={paymentDetails.sentFrom} onChange={(e) => setPaymentDetails((p) => ({ ...p, sentFrom: e.target.value }))} placeholder="Sent from" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={paymentDetails.sentTo} onChange={(e) => setPaymentDetails((p) => ({ ...p, sentTo: e.target.value }))} placeholder="Sent to" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={meta.couponCode} onChange={(e) => setMeta((p) => ({ ...p, couponCode: e.target.value }))} placeholder="Coupon code" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={meta.courierProvider} onChange={(e) => setMeta((p) => ({ ...p, courierProvider: e.target.value }))} placeholder="Courier provider" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={meta.courierTrackingNumber} onChange={(e) => setMeta((p) => ({ ...p, courierTrackingNumber: e.target.value }))} placeholder="Tracking number" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
            <input value={meta.courierConsignmentId} onChange={(e) => setMeta((p) => ({ ...p, courierConsignmentId: e.target.value }))} placeholder="Consignment ID" className="px-3 py-2.5 border border-gray-200 rounded-lg" />
          </div>
          <textarea value={meta.adminNotes} onChange={(e) => setMeta((p) => ({ ...p, adminNotes: e.target.value }))} rows={2} placeholder="Admin notes" className="w-full px-3 py-2.5 border border-gray-200 rounded-lg" />
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <p>Subtotal: <span className="font-semibold">{subtotal.toFixed(2)} TK</span></p>
            <p>Total: <span className="font-bold">{total.toFixed(2)} TK</span></p>
          </div>
          <button type="submit" disabled={submitting || items.length === 0} className="px-6 h-11 bg-black text-white rounded-lg font-semibold disabled:opacity-60">
            {submitting ? "Creating..." : "Create Order"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdminAddOrder;
