/* eslint-disable no-unused-vars */
// ModifyCategory.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";

const baseUrl = import.meta.env.VITE_API_URL;

function ModifyCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("General");
  const [editCommissionType, setEditCommissionType] = useState("inherit");
  const [editCommissionValue, setEditCommissionValue] = useState("");
  const [editCommissionFixed, setEditCommissionFixed] = useState("");
  const [editError, setEditError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const categoryTypes = [
    "General",
    "Popular",
    "Hot deals",
    "Best Selling",
    "Latest",
  ];

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required. Please login again.");
        return;
      }

      const response = await axios.get(`${baseUrl}/categories`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.data.success) {
        setCategories(response.data.categories);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleDelete = (category) => {
    setDeleteConfirm(category);
  };

  const confirmDeleteCategory = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");

      const response = await axios.delete(
        `${baseUrl}/categories/${deleteConfirm._id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setCategories(
          categories.filter((category) => category._id !== deleteConfirm._id)
        );
        toast.success("Category deleted successfully!");

        // Dispatch event for navbar update
        window.dispatchEvent(new CustomEvent("categoryDeleted"));
      }
    } catch (err) {
      console.error("Error deleting category:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to delete category";
      toast.error(errorMsg);
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const startEditing = (category) => {
    setEditingId(category._id);
    setEditName(category.name);
    setEditType(category.type || "General");
    setEditCommissionType(category.commissionType || "inherit");
    setEditCommissionValue(String(category.commissionValue ?? ""));
    setEditCommissionFixed(String(category.commissionFixed ?? ""));
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditType("General");
    setEditCommissionType("inherit");
    setEditCommissionValue("");
    setEditCommissionFixed("");
    setEditError("");
  };

  const handleUpdate = async (id) => {
    // Clear previous error
    setEditError("");

    // Validate input
    if (!editName.trim()) {
      setEditError("Category name cannot be empty");
      toast.error("Category name cannot be empty");
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await axios.put(
        `${baseUrl}/categories/${id}`,
        {
          name: editName,
          type: editType,
          commissionType: editCommissionType,
          commissionValue: Number(editCommissionValue || 0),
          commissionFixed: Number(editCommissionFixed || 0),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        setCategories(
          categories.map((category) =>
            category._id === id ? response.data.category : category
          )
        );
        setEditingId(null);
        setEditName("");
        setEditType("General");
        setEditCommissionType("inherit");
        setEditCommissionValue("");
        setEditCommissionFixed("");
        toast.success("Category updated successfully!");

        // Dispatch event for navbar update
        window.dispatchEvent(new CustomEvent("categoryUpdated"));
      }
    } catch (err) {
      console.error("Error updating category:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to update category";
      setEditError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleRefresh = () => {
    fetchCategories();
    toast.success("Categories refreshed!");
  };

  // Listen for category creation events
  useEffect(() => {
    const handleCategoryCreated = () => {
      fetchCategories();
      toast.success("New category detected! List updated.");
    };

    window.addEventListener("categoryCreated", handleCategoryCreated);
    return () => {
      window.removeEventListener("categoryCreated", handleCategoryCreated);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-2 border-t-black rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full"
    >
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-4 md:p-8 border border-gray-200"
        >
          <div className="py-1 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">
                  Category Manager
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your categories
                </p>
              </div>
              <div className="flex items-center justify-between md:justify-end gap-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {categories.length} categories
                </span>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
                  title="Refresh categories"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span className="ml-2 hidden md:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {categories.length === 0 ? (
            <div className="py-8 md:py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No categories
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new category.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 mt-4 md:mt-6">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="py-4 hover:bg-gray-50 transition-colors duration-150"
                >
                  {editingId === category._id ? (
                    <div>
                      <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => {
                              setEditName(e.target.value);
                              // Clear error when user starts typing
                              if (editError) setEditError("");
                            }}
                            className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-1 ${
                              editError
                                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                : "border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                            } text-gray-900 placeholder-gray-400`}
                            placeholder="Category name"
                            autoFocus
                          />
                        </div>
                        <div className="w-full md:w-auto">
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-gray-900"
                          >
                            {categoryTypes.map((type) => (
                              <option key={type} value={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full md:w-auto">
                          <select
                            value={editCommissionType}
                            onChange={(e) => setEditCommissionType(e.target.value)}
                            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-gray-900"
                          >
                            <option value="inherit">Inherit Global</option>
                            <option value="percentage">Percentage</option>
                            <option value="fixed">Fixed</option>
                            <option value="hybrid">Hybrid</option>
                          </select>
                        </div>
                        <div className="w-full md:w-32">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCommissionValue}
                            onChange={(e) => setEditCommissionValue(e.target.value)}
                            placeholder="%"
                            disabled={
                              editCommissionType === "inherit" ||
                              editCommissionType === "fixed"
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-gray-900 disabled:bg-gray-100"
                          />
                        </div>
                        <div className="w-full md:w-36">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editCommissionFixed}
                            onChange={(e) => setEditCommissionFixed(e.target.value)}
                            placeholder="Fixed TK"
                            disabled={
                              editCommissionType === "inherit" ||
                              editCommissionType === "percentage"
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-gray-900 disabled:bg-gray-100"
                          />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                          <button
                            onClick={() => handleUpdate(category._id)}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 text-gray-700 transition-colors duration-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                      {/* Red error text under the edit input */}
                      {editError && (
                        <p className="text-sm text-red-600 font-medium mt-1 ml-1">
                          {editError}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-gray-100 shrink-0">
                          <span className="text-sm font-medium text-gray-600">
                            {category.name.charAt(0).toUpperCase()}
                          </span>
                        </span>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1 sm:gap-0">
                          <span className="text-base font-medium text-gray-900 wrap-break-word">
                            {category.name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 self-start sm:self-center">
                            {category.type || "General"}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 self-start sm:self-center">
                            Commission: {category.commissionType || "inherit"}
                            {(category.commissionType === "percentage" ||
                              category.commissionType === "hybrid") &&
                              ` ${Number(category.commissionValue || 0)}%`}
                            {(category.commissionType === "fixed" ||
                              category.commissionType === "hybrid") &&
                              ` + ${Number(category.commissionFixed || 0)} TK`}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        <button
                          onClick={() => startEditing(category)}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() =>
                            handleDelete(category)
                          }
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm leading-4 font-medium rounded-lg shadow-sm text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </motion.div>
        <ConfirmModal
          isOpen={Boolean(deleteConfirm)}
          title="Delete category"
          message={
            deleteConfirm?.name
              ? `Delete "${deleteConfirm.name}" category?`
              : "Delete this category?"
          }
          confirmLabel="Delete"
          isDanger
          isLoading={isDeleting}
          onCancel={() => setDeleteConfirm(null)}
          onConfirm={confirmDeleteCategory}
        />
      </div>
    </motion.div>
  );
}

export default ModifyCategory;
