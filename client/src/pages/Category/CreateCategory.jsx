/* eslint-disable no-unused-vars */
// CreateCategory.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import axios from "axios";
import toast from "react-hot-toast";

const baseUrl = import.meta.env.VITE_API_URL;

function CreateCategory() {
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("General");
  const [commissionType, setCommissionType] = useState("inherit");
  const [commissionValue, setCommissionValue] = useState("");
  const [commissionFixed, setCommissionFixed] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");
  const [typeError, setTypeError] = useState("");

  const categoryTypes = [
    "General",
    "Popular",
    "Hot deals",
    "Best Selling",
    "Latest",
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors
    setNameError("");
    setTypeError("");

    let hasError = false;

    // Validate name
    if (!categoryName.trim()) {
      setNameError("Category name cannot be empty");
      hasError = true;
    }

    // Validate type
    if (!categoryType) {
      setTypeError("Please select a category type");
      hasError = true;
    }

    if (hasError) return;

    setIsSubmitting(true);

    try {
      // Get token from localStorage
      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Authentication required. Please login again.");
        setIsSubmitting(false);
        return;
      }

      const response = await axios.post(
        `${baseUrl}/categories`,
        {
          name: categoryName,
          type: categoryType,
          commissionType,
          commissionValue: Number(commissionValue || 0),
          commissionFixed: Number(commissionFixed || 0),
          isActive: true,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data.success) {
        // Reset form
        setCategoryName("");
        setCategoryType("General");
        setCommissionType("inherit");
        setCommissionValue("");
        setCommissionFixed("");

        // Show success toast
        toast.success("Category created successfully!");

        // Dispatch event for other components
        window.dispatchEvent(
          new CustomEvent("categoryCreated", {
            detail: response.data.category,
          })
        );
      }
    } catch (err) {
      console.error("Error creating category:", err);
      const errorMsg =
        err.response?.data?.message || "Failed to create category";
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="w-full">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="bg-white rounded-xl shadow-lg p-4 md:p-8 border border-gray-200"
        >
          <div className="mb-6 md:mb-8 text-center">
            <h2 className="text-xl md:text-2xl font-semibold text-gray-800 mb-2">
              Create New Category
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Enter category details to create a new category
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Category Type Dropdown */}
            <div className="mb-4 md:mb-6">
              <label
                htmlFor="categoryType"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category Type *
              </label>
              <select
                id="categoryType"
                value={categoryType}
                onChange={(e) => {
                  setCategoryType(e.target.value);
                  // Clear error when user selects an option
                  if (typeError) setTypeError("");
                }}
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-1 transition-colors text-base md:text-lg ${
                  typeError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                }`}
              >
                {categoryTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              {/* Red error text under the select */}
              {typeError && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {typeError}
                </p>
              )}
            </div>
            {/* Category Name Field */}
            <div className="mb-4">
              <label
                htmlFor="categoryName"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Category Name *
              </label>
              <input
                type="text"
                id="categoryName"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  // Clear error when user starts typing
                  if (nameError) setNameError("");
                }}
                className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-1 transition-colors text-base md:text-lg ${
                  nameError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-gray-500 focus:ring-gray-500"
                }`}
                placeholder="Enter category name"
                autoComplete="off"
              />
              {/* Red error text under the input */}
              {nameError && (
                <p className="mt-1 text-sm text-red-600 font-medium flex items-center">
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {nameError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div>
                <label
                  htmlFor="commissionType"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Commission Rule
                </label>
                <select
                  id="commissionType"
                  value={commissionType}
                  onChange={(e) => setCommissionType(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-base"
                >
                  <option value="inherit">Inherit Global</option>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label
                  htmlFor="commissionValue"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Commission %
                </label>
                <input
                  id="commissionValue"
                  type="number"
                  min="0"
                  step="0.01"
                  value={commissionValue}
                  onChange={(e) => setCommissionValue(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-base"
                  placeholder="0"
                  disabled={commissionType === "inherit" || commissionType === "fixed"}
                />
              </div>
              <div>
                <label
                  htmlFor="commissionFixed"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Fixed (TK)
                </label>
                <input
                  id="commissionFixed"
                  type="number"
                  min="0"
                  step="0.01"
                  value={commissionFixed}
                  onChange={(e) => setCommissionFixed(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:border-gray-500 focus:ring-gray-500 text-base"
                  placeholder="0"
                  disabled={commissionType === "inherit" || commissionType === "percentage"}
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-lg font-medium text-white mt-2 ${
                isSubmitting
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gray-800 hover:bg-gray-900"
              } transition-all shadow-md flex items-center justify-center text-base md:text-lg`}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Creating...
                </>
              ) : (
                "Create Category"
              )}
            </motion.button>
          </form>
        </motion.div>
      </div>
    </motion.div>
  );
}

export default CreateCategory;
