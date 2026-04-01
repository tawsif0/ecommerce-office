/* eslint-disable no-unused-vars */
// ModifyCategory.jsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";
import ConfirmModal from "../../components/ConfirmModal";
import RichTextEditor from "../../components/RichTextEditor";
import { stripHtml } from "../../utils/richText";
import {
  dashboardFieldClass,
  dashboardFormSurfaceClass,
  dashboardPrimaryButtonClass,
  dashboardSecondaryButtonClass,
} from "../../utils/dashboardFormStyles";

const baseUrl = import.meta.env.VITE_API_URL;

function ModifyCategory() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState("General");
  const [editDescription, setEditDescription] = useState("");
  const [editImageFile, setEditImageFile] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState("");
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

  const handleEditImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, WebP, GIF allowed.");
      event.target.value = "";
      return;
    }

    setEditImageFile(file);

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditImagePreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  const clearEditImageSelection = () => {
    setEditImageFile(null);
    setEditImagePreview("");
  };

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
    setEditDescription(category.description || "");
    setEditImageFile(null);
    setEditImagePreview(category.image || "");
    setEditError("");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditName("");
    setEditType("General");
    setEditDescription("");
    setEditImageFile(null);
    setEditImagePreview("");
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

      const formData = new FormData();
      formData.append("name", editName);
      formData.append("type", editType);
      formData.append("description", editDescription);

      if (editImageFile) {
        formData.append("image", editImageFile);
      }

      const response = await axios.put(`${baseUrl}/categories/${id}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        setCategories(
          categories.map((category) =>
            category._id === id ? response.data.category : category
          )
        );
        setEditingId(null);
        setEditName("");
        setEditType("General");
        setEditDescription("");
        setEditImageFile(null);
        setEditImagePreview("");
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
          className={`${dashboardFormSurfaceClass} p-4 md:p-8`}
        >
          <div className="py-1 border-b border-gray-100">
            <div className="flex flex-col md:flex-row md:items-center justify-end gap-4">
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
                      <div className="flex flex-col gap-3 mb-3">
                        <div className="w-full">
                          <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-700 transition hover:border-gray-400 hover:bg-gray-100">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/jpg,image/webp,image/gif"
                              className="hidden"
                              onChange={handleEditImageChange}
                            />
                            Upload new image
                          </label>
                        </div>
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          <div className="flex-1 space-y-3">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => {
                                setEditName(e.target.value);
                                if (editError) setEditError("");
                              }}
                              className={`${dashboardFieldClass} ${
                                editError
                                  ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                                  : ""
                              }`}
                              placeholder="Category name"
                              autoFocus
                            />
                            <RichTextEditor
                              value={editDescription}
                              onChange={setEditDescription}
                              placeholder="Optional category description"
                              minHeight={180}
                            />
                          </div>
                          <div className="w-full md:w-auto">
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              className={`${dashboardFieldClass} w-full md:w-auto`}
                            >
                              {categoryTypes.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                            <button
                              onClick={() => handleUpdate(category._id)}
                              className={dashboardPrimaryButtonClass}
                            >
                            Save
                          </button>
                          <button
                            onClick={cancelEditing}
                            className={dashboardSecondaryButtonClass}
                          >
                            Cancel
                          </button>
                          </div>
                        </div>
                        {editImagePreview ? (
                          <div className="flex items-start gap-3">
                            <div className="h-20 w-20 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                              <img
                                src={editImagePreview}
                                alt={`${editName || category.name} preview`}
                                className="h-full w-full object-cover"
                              />
                            </div>
                            {editImageFile ? (
                              <button
                                type="button"
                                onClick={clearEditImageSelection}
                                className={dashboardSecondaryButtonClass}
                              >
                                Remove selection
                              </button>
                            ) : null}
                          </div>
                        ) : null}
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
                        {category.image ? (
                          <div className="h-12 w-12 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 shrink-0">
                            <img
                              src={category.image}
                              alt={category.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <span className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-gray-100 shrink-0">
                            <span className="text-sm font-medium text-gray-600">
                              {category.name.charAt(0).toUpperCase()}
                            </span>
                          </span>
                        )}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 gap-1 sm:gap-0">
                          <span className="text-base font-medium text-gray-900 wrap-break-word">
                            {category.name}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 self-start sm:self-center">
                            {category.type || "General"}
                          </span>
                        </div>
                      </div>
                      {category.description ? (
                        <p className="mt-2 text-sm text-gray-500 sm:pl-[3.75rem]">
                          {stripHtml(category.description)}
                        </p>
                      ) : null}
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
