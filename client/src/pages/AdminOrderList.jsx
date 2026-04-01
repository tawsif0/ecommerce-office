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
  FiTruck,
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
import {
  formatPaymentMethodLabel,
  formatPaymentStatusLabel,
  getOrderCustomerProfile,
  getOrderItemColorSwatch,
  getOrderItemLineTotal,
  getOrderItemMetaLine,
  getOrderItemUnitPrice,
  getOrderItemVariantLines,
} from "../utils/orderPresentation";

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
  const [isPaymentStatusUpdating, setIsPaymentStatusUpdating] = useState(false);
  const [isCancellingOrder, setIsCancellingOrder] = useState(false);
  const [cancellationReviewAction, setCancellationReviewAction] = useState("");
  const [courierAction, setCourierAction] = useState("");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalOrders: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const ORDER_PROGRESS_STATUSES = [
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ];
  const ORDER_STATUS_TRANSITIONS = {
    pending: "confirmed",
    confirmed: "processing",
    processing: "shipped",
    shipped: "delivered",
    delivered: "returned",
  };

  // Status options with colors
  const statusOptions = [
    { value: "all", label: "All Orders", color: "gray", icon: FaBox },
    { value: "pending", label: "Pending", color: "yellow", icon: FaClock },
    {
      value: "confirmed",
      label: "Confirmed",
      color: "cyan",
      icon: FaCheckCircle,
    },
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
    {
      value: "returned",
      label: "Returned",
      color: "orange",
      icon: FaTimesCircle,
    },
  ];

  // Helper functions for step-by-step flow
  const getStatusIndex = (status) => {
    return ORDER_PROGRESS_STATUSES.indexOf(status);
  };

  const getCurrentStep = (status) => {
    const index = getStatusIndex(status);
    return index >= 0 ? index + 1 : 1;
  };

  const getNextStatus = (currentStatus) => {
    return ORDER_STATUS_TRANSITIONS[currentStatus] || currentStatus;
  };

  const canProceedToNextStatus = (status) => {
    return Boolean(ORDER_STATUS_TRANSITIONS[status]);
  };

  const getStatusMessage = (status) => {
    const messages = {
      pending: "Waiting for confirmation and payment verification",
      confirmed: "Order has been confirmed and queued for processing",
      processing: "Order is being prepared for shipment",
      shipped: "Order has been dispatched to delivery service",
      delivered: "Order has been successfully delivered",
      cancelled: "Order has been cancelled",
      returned: "Order has been returned",
    };
    return messages[status] || "";
  };

  const getNextStepMessage = (currentStatus) => {
    const messages = {
      pending: "Confirm this order before fulfillment starts",
      confirmed: "Prepare items and begin processing",
      processing: "Prepare order for shipment and assign tracking",
      shipped: "Mark as delivered once customer receives order",
      delivered: "Mark as returned if customer sends this order back",
    };
    return messages[currentStatus] || "";
  };

  const getPaymentProviderType = (order) =>
    String(order?.paymentDetails?.providerType || "").trim().toLowerCase();

  const isCashOnDeliveryOrder = (order) => {
    const paymentCategory = String(order?.paymentDetails?.paymentCategory || "")
      .trim()
      .toLowerCase();
    const providerType = getPaymentProviderType(order);
    const paymentLookup = `${order?.paymentMethod || ""} ${order?.paymentDetails?.method || ""}`;

    return (
      paymentCategory === "cash_on_delivery" ||
      providerType === "cod" ||
      /\bcod\b|cash[\s_-]*on[\s_-]*delivery/i.test(paymentLookup)
    );
  };

  const isGatewayPaymentOrder = (order) =>
    ["stripe", "paypal", "sslcommerz"].includes(getPaymentProviderType(order));

  const canManuallyManagePayment = (order) =>
    Boolean(order) &&
    !isCashOnDeliveryOrder(order) &&
    !["cancelled", "returned"].includes(String(order?.orderStatus || "").toLowerCase());

  const getPaymentStatusTextClass = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (normalized === "completed") return "text-green-600";
    if (normalized === "failed") return "text-red-600";
    return "text-yellow-600";
  };

  const getTransactionReference = (order) => {
    const candidates = [
      order?.paymentDetails?.transactionId,
      order?.transactionId,
    ];

    for (const candidate of candidates) {
      const value = String(candidate || "").trim();
      if (value && value !== "N/A") return value;
    }

    return "";
  };

  const canMarkPaymentCompleted = (order) => {
    if (!canManuallyManagePayment(order)) return false;
    if (isGatewayPaymentOrder(order)) return true;
    return Boolean(getTransactionReference(order));
  };

  const canAdminCancelOrder = (order) =>
    String(order?.orderStatus || "").trim().toLowerCase() === "pending";

  const getOrderTypeValue = (order) => {
    const explicitType = String(order?.orderType || "").trim().toLowerCase();
    if (explicitType === "manual" || explicitType === "online") {
      return explicitType;
    }

    const source = String(order?.source || "").trim().toLowerCase();
    return source.includes("manual") ? "manual" : "online";
  };

  const getOrderTypeLabel = (order) =>
    getOrderTypeValue(order) === "manual" ? "Manual" : "Online";

  const isManualOrder = (order) => getOrderTypeValue(order) === "manual";

  // Fetch orders
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(`${baseUrl}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          page,
          limit: 20,
          status: statusFilter,
          search: searchTerm,
        },
      });

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
    if (!selectedOrder || isStatusUpdating || isPaymentStatusUpdating || isCancellingOrder) return;

    if (!canProceedToNextStatus(selectedOrder.orderStatus)) {
      toast.error("No next status available for this order");
      return;
    }

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
        const updatedOrder = response.data?.order || {};
        const updatedStatus = updatedOrder.orderStatus || updatedOrder.status || nextStatus;
        const updatedPaymentStatus =
          updatedOrder.paymentStatus || selectedOrder.paymentStatus;

        toast.success(`Order status updated to ${updatedStatus}`);
        updateOrderInState(selectedOrder._id, {
          orderStatus: updatedStatus,
          paymentStatus: updatedPaymentStatus,
          courier: updatedOrder.courier || selectedOrder.courier || null,
          adminNotes: updatedOrder.adminNotes || selectedOrder.adminNotes || "",
          statusTimeline: Array.isArray(updatedOrder.statusTimeline)
            ? updatedOrder.statusTimeline
            : selectedOrder.statusTimeline,
          cancellation: updatedOrder.cancellation || selectedOrder.cancellation,
          cancellationRequest:
            updatedOrder.cancellationRequest || selectedOrder.cancellationRequest,
        });

        setShowStatusModal(false);
        setStatusNotes("");
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
    if (!selectedOrder || isStatusUpdating || isPaymentStatusUpdating || isCancellingOrder) return;
    if (!canAdminCancelOrder(selectedOrder)) {
      toast.error("Order cancellation is only available while the order is pending");
      return;
    }

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
        const updatedOrder = response.data?.order || {};
        const updatedStatus =
          updatedOrder.orderStatus || updatedOrder.status || "cancelled";
        const updatedPaymentStatus =
          updatedOrder.paymentStatus || selectedOrder.paymentStatus || "failed";

        toast.success("Order cancelled successfully");
        updateOrderInState(selectedOrder._id, {
          orderStatus: updatedStatus,
          paymentStatus: updatedPaymentStatus,
          courier: updatedOrder.courier || selectedOrder.courier || null,
          adminNotes: updatedOrder.adminNotes || selectedOrder.adminNotes || "",
          statusTimeline: Array.isArray(updatedOrder.statusTimeline)
            ? updatedOrder.statusTimeline
            : selectedOrder.statusTimeline,
          cancellation: updatedOrder.cancellation || selectedOrder.cancellation,
          cancellationRequest:
            updatedOrder.cancellationRequest || selectedOrder.cancellationRequest,
        });

        setShowCancelConfirm(false);
        setShowStatusModal(false);
        setStatusNotes("");
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error("Failed to cancel order");
    } finally {
      setIsCancellingOrder(false);
    }
  };

  const handleUpdatePaymentStatus = async (nextPaymentStatus) => {
    if (!selectedOrder?._id || !canManuallyManagePayment(selectedOrder)) return;

    try {
      setIsPaymentStatusUpdating(true);
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${baseUrl}/orders/admin/${selectedOrder._id}/payment-status`,
        {
          paymentStatus: nextPaymentStatus,
          notes: statusNotes || `Payment status updated to ${nextPaymentStatus}`,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          meta: { skipGlobalButtonLoading: true },
        },
      );

      if (!response.data?.success) {
        toast.error(response.data?.message || "Failed to update payment status");
        return;
      }

      const updatedOrder = response.data?.order || {};
      const updatedPaymentStatus =
        updatedOrder.paymentStatus || nextPaymentStatus || selectedOrder.paymentStatus;

      toast.success(`Payment status updated to ${updatedPaymentStatus}`);

      updateOrderInState(selectedOrder._id, {
        orderStatus: updatedOrder.orderStatus || selectedOrder.orderStatus,
        paymentStatus: updatedPaymentStatus,
        courier: updatedOrder.courier || selectedOrder.courier || null,
        adminNotes: updatedOrder.adminNotes || selectedOrder.adminNotes || "",
        statusTimeline: Array.isArray(updatedOrder.statusTimeline)
          ? updatedOrder.statusTimeline
          : selectedOrder.statusTimeline,
        cancellation: updatedOrder.cancellation || selectedOrder.cancellation,
        cancellationRequest:
          updatedOrder.cancellationRequest || selectedOrder.cancellationRequest,
      });
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error(
        error.response?.data?.message || "Failed to update payment status",
      );
    } finally {
      setIsPaymentStatusUpdating(false);
    }
  };

  const handleReviewCancellationRequest = async (action) => {
    if (!selectedOrder?._id) return;

    try {
      setCancellationReviewAction(action);
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${baseUrl}/orders/admin/${selectedOrder._id}/cancellation`,
        {
          action,
          notes: statusNotes || "",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          meta: { skipGlobalButtonLoading: true },
        },
      );

      if (!response.data?.success) {
        toast.error(response.data?.message || "Failed to review cancellation request");
        return;
      }

      toast.success(
        response.data?.message ||
          (action === "approve"
            ? "Cancellation request approved"
            : "Cancellation request rejected"),
      );
      setShowStatusModal(false);
      setStatusNotes("");
      await fetchOrders(pagination.currentPage || 1);
    } catch (error) {
      console.error("Review cancellation request error:", error);
      toast.error(
        error.response?.data?.message || "Failed to review cancellation request",
      );
    } finally {
      setCancellationReviewAction("");
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

  const updateOrderInState = (orderId, patch = {}) => {
    setOrders((prev) =>
      prev.map((order) =>
        order._id === orderId
          ? {
              ...order,
              ...patch,
              customer: getOrderCustomerProfile({
                ...order,
                ...patch,
              }),
            }
          : order,
      ),
    );

    setSelectedOrder((prev) =>
      prev && prev._id === orderId
        ? {
            ...prev,
            ...patch,
            customer: getOrderCustomerProfile({
              ...prev,
              ...patch,
            }),
          }
        : prev,
    );
  };

  const handleGenerateCourierConsignment = async () => {
    if (!selectedOrder?._id) return;

    try {
      setCourierAction("generate");
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${baseUrl}/orders/admin/${selectedOrder._id}/courier/consignment`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          meta: { skipGlobalButtonLoading: true },
        },
      );

      if (!response.data?.success) {
        toast.error(response.data?.message || "Failed to generate consignment");
        return;
      }

      const updatedOrder = response.data?.order || {};
      updateOrderInState(selectedOrder._id, {
        courier: updatedOrder.courier || selectedOrder.courier || null,
        statusTimeline: Array.isArray(updatedOrder.statusTimeline)
          ? updatedOrder.statusTimeline
          : selectedOrder.statusTimeline,
      });

      toast.success(response.data?.message || "Courier consignment generated");
      if (response.data?.warning) {
        toast(response.data.warning, { icon: "i" });
      }
    } catch (error) {
      console.error("Generate courier consignment error:", error);
      toast.error(error.response?.data?.message || "Failed to generate consignment");
    } finally {
      setCourierAction("");
    }
  };

  const handleSyncCourierTracking = async () => {
    if (!selectedOrder?._id) return;

    try {
      setCourierAction("sync");
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${baseUrl}/orders/admin/${selectedOrder._id}/courier/sync`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
          meta: { skipGlobalButtonLoading: true },
        },
      );

      if (!response.data?.success) {
        toast.error(response.data?.message || "Failed to sync courier tracking");
        return;
      }

      const updatedOrder = response.data?.order || {};
      updateOrderInState(selectedOrder._id, {
        orderStatus: updatedOrder.orderStatus || selectedOrder.orderStatus,
        paymentStatus: updatedOrder.paymentStatus || selectedOrder.paymentStatus,
        courier: updatedOrder.courier || selectedOrder.courier || null,
        statusTimeline: Array.isArray(updatedOrder.statusTimeline)
          ? updatedOrder.statusTimeline
          : selectedOrder.statusTimeline,
      });

      toast.success(response.data?.message || "Courier tracking synced");
    } catch (error) {
      console.error("Sync courier tracking error:", error);
      toast.error(error.response?.data?.message || "Failed to sync courier tracking");
    } finally {
      setCourierAction("");
    }
  };

  const handlePrintCourierLabel = async () => {
    if (!selectedOrder?._id) return;

    try {
      setCourierAction("print");
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${baseUrl}/orders/admin/${selectedOrder._id}/courier/label`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (!response.data?.success || !response.data?.label) {
        toast.error(response.data?.message || "Failed to load courier label");
        return;
      }

      const label = response.data.label;

      const printContent = `
      <html>
        <head>
          <title>Courier Label - ${label.orderNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 18px; color: #111; }
            .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
            .label { font-size: 12px; color: #666; }
            .value { font-size: 14px; font-weight: 600; }
            .title { font-size: 18px; margin: 0 0 12px 0; }
            .muted { font-size: 12px; color: #666; }
            .items { margin-top: 10px; border-top: 1px solid #eee; padding-top: 10px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <div class="card">
            <h2 class="title">Courier Label</h2>
            <div class="row">
              <div>
                <div class="label">Order Number</div>
                <div class="value">${label.orderNumber || "-"}</div>
              </div>
              <div>
                <div class="label">Courier</div>
                <div class="value">${label.courierProvider || "-"}</div>
              </div>
            </div>
            <div class="row">
              <div>
                <div class="label">Consignment ID</div>
                <div class="value">${label.consignmentId || "-"}</div>
              </div>
              <div>
                <div class="label">Tracking No</div>
                <div class="value">${label.trackingNumber || "-"}</div>
              </div>
            </div>
            <div class="row">
              <div>
                <div class="label">Customer</div>
                <div class="value">${label.customer?.name || "-"}</div>
              </div>
              <div>
                <div class="label">Phone</div>
                <div class="value">${label.customer?.phone || "-"}</div>
              </div>
            </div>
            <div class="row">
              <div>
                <div class="label">Address</div>
                <div class="value">
                  ${label.customer?.address || "-"}, ${label.customer?.city || "-"}, ${label.customer?.district || "-"}
                </div>
              </div>
            </div>
            <div class="row">
              <div>
                <div class="label">Amount to Collect</div>
                <div class="value">${Number(label.amountToCollect || 0).toFixed(2)} Tk</div>
              </div>
            </div>
            <div class="items">
              <div class="label">Items</div>
              ${(Array.isArray(label.items) ? label.items : [])
                .map(
                  (item) =>
                    `<div class="muted">${item.title || "Product"} x${Number(item.quantity || 0)}</div>`,
                )
                .join("")}
            </div>
          </div>
        </body>
      </html>
      `;

      const queued = printHtmlDocument(
        `Courier Label ${label.orderNumber || selectedOrder.orderNumber || ""}`,
        printContent,
      );
      if (queued) {
        toast.success("Courier label prepared for printing");
      }
    } catch (error) {
      console.error("Print courier label error:", error);
      toast.error(error.response?.data?.message || "Failed to print courier label");
    } finally {
      setCourierAction("");
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800",
      confirmed: "bg-cyan-100 text-cyan-800",
      processing: "bg-blue-100 text-blue-800",
      shipped: "bg-purple-100 text-purple-800",
      delivered: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
      returned: "bg-orange-100 text-orange-800",
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
    const method = formatPaymentMethodLabel(order?.paymentMethod || "");
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

  const printHtmlDocument = (title, htmlMarkup) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.setAttribute("title", title || "print-preview");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      document.body.appendChild(iframe);

      const frameWindow = iframe.contentWindow;
      const frameDocument = frameWindow?.document;

      if (!frameWindow || !frameDocument) {
        iframe.remove();
        toast.error("Unable to prepare the print document");
        return false;
      }

      let hasPrinted = false;
      const cleanup = () => {
        window.setTimeout(() => {
          iframe.remove();
        }, 800);
      };
      const runPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        window.setTimeout(() => {
          try {
            frameWindow.focus();
            frameWindow.print();
          } catch (error) {
            console.error("Print error:", error);
            toast.error("Print dialog could not be opened");
          } finally {
            cleanup();
          }
        }, 250);
      };

      iframe.onload = runPrint;
      frameDocument.open();
      frameDocument.write(`<!DOCTYPE html>${htmlMarkup}`);
      frameDocument.close();

      window.setTimeout(runPrint, 900);
      return true;
    } catch (error) {
      console.error("Prepare print document error:", error);
      toast.error("Failed to prepare the print document");
      return false;
    }
  };

  // Print order
  const printOrder = (order) => {
    const customer = getOrderCustomerProfile(order);
    const showPaymentStatus = !isCashOnDeliveryOrder(order);
    const paymentMethodLabel = formatPaymentMethodLabel(order?.paymentMethod);
    const orderTypeLabel = getOrderTypeLabel(order);
    const orderItems = Array.isArray(order?.items) ? order.items : [];
    const escapeHtml = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

    const printContent = `
      <html>
        <head>
          <title>Invoice ${escapeHtml(order.orderNumber)}</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              background: #f5f5f5;
              color: #111827;
              font-family: "Segoe UI", Arial, sans-serif;
            }
            .sheet {
              max-width: 920px;
              margin: 0 auto;
              padding: 28px;
            }
            .invoice {
              background: #ffffff;
              border: 1px solid #e5e7eb;
              border-radius: 28px;
              overflow: hidden;
              box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
            }
            .hero {
              padding: 28px 32px;
              background: linear-gradient(135deg, #0f172a 0%, #111827 55%, #1f2937 100%);
              color: #ffffff;
              display: flex;
              justify-content: space-between;
              gap: 24px;
              align-items: flex-start;
            }
            .hero h1 { margin: 10px 0 0; font-size: 30px; line-height: 1.1; }
            .hero p { margin: 6px 0 0; color: rgba(255,255,255,0.72); }
            .kicker {
              font-size: 11px;
              letter-spacing: 0.28em;
              text-transform: uppercase;
              color: rgba(255,255,255,0.68);
            }
            .badge {
              display: inline-flex;
              align-items: center;
              border-radius: 999px;
              padding: 10px 16px;
              background: rgba(255,255,255,0.1);
              border: 1px solid rgba(255,255,255,0.14);
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.14em;
            }
            .body {
              padding: 28px 32px 32px;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(2, minmax(0, 1fr));
              gap: 18px;
              margin-bottom: 22px;
            }
            .card {
              border: 1px solid #e5e7eb;
              border-radius: 20px;
              padding: 18px;
              background: #fafafa;
            }
            .card h3 {
              margin: 0 0 14px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.18em;
              color: #6b7280;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .meta-row strong { color: #111827; }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 22px;
              border: 1px solid #e5e7eb;
              border-radius: 20px;
              overflow: hidden;
            }
            thead { background: #f8fafc; }
            th, td {
              padding: 14px 16px;
              text-align: left;
              border-bottom: 1px solid #e5e7eb;
              font-size: 14px;
            }
            th {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 0.14em;
              color: #6b7280;
            }
            tbody tr:last-child td { border-bottom: none; }
            .product-name { font-weight: 700; color: #111827; }
            .product-meta { display: block; margin-top: 4px; font-size: 12px; color: #6b7280; }
            .totals {
              margin-top: 24px;
              margin-left: auto;
              width: 320px;
              border: 1px solid #e5e7eb;
              border-radius: 22px;
              padding: 18px;
              background: #fafafa;
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              gap: 12px;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .total-row:last-child { margin-bottom: 0; }
            .grand-total {
              border-top: 1px solid #d1d5db;
              padding-top: 14px;
              margin-top: 14px;
              font-size: 18px;
              font-weight: 800;
            }
            .footer {
              margin-top: 26px;
              padding-top: 18px;
              border-top: 1px dashed #d1d5db;
              color: #6b7280;
              font-size: 12px;
              line-height: 1.7;
            }
            @media print {
              body {
                background: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .sheet { padding: 0; }
              .invoice { border: none; box-shadow: none; border-radius: 0; }
              .hero {
                background: #ffffff !important;
                color: #111827 !important;
                border-bottom: 1px solid #e5e7eb;
              }
              .hero h1,
              .hero p,
              .kicker,
              .badge {
                color: #111827 !important;
                opacity: 1 !important;
              }
              .badge {
                background: #f8fafc !important;
                border-color: #d1d5db !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="invoice">
              <div class="hero">
                <div>
                  <div class="kicker">E-Commerce Office</div>
                  <h1>Invoice #${escapeHtml(order.orderNumber)}</h1>
                  <p>Prepared for order management and fulfillment review.</p>
                </div>
                <div class="badge">${escapeHtml(order.orderStatus || "pending")}</div>
              </div>

              <div class="body">
                <div class="grid">
                  <div class="card">
                    <h3>Customer</h3>
                    <div class="meta-row"><span>Name</span><strong>${escapeHtml(customer.name)}</strong></div>
                    <div class="meta-row"><span>Email</span><strong>${escapeHtml(customer.email || "N/A")}</strong></div>
                    <div class="meta-row"><span>Phone</span><strong>${escapeHtml(customer.phone || "N/A")}</strong></div>
                    <div class="meta-row"><span>Account</span><strong>${escapeHtml(customer.accountType || "Guest")}</strong></div>
                  </div>
                  <div class="card">
                    <h3>Order & Payment</h3>
                    <div class="meta-row"><span>Date</span><strong>${escapeHtml(formatDate(order.createdAt))}</strong></div>
                    <div class="meta-row"><span>Order Type</span><strong>${escapeHtml(orderTypeLabel)}</strong></div>
                    <div class="meta-row"><span>Payment Method</span><strong>${escapeHtml(paymentMethodLabel)}</strong></div>
                    ${
                      showPaymentStatus
                        ? `<div class="meta-row"><span>Payment Status</span><strong>${escapeHtml(
                            formatPaymentStatusLabel(order.paymentStatus),
                          )}</strong></div>`
                        : `<div class="meta-row"><span>Payment Note</span><strong>Pay on delivery</strong></div>`
                    }
                    ${
                      order?.transactionId && order.transactionId !== "N/A"
                        ? `<div class="meta-row"><span>Transaction ID</span><strong>${escapeHtml(
                            order.transactionId,
                          )}</strong></div>`
                        : ""
                    }
                  </div>
                </div>

                <div class="card">
                  <h3>Shipping Address</h3>
                  <div class="meta-row"><span>Recipient</span><strong>${escapeHtml(customer.name)}</strong></div>
                  <div class="meta-row"><span>Address</span><strong>${escapeHtml(
                    order?.shippingAddress?.address || "N/A",
                  )}</strong></div>
                  <div class="meta-row"><span>City</span><strong>${escapeHtml(
                    `${order?.shippingAddress?.city || ""}${order?.shippingAddress?.district ? `, ${order.shippingAddress.district}` : ""}` || "N/A",
                  )}</strong></div>
                  <div class="meta-row"><span>Postal</span><strong>${escapeHtml(
                    `${order?.shippingAddress?.postalCode || ""}${order?.shippingAddress?.country ? `, ${order.shippingAddress.country}` : ""}` || "N/A",
                  )}</strong></div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${orderItems
                      .map((item) => {
                        const productName =
                          typeof item?.product === "string"
                            ? item.product
                            : item?.product?.title || "Product";
                        const displayColor = getOrderItemColorSwatch(item);
                        const meta = [
                          ...getOrderItemVariantLines(item),
                          getOrderItemMetaLine(item),
                        ]
                          .filter(Boolean)
                          .join(" | ");
                        const colorMarkup = displayColor
                          ? `<span class="product-meta" style="margin-top: 8px; display: inline-flex; align-items: center; gap: 8px;"><span style="display: inline-block; width: 12px; height: 12px; border-radius: 999px; border: 1px solid #d1d5db; background-color: ${escapeHtml(displayColor)}; box-shadow: inset 0 0 0 1px rgba(15,23,42,0.12); -webkit-print-color-adjust: exact; print-color-adjust: exact;"></span></span>`
                          : "";
                        const unitPrice = getOrderItemUnitPrice(item);
                        const lineTotal = getOrderItemLineTotal(item);

                        return `
                          <tr>
                            <td>
                              <span class="product-name">${escapeHtml(productName)}</span>
                              ${colorMarkup}
                              ${
                                meta
                                  ? `<span class="product-meta">${escapeHtml(meta)}</span>`
                                  : ""
                              }
                            </td>
                            <td>${escapeHtml(Number(item?.quantity || 0))}</td>
                            <td>Tk ${unitPrice.toFixed(2)}</td>
                            <td>Tk ${lineTotal.toFixed(2)}</td>
                          </tr>
                        `;
                      })
                      .join("")}
                  </tbody>
                </table>

                <div class="totals">
                  <div class="total-row"><span>Subtotal</span><strong>Tk ${Number(order?.subtotal || 0).toFixed(2)}</strong></div>
                  <div class="total-row"><span>Shipping</span><strong>Tk ${Number(order?.shippingFee || 0).toFixed(2)}</strong></div>
                  ${
                    Number(order?.discount || 0) > 0
                      ? `<div class="total-row"><span>Discount</span><strong>-Tk ${Number(
                          order.discount || 0,
                        ).toFixed(2)}</strong></div>`
                      : ""
                  }
                  <div class="total-row grand-total"><span>Total</span><strong>Tk ${Number(
                    order?.total || 0,
                  ).toFixed(2)}</strong></div>
                </div>

                <div class="footer">
                  This invoice is generated from the admin order management panel. Keep the order
                  number for tracking, fulfillment, and support follow-up.
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const queued = printHtmlDocument(
      `Invoice ${order?.orderNumber || "order"}`,
      printContent,
    );
    if (queued) {
      toast.success("Invoice prepared for printing");
    }
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

  const selectedCustomer = getOrderCustomerProfile(selectedOrder || {});

  return (
    <div className="p-2">
      {/* Filters & Search - Mobile Optimized */}
      <div className="bg-white rounded-xl p-3 sm:p-4 md:p-6 mb-4 sm:mb-6 shadow-sm border border-gray-200">
        <div className="flex flex-col gap-3 sm:gap-4">
          {/* Search */}
          <div className="relative w-full">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm sm:text-base" />
            <input
              type="text"
              placeholder="Search order, phone, email, or transaction..."
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
                      Type
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
                  {orders.map((order) => {
                    const customer = getOrderCustomerProfile(order);
                    const showPaymentStatus = !isCashOnDeliveryOrder(order);
                    const orderTypeLabel = getOrderTypeLabel(order);
                    const manualOrder = isManualOrder(order);

                    return (
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
                            {customer.name}
                          </div>
                          <div className="text-xs sm:text-sm text-gray-500">
                            {customer.email || "No email"}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                            manualOrder
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {orderTypeLabel}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="font-semibold text-gray-900 text-sm sm:text-base">
                          Tk {order.total.toFixed(2)}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="space-y-1">
                          <span
                            className={`inline-block px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              order.orderStatus,
                            )}`}
                          >
                            {order.orderStatus}
                          </span>
                          {String(order?.cancellation?.requestStatus || "").toLowerCase() ===
                          "pending" ? (
                            <div className="inline-block rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                              Cancellation request
                            </div>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="text-xs sm:text-sm">
                          <div className="font-medium">
                            {getPaymentMethodDisplay(order)}
                          </div>
                          {showPaymentStatus ? (
                            <div
                              className={`text-xs ${getPaymentStatusTextClass(order.paymentStatus)}`}
                            >
                              {formatPaymentStatusLabel(order.paymentStatus)}
                            </div>
                          ) : null}
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
                          {!manualOrder ? (
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
                          ) : null}
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
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden divide-y divide-gray-200">
              {orders.map((order) => {
                const customer = getOrderCustomerProfile(order);
                const showPaymentStatus = !isCashOnDeliveryOrder(order);
                const orderTypeLabel = getOrderTypeLabel(order);
                const manualOrder = isManualOrder(order);

                return (
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
                        Tk {order.total.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          order.orderStatus,
                        )}`}
                      >
                        {order.orderStatus}
                      </span>
                      {String(order?.cancellation?.requestStatus || "").toLowerCase() ===
                      "pending" ? (
                        <div className="mt-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          Cancellation request
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="font-medium text-xs text-gray-900">
                      {customer.name}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {customer.email || "No email"}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-xs">
                      <div className="mb-1">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                            manualOrder
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {orderTypeLabel}
                        </span>
                      </div>
                      <div className="font-medium truncate max-w-[120px]">
                        {getPaymentMethodDisplay(order)}
                      </div>
                      {showPaymentStatus ? (
                        <div
                          className={getPaymentStatusTextClass(order.paymentStatus)}
                        >
                          {formatPaymentStatusLabel(order.paymentStatus)}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => viewOrderDetails(order)}
                        className="p-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                        title="View Details"
                      >
                        <FiEye className="w-3 h-3" />
                      </button>
                      {!manualOrder ? (
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
                      ) : null}
                    </div>
                  </div>
                </div>
                );
              })}
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
        <div className="fixed inset-0 app-layer-modal flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto">
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
                        {selectedCustomer.name}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Email:</span>{" "}
                      <span className="font-medium">
                        {selectedCustomer.email || "N/A"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Phone:</span>{" "}
                      <span className="font-medium">
                        {selectedCustomer.phone || "N/A"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Account:</span>{" "}
                      <span className="font-medium">
                        {selectedCustomer.accountType || "Registered"}
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
                        Tk {selectedOrder.total.toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {Array.isArray(selectedOrder.statusTimeline) &&
              selectedOrder.statusTimeline.length > 0 ? (
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                  <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">
                    Status Timeline
                  </h3>
                  <div className="space-y-2">
                    {selectedOrder.statusTimeline
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(a?.changedAt || 0).getTime() -
                          new Date(b?.changedAt || 0).getTime(),
                      )
                      .map((entry, idx) => (
                        <div
                          key={`${entry?.status || "status"}-${idx}`}
                          className="border border-gray-200 bg-white rounded-lg px-3 py-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                entry?.status,
                              )}`}
                            >
                              {String(entry?.status || "").toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-500">
                              {entry?.changedAt
                                ? new Date(entry.changedAt).toLocaleString()
                                : "N/A"}
                            </span>
                          </div>
                          {entry?.note ? (
                            <p className="text-xs sm:text-sm text-gray-700 mt-1">{entry.note}</p>
                          ) : null}
                        </div>
                      ))}
                  </div>
                </div>
              ) : null}

              {selectedOrder.cancellation ? (
                <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                  <h3 className="font-semibold text-black mb-2 sm:mb-3 text-sm sm:text-base">
                    Cancellation Details
                  </h3>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <p>
                      <span className="text-gray-600">Action:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.cancellation.actionType || "none"}
                      </span>
                    </p>
                    <p>
                      <span className="text-gray-600">Request status:</span>{" "}
                      <span className="font-medium">
                        {selectedOrder.cancellation.requestStatus || "none"}
                      </span>
                    </p>
                    {selectedOrder.cancellation.requestReason ? (
                      <p>
                        <span className="text-gray-600">Reason:</span>{" "}
                        <span className="font-medium">
                          {selectedOrder.cancellation.requestReason}
                        </span>
                      </p>
                    ) : null}
                    {selectedOrder.cancellation.resolutionNote ? (
                      <p>
                        <span className="text-gray-600">Admin note:</span>{" "}
                        <span className="font-medium">
                          {selectedOrder.cancellation.resolutionNote}
                        </span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}

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

              <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h3 className="font-semibold text-black text-sm sm:text-base">
                    Courier Integration
                  </h3>
                  <span className="text-xs text-gray-500">
                    {selectedOrder.courier?.status
                      ? selectedOrder.courier.status.toUpperCase()
                      : "NOT ASSIGNED"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm mb-3">
                  <p>
                    <span className="text-gray-600">Provider:</span>{" "}
                    <span className="font-medium">
                      {selectedOrder.courier?.providerName || "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600">Consignment ID:</span>{" "}
                    <span className="font-medium">
                      {selectedOrder.courier?.consignmentId || "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600">Tracking Number:</span>{" "}
                    <span className="font-medium">
                      {selectedOrder.courier?.trackingNumber || "N/A"}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-600">Last Sync:</span>{" "}
                    <span className="font-medium">
                      {selectedOrder.courier?.lastSyncedAt
                        ? new Date(selectedOrder.courier.lastSyncedAt).toLocaleString()
                        : "N/A"}
                    </span>
                  </p>
                </div>

                {selectedOrder.courier?.trackingUrl ? (
                  <a
                    href={selectedOrder.courier.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex text-xs sm:text-sm text-blue-700 underline mb-3"
                  >
                    Open Tracking URL
                  </a>
                ) : null}

                {selectedOrder.courier?.labelUrl ? (
                  <a
                    href={selectedOrder.courier.labelUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex ml-3 text-xs sm:text-sm text-blue-700 underline mb-3"
                  >
                    Open Courier Label URL
                  </a>
                ) : null}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleGenerateCourierConsignment}
                    disabled={courierAction !== ""}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-black text-white rounded-lg text-xs sm:text-sm disabled:opacity-60"
                  >
                    <FiTruck className="w-4 h-4" />
                    {courierAction === "generate" ? "Generating..." : "Generate Consignment"}
                  </button>
                  <button
                    onClick={handleSyncCourierTracking}
                    disabled={
                      courierAction !== "" ||
                      (!selectedOrder.courier?.consignmentId &&
                        !selectedOrder.courier?.trackingNumber)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-60"
                  >
                    {courierAction === "sync" ? "Syncing..." : "Sync Tracking"}
                  </button>
                  <button
                    onClick={handlePrintCourierLabel}
                    disabled={courierAction !== ""}
                    className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-60"
                  >
                    <FiPrinter className="w-4 h-4" />
                    {courierAction === "print" ? "Preparing..." : "Print Label"}
                  </button>
                </div>
              </div>

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
                        const displayColor = getOrderItemColorSwatch(item);
                        const variantLines = getOrderItemVariantLines(item);
                        return (
                        <tr key={index} className="border-b">
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            <div className="font-medium">{item.product}</div>
                            {variantLines.map((line) => (
                              <div
                                key={`${item.product}-${line}`}
                                className="text-gray-600 text-xs"
                              >
                                {line}
                              </div>
                            ))}
                            {displayColor && (
                              <div className="text-gray-600 text-xs inline-flex items-center rounded-full bg-gray-100 p-1">
                                <span
                                  className="inline-block h-3 w-3 shrink-0 rounded-full border border-gray-300"
                                  style={{
                                    backgroundColor: displayColor,
                                    boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.12)",
                                  }}
                                />
                              </div>
                            )}
                            {item.sku ? (
                              <div className="text-gray-600 text-xs">SKU: {item.sku}</div>
                            ) : null}
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
                            Tk {getOrderItemUnitPrice(item).toFixed(2)}
                          </td>
                          <td className="px-2 sm:px-4 py-2 sm:py-3">
                            Tk {getOrderItemLineTotal(item).toFixed(2)}
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
                      <span>Tk {selectedOrder.subtotal.toFixed(2)}</span>
                    </div>
                    {selectedOrder.shippingFee > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping:</span>
                        <span>Tk {selectedOrder.shippingFee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Discount:</span>
                        <span>-Tk {selectedOrder.discount.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.couponCode ? (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Coupon:</span>
                        <span>{selectedOrder.couponCode}</span>
                      </div>
                    ) : null}
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-semibold text-sm sm:text-base">
                        <span>Total:</span>
                        <span>Tk {selectedOrder.total.toFixed(2)}</span>
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
        <div className="fixed inset-0 app-layer-modal flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto">
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
                  : selectedOrder.orderStatus === "returned"
                    ? "Order Returned"
                    : `Update Order Status - Step ${getCurrentStep(selectedOrder.orderStatus)}/${ORDER_PROGRESS_STATUSES.length}`}
              </h2>

              <p className="text-sm sm:text-base text-gray-600 mb-4">
                Order: <strong>{selectedOrder.orderNumber}</strong>
              </p>

              {/* Status Steps Visualization */}
              <div className="mb-4 sm:mb-6">
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  {ORDER_PROGRESS_STATUSES.map((status, index) => {
                    const isCurrent = selectedOrder.orderStatus === status;
                    const isCompleted = getStatusIndex(selectedOrder.orderStatus) > index;
                    const isCancelled = selectedOrder.orderStatus === "cancelled";
                    const isReturned = selectedOrder.orderStatus === "returned";

                    return (
                      <div key={status} className="relative z-10 text-center flex-1">
                        <div
                          className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2 ${
                            isCancelled
                              ? "bg-red-100 border border-red-300"
                              : isReturned
                                ? "bg-orange-100 border border-orange-300"
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
                                : isReturned
                                  ? "text-orange-700"
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
                              : isReturned
                                ? "text-orange-600"
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
                  })}
                </div>

                {/* Status Line */}
                <div className="relative">
                  <div className="absolute top-3 left-3 sm:left-4 right-3 sm:right-4 h-0.5 bg-gray-300 -z-10">
                    <div
                      className={`h-full transition-all duration-300 ${
                        selectedOrder.orderStatus === "cancelled"
                          ? "bg-red-300"
                          : selectedOrder.orderStatus === "returned"
                            ? "bg-orange-400"
                          : "bg-green-500"
                      }`}
                      style={{
                        width: (() => {
                          if (selectedOrder.orderStatus === "cancelled") return "0%";
                          if (selectedOrder.orderStatus === "returned") return "100%";
                          const currentIndex = getStatusIndex(selectedOrder.orderStatus);
                          const maxIndex = Math.max(1, ORDER_PROGRESS_STATUSES.length - 1);
                          const percent = currentIndex <= 0 ? 0 : (currentIndex / maxIndex) * 100;
                          return `${percent}%`;
                        })(),
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
                    : selectedOrder.orderStatus === "returned"
                      ? "bg-orange-50 border border-orange-200"
                    : "bg-blue-50 border border-blue-200"
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center ${
                      selectedOrder.orderStatus === "cancelled"
                        ? "bg-red-100"
                        : selectedOrder.orderStatus === "returned"
                          ? "bg-orange-100"
                        : "bg-blue-100"
                    }`}
                  >
                    {selectedOrder.orderStatus === "cancelled" ? (
                      <FaTimesCircle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
                    ) : selectedOrder.orderStatus === "pending" ? (
                      <FaClock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : selectedOrder.orderStatus === "confirmed" ? (
                      <FaCheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : selectedOrder.orderStatus === "processing" ? (
                      <FaShippingFast className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : selectedOrder.orderStatus === "shipped" ? (
                      <FaBox className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                    ) : selectedOrder.orderStatus === "returned" ? (
                      <FaTimesCircle className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
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
              {canProceedToNextStatus(selectedOrder.orderStatus) && (
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

              {isCashOnDeliveryOrder(selectedOrder) ? (
                <div className="mb-4 sm:mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
                  <h4 className="text-sm sm:text-base font-medium text-amber-900">
                    COD payment flow
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm text-amber-800">
                    Cash on Delivery is collected directly from the customer at delivery, so
                    there is no separate payment-status control here.
                  </p>
                </div>
              ) : canManuallyManagePayment(selectedOrder) ? (
                <div className="mb-4 sm:mb-6 rounded-lg border border-sky-200 bg-sky-50 p-3 sm:p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm sm:text-base font-medium text-sky-900">
                        Payment status control
                      </h4>
                      <p className="mt-1 text-xs sm:text-sm text-sky-800">
                        {isGatewayPaymentOrder(selectedOrder)
                          ? "Use this after Stripe, SSLCommerz, or other gateway payment is confirmed."
                          : "Use this after you verify the manual wallet or bank transaction."}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${
                        selectedOrder.paymentStatus === "completed"
                          ? "bg-emerald-100 text-emerald-700"
                          : selectedOrder.paymentStatus === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {selectedOrder.paymentStatus}
                    </span>
                  </div>

                  <div className="mt-3 space-y-1 text-xs sm:text-sm text-slate-700">
                    {getTransactionReference(selectedOrder) ? (
                      <p>
                        Transaction ID:{" "}
                        <span className="font-semibold">
                          {getTransactionReference(selectedOrder)}
                        </span>
                      </p>
                    ) : isGatewayPaymentOrder(selectedOrder) ? (
                      <p className="text-sky-700">
                        No manual transaction ID was stored. Match this payment from the
                        gateway confirmation before marking it as paid.
                      </p>
                    ) : (
                      <p className="text-amber-700">
                        Add and verify the transaction reference before marking this
                        manual payment as paid.
                      </p>
                    )}
                    {selectedOrder?.paymentDetails?.gatewayPaymentId ? (
                      <p>
                        Gateway Ref:{" "}
                        <span className="font-semibold">
                          {selectedOrder.paymentDetails.gatewayPaymentId}
                        </span>
                      </p>
                    ) : null}
                    {selectedOrder?.paymentDetails?.sentFrom ? (
                      <p>
                        Sent from:{" "}
                        <span className="font-semibold">
                          {selectedOrder.paymentDetails.sentFrom}
                        </span>
                      </p>
                    ) : null}
                    {selectedOrder?.paymentDetails?.sentTo ? (
                      <p>
                        Sent to:{" "}
                        <span className="font-semibold">
                          {selectedOrder.paymentDetails.sentTo}
                        </span>
                      </p>
                    ) : null}
                    {selectedOrder?.paymentDetails?.accountNo ? (
                      <p>
                        Receiving account:{" "}
                        <span className="font-semibold">
                          {selectedOrder.paymentDetails.accountNo}
                        </span>
                      </p>
                    ) : null}
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => handleUpdatePaymentStatus("completed")}
                      disabled={
                        isPaymentStatusUpdating ||
                        selectedOrder.paymentStatus === "completed" ||
                        !canMarkPaymentCompleted(selectedOrder)
                      }
                      className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isPaymentStatusUpdating &&
                      selectedOrder.paymentStatus !== "completed"
                        ? "Updating..."
                        : !canMarkPaymentCompleted(selectedOrder)
                          ? "Transaction ID Needed"
                          : "Mark Paid"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdatePaymentStatus("pending")}
                      disabled={
                        isPaymentStatusUpdating ||
                        selectedOrder.paymentStatus === "pending"
                      }
                      className="rounded-lg border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Set Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdatePaymentStatus("failed")}
                      disabled={
                        isPaymentStatusUpdating ||
                        selectedOrder.paymentStatus === "failed"
                      }
                      className="rounded-lg border border-red-300 bg-white px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Mark Failed
                    </button>
                  </div>
                </div>
              ) : null}

              {String(selectedOrder?.cancellation?.requestStatus || "").toLowerCase() ===
              "pending" ? (
                <div className="mb-4 sm:mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4">
                  <h4 className="text-sm sm:text-base font-medium text-amber-900">
                    Pending cancellation request
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm text-amber-800">
                    {selectedOrder.cancellation?.requestReason
                      ? `Reason: ${selectedOrder.cancellation.requestReason}`
                      : "Customer requested to cancel this order."}
                  </p>
                  <textarea
                    value={statusNotes}
                    onChange={(event) => setStatusNotes(event.target.value)}
                    placeholder="Optional admin note for approval or rejection"
                    rows="3"
                    className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>
              ) : null}

              {/* Action Buttons */}
              <div className="space-y-2 sm:space-y-3">
                {String(selectedOrder?.cancellation?.requestStatus || "").toLowerCase() ===
                "pending" ? (
                  <>
                    <button
                      onClick={() => handleReviewCancellationRequest("approve")}
                      disabled={
                        Boolean(cancellationReviewAction) ||
                        isCancellingOrder ||
                        isPaymentStatusUpdating
                      }
                      className="w-full py-2.5 sm:py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {cancellationReviewAction === "approve"
                        ? "Approving cancellation..."
                        : "Approve Cancellation"}
                    </button>
                    <button
                      onClick={() => handleReviewCancellationRequest("reject")}
                      disabled={
                        Boolean(cancellationReviewAction) ||
                        isCancellingOrder ||
                        isPaymentStatusUpdating
                      }
                      className="w-full py-2.5 sm:py-3 border border-amber-300 text-amber-800 font-medium rounded-lg hover:bg-amber-50 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {cancellationReviewAction === "reject"
                        ? "Rejecting request..."
                        : "Reject Cancellation Request"}
                    </button>
                  </>
                ) : null}

                {canProceedToNextStatus(selectedOrder.orderStatus) ? (
                  <>
                    <button
                      onClick={handleProceed}
                      disabled={
                        isStatusUpdating ||
                        isPaymentStatusUpdating ||
                        isCancellingOrder ||
                        Boolean(cancellationReviewAction)
                      }
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

                    {canAdminCancelOrder(selectedOrder) ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={
                          isStatusUpdating ||
                          isPaymentStatusUpdating ||
                          isCancellingOrder ||
                          Boolean(cancellationReviewAction)
                        }
                        className="w-full py-2.5 sm:py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        <FiXCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                        Cancel Order
                      </button>
                    ) : null}
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setStatusNotes("");
                    }}
                    disabled={
                      isStatusUpdating ||
                      isPaymentStatusUpdating ||
                      isCancellingOrder ||
                      Boolean(cancellationReviewAction)
                    }
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
                  disabled={
                    isStatusUpdating ||
                    isPaymentStatusUpdating ||
                    isCancellingOrder ||
                    Boolean(cancellationReviewAction)
                  }
                  className="w-full py-2.5 sm:py-3 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {selectedOrder.orderStatus === "cancelled" ||
                  selectedOrder.orderStatus === "returned"
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
        <div className="fixed inset-0 app-layer-modal flex items-start sm:items-center justify-center p-2 sm:p-4 bg-black/50 overflow-y-auto">
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
                  disabled={isCancellingOrder || isStatusUpdating || isPaymentStatusUpdating}
                  className="flex-1 py-2.5 sm:py-3 border border-gray-300 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Go Back
                </button>
                <button
                  onClick={handleCancelOrder}
                  disabled={isCancellingOrder || isStatusUpdating || isPaymentStatusUpdating}
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
