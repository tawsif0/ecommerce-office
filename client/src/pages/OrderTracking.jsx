/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// pages/OrderTracking.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiChevronLeft,
  FiCopy,
  FiPackage,
  FiTruck,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiHome,
  FiShoppingBag,
} from "react-icons/fi";
import {
  FaBox,
  FaShippingFast,
  FaReceipt,
  FaUser,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
} from "react-icons/fa";
import { motion } from "framer-motion";

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

  if (imagePath && !imagePath.startsWith("/")) {
    return baseUrl
      ? `${baseUrl}/uploads/products/${imagePath}`
      : `/uploads/products/${imagePath}`;
  }

  return null;
};

// Image component with fallback (same as in CheckOut)
const ProductImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getFullImageUrl(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(getFullImageUrl(src));
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
    if (src && src.startsWith("/uploads/products/")) {
      const altUrl = `${baseUrl}${src}`;
      if (altUrl !== imgSrc) {
        setImgSrc(altUrl);
        setHasError(false);
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
    />
  );
};
const OrderTracking = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch order details
  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${baseUrl}/orders/track/${orderNumber}`,
      );

      if (response.data.success) {
        setOrder(response.data.order);
      } else {
        setError("Order not found");
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setError("Failed to load order details. Please check the order number.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderNumber) {
      fetchOrderDetails();
    } else {
      setError("No order number provided");
      setLoading(false);
    }
  }, [orderNumber]);

  // Copy order number
  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success("Order number copied!");
    }
  };

  // Get status info
  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
        return {
          icon: FiClock,
          color: "#f59e0b",
          bgColor: "bg-yellow-50",
          textColor: "text-yellow-700",
          borderColor: "border-yellow-200",
          message: "Order is pending confirmation",
        };
      case "processing":
        return {
          icon: FiPackage,
          color: "#3b82f6",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          borderColor: "border-blue-200",
          message: "Order is being processed",
        };
      case "shipped":
        return {
          icon: FiTruck,
          color: "#8b5cf6",
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          borderColor: "border-purple-200",
          message: "Order has been shipped",
        };
      case "delivered":
        return {
          icon: FiCheckCircle,
          color: "#10b981",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          borderColor: "border-green-200",
          message: "Order has been delivered",
        };
      case "cancelled":
        return {
          icon: FiXCircle,
          color: "#ef4444",
          bgColor: "bg-red-50",
          textColor: "text-red-700",
          borderColor: "border-red-200",
          message: "Order has been cancelled",
        };
      default:
        return {
          icon: FiPackage,
          color: "#6b7280",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          borderColor: "border-gray-200",
          message: "Order status unknown",
        };
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Get estimated delivery date
  const getEstimatedDelivery = () => {
    if (!order?.createdAt) return "N/A";
    const orderDate = new Date(order.createdAt);
    const estimatedDate = new Date(orderDate);
    estimatedDate.setDate(estimatedDate.getDate() + 5); // 5 days from order date
    return estimatedDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Tracking Order
          </h3>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="text-6xl mb-6">📦</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Order Not Found
            </h1>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {error ||
                "We couldn't find an order with that number. Please check the order number and try again."}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate("/")}
                className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
              >
                <FiHome className="w-4 h-4" />
                Back to Home
              </button>
              <button
                onClick={() => navigate("/shop")}
                className="px-6 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <FiShoppingBag className="w-4 h-4" />
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.orderStatus);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 transition-colors group"
          >
            <FiChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium">Back to Home</span>
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
              <StatusIcon
                className="w-8 h-8"
                style={{ color: statusInfo.color }}
              />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-3">
              Order Tracking
            </h1>
            <div className="flex items-center justify-center gap-4">
              <p className="text-gray-600">
                Tracking order:{" "}
                <span className="font-semibold text-black">
                  {order.orderNumber}
                </span>
              </p>
              <button
                onClick={copyOrderNumber}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                title="Copy order number"
              >
                <FiCopy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Tracking & Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Status Card */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${statusInfo.bgColor}`}
                  >
                    <StatusIcon className={`w-6 h-6 ${statusInfo.textColor}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-black">
                      Order Status
                    </h2>
                    <p className="text-gray-600">{statusInfo.message}</p>
                  </div>
                </div>
                <span
                  className={`px-4 py-2 rounded-full font-medium ${statusInfo.bgColor} ${statusInfo.textColor} ${statusInfo.borderColor} border`}
                >
                  {order.orderStatus.toUpperCase()}
                </span>
              </div>

              {/* Tracking Timeline */}
              <div className="relative">
                {/* Timeline bar FIRST - naturally behind content */}
                <div className="absolute top-6 left-6 right-6 h-1">
                  <div className="absolute inset-0 bg-gray-200 rounded-full"></div>
                  <div
                    className="absolute h-full bg-black rounded-full transition-all duration-500"
                    style={{
                      width:
                        order.orderStatus === "cancelled"
                          ? "0%"
                          : order.orderStatus === "pending"
                            ? "0%"
                            : order.orderStatus === "processing"
                              ? "33%"
                              : order.orderStatus === "shipped"
                                ? "66%"
                                : "100%",
                    }}
                  ></div>
                </div>

                {/* Icons container - appears on top naturally */}
                <div className="flex justify-between items-center relative">
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
                          order.orderStatus,
                        );
                        return order.orderStatus === "cancelled"
                          ? false
                          : index <= currentIndex;
                      })();

                      const stepStatusInfo = getStatusInfo(status);
                      const StepIcon = stepStatusInfo.icon;

                      return (
                        <div key={status} className="text-center">
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                              isActive
                                ? "bg-black shadow-lg"
                                : "bg-white border border-gray-300"
                            }`}
                          >
                            <StepIcon
                              className={`w-5 h-5 ${
                                isActive ? "text-white" : "text-gray-400"
                              }`}
                            />
                          </div>
                          <span
                            className={`text-sm font-medium ${
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
              </div>
            </motion.div>

            {/* Order Details */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <FaReceipt className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-black">
                  Order Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Customer Info */}
                <div>
                  <h3 className="font-medium text-black mb-3 flex items-center gap-2">
                    <FaUser className="w-4 h-4 text-gray-500" />
                    Customer Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-600">Name:</span>{" "}
                      <span className="font-medium">{order.customerName}</span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Order Date:</span>{" "}
                      <span className="font-medium">
                        {formatDate(order.createdAt)}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Order Number:</span>{" "}
                      <span className="font-medium">{order.orderNumber}</span>
                    </p>
                  </div>
                </div>

                {/* Payment Info */}
                <div>
                  <h3 className="font-medium text-black mb-3 flex items-center gap-2">
                    <FaReceipt className="w-4 h-4 text-gray-500" />
                    Payment Information
                  </h3>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="text-gray-600">Method:</span>{" "}
                      <span className="font-medium capitalize">
                        {order.paymentMethod?.replace(/_/g, " ")}
                      </span>
                    </p>
                    <p className="text-sm">
                      <span className="text-gray-600">Status:</span>{" "}
                      <span
                        className={`font-medium ${
                          order.paymentStatus === "completed"
                            ? "text-green-600"
                            : order.paymentStatus === "pending"
                              ? "text-yellow-600"
                              : "text-red-600"
                        }`}
                      >
                        {order.paymentStatus}
                      </span>
                    </p>
                    {order.transactionId && order.transactionId !== "N/A" && (
                      <p className="text-sm">
                        <span className="text-gray-600">Transaction ID:</span>{" "}
                        <span className="font-medium">
                          {order.transactionId}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Order Items */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6"
            >
              <h2 className="text-xl font-semibold text-black mb-6">
                Order Items
              </h2>
              <div className="space-y-4">
                {order.items?.map((item, index) => {
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
                      {item.product?.image ? (
                        <ProductImage
                          src={item.product.images?.[0] || item.product.image}
                          alt={item.product.title}
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
                        {item.product?.title}
                      </h4>
                      <div className="flex items-center gap-4 mt-2">
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
                        {item.dimensions && (
                          <div className="text-sm text-gray-600">
                            dimensions: {item.dimensions}
                          </div>
                        )}
                      </div>
                      <div className="mt-2 flex justify-between items-center">
                        <div className="text-sm text-gray-500">
                          Unit Price: {item.price?.toFixed(2)}
                        </div>
                        <div className="font-semibold">
                          ৳{item.itemTotal?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-end">
                  <div className="w-64 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>৳{order.subtotal?.toFixed(2)}</span>
                    </div>
                    {order.shippingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping:</span>
                        <span>৳{order.shippingFee?.toFixed(2)}</span>
                      </div>
                    )}
                    {order.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span>-৳{order.discount?.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-3">
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span>৳{order.total?.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Shipping & Actions */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <FaMapMarkerAlt className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-black">
                  Shipping Address
                </h2>
              </div>

              <div className="space-y-3">
                <p className="font-medium">
                  {order.shippingAddress?.firstName}{" "}
                  {order.shippingAddress?.lastName}
                </p>
                <p className="text-gray-600">
                  {order.shippingAddress?.address}
                </p>
                <p className="text-gray-600">
                  {order.shippingAddress?.city},{" "}
                  {order.shippingAddress?.district}
                </p>
                <p className="text-gray-600">
                  {order.shippingAddress?.postalCode},{" "}
                  {order.shippingAddress?.country}
                </p>
                {order.shippingAddress?.phone && (
                  <div className="flex items-center gap-2 mt-4">
                    <FaPhone className="w-4 h-4 text-gray-500" />
                    <span>{order.shippingAddress.phone}</span>
                  </div>
                )}
                {order.shippingAddress?.email && (
                  <div className="flex items-center gap-2">
                    <FaEnvelope className="w-4 h-4 text-gray-500" />
                    <span>{order.shippingAddress.email}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Quick Info */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 md:p-6"
            >
              <h3 className="text-lg font-semibold text-black mb-4">
                Order Information
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Number</span>
                  <span className="font-medium">{order.orderNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Order Date</span>
                  <span className="font-medium">
                    {formatDate(order.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Estimated Delivery</span>
                  <span className="font-medium">{getEstimatedDelivery()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{order.items?.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="font-bold text-lg">
                    ৳{order.total?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => navigate("/shop")}
                  className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Continue Shopping
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Back to Home
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderTracking;
