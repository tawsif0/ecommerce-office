/* eslint-disable react-hooks/exhaustive-deps */
import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaTruck,
  FaCreditCard,
  FaCalendarAlt,
  FaReceipt,
  FaUser,
  FaBuilding,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaBoxOpen,
} from "react-icons/fa";
import {
  FiChevronRight,
  FiPackage,
  FiClock,
  FiDollarSign,
  FiCopy,
  FiTruck,
} from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";

const baseUrl = import.meta.env.VITE_API_URL;

const resolveImageValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (Array.isArray(value)) return resolveImageValue(value[0]);

  if (typeof value === "object") {
    return (
      value.data ||
      value.url ||
      value.secure_url ||
      value.src ||
      value.path ||
      ""
    );
  }

  return "";
};

// Helper function to get full image URL
const getFullImageUrl = (imagePath) => {
  const resolvedPath = resolveImageValue(imagePath);
  if (!resolvedPath) return null;

  if (
    resolvedPath.startsWith("http://") ||
    resolvedPath.startsWith("https://") ||
    resolvedPath.startsWith("data:")
  ) {
    return resolvedPath;
  }

  if (resolvedPath.startsWith("/")) {
    return baseUrl ? `${baseUrl}${resolvedPath}` : resolvedPath;
  }

  if (resolvedPath && !resolvedPath.startsWith("/")) {
    return baseUrl
      ? `${baseUrl}/uploads/products/${resolvedPath}`
      : `/uploads/products/${resolvedPath}`;
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

const ThankYou = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const { orderId } = location.state || {};

  // Get authentication headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchOrderDetails = async () => {
    if (!orderId) {
      toast.error("No order information found", {
        autoClose: 3000,
      });
      navigate("/");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      try {
        const response = await axios.get(`${baseUrl}/orders/${orderId}`, {
          headers: token ? getAuthHeaders() : {},
        });

        if (response.data.success) {
          setOrder(response.data.order);
        } else {
          throw new Error("Failed to load order");
        }
      } catch (authError) {
        if (
          authError.response?.status === 401 ||
          authError.response?.status === 403
        ) {
          const guestOrders = JSON.parse(
            localStorage.getItem("guestOrders") || "[]",
          );
          const guestOrder = guestOrders.find((order) => order._id === orderId);

          if (guestOrder) {
            setOrder(guestOrder);
          } else {
            throw new Error("Order not found");
          }
        } else {
          throw authError;
        }
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      toast.error("Could not load order details", {
        autoClose: 3000,
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.order) {
      setOrder(location.state.order);
      setLoading(false);
      return;
    }

    if (orderId) {
      const token = localStorage.getItem("token");

      if (!token) {
        const guestOrders = JSON.parse(
          localStorage.getItem("guestOrders") || "[]",
        );
        const guestOrder = guestOrders.find((order) => order._id === orderId);

        if (guestOrder) {
          setOrder(guestOrder);
          setLoading(false);
          return;
        }

        const lastOrder = localStorage.getItem("lastOrder");
        if (lastOrder) {
          const parsedLastOrder = JSON.parse(lastOrder);
          if (parsedLastOrder._id === orderId) {
            setOrder(parsedLastOrder);
            setLoading(false);
            return;
          }
        }
      }

      fetchOrderDetails();
    } else {
      const lastOrder = localStorage.getItem("lastOrder");
      if (lastOrder) {
        setOrder(JSON.parse(lastOrder));
        setLoading(false);
      } else {
        toast.error("No order information found", {
          autoClose: 3000,
        });
        navigate("/");
      }
    }
  }, [orderId, location.state]);

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Format time
  const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-50 text-yellow-700 border-yellow-200",
      processing: "bg-blue-50 text-blue-700 border-blue-200",
      shipped: "bg-purple-50 text-purple-700 border-purple-200",
      delivered: "bg-green-50 text-green-700 border-green-200",
      cancelled: "bg-red-50 text-red-700 border-red-200",
    };
    return colors[status] || "bg-gray-50 text-gray-700 border-gray-200";
  };
  const copyOrderNumber = () => {
    if (order?.orderNumber) {
      navigator.clipboard.writeText(order.orderNumber);
      toast.success("Order number copied!");
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen w-full bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6 animate-pulse">
            <FaBoxOpen className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Loading Order Details
          </h3>
          <p className="text-gray-600">
            Please wait while we fetch your order information...
          </p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen w-full bg-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gray-50 rounded-2xl p-8 md:p-12 text-center border border-gray-200">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaBoxOpen className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-gray-900 mb-3">
              Order Not Found
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              We couldn't find your order details. Please check your orders
              page.
            </p>
            <button
              onClick={() => navigate("/orders")}
              className="px-6 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-colors"
            >
              View My Orders
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-white py-8 md:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-gray-600 hover:text-black mb-6 transition-colors group"
          >
            <span className="text-sm font-medium">Back to Home</span>
            <FiChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
              <FaCheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-3">
              Order Confirmed!
            </h1>
            <div className="flex items-center justify-center gap-2 mb-3">
              <p className="text-gray-600">
                Thank you for your purchase. Your order{" "}
                <span className="font-semibold text-black">
                  #{order.orderNumber}
                </span>{" "}
                has been received.
              </p>
              <button
                onClick={copyOrderNumber}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Copy order number"
              >
                <FiCopy className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <p className="text-gray-600">
              You can track your order using the order number above.
            </p>
          </div>
        </div>

        {/* Order Status Card */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
                <FaReceipt className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-black">
                  Order Status
                </h2>
                <p className="text-sm text-gray-500">
                  Track your order progress
                </p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(
                order.orderStatus,
              )}`}
            >
              {order.orderStatus?.charAt(0).toUpperCase() +
                order.orderStatus?.slice(1)}
            </span>
          </div>

          {/* Status Timeline */}
          <div className="relative">
            <div className="flex justify-between items-center">
              <div className="text-center relative z-10">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg">
                  <FaCheckCircle className="w-5 h-5 text-white" />
                </div>
                <span className="text-xs font-medium text-black">
                  Order Placed
                </span>
                <p className="text-xs text-gray-500">
                  {formatDate(order.createdAt)}
                </p>
              </div>

              <div className="flex-1 h-1 mx-4 bg-gray-200 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${
                    order.orderStatus !== "pending"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                  style={{
                    width: order.orderStatus !== "pending" ? "100%" : "50%",
                  }}
                ></div>
              </div>

              <div className="text-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg ${
                    order.orderStatus !== "pending"
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                >
                  <span
                    className={`${
                      order.orderStatus !== "pending"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  >
                    ⚙️
                  </span>
                </div>
                <span className="text-xs font-medium text-black">
                  Processing
                </span>
                <p className="text-xs text-gray-500">Soon</p>
              </div>

              <div className="flex-1 h-1 mx-4 bg-gray-200 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${
                    order.orderStatus === "shipped" ||
                    order.orderStatus === "delivered"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                  style={{
                    width:
                      order.orderStatus === "shipped" ||
                      order.orderStatus === "delivered"
                        ? "100%"
                        : "0%",
                  }}
                ></div>
              </div>

              <div className="text-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg ${
                    order.orderStatus === "shipped" ||
                    order.orderStatus === "delivered"
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                >
                  <FaTruck
                    className={`w-4 h-4 ${
                      order.orderStatus === "shipped" ||
                      order.orderStatus === "delivered"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-black">Shipped</span>
                <p className="text-xs text-gray-500">Soon</p>
              </div>

              <div className="flex-1 h-1 mx-4 bg-gray-200 relative">
                <div
                  className={`absolute top-0 left-0 h-full ${
                    order.orderStatus === "delivered"
                      ? "bg-green-500"
                      : "bg-gray-300"
                  }`}
                  style={{
                    width: order.orderStatus === "delivered" ? "100%" : "0%",
                  }}
                ></div>
              </div>

              <div className="text-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2 shadow-lg ${
                    order.orderStatus === "delivered"
                      ? "bg-green-500"
                      : "bg-gray-200"
                  }`}
                >
                  <FiPackage
                    className={`w-4 h-4 ${
                      order.orderStatus === "delivered"
                        ? "text-white"
                        : "text-gray-400"
                    }`}
                  />
                </div>
                <span className="text-xs font-medium text-black">
                  Delivered
                </span>
                <p className="text-xs text-gray-500">Soon</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Order Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Summary Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <FaReceipt className="w-5 h-5 text-gray-600" />
                  </div>
                  <h2 className="text-xl font-semibold text-black">
                    Order Summary
                  </h2>
                </div>
                <div className="text-sm text-gray-500">
                  Order #:{" "}
                  <span className="font-semibold text-black">
                    {order.orderNumber}
                  </span>
                </div>
              </div>

              {/* Products List */}
              <div className="space-y-4 mb-6">
                {order.items?.map((item, index) => {
                  const displayColor =
                    item.color && item.color.toLowerCase() !== "default"
                      ? item.color
                      : "";
                  const product =
                    item?.product && typeof item.product === "object"
                      ? item.product
                      : null;
                  const title = item.title || product?.title || "Product";
                  const image = resolveImageValue(
                    item.image || product?.images?.[0] || product?.image || "",
                  );
                  const quantity = Number(item.quantity || 1);
                  const unitPrice = Number(item.price ?? product?.price ?? 0);
                  const itemTotal = unitPrice * quantity;
                  return (
                    <div
                      key={index}
                      className="flex gap-4 pb-4 border-b border-gray-100 last:border-0"
                    >
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {image ? (
                          <ProductImage
                            src={image}
                            alt={title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FiPackage className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {title}
                        </h3>
                        <div className="flex items-center justify-between mt-1">
                          <div className="text-sm text-gray-500">
                            Qty: {quantity}
                            {item.variationLabel && (
                              <span className="ml-2">
                                Variant: {item.variationLabel}
                              </span>
                            )}
                            {displayColor && (
                              <span className="ml-2 inline-flex items-center gap-1">
                                • Colors:
                                {displayColor && (
                                  <span
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: displayColor }}
                                  />
                                )}
                              </span>
                            )}
                            {item.dimensions && (
                              <span className="ml-2">• dimensions: {item.dimensions}</span>
                            )}
                          </div>
                          <div className="font-semibold text-gray-900">
                            ৳{itemTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Breakdown */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">
                    ৳{order.subtotal?.toFixed(2)}
                  </span>
                </div>
                {order.shippingFee > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Shipping</span>
                    <span className="text-gray-900">
                      ৳{order.shippingFee?.toFixed(2)}
                    </span>
                  </div>
                )}

                {order.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Discount</span>
                    <span className="text-red-600">
                      -৳{order.discount?.toFixed(2)}
                    </span>
                  </div>
                )}

                {order.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">
                      ৳{order.tax?.toFixed(2)}
                    </span>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-black">Total</span>
                    <span className="text-2xl font-bold text-black">
                      ৳{order.total?.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Shipping Information Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <FaMapMarkerAlt className="w-5 h-5 text-gray-600" />
                </div>
                <h2 className="text-xl font-semibold text-black">
                  Shipping Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-black mb-3 flex items-center gap-2">
                    <FaUser className="w-4 h-4 text-gray-500" />
                    Shipping Address
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p className="font-medium text-black">
                      {order.shippingAddress?.firstName}{" "}
                      {order.shippingAddress?.lastName}
                    </p>
                    {order.shippingAddress?.company && (
                      <p className="flex items-center gap-2">
                        <FaBuilding className="w-3 h-3" />
                        {order.shippingAddress.company}
                      </p>
                    )}
                    <p className="flex items-center gap-2">
                      <FaMapMarkerAlt className="w-3 h-3" />
                      {order.shippingAddress?.address}
                    </p>
                    {order.shippingAddress?.apartment && (
                      <p className="ml-5">{order.shippingAddress.apartment}</p>
                    )}
                    <p>
                      {order.shippingAddress?.city},{" "}
                      {order.shippingAddress?.district}
                    </p>
                    <p>
                      {order.shippingAddress?.postalCode},{" "}
                      {order.shippingAddress?.country}
                    </p>
                    {order.shippingAddress?.phone && (
                      <p className="flex items-center gap-2">
                        <FaPhone className="w-3 h-3" />
                        {order.shippingAddress.phone}
                      </p>
                    )}
                    {order.shippingAddress?.email && (
                      <p className="flex items-center gap-2">
                        <FaEnvelope className="w-3 h-3" />
                        {order.shippingAddress.email}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-black mb-3 flex items-center gap-2">
                    <FaCreditCard className="w-4 h-4 text-gray-500" />
                    Payment Details
                  </h3>
                  <div className="text-sm text-gray-600 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Method:</span>
                      <span className="font-medium text-black capitalize">
                        {order.paymentMethod?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Status:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.paymentStatus === "completed"
                            ? "bg-green-100 text-green-700"
                            : order.paymentStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {order.paymentStatus?.charAt(0).toUpperCase() +
                          order.paymentStatus?.slice(1) || "Pending"}
                      </span>
                    </div>
                    {order.paymentMethod === "cash_on_delivery" && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-700">
                          Please have the exact amount ready for delivery.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Info & Actions */}
          <div className="space-y-6">
            {/* Order Quick Info */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
              <h3 className="text-lg font-semibold text-black mb-6">
                Order Details
              </h3>

              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FaReceipt className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Order Number</p>
                    <p className="font-semibold text-black">
                      {order.orderNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FaCalendarAlt className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Order Date & Time</p>
                    <p className="font-semibold text-black">
                      {formatDate(order.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">
                      <FiClock className="inline w-3 h-3 mr-1" />
                      {formatTime(order.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FaCreditCard className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <p className="font-semibold text-black capitalize">
                      {order.paymentStatus || "Pending"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FaTruck className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estimated Delivery</p>
                    <p className="font-semibold text-black">
                      3-5 Business Days
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                    <FiDollarSign className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-xl font-bold text-black">
                      ৳{order.total?.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 space-y-3">
                <button
                  onClick={() => navigate(`/track-order/${order.orderNumber}`)}
                  className="w-full py-3 bg-black text-white font-medium rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center gap-2"
                >
                  <FiTruck className="w-4 h-4" />
                  Track This Order
                </button>
                <button
                  onClick={() => navigate("/")}
                  className="w-full py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Continue Shopping
                </button>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
              <h4 className="text-sm font-medium text-black mb-3">
                Need Help?
              </h4>
              <p className="text-xs text-gray-600 mb-4">
                If you have any questions about your order, our support team is
                here to help.
              </p>
              <div className="text-xs text-gray-500 space-y-2">
                <div className="flex items-center gap-2">
                  <FaPhone className="w-3 h-3" />
                  <span>+880 1XXX-XXXXXX</span>
                </div>
                <div className="flex items-center gap-2">
                  <FaEnvelope className="w-3 h-3" />
                  <span>support@example.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;




