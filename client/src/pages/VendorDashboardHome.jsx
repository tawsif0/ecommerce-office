import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  FiBarChart2,
  FiClock,
  FiDollarSign,
  FiPackage,
  FiArrowRight,
  FiMail,
  FiMessageSquare,
  FiTag,
  FiEdit3,
} from "react-icons/fi";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const VendorDashboardHome = ({ onTabChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingProducts: 0,
    approvedProducts: 0,
    rejectedProducts: 0,
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    processingOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    returnedOrders: 0,
    grossSales: 0,
    commissionTotal: 0,
    netEarnings: 0,
    todaySales: 0,
    monthlySales: 0,
    inventory: {
      totalStock: 0,
      lowStockAlerts: 0,
      outOfStock: 0,
    },
    recentOrders: [],
  });

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchVendorDashboard = async () => {
    try {
      setLoading(true);
      const [profileResponse, statsResponse] = await Promise.all([
        axios.get(`${baseUrl}/vendors/me/profile`, { headers: getAuthHeaders() }),
        axios.get(`${baseUrl}/vendors/me/stats`, { headers: getAuthHeaders() }),
      ]);

      setVendor(profileResponse.data?.vendor || null);
      setStats((prev) => ({
        ...prev,
        ...(statsResponse.data?.stats || {}),
      }));
    } catch {
      // Keep graceful fallback UI for non-approved/new vendor
      setVendor(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.userType === "vendor") {
      fetchVendorDashboard();
    }
  }, [user]);

  if (user?.userType !== "vendor") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Vendor Access Only</h2>
        <p className="text-gray-600">This dashboard is available for vendor accounts.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[220px]">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-emerald-800 to-black rounded-xl p-6 md:p-8 text-white">
        <p className="text-sm text-emerald-100 uppercase tracking-wide">Vendor Space</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">
          {vendor?.storeName || "My Vendor Dashboard"}
        </h1>
        <p className="text-emerald-100 mt-2">
          Store status:{" "}
          <span className="font-semibold uppercase">{vendor?.status || "pending"}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Products</p>
            <FiPackage className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-black mt-2">{stats.totalProducts}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Pending Products</p>
            <FiClock className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-black mt-2">{stats.pendingProducts}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Total Orders</p>
            <FiBarChart2 className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-black mt-2">{stats.totalOrders}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Net Earnings</p>
            <FiDollarSign className="w-5 h-5 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-black mt-2">
            {Number(stats.netEarnings || 0).toFixed(2)} TK
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Sales Snapshot</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Today Sales</p>
            <p className="text-xl font-bold text-black mt-1">
              {Number(stats.todaySales || 0).toFixed(2)} TK
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Monthly Sales</p>
            <p className="text-xl font-bold text-black mt-1">
              {Number(stats.monthlySales || 0).toFixed(2)} TK
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Gross Sales</p>
            <p className="text-xl font-bold text-black mt-1">
              {Number(stats.grossSales || 0).toFixed(2)} TK
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Marketplace Commission</p>
            <p className="text-xl font-bold text-black mt-1">
              {Number(stats.commissionTotal || 0).toFixed(2)} TK
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <p className="text-gray-500">Net Earnings</p>
            <p className="text-xl font-bold text-black mt-1">
              {Number(stats.netEarnings || 0).toFixed(2)} TK
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Order Status Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
          {[
            ["Pending", stats.pendingOrders],
            ["Confirmed", stats.confirmedOrders],
            ["Processing", stats.processingOrders],
            ["Shipped", stats.shippedOrders],
            ["Delivered", stats.deliveredOrders],
            ["Cancelled", stats.cancelledOrders],
            ["Returned", stats.returnedOrders],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-gray-200 p-3">
              <p className="text-gray-500">{label}</p>
              <p className="text-lg font-bold text-black mt-1">{Number(value || 0)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Inventory Snapshot</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Stock Units</span>
              <span className="font-semibold text-black">
                {Number(stats?.inventory?.totalStock || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Low Stock Alerts</span>
              <span className="font-semibold text-black">
                {Number(stats?.inventory?.lowStockAlerts || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Out of Stock</span>
              <span className="font-semibold text-black">
                {Number(stats?.inventory?.outOfStock || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
          <h2 className="text-lg font-semibold text-black mb-4">Recent Orders</h2>
          {Array.isArray(stats?.recentOrders) && stats.recentOrders.length > 0 ? (
            <div className="space-y-2">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.orderNumber}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-black truncate">{order.orderNumber}</p>
                    <p className="text-gray-500 truncate">{order.customerName || "Customer"}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-black">
                      {Number(order.total || 0).toFixed(2)} TK
                    </p>
                    <p className="text-xs text-gray-500 capitalize">{order.orderStatus}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No recent orders yet.</p>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { label: "Vendor Orders", tab: "vendor-orders", icon: FiPackage },
            { label: "Create Product", tab: "create-product", icon: FiEdit3 },
            { label: "Manage Products", tab: "modify-product", icon: FiEdit3 },
            { label: "Brands", tab: "module-brands", icon: FiTag },
            { label: "Sales Report", tab: "module-business-reports", icon: FiBarChart2 },
            { label: "Suppliers", tab: "module-suppliers", icon: FiPackage },
            { label: "Purchases", tab: "module-purchases", icon: FiPackage },
            { label: "Accounts", tab: "module-accounts", icon: FiDollarSign },
            { label: "Customer Messages", tab: "vendor-messages", icon: FiMail },
            { label: "Support Tickets", tab: "module-support", icon: FiMessageSquare },
            { label: "Coupons", tab: "coupons", icon: FiTag },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.tab}
                type="button"
                onClick={() => onTabChange?.(action.tab)}
                className="inline-flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  {action.label}
                </span>
                <FiArrowRight className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <h2 className="text-lg font-semibold text-black mb-4">Earnings Graph</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={[
                { name: "Gross Sales", value: Number(stats.grossSales || 0) },
                { name: "Commission", value: Number(stats.commissionTotal || 0) },
                { name: "Net Earnings", value: Number(stats.netEarnings || 0) },
              ]}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fill: "#374151", fontSize: 12 }} />
              <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} />
              <Tooltip formatter={(value) => [`${Number(value).toFixed(2)} TK`, "Amount"]} />
              <Bar dataKey="value" fill="#111827" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default VendorDashboardHome;
