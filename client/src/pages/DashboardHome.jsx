/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
  ArrowRightIcon,
  ShoppingBagIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  TicketIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

const baseUrl = import.meta.env.VITE_API_URL;

const DashboardHome = ({ user, onTabChange }) => {
  const [loading, setLoading] = useState(false);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalRevenue: 0,
    sales: {
      today: 0,
      monthly: 0,
      total: 0,
    },
    orders: {
      total: 0,
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      returned: 0,
    },
    financials: {
      revenue: 0,
      otherIncome: 0,
      expense: 0,
      netProfit: 0,
    },
    inventory: {
      totalProducts: 0,
      totalStock: 0,
      lowStockAlerts: 0,
      outOfStock: 0,
    },
    customerInsights: {
      abandonedOrders: 0,
      abandonedValue: 0,
      highRiskCustomers: 0,
      recentOrders: [],
    },
  });

  const isAdmin = user?.userType === "admin";

  const quickActions =
    user?.userType === "vendor"
      ? [
          { label: "Vendor Orders", tab: "vendor-orders", icon: ShoppingBagIcon },
          { label: "Campaign Center", tab: "module-campaign-offers", icon: TicketIcon },
          { label: "Store Messages", tab: "vendor-messages", icon: ChatBubbleLeftRightIcon },
          { label: "Support Tickets", tab: "module-support", icon: TicketIcon },
          { label: "Create Product", tab: "create-product", icon: ArrowRightIcon },
        ]
      : [
          { label: "My Orders", tab: "my-orders", icon: ShoppingBagIcon },
          { label: "Wishlist", tab: "wishlist", icon: HeartIcon },
          { label: "Vendor Messages", tab: "vendor-messages", icon: ChatBubbleLeftRightIcon },
          { label: "Support Tickets", tab: "module-support", icon: TicketIcon },
        ];

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const statsResponse = await axios.get(`${baseUrl}/auth/admin/system-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSystemStats((prev) => ({
        ...prev,
        ...(statsResponse.data || {}),
      }));
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    return (
      <div className="space-y-6">
        <div className="bg-linear-to-r from-purple-900 to-black rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-white">Admin Dashboard</h2>
          <p className="text-gray-300 mt-1">System overview and user activity</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Today Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(systemStats?.sales?.today || 0).toFixed(2)} TK
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monthly Sales</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(systemStats?.sales?.monthly || 0).toFixed(2)} TK
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    <ShoppingBagIcon className="h-6 w-6 text-slate-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(systemStats?.orders?.total || 0)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pipeline Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(systemStats?.orders?.pending || 0) +
                        Number(systemStats?.orders?.confirmed || 0) +
                        Number(systemStats?.orders?.processing || 0) +
                        Number(systemStats?.orders?.shipped || 0)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircleIcon className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Delivered</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(systemStats?.orders?.delivered || 0)}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ShieldCheckIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Cancelled/Returned</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {Number(systemStats?.orders?.cancelled || 0) +
                        Number(systemStats?.orders?.returned || 0)}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-3">Financials</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Revenue</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.financials?.revenue || 0).toFixed(2)} TK
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Expense</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.financials?.expense || 0).toFixed(2)} TK
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-2">
                    <span className="text-gray-700">Net Profit</span>
                    <span
                      className={`font-bold ${
                        Number(systemStats?.financials?.netProfit || 0) >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {Number(systemStats?.financials?.netProfit || 0).toFixed(2)} TK
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-3">Inventory</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Products</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.inventory?.totalProducts || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Low Stock Alerts</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.inventory?.lowStockAlerts || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Out of Stock</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.inventory?.outOfStock || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                <p className="text-sm font-semibold text-gray-900 mb-3">Customer Insights</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Abandoned Orders</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.customerInsights?.abandonedOrders || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Abandoned Value</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.customerInsights?.abandonedValue || 0).toFixed(2)} TK
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">High-Risk Customers</span>
                    <span className="font-semibold text-black">
                      {Number(systemStats?.customerInsights?.highRiskCustomers || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">Recent Orders</p>
              {(systemStats?.customerInsights?.recentOrders || []).length === 0 ? (
                <p className="text-sm text-gray-500">No recent orders found.</p>
              ) : (
                <div className="space-y-2">
                  {(systemStats?.customerInsights?.recentOrders || []).map((order) => (
                    <div
                      key={order.orderNumber}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-black truncate">{order.orderNumber}</p>
                        <p className="text-gray-500 truncate">
                          {order.customerName || "Guest Customer"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold text-black">
                          {Number(order.total || 0).toFixed(2)} TK
                        </p>
                        <p className="text-xs text-gray-500 capitalize">{order.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <p className="text-sm font-semibold text-gray-900 mb-3">Quick Access</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: "Add Order", tab: "add-order", icon: ShoppingBagIcon },
                  { label: "Order List", tab: "order-list", icon: ShoppingBagIcon },
                  { label: "Customer Risk", tab: "customer-risk", icon: ShieldCheckIcon },
                  { label: "Abandoned Orders", tab: "module-abandoned", icon: TicketIcon },
                  { label: "Campaign Center", tab: "module-campaign-offers", icon: TicketIcon },
                  { label: "Landing Pages", tab: "module-landing-pages", icon: ArrowRightIcon },
                  { label: "Business Reports", tab: "module-business-reports", icon: ArrowRightIcon },
                  { label: "Website Setup", tab: "module-website-setup", icon: ArrowRightIcon },
                  { label: "Super Admin", tab: "module-super-admin", icon: ShieldCheckIcon },
                  { label: "Vendor Reports", tab: "vendor-reports", icon: ArrowRightIcon },
                  { label: "Accounts", tab: "module-accounts", icon: CurrencyDollarIcon },
                  { label: "Admin Users", tab: "module-admin-users", icon: ShieldCheckIcon },
                  { label: "Support Tickets", tab: "module-support", icon: TicketIcon },
                  { label: "Geolocation", tab: "module-geolocation", icon: ArrowRightIcon },
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
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString()
    : "N/A";

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-blue-900 to-black rounded-xl p-6 md:p-8">
        <h2 className="text-2xl font-bold text-white">Welcome, {user?.name}</h2>
        <p className="text-gray-300 mt-1">Manage your account and orders</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
        >
          <p className="text-sm text-gray-500">Email</p>
          <p className="text-lg font-bold text-gray-900 break-all">{user?.email || "-"}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
        >
          <p className="text-sm text-gray-500">Account Status</p>
          <p className="text-2xl font-bold text-emerald-600">{user?.status || "active"}</p>
        </motion.div>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <p className="text-sm text-gray-500">Joined On</p>
        <p className="text-lg font-semibold text-gray-900 mt-1">{createdAt}</p>
      </div>

      <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-3">Quick Access</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
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
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;
