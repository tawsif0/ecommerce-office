/* eslint-disable react-hooks/exhaustive-deps */
// pages/UserOrders.jsx
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  FiSearch,
  FiEye,
  FiCopy,
  FiChevronRight,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiXCircle,
} from "react-icons/fi";
import { motion } from "framer-motion";

const baseUrl = import.meta.env.VITE_API_URL;
// Update the getFullImageUrl function in UserOrders.jsx
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;

  // Already a full URL
  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:")
  ) {
    return imagePath;
  }

  // Handle relative paths
  if (imagePath.startsWith("/")) {
    // Remove double slashes if they exist
    const cleanPath = imagePath.replace(/^\/\//, "/");
    return baseUrl ? `${baseUrl}${cleanPath}` : cleanPath;
  }

  // Handle filename-only paths
  if (imagePath && !imagePath.startsWith("/")) {
    return baseUrl
      ? `${baseUrl}/uploads/products/${imagePath}`
      : `/uploads/products/${imagePath}`;
  }

  return null;
};

// In ProductImage component, update the error handling
const ProductImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getFullImageUrl(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const fullUrl = getFullImageUrl(src);
    setImgSrc(fullUrl);
    setHasError(false);
  }, [src]);

  const handleError = () => {
    console.log("Image error:", imgSrc, "original:", src);
    setHasError(true);

    // Try alternative formats
    if (src) {
      // If it's already a full URL, no fallback
      if (src.startsWith("http") || src.startsWith("data:")) {
        return;
      }

      // Try different formats
      const alternatives = [];

      // If it's a relative path without baseUrl
      if (src.startsWith("/") && baseUrl) {
        const withBase = `${baseUrl}${src}`;
        if (withBase !== imgSrc) {
          alternatives.push(withBase);
        }
      }

      // If it's just a filename
      if (!src.startsWith("/") && baseUrl) {
        const withUploads = `${baseUrl}/uploads/products/${src}`;
        alternatives.push(withUploads);
      }

      // Try each alternative
      for (const altUrl of alternatives) {
        if (altUrl !== imgSrc) {
          const img = new Image();
          img.onload = () => {
            setImgSrc(altUrl);
            setHasError(false);
          };
          img.src = altUrl;
          break;
        }
      }
    }
  };

  if (hasError || !imgSrc) {
    return (
      <div
        className={`${className} bg-gray-100 flex items-center justify-center`}
      >
        <svg
          className="w-6 h-6 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      crossOrigin={
        imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://")
          ? "anonymous"
          : undefined
      }
      loading="lazy"
    />
  );
};
const UserOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch user's orders
  const fetchUserOrders = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${baseUrl}/orders/user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setOrders(response.data.orders);
      } else {
        toast.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error loading your orders");
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (user) {
      fetchUserOrders();
    }
  }, []);

  // Copy order number
  const copyOrderNumber = (orderNumber) => {
    navigator.clipboard.writeText(orderNumber);
    toast.success("Order number copied!");
  };

  // View order details
  const viewOrderDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  // Get status icon and color
  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
        return {
          icon: FiClock,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
        };
      case "processing":
        return {
          icon: FiPackage,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "shipped":
        return {
          icon: FiTruck,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
      case "delivered":
        return {
          icon: FiCheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
        };
      case "cancelled":
        return {
          icon: FiXCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
        };
      default:
        return {
          icon: FiPackage,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Track order
  const trackOrder = (orderNumber) => {
    window.open(`/track-order/${orderNumber}`, "_blank");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Please Login
          </h2>
          <p className="text-gray-600">
            You need to be logged in to view your orders.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-2">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-black mb-2">
          My Orders
        </h1>
        <p className="text-gray-600">
          View and track all your orders in one place.
        </p>
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-black mb-4"></div>
            <p className="text-gray-600">Loading your orders...</p>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <div className="text-6xl mb-6">📦</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            No orders yet
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            You haven't placed any orders yet. Start shopping to see your orders
            here.
          </p>
          <a
            href="/shop"
            className="inline-block px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            Start Shopping
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.orderStatus);
            const StatusIcon = statusInfo.icon;

            return (
              <motion.div
                key={order._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Order Header */}
                <div className="p-4 md:p-6 border-b border-gray-100">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-bold text-lg text-black">
                          Order #{order.orderNumber}
                        </h3>
                        <button
                          onClick={() => copyOrderNumber(order.orderNumber)}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                          title="Copy order number"
                        >
                          <FiCopy className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <p className="text-gray-600 text-sm">
                        Placed on {formatDate(order.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div
                        className={`px-3 py-1.5 rounded-full flex items-center gap-2 ${statusInfo.bgColor} ${statusInfo.borderColor} border`}
                      >
                        <StatusIcon className={`w-4 h-4 ${statusInfo.color}`} />
                        <span
                          className={`text-sm font-medium ${statusInfo.color}`}
                        >
                          {order.orderStatus.charAt(0).toUpperCase() +
                            order.orderStatus.slice(1)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg text-black">
                          ৳{order.total?.toFixed(2) || "0.00"}
                        </div>
                        <div className="text-sm text-gray-500">
                          {order.items?.length || 0} item
                          {order.items?.length !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Items Preview */}
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 mb-3">
                        Items in this order
                      </h4>
                      <div className="flex flex-wrap gap-4">
                        {order.items?.slice(0, 3).map((item, index) => (
                          <div key={index} className="flex items-center gap-3">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                              {item.product?.images?.[0] ||
                              item.product?.image ? (
                                <ProductImage
                                  src={
                                    item.product.images?.[0] ||
                                    item.product.image
                                  }
                                  alt={item.product.title || "Product"}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <FiPackage className="w-8 h-8 text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {item.product?.title || "Product"}
                              </p>
                              <p className="text-sm text-gray-600">
                                Qty: {item.quantity} × ৳{item.price?.toFixed(2)}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items?.length > 3 && (
                          <div className="flex items-center">
                            <span className="text-gray-500">
                              +{order.items.length - 3} more items
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiEye className="w-4 h-4" />
                        View Details
                      </button>
                      <button
                        onClick={() => trackOrder(order.orderNumber)}
                        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                      >
                        <FiTruck className="w-4 h-4" />
                        Track Order
                      </button>
                    </div>
                  </div>
                </div>

                {/* Shipping Info */}
                {order.shippingAddress && (
                  <div className="px-4 md:px-6 py-3 bg-gray-50 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-600">Shipping to: </span>
                        <span className="font-medium">
                          {order.shippingAddress.firstName}{" "}
                          {order.shippingAddress.lastName}
                        </span>
                        <span className="text-gray-500 ml-2">
                          • {order.shippingAddress.city}
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-gray-600">Payment: </span>
                        <span className="font-medium">
                          {order.paymentMethod?.replace(/_/g, " ")}
                        </span>
                        <span
                          className={`ml-2 ${
                            order.paymentStatus === "completed"
                              ? "text-green-600"
                              : "text-yellow-600"
                          }`}
                        >
                          ({order.paymentStatus})
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Order Details
                  </h2>
                  <p className="text-gray-600">{selectedOrder.orderNumber}</p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Order Timeline */}
              <div className="mb-8">
                <h3 className="font-semibold text-black mb-4">Order Status</h3>
                <div className="relative">
                  <div className="flex justify-between items-center">
                    {["pending", "processing", "shipped", "delivered"].map(
                      (status, index) => {
                        const isActive = (() => {
                          const statusOrder = [
                            "pending",
                            "processing",
                            "shipped",
                            "delivered",
                          ];
                          const currentIndex = statusOrder.indexOf(
                            selectedOrder.orderStatus,
                          );
                          return selectedOrder.orderStatus === "cancelled"
                            ? false
                            : index <= currentIndex;
                        })();

                        const statusInfo = getStatusInfo(status);
                        const StatusIcon = statusInfo.icon;

                        return (
                          <div
                            key={status}
                            className="text-center relative z-10"
                          >
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 ${
                                isActive
                                  ? "bg-black"
                                  : "bg-gray-200 border border-gray-300"
                              }`}
                            >
                              <StatusIcon
                                className={`w-5 h-5 ${
                                  isActive ? "text-white" : "text-gray-400"
                                }`}
                              />
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                isActive ? "text-black" : "text-gray-500"
                              }`}
                            >
                              {status.charAt(0).toUpperCase() + status.slice(1)}
                            </span>
                          </div>
                        );
                      },
                    )}
                  </div>
                  {/* Timeline bar */}
                  <div className="absolute top-6 left-6 right-6 h-1 bg-gray-200 -z-10">
                    <div
                      className="h-full bg-black transition-all duration-500"
                      style={{
                        width:
                          selectedOrder.orderStatus === "cancelled"
                            ? "0%"
                            : selectedOrder.orderStatus === "pending"
                              ? "0%"
                              : selectedOrder.orderStatus === "processing"
                                ? "33%"
                                : selectedOrder.orderStatus === "shipped"
                                  ? "66%"
                                  : "100%",
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div className="mb-6">
                <h3 className="font-semibold text-black mb-3">Order Items</h3>
                <div className="space-y-4">
                  {selectedOrder.items?.map((item, index) => {
                    const displayColor =
                      item.color && item.color.toLowerCase() !== "default"
                        ? item.color
                        : "";
                    return (
                      <div
                        key={index}
                        className="flex gap-4 p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                          {item.product?.images?.[0] || item.product?.image ? (
                            <ProductImage
                              src={item.product.images?.[0] || item.product.image}
                              alt={item.product.title || "Product"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <FiPackage className="w-8 h-8 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {item.product?.title || "Product"}
                          </h4>
                          <div className="flex flex-wrap items-center gap-4 mt-2">
                            <div className="text-sm text-gray-600">
                              Quantity: {item.quantity}
                            </div>
                            {displayColor && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                  <span>Colors:</span>
                                  <span
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: displayColor }}
                                  />
                                </span>
                              </div>
                            )}
                            {item.size && (
                              <div className="text-sm text-gray-600">
                                Size: {item.size}
                              </div>
                            )}
                          </div>
                          {item.dimensions && (
                            <div className="text-sm text-gray-600 mt-1 wrap-break-word">
                              Dim: {item.dimensions}
                            </div>
                          )}
                          <div className="mt-2 flex justify-between items-center">
                            <div className="text-sm text-gray-500">
                              Unit Price: ৳{item.price?.toFixed(2)}
                            </div>
                            <div className="font-semibold">
                              ৳{(item.quantity * item.price).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-6 rounded-lg mb-6">
                <h3 className="font-semibold text-black mb-4">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>৳{selectedOrder.subtotal?.toFixed(2)}</span>
                  </div>
                  {selectedOrder.shippingFee > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipping Fee</span>
                      <span>৳{selectedOrder.shippingFee?.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span>-৳{selectedOrder.discount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total Amount</span>
                      <span>৳{selectedOrder.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="mb-6">
                  <h3 className="font-semibold text-black mb-3">
                    Shipping Address
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="font-medium">
                      {selectedOrder.shippingAddress.firstName}{" "}
                      {selectedOrder.shippingAddress.lastName}
                    </p>
                    <p className="text-gray-600 mt-1">
                      {selectedOrder.shippingAddress.address}
                    </p>
                    <p className="text-gray-600">
                      {selectedOrder.shippingAddress.city},{" "}
                      {selectedOrder.shippingAddress.district}
                    </p>
                    <p className="text-gray-600">
                      {selectedOrder.shippingAddress.postalCode},{" "}
                      {selectedOrder.shippingAddress.country}
                    </p>
                    {selectedOrder.shippingAddress.phone && (
                      <p className="text-gray-600 mt-2">
                        Phone: {selectedOrder.shippingAddress.phone}
                      </p>
                    )}
                    {selectedOrder.shippingAddress.email && (
                      <p className="text-gray-600">
                        Email: {selectedOrder.shippingAddress.email}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-black mb-3">
                  Payment Information
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Payment Method</p>
                      <p className="font-medium">
                        {selectedOrder.paymentMethod?.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Payment Status</p>
                      <p
                        className={`font-medium ${
                          selectedOrder.paymentStatus === "completed"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {selectedOrder.paymentStatus}
                      </p>
                    </div>
                    {selectedOrder.paymentDetails?.transactionId && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-600">Transaction ID</p>
                        <p className="font-medium">
                          {selectedOrder.paymentDetails.transitionId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center">
                <button
                  onClick={() => trackOrder(selectedOrder.orderNumber)}
                  className="px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
                >
                  <FiTruck className="w-4 h-4" />
                  Track Order
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default UserOrders;
