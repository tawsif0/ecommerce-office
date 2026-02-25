import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiRefreshCw } from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const initialForm = {
  productId: "",
  title: "",
  startingPrice: "",
  reservePrice: "",
  buyNowPrice: "",
  minIncrement: "1",
  startsAt: "",
  endsAt: "",
  status: "draft",
};

const ModuleAuctions = () => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const isAdmin = user?.userType === "admin";
  const canManage = user?.userType === "vendor" || user?.userType === "staff" || isAdmin;

  const fetchProducts = async () => {
    if (!canManage) {
      setProducts([]);
      return;
    }

    try {
      const response = await axios.get(`${baseUrl}/products`, {
        headers: getAuthHeaders(),
      });
      setProducts(response.data?.products || []);
    } catch {
      setProducts([]);
    }
  };

  const fetchAuctions = async () => {
    try {
      setLoading(true);

      let endpoint = `${baseUrl}/auctions/public`;
      if (isAdmin) endpoint = `${baseUrl}/auctions/admin`;
      if (!isAdmin && canManage) endpoint = `${baseUrl}/auctions/vendor`;

      const response = await axios.get(endpoint, {
        headers: canManage || isAdmin ? getAuthHeaders() : undefined,
      });
      setAuctions(response.data?.auctions || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load auctions");
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await Promise.all([fetchAuctions(), fetchProducts()]);
  };

  useEffect(() => {
    if (!user) return;
    refresh();
  }, [user]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const createAuction = async (event) => {
    event.preventDefault();

    if (!form.productId || !form.title.trim() || !form.startsAt || !form.endsAt) {
      toast.error("Product, title, start and end datetime are required");
      return;
    }

    try {
      setSaving(true);
      await axios.post(
        `${baseUrl}/auctions`,
        {
          ...form,
          title: form.title.trim(),
          startingPrice: Number(form.startingPrice || 0),
          reservePrice: Number(form.reservePrice || 0),
          buyNowPrice: form.buyNowPrice ? Number(form.buyNowPrice) : null,
          minIncrement: Number(form.minIncrement || 1),
        },
        { headers: getAuthHeaders() },
      );

      toast.success("Auction created");
      setForm(initialForm);
      refresh();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create auction");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (auctionId, status) => {
    try {
      await axios.patch(
        `${baseUrl}/auctions/${auctionId}/status`,
        { status },
        { headers: getAuthHeaders() },
      );
      toast.success("Auction status updated");
      fetchAuctions();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-zinc-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl font-bold">Auction Module</h1>
        <p className="text-zinc-200 mt-1">Create and manage product auctions.</p>
      </div>

      {canManage && (
        <form
          onSubmit={createAuction}
          className="bg-white border border-gray-200 rounded-xl p-5 md:p-6"
        >
          <h2 className="text-lg font-semibold text-black mb-4">Create Auction</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            <select
              name="productId"
              value={form.productId}
              onChange={handleFormChange}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product._id} value={product._id}>
                  {product.title}
                </option>
              ))}
            </select>
            <input
              name="title"
              value={form.title}
              onChange={handleFormChange}
              placeholder="Auction title"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              name="startingPrice"
              value={form.startingPrice}
              onChange={handleFormChange}
              placeholder="Starting price"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              name="reservePrice"
              value={form.reservePrice}
              onChange={handleFormChange}
              placeholder="Reserve price"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              name="buyNowPrice"
              value={form.buyNowPrice}
              onChange={handleFormChange}
              placeholder="Buy now price (optional)"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="minIncrement"
              value={form.minIncrement}
              onChange={handleFormChange}
              placeholder="Min increment"
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="datetime-local"
              name="startsAt"
              value={form.startsAt}
              onChange={handleFormChange}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <input
              type="datetime-local"
              name="endsAt"
              value={form.endsAt}
              onChange={handleFormChange}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            />
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
              className="px-3 py-2.5 border border-gray-200 rounded-lg"
            >
              <option value="draft">Draft</option>
              <option value="live">Live</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-4 px-5 py-2.5 bg-black text-white rounded-lg font-medium disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create Auction"}
          </button>
        </form>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-black">Auctions ({auctions.length})</h2>
          <button
            onClick={refresh}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading auctions...</p>
        ) : auctions.length === 0 ? (
          <p className="text-gray-600">No auctions found.</p>
        ) : (
          <div className="space-y-3">
            {auctions.map((auction) => (
              <div
                key={auction._id}
                className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 xl:grid-cols-12 gap-3 items-center"
              >
                <div className="xl:col-span-5">
                  <p className="font-semibold text-black">{auction.title}</p>
                  <p className="text-sm text-gray-600">
                    Product: {auction.product?.title || "N/A"} | Vendor: {auction.vendor?.storeName || "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Start: {new Date(auction.startsAt).toLocaleString()} | End:{" "}
                    {new Date(auction.endsAt).toLocaleString()}
                  </p>
                </div>

                <div className="xl:col-span-4">
                  <p className="text-sm text-gray-700">Current bid: {auction.currentBid || 0} TK</p>
                  <p className="text-sm text-gray-700">Winning: {auction.winningAmount || 0} TK</p>
                  <p className="text-sm text-gray-700">Total bids: {auction.totalBids || 0}</p>
                </div>

                <div className="xl:col-span-3">
                  {canManage ? (
                    <select
                      value={auction.status}
                      onChange={(event) => updateStatus(auction._id, event.target.value)}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"
                    >
                      <option value="draft">Draft</option>
                      <option value="live">Live</option>
                      <option value="ended">Ended</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  ) : (
                    <span className="inline-flex px-3 py-1 rounded-full bg-gray-100 text-sm text-gray-700">
                      {auction.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModuleAuctions;
