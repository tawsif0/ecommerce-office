/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import ConfirmModal from "../components/ConfirmModal";
import {
  PlusCircleIcon,
  CreditCardIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  CogIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
const baseUrl = import.meta.env.VITE_API_URL;
const AdminPaymentMethods = () => {
  const { user } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMethod, setNewMethod] = useState({
    type: "",
    accountNo: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (user?.userType === "admin") {
      fetchPaymentMethods();
    }
  }, [user]);

  const fetchPaymentMethods = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${baseUrl}/auth/admin/payment-methods`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPaymentMethods(response.data);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Failed to load payment methods");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMethod = async () => {
    if (!newMethod.type.trim() || !newMethod.accountNo.trim()) {
      toast.error("Please fill in both fields");
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");

      if (editingId) {
        // Update existing method
        const response = await axios.put(
          `${baseUrl}/auth/admin/payment-methods/${editingId}`,
          newMethod,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Payment method updated successfully");
      } else {
        // Add new method
        const response = await axios.post(
          `${baseUrl}/auth/admin/payment-methods`,
          newMethod,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        toast.success("Payment method added successfully");
      }

      setNewMethod({ type: "", accountNo: "" });
      setEditingId(null);
      fetchPaymentMethods();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to save payment method",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEditMethod = (method) => {
    setNewMethod({
      type: method.type,
      accountNo: method.accountNo,
    });
    setEditingId(method._id);
  };

  const handleDeleteMethod = (method) => {
    setDeleteConfirm(method);
  };

  const confirmDeleteMethod = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${baseUrl}/auth/admin/payment-methods/${deleteConfirm._id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      toast.success("Payment method deleted successfully");
      fetchPaymentMethods();
    } catch (error) {
      toast.error(
        error.response?.data?.error || "Failed to delete payment method",
      );
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleCancelEdit = () => {
    setNewMethod({ type: "", accountNo: "" });
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">Loading payment methods...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-linear-to-r from-blue-900 to-black rounded-xl p-6 md:p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 bg-white/10 rounded-full mb-4">
          <CreditCardIcon className="h-6 w-6 md:h-8 md:w-8 text-white" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
          Payment Methods Management
        </h2>
        <p className="text-gray-300 text-sm md:text-base mb-6">
          Add and manage payment methods for users
        </p>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center space-x-3 mb-6">
          <CogIcon className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
          <h2 className="text-lg md:text-xl font-bold text-gray-900">
            {editingId ? "Edit Payment Method" : "Add New Payment Method"}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Type
            </label>
            <input
              type="text"
              value={newMethod.type}
              onChange={(e) =>
                setNewMethod({ ...newMethod, type: e.target.value })
              }
              placeholder="e.g., Bitcoin, PayPal, Stripe"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none"
            />
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              Name of the payment method
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Account Number/Details
            </label>
            <input
              type="text"
              value={newMethod.accountNo}
              onChange={(e) =>
                setNewMethod({ ...newMethod, accountNo: e.target.value })
              }
              placeholder="e.g., 1A2b3C4d5E... or +1234567890"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-black focus:outline-none"
            />
            <p className="text-xs md:text-sm text-gray-500 mt-2">
              Account number or payment details
            </p>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={handleAddMethod}
            disabled={
              saving || !newMethod.type.trim() || !newMethod.accountNo.trim()
            }
            className="px-6 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                {editingId ? (
                  <>
                    <CheckCircleIcon className="h-5 w-5" />
                    <span>Update Method</span>
                  </>
                ) : (
                  <>
                    <PlusCircleIcon className="h-5 w-5" />
                    <span>Add Payment Method</span>
                  </>
                )}
              </>
            )}
          </button>

          {editingId && (
            <button
              onClick={handleCancelEdit}
              disabled={saving}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <XCircleIcon className="h-5 w-5 inline mr-2" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Payment Methods List */}
      <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg md:text-xl font-bold text-gray-900">
              Available Payment Methods ({paymentMethods.length})
            </h3>
            <p className="text-sm text-gray-600">
              These methods will appear in checkout payment options
            </p>
          </div>
          <button
            onClick={fetchPaymentMethods}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center"
          >
            <svg
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        {paymentMethods.length === 0 ? (
          <div className="text-center py-8">
            <CreditCardIcon className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No payment methods added yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Add payment methods above to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paymentMethods.map((method) => (
              <motion.div
                key={method._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <CreditCardIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <h4 className="font-bold text-gray-900">{method.type}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-2">
                      Account Details:
                    </p>
                    <p className="font-mono text-sm bg-white p-2 rounded mt-1 border border-gray-200">
                      {method.accountNo}
                    </p>
                  </div>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => handleEditMethod(method)}
                      className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMethod(method)}
                      className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="text-xs text-gray-500 mt-3">
                  Created: {new Date(method.createdAt).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        )}
        <ConfirmModal
          isOpen={Boolean(deleteConfirm)}
          title="Delete payment method"
          message={
            deleteConfirm?.type
              ? `Delete the ${deleteConfirm.type} payment method?`
              : "Delete this payment method?"
          }
          confirmLabel="Delete"
          isDanger
          isLoading={isDeleting}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDeleteMethod}
        />
      </div>
    </div>
  );
};

export default AdminPaymentMethods;
