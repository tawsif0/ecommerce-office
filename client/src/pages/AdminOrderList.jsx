/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
// pages/AdminOrderList.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import {
  FiSearch,
  FiFilter,
  FiEye,
  FiEdit,
  FiCopy,
  FiChevronLeft,
  FiChevronRight,
  FiPrinter,
  FiXCircle,
  FiChevronRight as FiChevronRightIcon,
} from "react-icons/fi";
import {
  FaBox,
  FaShippingFast,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import { motion } from "framer-motion";

const baseUrl = import.meta.env.VITE_API_URL;

const AdminOrderList = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [statusNotes, setStatusNotes] = useState("");
  const [isStatusUpdating, setIsStatusUpdating] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });

  // Status options with colors
  const statusOptions = [
    { value: "all", label: "All Orders", color: "gray", icon: FaBox },
    { value: "pending", label: "Pending", color: "yellow", icon: FaClock },
    {
      value: "processing",
      label: "Processing",
      color: "blue",
      icon: FaShippingFast,
    },
    { value: "shipped", label: "Shipped", color: "purple", icon: FaBox },
    {
      value: "delivered",
      label: "Delivered",
      color: "green",
      icon: FaCheckCircle,
    },
    {
      value: "cancelled",
      label: "Cancelled",
      color: "red",
      icon: FaTimesCircle,
    },
  ];

  // Helper functions for step-by-step flow
  const getStatusIndex = (status) => {
    const statusOrder = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];
    return statusOrder.indexOf(status);
  };

  const getCurrentStep = (status) => {
    const index = getStatusIndex(status);
    return index + 1; // +1 because array index starts at 0
  };

  const getNextStatus = (currentStatus) => {
    const statusOrder = ["pending", "processing", "shipped", "delivered"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    return currentIndex < statusOrder.length - 1
      ? statusOrder[currentIndex + 1]
      : currentStatus;
  };

  const getStatusMessage = (status) => {
    const messages = {
      pending: "Waiting for confirmation and payment verification",
      processing: "Order is being prepared for shipment",
      shipped: "Order has been dispatched to delivery service",
      delivered: "Order has been successfully delivered",
      cancelled: "Order has been cancelled",
    };
    return messages[status] || "";
  };

  const getNextStepMessage = (currentStatus) => {
    const messages = {
      pending: "Verify payment and begin order processing",
      processing: "Prepare order for shipment and assign tracking",
      shipped: "Mark as delivered once customer receives order",
      delivered: "Order completed successfully",
    };
    return messages[currentStatus] || "";
  };

  // Fetch orders
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${baseUrl}/orders/admin/all?page=${page}&limit=20&status=${statusFilter}&search=${searchTerm}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        setOrders(response.data.orders);
        setPagination(response.data.pagination);
      } else {
        toast.error("Failed to fetch orders");
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      toast.error("Error loading orders");
    } finally {
      setLoading(false);
    }
  };

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrders(1);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, statusFilter]);

  // Initial fetch
  useEffect(() => {
    if (user?.userType === "admin") {
      fetchOrders();
    }
  }, [user]);

  // Handle proceed to next step
  const handleProceed = async () => {
    if (!selectedOrder || isStatusUpdating || isCancellingOrder) return;

    const nextStatus = getNextStatus(selectedOrder.orderStatus);

    try {
      setIsStatusUpdating(true);
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${baseUrl}/orders/admin/${selectedOrder._id}/status`,
        {
          status: nextStatus,
          notes: statusNotes || `Status updated to ${nextStatus}`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          meta: { skipGlobalButtonLoading: true },
        },
      );

      if (response.data.success) {
        toast.success(`Order status updated to ${nextStatus}`);

        // Update payment status if moving from pending to processing
        if (
          selectedOrder.orderStatus === "pending" &&
          nextStatus === "processing"
        ) {
          setOrders(
            orders.map((order) =>
              order._id === selectedOrder._id
                ? {
                    ...order,
                    orderStatus: nextStatus,
                    paymentStatus: "completed", // Update payment status
                  }
                : order,
            ),
          );
        } else {
          setOrders(
            orders.map((order) =>
              order._id === selectedOrder._id
                ? { ...order, orderStatus: nextStatus }
                : order,
            ),
          );
        }

        setShowStatusModal(false);
        setStatusNotes("");
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
    } finally {
      setIsStatusUpdating(false);
    }
  };

  // Handle cancel order
  const handleCancelOrder = async () => {
    if (!selectedOrder || isStatusUpdating || isCancellingOrder) return;

    try {
      setIsCancellingOrder(true);
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${baseUrl}/orders/admin/${selectedOrder._id}/status`,
        {
          status: "cancelled",
          notes: statusNotes || "Order cancelled by admin",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          meta: { skipGlobalButtonLoading: true },
        },
      );

      if (response.data.success) {
        toast.success("Order cancelled successfully");

        // Update local state
        setOrders(
          orders.map((order) =>
            order._id === selectedOrder._id
              ? {
                  ...order,
                  orderStatus: "cancelled",
                  paymentStatus: "failed", // Update payment status
                }
              : order,
          ),
        );

        setShowCancelConfirm(false);
        setShowStatusModal(false);
        setStatusNotes("");
        setSelectedOrder(null);
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setIsCancellingOrder(false);
    }
  };

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

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Format date for mobile
  const formatDateMobile = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get payment method display
  const getPaymentMethodDisplay = (order) => {
    const method = order.paymentMethod || "";
    const transactionId = order.transactionId || "";

    if (transactionId && transactionId !== "N/A") {
      return `${method} (${transactionId})`;
    }
    return method;
  };

  // Pagination handlers
  const goToPage = (page) => {
    if (page >= 1 && page <= pagination.totalPages) {
      fetchOrders(page);
    }
  };

  // Print order
  const printOrder = (order) => {
    const printContent = `
      <html>
        <head>
          <title>Order ${order.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .order-info { margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f5f5f5; }
            .total { font-weight: bold; font-size: 18px; text-align: right; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Order Invoice</h1>
            <h2>Order #${order.orderNumber}</h2>
          </div>
          <div class="order-info">
            <p><strong>Date:</strong> ${formatDate(order.createdAt)}</p>
            <p><strong>Customer:</strong> ${order.customer.name}</p>
            <p><strong>Email:</strong> ${order.customer.email}</p>
            <p><strong>Status:</strong> ${order.orderStatus}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${order.items
                .map(
                  (item) => `
                <tr>
                  <td>${item.product}</td>
                  <td>${item.quantity}</td>
                  <td>৳${item.price.toFixed(2)}</td>
                  <td>৳${item.total.toFixed(2)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
          <div class="total">
            <p>Total: ৳${order.total.toFixed(2)}</p>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  if (user?.userType !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Admin Access Required
          </h2>
          <p className="text-gray-600 mb-6">
            You need to be an admin to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors w-full"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-black mb-1 sm:mb-2">
          Order Management
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Manage and track all customer orders in one place.
        </p>
      </div>

      {/* Filters & Search - Mobile Optimized */}
      <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 shadow-sm border border-gray-200">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 sm:pl-10 pr-3 sm:pr-4 py-2 sm:py-2.5 text-sm sm:text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <FiFilter className="text-gray-500 text-sm sm:text-base" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="flex-1 sm:w-auto border border-gray-300 rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-black"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Stats - Mobile Hidden */}
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                Total: {pagination.totalOrders}
              </div>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="sm:hidden flex items-center justify-between text-xs">
            <div className="px-2 py-1 bg-gray-100 rounded">
              Total: {pagination.totalOrders}
            </div>
            <div className="text-gray-500">
              Page {pagination.currentPage}/{pagination.totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* Orders Table - Mobile Optimized */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-black mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">
              Loading orders...
            </p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="text-4xl sm:text-5xl mb-4 sm:mb-6">📦</div>
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">
              No orders found
            </h3>
            <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto">
              {searchTerm || statusFilter !== "all"
                ? "Try changing your search or filter"
                : "No orders have been placed yet"}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Order #
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Payment
                    </th>
                    <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr
                      key={order._id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-sm sm:text-base">
                            {order.orderNumber}
                          </span>
                          <button
                            onClick={() => copyOrderNumber(order.orderNumber)}
                            className="p-1 hover:bg-gray-200 rounded transition-colors"
                            title="Copy order number"
                          >
                            <FiCopy className="w-3 h-3 sm:w-4 sm:h-4" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div>
                          <div className="font-medium text-gray-900 text-sm sm:text-base">
                            {order.customer.name}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {order.customer.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="font-semibold text-gray-900 text-sm sm:text-base">
                          ৳{order.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span
                          className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.orderStatus,
                          )}`}
                        >
                          {order.orderStatus}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium">
                            {getPaymentMethodDisplay(order)}
                          </div>
                          <div
                            className={`text-xs ${
                              order.paymentStatus === "completed"
                                ? "text-green-600"
                                : "text-yellow-600"
                            }`}
                          >
                            {order.paymentStatus}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-1 sm:gap-2">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => viewOrderDetails(order)}
                            className="p-1.5 sm:p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            title="View Details"
                          >
                            <FiEye className="w-3 h-3 sm:w-4 sm:h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setSelectedOrder(order);
                              setShowStatusModal(true);
                            }}
                            className="p-1.5 sm:p-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="Update Status"
                          >
                            <FiEdit className="w-3 h-3 sm:w-4 sm:h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => printOrder(order)}
                            className="p-1.5 sm:p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Print Invoice"
                          >
                            <FiPrinter className="w-3 h-3 sm:w-4 sm:h-4" />
                          </motion.button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-gray-200">
              {orders.map((order) => (
                <div key={order._id} className="p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-semibold text-sm">
                          {order.orderNumber}
                        </span>
                        <button
                          onClick={() => copyOrderNumber(order.orderNumber)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                          title="Copy order number"
                        >
                          <FiCopy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateMobile(order.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-sm">
                        ৳{order.total.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          order.orderStatus,
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="font-medium text-xs text-gray-900">
                      {order.customer.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {order.customer.email}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-xs">
                      <div className="font-medium truncate max-w-[120px]">
                        {order.paymentMethod}
                      </div>
                      <div
                        className={`${
                          order.paymentStatus === "completed"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }`}
                      >
                        {order.paymentStatus}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        title="View Details"
                      >
                        <FiEye className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowStatusModal(true);
                        }}
                        className="p-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                        title="Update Status"
                      >
                        <FiEdit className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination - Responsive */}
            {pagination.totalPages > 1 && (
              <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                  <div className="text-xs sm:text-sm text-gray-700 text-center sm:text-left">
                    Showing page {pagination.currentPage} of{" "}
                    {pagination.totalPages}
                  </div>
                  <div className="flex items-center justify-center gap-1 sm:gap-2">
                    <button
                      onClick={() => goToPage(pagination.currentPage - 1)}
                      disabled={!pagination.hasPrevPage}
                      className={`p-1.5 sm:p-2 rounded-lg text-sm ${
                        pagination.hasPrevPage
                          ? "hover:bg-gray-100 text-gray-700"
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <FiChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Mobile: Show current page only */}
                    <div className="sm:hidden">
                      <span className="px-3 py-1.5 bg-black text-white text-sm rounded-lg">
                        {pagination.currentPage}
                      </span>
                    </div>

                    {/* Desktop: Show page numbers */}
                    <div className="hidden sm:flex items-center gap-1">
                      {[...Array(Math.min(5, pagination.totalPages))].map(
                        (_, i) => {
                          const pageNum = i + 1;
                          if (
                            pageNum === 1 ||
                            pageNum === pagination.totalPages ||
                            (pageNum >= pagination.currentPage - 1 &&
                              pageNum <= pagination.currentPage + 1)
                          ) {
                            return (
                              <button
                                key={pageNum}
                                onClick={() => goToPage(pageNum)}
                                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-sm ${
                                  pagination.currentPage === pageNum
                                    ? "bg-black text-white"
                                    : "hover:bg-gray-100 text-gray-700"
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          }
                          return null;
                        },
                      )}
                      {pagination.totalPages > 5 &&
                        pagination.currentPage < pagination.totalPages - 2 && (
                          <span className="px-2 text-gray-500">...</span>
                        )}
                    </div>

                    <button
                      onClick={() => goToPage(pagination.currentPage + 1)}
                      disabled={!pagination.hasNextPage}
                      className={`p-1.5 sm:p-2 rounded-lg text-sm ${
                        pagination.hasNextPage
                          ? "hover:bg-gray-100 text-gray-700"
                          : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <FiChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Order Details Modal - Responsive */}
      {showDetailsModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto my-auto"
          >
            <div className="p-4 sm:p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-4 sm:mb-6">
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-black">
                    Order Details
                  </h2>
                  <p className="text-sm sm:text-base text-gray-600">
                    {selectedOrder.orderNumber}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg text-lg"
                >
                  ✕
                </button>
              </div>

              {/* Order Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">
                    Customer Information
                  </h3>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <p>
                      <span className="text-gray-600">Name:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.customer.name}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Email:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.customer.email}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Phone:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.customer.phone}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Account:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.customer.accountType || "Registered"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                  <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">
                    Order Information
                  </h3>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <p>
                      <span className="text-gray-600">Date:</span>{" "}
                      <span className="font-medium">
                        {formatDate(selectedOrder.createdAt)}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Status:</span>{" "}
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          selectedOrder.orderStatus,
                        )}`}
                      >
                        {selectedOrder.orderStatus}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Payment:</span>{" "}
                      <span className="font-medium">
                        {getPaymentMethodDisplay(selectedOrder)}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Total:</span>{" "}
                      <span className="font-medium">
                        ৳{selectedOrder.total.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                  <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">
                    Shipping Address
                  </h3>
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p>{selectedOrder.shippingAddress.address}</p>
                    <p>
                      {selectedOrder.shippingAddress.city},{" "}
                      {selectedOrder.shippingAddress.district}
                    </p>
                    <p>
                      {selectedOrder.shippingAddress.postalCode},{" "}
                      {selectedOrder.shippingAddress.country}
                    </p>
                  </div>
                </div>
              )}

              {/* Items Table */}
              <div className="mb-4 sm:mb-6">
                <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">
                  Order Items
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs sm:text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 sm:px-4 py-2 text-left">Product</th>
                        <th className="px-2 sm:px-4 py-2 text-left">Qty</th>
                        <th className="px-2 sm:px-4 py-2 text-left">Price</th>
                        <th className="px-2 sm:px-4 py-2 text-left">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items.map((item, index) => {
                        const displayColor =
                          item.color && item.color.toLowerCase() !== "default"
                            ? item.color
                            : "";
                        return (
                        <tr key={index} className="border-b">
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="font-medium">{item.product}</div>
                            {displayColor && (
                              <div className="text-gray-600 text-xs inline-flex items-center gap-1">
                                <span>Colors:</span>
                                <span
                                  className="w-3 h-3 rounded-full border border-gray-300"
                                  style={{ backgroundColor: displayColor }}
                                />
                              </div>
                            )}
                            {item.dimensions && (
                              <div className="text-gray-600 text-xs">
                                dimensions: {item.dimensions}
                              </div>
                            )}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            {item.quantity}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            ৳{item.price.toFixed(2)}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            ৳{item.total.toFixed(2)}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
                <div className="flex justify-end">
                  <div className="w-full sm:w-64 space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>৳{selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedOrder.shippingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping:</span>
                        <span>৳{selectedOrder.shippingFee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span>-৳{selectedOrder.discount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-sm sm:text-base">
                        <span>Total:</span>
                        <span>৳{selectedOrder.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 sm:mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setSelectedOrder(selectedOrder);
                    setShowStatusModal(true);
                  }}
                  className="px-3 sm:px-4 py-2 bg-black text-white text-sm sm:text-base rounded-lg hover:bg-gray-800"
                >
                  Update Status
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 text-sm sm:text-base rounded-lg hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Update Status Modal - Step by Step */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-y-auto my-auto"
          >
            <div className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-black mb-4">
                {selectedOrder.orderStatus === "cancelled"
                  ? "Order Cancelled"
                  : `Update Order Status - Step ${getCurrentStep(selectedOrder.orderStatus)}/4`}
              </h2>

              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Order: <strong>{selectedOrder.orderNumber}</strong>
              </p>

              {/* Status Steps Visualization */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  {["pending", "processing", "shipped", "delivered"].map(
                    (status, index) => {
                      const isCurrent = selectedOrder.orderStatus === status;
                      const isCompleted =
                        getStatusIndex(selectedOrder.orderStatus) > index;
                      const isCancelled =
                        selectedOrder.orderStatus === "cancelled";

                      return (
                        <div key={status} className="text-center flex-1">
                          <div
                            className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2 ${
                              isCancelled
                                ? "bg-red-100 border border-red-300"
                                : isCompleted
                                  ? "bg-green-100 border border-green-500"
                                  : isCurrent
                                    ? "bg-blue-100 border border-blue-500"
                                    : "bg-gray-100 border border-gray-300"
                            }`}
                          >
                            <span
                              className={`text-xs font-bold ${
                                isCancelled
                                  ? "text-red-700"
                                  : isCompleted
                                    ? "text-green-700"
                                    : isCurrent
                                      ? "text-blue-700"
                                      : "text-gray-500"
                              }`}
                            >
                              {index + 1}
                            </span>
                          </div>
                          <span
                            className={`text-xs ${
                              isCancelled
                                ? "text-red-600"
                                : isCompleted
                                  ? "text-green-600"
                                  : isCurrent
                                    ? "text-blue-600 font-bold"
                                    : "text-gray-500"
                            }`}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Status Line */}
                <div className="relative">
                  <div className="absolute top-3 left-3 sm:left-4 right-3 sm:right-4 h-0.5 bg-gray-300 -z-10">
                    <div
                      className={`h-full transition-all duration-300 ${
                        selectedOrder.orderStatus === "cancelled"
                          ? "bg-red-300"
                          : "bg-green-500"
                      }`}
                      style={{
                        width:
                          selectedOrder.orderStatus === "cancelled"
                            ? "0%"
                            : `${(getStatusIndex(selectedOrder.orderStatus) / 3) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Current Status Display */}
              <div
                className={`p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 ${
                  selectedOrder.orderStatus === "cancelled"
                    ? "bg-red-50 border border-red-200"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      selectedOrder.orderStatus === "cancelled"
                        ? "bg-red-100"
                        : "bg-blue-100"
                    }`}
                  >
                    {selectedOrder.orderStatus === "cancelled" ? (
                      <FaTimesCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    ) : selectedOrder.orderStatus === "pending" ? (
                      <FaClock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : selectedOrder.orderStatus === "processing" ? (
                      <FaShippingFast className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : selectedOrder.orderStatus === "shipped" ? (
                      <FaBox className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : (
                      <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-black text-sm sm:text-base">
                      Current Status: {selectedOrder.orderStatus.toUpperCase()}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {getStatusMessage(selectedOrder.orderStatus)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Next Step Information */}
              {selectedOrder.orderStatus !== "cancelled" &&
                selectedOrder.orderStatus !== "delivered" && (
                  <div className="bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 mb-4 sm:mb-6">
                    <h4 className="font-medium text-green-800 mb-1 sm:mb-2 text-sm sm:text-base">
                      Next Step:{" "}
                      {getNextStatus(selectedOrder.orderStatus).toUpperCase()}
                    </h4>
                    <p className="text-xs sm:text-sm text-green-700">
                      {getNextStepMessage(selectedOrder.orderStatus)}
                    </p>
                  </div>
                )}

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-3">
                {selectedOrder.orderStatus !== "cancelled" &&
                selectedOrder.orderStatus !== "delivered" ? (
                  <>
                    <button
                      onClick={handleProceed}
                      disabled={isStatusUpdating || isCancellingOrder}
                      className="w-full py-2.5 sm:py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isStatusUpdating ? (
                        <>
                          <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                          Updating Status...
                        </>
                      ) : (
                        <>
                          <FiChevronRightIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                          Proceed to{" "}
                          {getNextStatus(selectedOrder.orderStatus).toUpperCase()}
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isStatusUpdating || isCancellingOrder}
                      className="w-full py-2.5 sm:py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <FiXCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Cancel Order
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setStatusNotes("");
                    }}
                    disabled={isStatusUpdating || isCancellingOrder}
                    className="w-full py-2.5 sm:py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Close
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setStatusNotes("");
                  }}
                  disabled={isStatusUpdating || isCancellingOrder}
                  className="w-full py-2.5 sm:py-3 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {selectedOrder.orderStatus === "cancelled" ||
                  selectedOrder.orderStatus === "delivered"
                    ? "Close"
                    : "Not Now"}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Confirmation Modal - Responsive */}
      {showCancelConfirm && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-xl w-full max-w-md max-h-[90vh] sm:max-h-[85vh] overflow-y-auto my-auto"
          >
            <div className="p-4 sm:p-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <FaTimesCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-600" />
                </div>
                <h2 className="text-lg sm:text-xl font-bold text-black mb-1.5 sm:mb-2">
                  Cancel Order Confirmation
                </h2>
                <p className="text-sm sm:text-base text-gray-600">
                  Are you sure you want to cancel order{" "}
                  <strong>{selectedOrder.orderNumber}</strong>?
                </p>
              </div>

              <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-4 sm:mb-6">
                <h4 className="font-medium text-red-800 mb-1.5 sm:mb-2 text-sm sm:text-base">
                  ⚠️ Important Notice
                </h4>
                <ul className="text-xs sm:text-sm text-red-700 space-y-1">
                  <li>• Order status will be changed to "cancelled"</li>
                  <li>• Payment status will be set to "failed"</li>
                  <li>• Customer will receive cancellation email</li>
                  <li>• This action cannot be undone</li>
                </ul>
              </div>

              <div className="mb-4 sm:mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Cancellation Reason (Optional)
                </label>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Enter reason for cancellation..."
                  rows="3"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  disabled={isCancellingOrder || isStatusUpdating}
                  className="flex-1 py-2.5 sm:py-3 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancellingOrder || isStatusUpdating}
                  className="flex-1 py-2.5 sm:py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCancellingOrder ? (
                    <span className="inline-flex items-center justify-center gap-2">
                      <span className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    "Yes, Cancel Order"
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminOrderList;
