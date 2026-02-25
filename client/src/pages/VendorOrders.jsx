import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiClock, FiPackage, FiTruck } from "react-icons/fi";

const baseUrl = import.meta.env.VITE_API_URL;

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }

  if (imagePath.startsWith("/")) {
    return baseUrl ? `${baseUrl}${imagePath}` : imagePath;
  }

  return baseUrl
    ? `${baseUrl}/uploads/products/${imagePath}`
    : `/uploads/products/${imagePath}`;
};

const VendorOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchVendorOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/me/orders`, {
        headers: getAuthHeaders(),
      });
      setOrders(response.data?.orders || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load vendor orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[220px]">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-slate-800 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Vendor Orders</h1>
        <p className="text-slate-200 mt-2">Manage orders containing your products.</p>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <p className="text-gray-600">No vendor orders yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-white border border-gray-200 rounded-xl p-5 md:p-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-semibold text-black">{order.orderNumber}</p>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm">
                  {order.orderStatus === "pending" && <FiClock className="w-4 h-4" />}
                  {order.orderStatus === "processing" && <FiPackage className="w-4 h-4" />}
                  {order.orderStatus === "shipped" && <FiTruck className="w-4 h-4" />}
                  <span className="capitalize">{order.orderStatus}</span>
                </div>
              </div>

              <div className="space-y-3">
                {(order.items || []).map((item, index) => (
                  <div
                    key={`${order._id}-item-${index}`}
                    className="border border-gray-100 rounded-lg p-3 flex items-center gap-3"
                  >
                    <div className="w-14 h-14 rounded-md overflow-hidden bg-gray-100 shrink-0">
                      {item.product?.images?.[0] ? (
                        <img
                          src={getFullImageUrl(item.product.images[0])}
                          alt={item.product?.title || "Product"}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {item.product?.title || "Product"}
                      </p>
                      <p className="text-sm text-gray-600">
                        Qty: {item.quantity} x {Number(item.price || 0).toFixed(2)} TK
                      </p>
                    </div>
                    <div className="text-sm font-semibold text-black">
                      {(Number(item.price || 0) * Number(item.quantity || 0)).toFixed(2)} TK
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-500">Vendor Subtotal</p>
                  <p className="font-semibold text-black mt-1">
                    {Number(order.vendorSubtotal || 0).toFixed(2)} TK
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-500">Commission</p>
                  <p className="font-semibold text-black mt-1">
                    {Number(order.vendorCommission || 0).toFixed(2)} TK
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-3">
                  <p className="text-gray-500">Your Net</p>
                  <p className="font-semibold text-black mt-1">
                    {Number(order.vendorNet || 0).toFixed(2)} TK
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorOrders;
