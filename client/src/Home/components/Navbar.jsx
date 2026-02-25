/* eslint-disable no-unused-vars */
// components/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCart } from "../../context/CartContext";
import { FiPackage } from "react-icons/fi";

const baseUrl = import.meta.env.VITE_API_URL;

const Navbar = () => {
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [isShopByCategoriesOpen, setIsShopByCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [categoryProductIds, setCategoryProductIds] = useState([]);
  const [hasCategoryProductIndex, setHasCategoryProductIndex] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Search functionality
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchRef = useRef(null);

  // Dynamic search suggestions
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  // ============ ADDED: Order search states ============
  const [orderSearchResults, setOrderSearchResults] = useState([]);
  const [showOrderResults, setShowOrderResults] = useState(false);
  const [searchingOrders, setSearchingOrders] = useState(false);
  const orderSearchTimeoutRef = useRef(null);
  // ====================================================

  // Refs for dropdown containers
  const categoriesRef = useRef(null);
  const shopByCategoriesRef = useRef(null);
  const categoriesTimeoutRef = useRef(null);
  const shopByCategoriesTimeoutRef = useRef(null);

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileCategoriesOpen, setIsMobileCategoriesOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Login check state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const { cartCount } = useCart();
  const categoryIdSet = useMemo(
    () => new Set(categoryProductIds),
    [categoryProductIds],
  );
  const visibleCategories = useMemo(() => {
    return categories.filter((category) => {
      if (hasCategoryProductIndex && !categoryIdSet.has(category._id)) {
        return false;
      }
      return true;
    });
  }, [categories, hasCategoryProductIndex, categoryIdSet]);

  // Helper function to detect if query looks like an order number
  const isOrderNumberQuery = (query) => {
    const trimmed = query?.toString().trim() || "";

    // Exact pattern: ORD-13_digit_timestamp-1_to_4_digit_random
    // Example: ORD-1769584921417-5450
    const exactPattern = /^ORD-\d{13}-\d{1,4}$/i.test(trimmed);

    return exactPattern;
  };

  // Check login status
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    setIsLoggedIn(!!token);
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setUserName(user.name || user.email?.split("@")[0] || "User");
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  useEffect(() => {
    const handleLoggedIn = () => {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setUserName(user.name || user.email?.split("@")[0] || "User");
      } catch (e) {
        setUserName("User");
      }
    };

    const handleLoggedOut = () => {
      setIsLoggedIn(false);
      setUserName("");
    };

    window.addEventListener("userLoggedIn", handleLoggedIn);
    window.addEventListener("userLoggedOut", handleLoggedOut);

    return () => {
      window.removeEventListener("userLoggedIn", handleLoggedIn);
      window.removeEventListener("userLoggedOut", handleLoggedOut);
    };
  }, []);

  // Fetch categories from API
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const [categoriesResult, productsResult] = await Promise.allSettled([
        axios.get(`${baseUrl}/categories/public`),
        axios.get(`${baseUrl}/products/public`),
      ]);

      if (
        categoriesResult.status === "fulfilled" &&
        categoriesResult.value.data.success
      ) {
        setCategories(categoriesResult.value.data.categories);
      } else {
        setError("Failed to load categories");
      }

      if (
        productsResult.status === "fulfilled" &&
        productsResult.value.data.success
      ) {
        const productsList = productsResult.value.data.products || [];
        const ids = new Set();
        productsList.forEach((product) => {
          if (!product?.category) return;
          const categoryId =
            typeof product.category === "string"
              ? product.category
              : product.category._id;
          if (categoryId) ids.add(categoryId);
        });
        setCategoryProductIds(Array.from(ids));
        setHasCategoryProductIndex(true);
      } else {
        setHasCategoryProductIndex(false);
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError("Unable to load categories");
    } finally {
      setLoading(false);
    }
  };

  // ============ ADDED: Function to search orders ============
  const searchOrders = async (query) => {
    const trimmedQuery = query?.toString().trim() || "";

    // Only search if query looks like an order number
    if (!trimmedQuery || !isOrderNumberQuery(trimmedQuery)) {
      setOrderSearchResults([]);
      setShowOrderResults(false);
      return;
    }

    try {
      setSearchingOrders(true);
      const response = await axios.get(`${baseUrl}/orders/search`, {
        params: { query: trimmedQuery.trim() },
      });

      if (response.data.success) {
        setOrderSearchResults(response.data.suggestions || []);
        setShowOrderResults(true);
      }
    } catch (error) {
      console.error("Error searching orders:", error);
      setOrderSearchResults([]);
    } finally {
      setSearchingOrders(false);
    }
  };
  // ==========================================================

  // Fetch dynamic search suggestions
  const fetchSearchSuggestions = async (query) => {
    const trimmedQuery = query?.toString().trim() || "";

    if (!trimmedQuery || trimmedQuery.length === 0) {
      setSearchSuggestions([]);
      return;
    }

    try {
      setIsFetchingSuggestions(true);
      const response = await axios.get(
        `${baseUrl}/products/public/suggestions`,
        {
          params: {
            query: trimmedQuery,
            limit: 8,
          },
        },
      );

      if (response.data.success && response.data.suggestions) {
        const { products, categories } = response.data.suggestions;

        const productsArray = Array.isArray(products) ? products : [];
        const categoriesArray = Array.isArray(categories) ? categories : [];

        const allSuggestions = [
          ...productsArray.map((product) => ({
            ...product,
            type: "product",
          })),
          ...categoriesArray.map((category) => ({
            ...category,
            type: "category",
          })),
        ];

        setSearchSuggestions(allSuggestions.slice(0, 8));
      } else {
        setSearchSuggestions([]);
      }
    } catch (err) {
      console.error("Error fetching search suggestions:", err);
      setSearchSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  // Fetch search results
  const fetchSearchResults = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    try {
      setIsSearching(true);
      const response = await axios.get(`${baseUrl}/products/public`);

      if (response.data.success && response.data.products) {
        const products = response.data.products;

        const filtered = products.filter((product) => {
          const searchLower = query.toLowerCase();
          return (
            (product.title &&
              product.title.toLowerCase().includes(searchLower)) ||
            (product.description &&
              product.description.toLowerCase().includes(searchLower)) ||
            (product.brand &&
              product.brand.toLowerCase().includes(searchLower)) ||
            (product.category &&
              product.category.name &&
              product.category.name.toLowerCase().includes(searchLower)) ||
            (product.productType &&
              product.productType.toLowerCase().includes(searchLower))
          );
        });

        setSearchResults(filtered.slice(0, 5));
      }
    } catch (err) {
      console.error("Error searching products:", err);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // ============ UPDATED: Handle search change ============
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    const trimmedQuery = query?.toString().trim() || "";

    // Clear timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (orderSearchTimeoutRef.current) {
      clearTimeout(orderSearchTimeoutRef.current);
    }

    if (!trimmedQuery || trimmedQuery.length === 0) {
      setShowSearchResults(false);
      setShowSuggestions(false);
      setShowOrderResults(false);
      setSearchResults([]);
      setSearchSuggestions([]);
      setOrderSearchResults([]);
      return;
    }

    // Search for products/categories - show suggestions for short queries
    if (trimmedQuery.length >= 1) {
      setShowSuggestions(true);
      setShowSearchResults(false);
      setShowOrderResults(false);

      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchSuggestions(query);
      }, 200);
    }

    // ============ MODIFIED: Search for orders only when it looks like an order number ============
    if (isOrderNumberQuery(trimmedQuery)) {
      orderSearchTimeoutRef.current = setTimeout(() => {
        searchOrders(query);
      }, 300); // Slight delay for order search
    } else {
      // Clear order results if query doesn't look like an order number
      setOrderSearchResults([]);
      setShowOrderResults(false);
    }
    // ===================================================
  };
  // =====================================================

  // Handle search form submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchResults(false);
      setShowSuggestions(false);
      setShowOrderResults(false); // ADDED
      setSearchQuery("");
      setSearchResults([]);
      setSearchSuggestions([]);
      setOrderSearchResults([]); // ADDED
      setIsMobileSearchOpen(false);
    }
  };

  // Handle clicking on a search result
  const handleSearchResultClick = (productId) => {
    navigate(`/product/${productId}`);
    setShowSearchResults(false);
    setShowSuggestions(false);
    setShowOrderResults(false); // ADDED
    setSearchQuery("");
    setSearchResults([]);
    setSearchSuggestions([]);
    setOrderSearchResults([]); // ADDED
    setIsMobileSearchOpen(false);
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === "product") {
      navigate(`/product/${suggestion._id}`);
    } else if (suggestion.type === "category") {
      navigate(`/shop?category=${suggestion._id}`);
    } else {
      navigate(
        `/shop?search=${encodeURIComponent(
          suggestion.title || suggestion.name,
        )}`,
      );
    }

    setShowSearchResults(false);
    setShowSuggestions(false);
    setShowOrderResults(false); // ADDED
    setSearchQuery("");
    setSearchResults([]);
    setSearchSuggestions([]);
    setOrderSearchResults([]); // ADDED
    setIsMobileSearchOpen(false);
  };

  // ============ ADDED: Handle order result click ============
  const handleOrderResultClick = (orderNumber) => {
    navigate(`/track-order/${orderNumber}`);
    setShowOrderResults(false);
    setShowSearchResults(false);
    setShowSuggestions(false);
    setSearchQuery("");
    setSearchResults([]);
    setSearchSuggestions([]);
    setOrderSearchResults([]);
    setIsMobileSearchOpen(false);
  };
  // ==========================================================

  // Close search results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearchResults(false);
        setShowSuggestions(false);
        setShowOrderResults(false); // ADDED
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle category click
  const handleCategoryClick = (categoryId, categoryName) => {
    navigate(`/shop?category=${categoryId}`);
    setIsCategoriesOpen(false);
    setIsShopByCategoriesOpen(false);
    setIsMobileCategoriesOpen(false);
    setIsMobileMenuOpen(false);
  };

  // Handle cart icon click
  const handleCartClick = () => {
    navigate("/added-to-cart");
    setIsMobileMenuOpen(false);
  };

  // Handle shop by categories mouse enter
  const handleShopByCategoriesMouseEnter = () => {
    if (shopByCategoriesTimeoutRef.current) {
      clearTimeout(shopByCategoriesTimeoutRef.current);
    }
    setIsShopByCategoriesOpen(true);
  };

  // Handle shop by categories mouse leave with delay
  const handleShopByCategoriesMouseLeave = () => {
    shopByCategoriesTimeoutRef.current = setTimeout(() => {
      setIsShopByCategoriesOpen(false);
    }, 150);
  };

  // Handle dropdown mouse enter to cancel timeout
  const handleDropdownMouseEnter = (type) => {
    if (type === "categories" && categoriesTimeoutRef.current) {
      clearTimeout(categoriesTimeoutRef.current);
    }
    if (type === "shop" && shopByCategoriesTimeoutRef.current) {
      clearTimeout(shopByCategoriesTimeoutRef.current);
    }
  };

  // Function to get badge color based on category type - Black & White theme
  const getBadgeStyle = (type) => {
    const typeLower = (type || "General").toLowerCase();

    if (typeLower.includes("hot") || typeLower.includes("deal")) {
      return {
        backgroundColor: "#e5e7eb",
        color: "#000000",
        border: "1px solid #9ca3af",
      };
    } else if (typeLower.includes("popular")) {
      return {
        backgroundColor: "#f3f4f6",
        color: "#000000",
        border: "1px solid #9ca3af",
      };
    } else if (typeLower.includes("best")) {
      return {
        backgroundColor: "#f9fafb",
        color: "#000000",
        border: "1px solid #9ca3af",
      };
    } else if (typeLower.includes("latest")) {
      return {
        backgroundColor: "#e5e7eb",
        color: "#000000",
        border: "1px solid #9ca3af",
      };
    } else {
      return {
        backgroundColor: "#f3f4f6",
        color: "#000000",
        border: "1px solid #9ca3af",
      };
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    navigate("/");
    setIsMobileMenuOpen(false);
    toast.success("Logged out successfully!");
    window.dispatchEvent(new CustomEvent("userLoggedOut"));
  };

  // Mobile search toggle
  const toggleMobileSearch = () => {
    setIsMobileSearchOpen(!isMobileSearchOpen);
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const mobileMenu = document.getElementById("mobile-menu");
      const mobileMenuButton = document.getElementById("mobile-menu-button");

      if (
        mobileMenu &&
        !mobileMenu.contains(event.target) &&
        mobileMenuButton &&
        !mobileMenuButton.contains(event.target)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <header className="font-sans">
      {/* Top bar - Hidden on mobile */}
      <div className="hidden lg:block bg-linear-to-r from-gray-900 to-black py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex justify-end items-center text-xs text-gray-300">
          <div className="flex items-center space-x-6">
            {/* Phone - Clickable */}
            <a
              href="tel:+919876543210"
              className="flex items-center space-x-2 group hover:text-white transition-colors duration-200"
            >
              <svg
                className="w-4 h-4 text-gray-300 group-hover:text-white transition-transform duration-200 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span className="group-hover:underline">(+91) 9876-543-210</span>
            </a>

            {/* Email - Clickable */}
            <a
              href="mailto:support@demo.com"
              className="flex items-center space-x-2 group hover:text-white transition-colors duration-200"
            >
              <svg
                className="w-4 h-4 text-gray-300 group-hover:text-white transition-transform duration-200 group-hover:scale-110"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="group-hover:underline">support@demo.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center lg:hidden">
              <Link to="/" className="text-2xl font-bold text-black">
                E-Commerce
              </Link>
            </div>

            {/* Desktop Navigation - Center */}
            <div className="hidden lg:flex lg:items-center lg:justify-between lg:flex-1">
              {/* Categories Dropdown */}
              <div
                ref={shopByCategoriesRef}
                className="relative"
                onMouseEnter={handleShopByCategoriesMouseEnter}
                onMouseLeave={handleShopByCategoriesMouseLeave}
              >
                <button className="flex items-center space-x-2 py-4 pr-4 text-black hover:text-gray-700 transition-colors duration-200 font-medium">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                    />
                  </svg>
                  <span className="font-semibold">SHOP BY CATEGORIES</span>
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isShopByCategoriesOpen && (
                  <div
                    className="absolute top-full left-0 w-64 bg-white rounded-lg shadow-xl border border-gray-300 py-2 z-40 animate-fadeIn"
                    onMouseEnter={() => handleDropdownMouseEnter("shop")}
                    onMouseLeave={handleShopByCategoriesMouseLeave}
                  >
                    {loading ? (
                      <div className="px-4 py-3 text-center text-gray-500">
                        Loading...
                      </div>
                    ) : visibleCategories.length === 0 ? (
                      <div className="px-4 py-3 text-center text-gray-500">
                        No categories
                      </div>
                    ) : (
                      <>
                        <div className="px-4 py-2 border-b border-gray-200">
                          <h3 className="text-sm font-semibold text-gray-900">
                            All Categories
                          </h3>
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {visibleCategories.map((category) => (
                            <button
                              key={category._id}
                              className="w-full flex items-center justify-between px-4 py-3 text-sm text-gray-800 hover:bg-gray-100 hover:text-black transition-colors duration-150"
                              onClick={() =>
                                handleCategoryClick(category._id, category.name)
                              }
                            >
                              <span className="truncate">{category.name}</span>
                              <span
                                className="ml-2 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap"
                                style={getBadgeStyle(category.type)}
                              >
                                {category.type || "General"}
                              </span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Search Bar */}
              <div
                ref={searchRef}
                className="relative w-full max-w-xl mx-4 pr-16"
              >
                <form onSubmit={handleSearchSubmit} className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => {
                      if (searchQuery.trim()) {
                        setShowSuggestions(true);
                        fetchSearchSuggestions(searchQuery);
                      }
                    }}
                    placeholder="Search for products, brands, or order numbers..."
                    className="w-full px-4 py-2.5 pl-12 pr-4 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent transition-all duration-200"
                  />
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                </form>

                {showSuggestions && searchQuery.trim() && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-300 z-50 max-h-96 overflow-y-auto animate-fadeIn">
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-gray-900">
                          Results for "{searchQuery}"
                        </h3>
                        <button
                          onClick={() => setShowSuggestions(false)}
                          className="text-gray-500 hover:text-gray-700"
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
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {isFetchingSuggestions || searchingOrders ? (
                      <div className="p-8 text-center">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                        <p className="text-sm text-gray-600 mt-2">
                          Searching...
                        </p>
                      </div>
                    ) : orderSearchResults.length > 0 &&
                      isOrderNumberQuery(searchQuery) ? (
                      // SHOW ONLY ORDER RESULTS (when query looks like an order number)
                      <div className="divide-y divide-gray-200">
                        <div className="p-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <FiPackage className="w-4 h-4 text-gray-600" />
                            <span className="text-xs font-medium text-gray-700">
                              Order Tracking
                            </span>
                          </div>
                        </div>
                        {orderSearchResults.slice(0, 5).map((order, index) => (
                          <div
                            key={`order-${order._id}-${index}`}
                            className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                            onClick={() =>
                              handleOrderResultClick(order.orderNumber)
                            }
                          >
                            <div className="flex items-center">
                              <div className="p-2 rounded-lg bg-blue-100">
                                <FiPackage className="w-5 h-5 text-blue-700" />
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="text-sm font-medium text-gray-900">
                                  Order #{order.orderNumber}
                                </div>
                                <div className="text-xs text-gray-600 mt-1">
                                  <div>Customer: {order.customerName}</div>
                                  <div>Product: {order.productName}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs ${
                                        order.status === "delivered"
                                          ? "bg-green-100 text-green-700"
                                          : order.status === "shipped"
                                            ? "bg-purple-100 text-purple-700"
                                            : order.status === "processing"
                                              ? "bg-blue-100 text-blue-700"
                                              : order.status === "pending"
                                                ? "bg-yellow-100 text-yellow-700"
                                                : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                    <span className="text-gray-500 text-xs">
                                      {new Date(
                                        order.date,
                                      ).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                                TRACK
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchSuggestions.length > 0 ? (
                      // SHOW ONLY PRODUCT/CATEGORY RESULTS (if no orders found or query doesn't look like order number)
                      <div className="divide-y divide-gray-200">
                        <div className="p-3 bg-gray-50">
                          <div className="flex items-center gap-2">
                            <svg
                              className="w-4 h-4 text-gray-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                            <span className="text-xs font-medium text-gray-700">
                              Products & Categories
                            </span>
                          </div>
                        </div>
                        {searchSuggestions
                          .slice(0, 5)
                          .map((suggestion, index) => (
                            <div
                              key={`${suggestion.type}-${suggestion._id}-${index}`}
                              className="p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              <div className="flex items-center">
                                <div
                                  className={`p-2 rounded-lg ${
                                    suggestion.type === "product"
                                      ? "bg-gray-100"
                                      : "bg-gray-200"
                                  }`}
                                >
                                  {suggestion.type === "product" ? (
                                    <svg
                                      className="w-5 h-5 text-gray-700"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-5 h-5 text-gray-700"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth="2"
                                        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                      />
                                    </svg>
                                  )}
                                </div>
                                <div className="ml-4 flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {suggestion.type === "product"
                                      ? suggestion.title
                                      : suggestion.name}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {suggestion.type === "product"
                                      ? suggestion.brand || "Product"
                                      : "Category"}
                                    {suggestion.type === "product" &&
                                      (suggestion.priceType === "tba" ? (
                                        <span className="ml-2 font-medium">TBA</span>
                                      ) : suggestion.price !== null &&
                                        suggestion.price !== undefined ? (
                                        <span className="ml-2 font-medium">
                                          ৳{Number(suggestion.price).toFixed(2)}
                                        </span>
                                      ) : null)}
                                  </div>
                                </div>
                                <div
                                  className={`text-xs font-medium px-2 py-1 rounded-full ${
                                    suggestion.type === "product"
                                      ? "bg-gray-100 text-gray-800"
                                      : "bg-gray-200 text-gray-800"
                                  }`}
                                >
                                  {suggestion.type === "product"
                                    ? "VIEW"
                                    : "BROWSE"}
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      // NO RESULTS AT ALL
                      <div className="p-8 text-center text-gray-600">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Navigation - Right */}
            <div className="hidden lg:flex lg:items-center lg:space-x-6">
              {/* User Menu */}
              {isLoggedIn ? (
                <div className="relative group">
                  <button className="flex items-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors duration-200">
                    <div className="w-8 h-8 bg-linear-to-r from-gray-800 to-black rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-gray-800">
                      {userName}
                    </span>
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-300 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                    <div className="px-4 py-2 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">
                        {userName}
                      </p>
                      <p className="text-xs text-gray-600">Welcome back!</p>
                    </div>
                    <Link
                      to="/dashboard"
                      className="flex items-center px-4 py-3 text-sm text-gray-800 hover:bg-gray-100 hover:text-black transition-colors duration-150"
                    >
                      <svg
                        className="w-4 h-4 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                      Dashboard
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-sm text-gray-800 hover:bg-gray-100 transition-colors duration-150"
                    >
                      <svg
                        className="w-4 h-4 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-800 hover:text-black transition-colors duration-200"
                >
                  Login
                </Link>
              )}

              {/* Cart */}
              <button
                onClick={handleCartClick}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {(cartCount > 0 || !isLoggedIn) && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center lg:hidden space-x-4">
              {/* Mobile Search Button */}
              <button
                onClick={toggleMobileSearch}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </button>

              {/* Mobile Cart */}
              <button
                onClick={handleCartClick}
                className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <svg
                  className="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {(cartCount > 0 || !isLoggedIn) && (
                  <span className="absolute -top-1 -right-1 bg-black text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>

              <button
                id="mobile-menu-button"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-800"
              >
                <svg
                  className="w-6 h-6 text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {isMobileSearchOpen && (
          <div className="lg:hidden border-t border-gray-200 bg-white px-4 py-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                onFocus={() => {
                  if (searchQuery.trim()) {
                    setShowSuggestions(true);
                    fetchSearchSuggestions(searchQuery);
                  }
                }}
                placeholder="Search products or order numbers..."
                className="w-full pl-12 pr-12 py-3.5 text-sm bg-white border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-transparent"
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center h-5 pointer-events-none">
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            {/* ============ FIXED: Mobile Search Suggestions ============ */}
            {showSuggestions && searchQuery.trim() && (
              <div className="mt-3 bg-white rounded-lg shadow border border-gray-200 max-h-60 overflow-y-auto">
                <div className="p-2 bg-gray-50 border-b">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium">Search Results</span>
                    <button
                      onClick={() => setShowSuggestions(false)}
                      className="text-xs text-gray-600 hover:text-gray-800"
                    >
                      Close
                    </button>
                  </div>
                </div>

                {isFetchingSuggestions || searchingOrders ? (
                  <div className="p-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                    <span className="text-xs text-gray-600 ml-2">
                      Searching...
                    </span>
                  </div>
                ) : orderSearchResults.length > 0 &&
                  isOrderNumberQuery(searchQuery) ? (
                  // SHOW ONLY ORDERS ON MOBILE (when query looks like an order number)
                  <div className="divide-y divide-gray-100">
                    {orderSearchResults.slice(0, 3).map((order, index) => (
                      <div
                        key={`mobile-order-${index}`}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          handleOrderResultClick(order.orderNumber)
                        }
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-1.5 rounded bg-blue-100">
                            <FiPackage className="w-3 h-3 text-blue-700" />
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium">
                              Order #{order.orderNumber}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {order.customerName}
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className={`text-xs px-1.5 py-0.5 rounded ${
                                  order.status === "delivered"
                                    ? "bg-green-100 text-green-700"
                                    : order.status === "shipped"
                                      ? "bg-purple-100 text-purple-700"
                                      : order.status === "processing"
                                        ? "bg-blue-100 text-blue-700"
                                        : order.status === "pending"
                                          ? "bg-yellow-100 text-yellow-700"
                                          : "bg-red-100 text-red-700"
                                }`}
                              >
                                {order.status}
                              </span>
                            </div>
                          </div>
                          <div className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                            TRACK
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : searchSuggestions.length > 0 ? (
                  // SHOW ONLY PRODUCTS/CATEGORIES ON MOBILE (if no orders or query doesn't look like order number)
                  <div className="divide-y divide-gray-100">
                    {searchSuggestions.slice(0, 3).map((suggestion, index) => (
                      <div
                        key={`mobile-${suggestion.type}-${index}`}
                        className="p-3 hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-1.5 rounded ${
                              suggestion.type === "product"
                                ? "bg-gray-100"
                                : "bg-gray-200"
                            }`}
                          >
                            {suggestion.type === "product" ? (
                              <svg
                                className="w-3 h-3 text-gray-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-3 h-3 text-gray-700"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="text-xs font-medium truncate">
                              {suggestion.type === "product"
                                ? suggestion.title
                                : suggestion.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {suggestion.type === "product"
                                ? "Product"
                                : "Category"}
                              {suggestion.type === "product" &&
                                (suggestion.priceType === "tba" ? (
                                  <span className="ml-1 font-medium">• TBA</span>
                                ) : suggestion.price !== null &&
                                  suggestion.price !== undefined ? (
                                  <span className="ml-1 font-medium">
                                    • ৳{Number(suggestion.price).toFixed(2)}
                                  </span>
                                ) : null)}
                            </div>
                          </div>
                          <div
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              suggestion.type === "product"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-gray-200 text-gray-800"
                            }`}
                          >
                            {suggestion.type === "product" ? "VIEW" : "BROWSE"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  // NO RESULTS
                  <div className="p-4 text-center text-gray-600 text-xs">
                    No results found for "{searchQuery}"
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div
            id="mobile-menu"
            className="lg:hidden bg-white border-t border-gray-200 shadow-lg"
          >
            <div className="px-4 py-3 space-y-1">
              {/* Dashboard Link (mobile) */}
              {isLoggedIn && (
                <Link
                  to="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-100 hover:text-black rounded-lg transition-colors duration-150"
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                  Dashboard
                </Link>
              )}

              {/* Categories Dropdown (mobile) */}
              <div className="space-y-1">
                <button
                  onClick={() =>
                    setIsMobileCategoriesOpen(!isMobileCategoriesOpen)
                  }
                  className="w-full flex items-center justify-between px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                >
                  <div className="flex items-center">
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 6h16M4 12h16M4 18h16"
                      />
                    </svg>
                    Categories
                  </div>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${isMobileCategoriesOpen ? "transform rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {isMobileCategoriesOpen && (
                  <div className="pl-12 space-y-1">
                    {loading ? (
                      <div className="px-4 py-2 text-gray-600">Loading...</div>
                    ) : visibleCategories.length === 0 ? (
                      <div className="px-4 py-2 text-gray-600">
                        No categories
                      </div>
                    ) : (
                      visibleCategories.map((category) => (
                        <button
                          key={category._id}
                          onClick={() =>
                            handleCategoryClick(category._id, category.name)
                          }
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-black rounded transition-colors duration-150 flex items-center justify-between"
                        >
                          <span>{category.name}</span>
                          <span
                            className="px-2 py-1 text-xs rounded-full border"
                            style={getBadgeStyle(category.type)}
                          >
                            {category.type || "General"}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Navigation Links (mobile) */}
              {["Home", "Shop", "About", "Contact", "FAQs"].map((item) => {
                const to =
                  item === "Home"
                    ? "/"
                    : item === "Shop"
                      ? "/shop"
                      : item === "About"
                        ? "/about"
                        : item === "Contact"
                          ? "/contact"
                          : "/faqs";

                return (
                  <Link
                    key={item}
                    to={to}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-100 hover:text-black rounded-lg transition-colors duration-150"
                  >
                    {item === "Home" && (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                        />
                      </svg>
                    )}
                    {item === "Shop" && (
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                        />
                      </svg>
                    )}
                    {item}
                  </Link>
                );
              })}

              {/* ============================================================ */}

              {/* Auth Links (mobile) */}
              <div className="pt-4 border-t border-gray-200">
                {isLoggedIn ? (
                  <>
                    <div className="px-4 py-3">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-linear-to-r from-gray-800 to-black rounded-full flex items-center justify-center text-white font-semibold text-sm mr-3">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {userName}
                          </p>
                          <p className="text-xs text-gray-600">Welcome back!</p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-150"
                    >
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center px-4 py-3 text-base font-medium text-gray-800 hover:bg-gray-100 hover:text-black rounded-lg transition-colors duration-150"
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                      />
                    </svg>
                    Login / Register
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom Navigation Bar (Desktop only) */}
      <div className="hidden lg:block bg-linear-to-r from-gray-900 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-8">
            {/* Logo */}
            <div className="flex items-center">
              <Link to="/" className="shrink-0 flex items-center py-4">
                <div className="text-2xl font-bold text-white">E-Commerce</div>
              </Link>
            </div>

            {/* Main Navigation Links */}
            <div className="flex items-center space-x-8">
              {["Home", "Shop", "About", "Contact", "FAQs"].map((item) => {
                const to =
                  item === "Home"
                    ? "/"
                    : item === "Shop"
                      ? "/shop"
                      : item === "About"
                        ? "/about"
                        : item === "Contact"
                          ? "/contact"
                          : "/faqs";

                return (
                  <NavLink
                    key={item}
                    to={to}
                    className={({ isActive }) =>
                      `py-4 font-medium transition-colors duration-200 ${
                        isActive
                          ? "text-white border-b-2 border-white"
                          : "text-gray-300 hover:text-white hover:border-b-2 hover:border-gray-400"
                      }`
                    }
                  >
                    {item}
                  </NavLink>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
