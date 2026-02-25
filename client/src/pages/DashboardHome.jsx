/* eslint-disable no-unused-vars */
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import {
  UserGroupIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";

const baseUrl = import.meta.env.VITE_API_URL;

const DashboardHome = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalRevenue: 0,
  });

  const isAdmin = user?.userType === "admin";

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const [usersResponse, statsResponse] = await Promise.allSettled([
        axios.get(`${baseUrl}/auth/admin/all-users`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${baseUrl}/auth/admin/system-stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (usersResponse.status === "fulfilled") {
        setAllUsers(usersResponse.value.data || []);
      }

      if (statsResponse.status === "fulfilled") {
        setSystemStats({
          totalUsers: statsResponse.value.data?.totalUsers || 0,
          activeUsers: statsResponse.value.data?.activeUsers || 0,
          pendingUsers: statsResponse.value.data?.pendingUsers || 0,
          totalRevenue: statsResponse.value.data?.totalRevenue || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isAdmin) {
    const nonAdminUsers = allUsers.filter((u) => u.userType !== "admin");

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <UserGroupIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900">{nonAdminUsers.length}</p>
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
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.activeUsers}</p>
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
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <ClockIcon className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pending Users</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.pendingUsers}</p>
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
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <CurrencyDollarIcon className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">{systemStats.totalRevenue} TK</p>
                </div>
              </div>
            </motion.div>
          </div>
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
    </div>
  );
};

export default DashboardHome;
