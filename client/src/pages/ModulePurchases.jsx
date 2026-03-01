import React, { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiBox,
  FiDollarSign,
  FiPlus,
  FiRefreshCw,
  FiSave,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const makeLine = () => ({
  productId: "",
  variationId: "",
  quantity: "1",
  purchasePrice: "0",
});

const ModulePurchases = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [summary, setSummary] = useState({
    count: 0,
    totalAmount: 0,
    paidAmount: 0,
    dueAmount: 0,
  });

  const [form, setForm] = useState({
    supplierId: "",
    invoiceNumber: "",
    purchaseDate: new Date().toISOString().slice(0, 10),
    paidAmount: "0",
    notes: "",
    items: [makeLine()],
  });

  const canAccess = useMemo(
    () => ["admin", "vendor", "staff"].includes(String(user?.userType || "").toLowerCase()),
    [user?.userType],
  );

  const fetchDependencies = useCallback(async () => {
    if (!canAccess) return;

    try {
      setLoading(true);

      const [supplierResponse, productResponse, purchaseResponse] = await Promise.all([
        axios.get(`${baseUrl}/suppliers`, {
          headers: getAuthHeaders(),
          params: { limit: 200 },
        }),
        axios.get(`${baseUrl}/products`, {
          headers: getAuthHeaders(),
        }),
        axios.get(`${baseUrl}/purchases`, {
          headers: getAuthHeaders(),
          params: { limit: 100 },
        }),
      ]);

      setSuppliers(supplierResponse.data?.suppliers || []);
      setProducts(productResponse.data?.products || []);
      setPurchases(purchaseResponse.data?.purchases || []);
      setSummary(
        purchaseResponse.data?.summary || {
          count: 0,
          totalAmount: 0,
          paidAmount: 0,
          dueAmount: 0,
        },
      );
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load purchase module data");
      setSuppliers([]);
      setProducts([]);
      setPurchases([]);
    } finally {
      setLoading(false);
    }
  }, [canAccess]);

  useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  const updateLine = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((line, lineIndex) =>
        lineIndex === index
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    }));
  };

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, makeLine()],
    }));
  };

  const removeLine = (index) => {
    setForm((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((_, lineIndex) => lineIndex !== index),
      };
    });
  };

  const computedTotal = useMemo(
    () =>
      form.items.reduce((sum, item) => {
        const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
        const purchasePrice = Math.max(0, Number(item.purchasePrice || 0));
        return sum + quantity * purchasePrice;
      }, 0),
    [form.items],
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.supplierId) {
      toast.error("Supplier is required");
      return;
    }

    if (!String(form.invoiceNumber || "").trim()) {
      toast.error("Invoice number is required");
      return;
    }

    const validItems = form.items
      .map((item) => ({
        productId: String(item.productId || "").trim(),
        variationId: String(item.variationId || "").trim(),
        quantity: Math.max(1, Number.parseInt(item.quantity, 10) || 1),
        purchasePrice: Math.max(0, Number(item.purchasePrice || 0)),
      }))
      .filter((item) => item.productId);

    if (!validItems.length) {
      toast.error("At least one product item is required");
      return;
    }

    setSaving(true);
    try {
      await axios.post(
        `${baseUrl}/purchases`,
        {
          supplierId: form.supplierId,
          invoiceNumber: String(form.invoiceNumber || "").trim(),
          purchaseDate: form.purchaseDate || undefined,
          paidAmount: Math.max(0, Number(form.paidAmount || 0)),
          notes: String(form.notes || "").trim(),
          items: validItems,
        },
        {
          headers: getAuthHeaders(),
        },
      );

      toast.success("Purchase saved and stock updated");
      setForm({
        supplierId: "",
        invoiceNumber: "",
        purchaseDate: new Date().toISOString().slice(0, 10),
        paidAmount: "0",
        notes: "",
        items: [makeLine()],
      });
      fetchDependencies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save purchase");
    } finally {
      setSaving(false);
    }
  };

  const addPayment = async (purchase) => {
    const input = window.prompt("Enter payment amount", String(Number(purchase.dueAmount || 0).toFixed(2)));
    if (input === null) return;

    const amount = Number(input);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Valid payment amount is required");
      return;
    }

    try {
      await axios.patch(
        `${baseUrl}/purchases/${purchase._id}/payment`,
        { amount },
        { headers: getAuthHeaders() },
      );
      toast.success("Payment recorded");
      fetchDependencies();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to record payment");
    }
  };

  const getProductVariations = (productId) => {
    const product = products.find((row) => String(row._id) === String(productId));
    return Array.isArray(product?.variations)
      ? product.variations.filter((variation) => variation?.isActive !== false)
      : [];
  };

  if (!canAccess) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Access Required</h2>
        <p className="text-gray-600">Only admin/vendor/staff can access purchases.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-full mb-4">
          <FiBox className="w-6 h-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold">Purchase Management</h1>
        <p className="text-zinc-200 mt-2">Track supplier purchases and auto-increase inventory stock.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Purchases</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.count || 0)}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Total Amount</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.totalAmount || 0).toFixed(2)} TK</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.paidAmount || 0).toFixed(2)} TK</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-500">Due</p>
          <p className="text-2xl font-bold text-black mt-1">{Number(summary.dueAmount || 0).toFixed(2)} TK</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <form onSubmit={handleSubmit} className="xl:col-span-1 bg-white border border-gray-200 rounded-xl p-5 space-y-3">
          <h2 className="text-lg font-semibold text-black">Create Purchase</h2>

          <select
            value={form.supplierId}
            onChange={(event) => setForm((prev) => ({ ...prev, supplierId: event.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          >
            <option value="">Select supplier</option>
            {suppliers.map((supplier) => (
              <option key={supplier._id} value={supplier._id}>
                {supplier.name}
              </option>
            ))}
          </select>

          <input
            value={form.invoiceNumber}
            onChange={(event) => setForm((prev) => ({ ...prev, invoiceNumber: event.target.value }))}
            placeholder="Invoice number"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            type="date"
            value={form.purchaseDate}
            onChange={(event) => setForm((prev) => ({ ...prev, purchaseDate: event.target.value }))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <input
            type="number"
            min="0"
            step="0.01"
            value={form.paidAmount}
            onChange={(event) => setForm((prev) => ({ ...prev, paidAmount: event.target.value }))}
            placeholder="Paid amount"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <textarea
            value={form.notes}
            onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
            placeholder="Notes"
            rows={3}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg"
          />

          <div className="border border-gray-200 rounded-lg p-3 space-y-3">
            <p className="text-sm font-medium text-black">Items</p>
            {form.items.map((line, index) => {
              const variations = getProductVariations(line.productId);

              return (
                <div key={`line-${index}`} className="space-y-2 border border-gray-100 rounded-lg p-3 bg-gray-50">
                  <select
                    value={line.productId}
                    onChange={(event) => {
                      const nextProductId = event.target.value;
                      const selectedProduct = products.find(
                        (product) => String(product._id) === String(nextProductId),
                      );

                      updateLine(index, "productId", nextProductId);
                      updateLine(index, "variationId", "");
                      if (selectedProduct) {
                        updateLine(index, "purchasePrice", String(Number(selectedProduct.price || 0)));
                      }
                    }}
                    className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select product</option>
                    {products.map((product) => (
                      <option key={product._id} value={product._id}>
                        {product.title}
                      </option>
                    ))}
                  </select>

                  {variations.length ? (
                    <select
                      value={line.variationId}
                      onChange={(event) => updateLine(index, "variationId", event.target.value)}
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                      <option value="">No variation</option>
                      {variations.map((variation) => (
                        <option key={variation._id} value={variation._id}>
                          {variation.label}
                        </option>
                      ))}
                    </select>
                  ) : null}

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(event) => updateLine(index, "quantity", event.target.value)}
                      placeholder="Qty"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.purchasePrice}
                      onChange={(event) => updateLine(index, "purchasePrice", event.target.value)}
                      placeholder="Price"
                      className="w-full px-2.5 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    />
                  </div>

                  {form.items.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove line
                    </button>
                  ) : null}
                </div>
              );
            })}

            <button
              type="button"
              onClick={addLine}
              className="inline-flex items-center gap-2 text-sm text-black hover:underline"
            >
              <FiPlus className="w-4 h-4" />
              Add another item
            </button>
          </div>

          <div className="rounded-lg border border-gray-200 px-3 py-2.5 bg-gray-50 text-sm text-gray-700">
            Estimated total: <span className="font-semibold text-black">{computedTotal.toFixed(2)} TK</span>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 px-4 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            <FiSave className="w-4 h-4" />
            {saving ? "Saving..." : "Save Purchase"}
          </button>
        </form>

        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-black">Recent Purchases ({purchases.length})</h2>
            <button
              onClick={fetchDependencies}
              className="inline-flex h-10 items-center gap-2 px-3 border border-gray-300 rounded-lg text-sm"
            >
              <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>

          {loading ? (
            <p className="text-gray-600">Loading purchases...</p>
          ) : purchases.length === 0 ? (
            <p className="text-gray-600">No purchases found.</p>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-gray-600 border-b border-gray-200">
                  <tr>
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Supplier</th>
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Paid</th>
                    <th className="py-2 pr-3">Due</th>
                    <th className="py-2 pr-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((purchase) => (
                    <tr key={purchase._id} className="border-b border-gray-100">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-black">{purchase.invoiceNumber}</p>
                        <p className="text-xs text-gray-500">{purchase.paymentStatus}</p>
                      </td>
                      <td className="py-3 pr-3">{purchase.supplier?.name || "-"}</td>
                      <td className="py-3 pr-3">
                        {purchase.purchaseDate
                          ? new Date(purchase.purchaseDate).toLocaleDateString()
                          : "-"}
                      </td>
                      <td className="py-3 pr-3 font-semibold text-black">
                        {Number(purchase.totalAmount || 0).toFixed(2)} TK
                      </td>
                      <td className="py-3 pr-3">{Number(purchase.paidAmount || 0).toFixed(2)} TK</td>
                      <td className="py-3 pr-3">{Number(purchase.dueAmount || 0).toFixed(2)} TK</td>
                      <td className="py-3 pr-3">
                        <button
                          onClick={() => addPayment(purchase)}
                          disabled={Number(purchase.dueAmount || 0) <= 0}
                          className="inline-flex h-8 items-center gap-1 px-2.5 text-xs rounded-md border border-gray-300 disabled:opacity-50"
                        >
                          <FiDollarSign className="w-3.5 h-3.5" />
                          Add Payment
                        </button>
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

export default ModulePurchases;
