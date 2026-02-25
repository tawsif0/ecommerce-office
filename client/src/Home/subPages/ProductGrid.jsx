/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import {
  FiFilter,
  FiX,
  FiEye,
  FiGrid,
  FiList,
  FiChevronDown,
  FiChevronUp,
} from "react-icons/fi";
import { FaImage } from "react-icons/fa6";
import { motion } from "framer-motion";
const ProductGrid = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedCategoryType, setSelectedCategoryType] = useState("all");
  const [categoryName, setCategoryName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(5); // New state for limiting products
  const [allProductsVisible, setAllProductsVisible] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    const savedViewMode = localStorage.getItem("shopViewMode");
    return savedViewMode || "grid"; // Default to grid if nothing saved
  });
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [expandedFilters, setExpandedFilters] = useState({
    categories: true,
    types: true,
    price: true,
  });

  const baseUrl = import.meta.env.VITE_API_URL;
  const getCategoryIdFromProduct = (product) => {
    if (!product?.category) return null;
    return typeof product.category === "string"
      ? product.category
      : product.category._id || null;
  };
  const getProductDisplayPrice = (product) => {
    if (!product) return 0;
    if (String(product.priceType || "single") === "tba") return 0;

    if (
      String(product.marketplaceType || "simple") === "variable" &&
      Array.isArray(product.variations) &&
      product.variations.length > 0
    ) {
      const variationPrices = product.variations
        .filter((variation) => variation?.isActive !== false)
        .map((variation) => {
          const hasSalePrice =
            variation?.salePrice !== null &&
            variation?.salePrice !== undefined &&
            String(variation.salePrice).trim() !== "";
          if (hasSalePrice) {
            const salePrice = Number(variation.salePrice);
            if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
          }
          const regularPrice = Number(variation?.price);
          return Number.isFinite(regularPrice) && regularPrice >= 0 ? regularPrice : null;
        })
        .filter((price) => price !== null);

      if (variationPrices.length > 0) {
        return Math.min(...variationPrices);
      }
    }

    const hasSalePrice =
      String(product?.priceType || "single") === "best" &&
      product?.salePrice !== null &&
      product?.salePrice !== undefined &&
      String(product.salePrice).trim() !== "";
    if (hasSalePrice) {
      const salePrice = Number(product.salePrice);
      if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
    }

    const regularPrice = Number(product.price);
    if (Number.isFinite(regularPrice) && regularPrice >= 0) return regularPrice;

    return 0;
  };
  const getProductPricing = (product) => {
    const priceType = String(product?.priceType || "single");
    if (priceType === "tba") {
      return {
        priceType,
        isTba: true,
        currentPrice: null,
        previousPrice: null,
        hasDiscount: false,
      };
    }

    const currentPrice = getProductDisplayPrice(product);
    const previousPrice = Number(product?.price || currentPrice || 0);
    const hasDiscount =
      priceType === "best" &&
      Number.isFinite(previousPrice) &&
      previousPrice > Number(currentPrice || 0) &&
      Number(currentPrice || 0) > 0;

    return {
      priceType,
      isTba: false,
      currentPrice,
      previousPrice,
      hasDiscount,
    };
  };
  const getProductCardMetaLine = (product) =>
    product?.dimensions ? `Dim: ${product.dimensions}` : "";
  const visibleProducts = React.useMemo(() => products, [products]);
  const visibleCategories = React.useMemo(() => {
    return categories.filter((category) => {
      const hasProduct = visibleProducts.some(
        (product) => getCategoryIdFromProduct(product) === category._id,
      );
      return hasProduct;
    });
  }, [categories, visibleProducts]);
  const visibleCategoryTypes = React.useMemo(() => {
    const types = [];
    visibleCategories.forEach((category) => {
      if (category.type && !types.includes(category.type)) {
        types.push(category.type);
      }
    });
    return types;
  }, [visibleCategories]);

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem("shopViewMode", mode);
  };
  // Parse URL parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const categoryParam = params.get("category");
    const typeParam = params.get("type");
    const searchParam = params.get("search");

    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory("all");
    }

    if (typeParam) {
      setSelectedCategoryType(typeParam);
    } else {
      setSelectedCategoryType("all");
    }

    if (searchParam) {
      setSearchTerm(searchParam);
    } else {
      setSearchTerm("");
    }
  }, [location.search]);

  // Fetch products and categories
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Filter products when dependencies change
  useEffect(() => {
    if (products.length > 0 && categories.length > 0) {
      filterProducts();
    }
  }, [
    products,
    selectedCategory,
    selectedCategoryType,
    categories,
    sortBy,
    priceRange,
    visibleProducts,
  ]);
  useEffect(() => {
    // Reset display limit when filters change
    if (!allProductsVisible) {
      setDisplayLimit(5);
    }
  }, [selectedCategory, selectedCategoryType, priceRange, sortBy]);
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/products/public`);
        if (response.data.success) {
          const productsData = response.data.products || [];
          setProducts(productsData);

          // Set initial price range based on products
          const prices = productsData.map((p) => getProductDisplayPrice(p));
          const maxPrice = Math.max(...prices) > 0 ? Math.max(...prices) : 10000;
          setPriceRange([0, maxPrice]);
        }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${baseUrl}/categories/public`);
      if (response.data.success) {
        const categoriesData = response.data.categories || [];
        setCategories(categoriesData);

        const params = new URLSearchParams(location.search);
        const categoryParam = params.get("category");

        if (categoryParam) {
          const selectedCat = categoriesData.find(
            (cat) => cat._id === categoryParam,
          );
          if (selectedCat) {
            setCategoryName(selectedCat.name);
          } else {
            setCategoryName("");
          }
        } else {
          setCategoryName("");
        }
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const filterProducts = () => {
    let filtered = [...visibleProducts];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((product) => {
        if (!product.category) return false;

        let categoryId;
        if (typeof product.category === "string") {
          categoryId = product.category;
        } else if (product.category._id) {
          categoryId = product.category._id;
        } else {
          return false;
        }

        return categoryId === selectedCategory;
      });

      const selectedCat = categories.find(
        (cat) => cat._id === selectedCategory,
      );
      setCategoryName(selectedCat?.name || "");
    } else {
      setCategoryName("");
    }

    // Filter by category type
    if (selectedCategoryType !== "all") {
      filtered = filtered.filter((product) => {
        let category = null;
        if (product.category) {
          if (typeof product.category === "string") {
            category = categories.find((cat) => cat._id === product.category);
          } else if (product.category._id) {
            category = categories.find(
              (cat) => cat._id === product.category._id,
            );
          }
        }

        return category && category.type === selectedCategoryType;
      });
    }

    // Filter by search term
    const trimmedSearch = (searchTerm || "").trim().toLowerCase();
    if (trimmedSearch) {
      filtered = filtered.filter((product) => {
        const title = (product.title || "").toLowerCase();
        const description = (product.description || "").toLowerCase();
        const brand = (product.brand || "").toLowerCase();
        const productType = (product.productType || "").toLowerCase();
        const marketplaceType = (product.marketplaceType || "").toLowerCase();
        const vendorName = (
          (typeof product.vendor === "object" ? product.vendor?.storeName : "") ||
          ""
        ).toLowerCase();
        const categoryNameText =
          (typeof product.category === "object"
            ? product.category?.name
            : "") || "";

        return (
          title.includes(trimmedSearch) ||
          description.includes(trimmedSearch) ||
          brand.includes(trimmedSearch) ||
          productType.includes(trimmedSearch) ||
          marketplaceType.includes(trimmedSearch) ||
          vendorName.includes(trimmedSearch) ||
          categoryNameText.toLowerCase().includes(trimmedSearch)
        );
      });
    }

    // Filter by price range
    filtered = filtered.filter((product) => {
      if (String(product?.priceType || "single") === "tba") return true;
      const price = getProductDisplayPrice(product);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort products
    switch (sortBy) {
      case "price-low":
        filtered.sort((a, b) => getProductDisplayPrice(a) - getProductDisplayPrice(b));
        break;
      case "price-high":
        filtered.sort((a, b) => getProductDisplayPrice(b) - getProductDisplayPrice(a));
        break;
      case "name":
        filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
        break;
      case "featured":
      default:
        break;
    }

    setFilteredProducts(filtered);
  };

  const getFullImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (
      imagePath.startsWith("http://") ||
      imagePath.startsWith("https://") ||
      imagePath.startsWith("data:")
    ) {
      return imagePath;
    }
    if (imagePath.startsWith("/")) {
      return baseUrl ? `${baseUrl}${imagePath}` : imagePath;
    }
    return baseUrl
      ? `${baseUrl}/uploads/products/${imagePath}`
      : `/uploads/products/${imagePath}`;
  };

  // Helper function to get category type for a product
  const getCategoryTypeForProduct = (product) => {
    if (!product.category) return null;

    let category = null;
    if (typeof product.category === "string") {
      category = categories.find((cat) => cat._id === product.category);
    } else if (product.category._id) {
      category = categories.find((cat) => cat._id === product.category._id);
    }

    return category?.type || null;
  };

  // Helper function to get category name for a product
  const getCategoryNameForProduct = (product) => {
    if (!product.category) return null;

    let category = null;
    if (typeof product.category === "string") {
      category = categories.find((cat) => cat._id === product.category);
    } else if (product.category._id) {
      category = categories.find((cat) => cat._id === product.category._id);
    }

    return category?.name || null;
  };

  const getVendorForProduct = (product) => {
    if (!product?.vendor) return null;
    if (typeof product.vendor === "object") return product.vendor;
    return null;
  };

  const getVendorSummary = (vendor) => {
    if (!vendor) return "";
    const location = [vendor.city, vendor.country].filter(Boolean).join(", ");
    const rating =
      vendor.ratingAverage !== undefined && vendor.ratingAverage !== null
        ? `${Number(vendor.ratingAverage).toFixed(1)} (${vendor.ratingCount || 0})`
        : "";

    if (location && rating) return `${location} | Rating ${rating}`;
    if (location) return location;
    if (rating) return `Rating ${rating}`;
    return "";
  };

  const highlightText = (text, term) => {
    if (!text || !term) return text;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    const parts = String(text).split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span key={idx} className="bg-yellow-200 text-black px-0.5 rounded">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const resetFilters = () => {
    setSelectedCategory("all");
    setSelectedCategoryType("all");
    setCategoryName("");
    setSearchTerm("");
    setSortBy("featured");

    // Reset price range to initial values
    const prices = products.map((p) => getProductDisplayPrice(p));
    const maxPrice = Math.max(...prices) > 0 ? Math.max(...prices) : 10000;
    setPriceRange([0, maxPrice]);

    // Clear URL parameters
    navigate("/shop", { replace: true });
  };

  const toggleFilterSection = (section) => {
    setExpandedFilters((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const ProductImage = ({ src, alt, className = "" }) => {
    const [imgSrc, setImgSrc] = useState(getFullImageUrl(src));
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
      setImgSrc(getFullImageUrl(src));
      setHasError(false);
    }, [src]);

    const handleError = () => {
      setHasError(true);
      if (src && src.startsWith("/uploads/products/")) {
        const altUrl = `${baseUrl}${src}`;
        if (altUrl !== imgSrc) {
          setImgSrc(altUrl);
          setHasError(false);
        }
      }
    };

    if (hasError || !imgSrc) {
      return (
        <div
          className={`flex flex-col items-center justify-center bg-gray-100 text-gray-400 ${className}`}
        >
          <FaImage className="text-2xl mb-2" />
          <span className="text-xs">No Image</span>
        </div>
      );
    }

    const isRemote =
      imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://");

    return (
      <img
        src={imgSrc}
        alt={alt}
        className={`object-cover ${className}`}
        onError={handleError}
        crossOrigin={isRemote ? "anonymous" : undefined}
      />
    );
  };
  const handleViewMore = () => {
    if (!allProductsVisible) {
      // Show all products
      setAllProductsVisible(true);
      setDisplayLimit(filteredProducts.length);
    } else {
      // Show only 5 products
      setAllProductsVisible(false);
      setDisplayLimit(5);
    }
  };
  const LoadingSkeleton = () => (
    <section className=" bg-white py-4 md:py-8 lg:py-12">
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Desktop Filters Skeleton */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 animate-pulse rounded-2xl h-48"
                ></div>
              ))}
            </div>
          </div>

          {/* Products Grid Skeleton */}
          <div className="lg:col-span-3">
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-100 animate-pulse rounded-2xl h-64 sm:h-72 md:h-80"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );

  if (loading) return <LoadingSkeleton />;

  return (
    <section className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-linear-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 lg:px-8 py-4 md:py-6 lg:py-7">
          <div className="text-center mb-2 md:mb-3">
            <h1 className="text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-black mb-1.5 tracking-tight">
              <span className="bg-linear-to-r from-black to-gray-800 bg-clip-text text-transparent">
                Luxe Marketplace
              </span>
            </h1>
            <p className="text-gray-600 text-sm xs:text-base sm:text-lg max-w-2xl mx-auto px-2">
              Discover curated products from trusted marketplace vendors
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 xs:px-4 sm:px-6 pb-6 md:pb-8 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
          {/* Desktop Filters */}
          <div className="lg:col-span-1 hidden lg:block">
            <div className="bg-white rounded-2xl p-4 sm:p-6 border border-gray-200 shadow-sm sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-black">Filters</h3>
                {(selectedCategory !== "all" ||
                  selectedCategoryType !== "all" ||
                  sortBy !== "featured" ||
                  priceRange[1] <
                    Math.max(
                      ...products.map((p) => getProductDisplayPrice(p)),
                    )) && (
                  <button
                    onClick={resetFilters}
                    className="text-sm text-gray-500 hover:text-black transition-colors"
                  >
                    Reset All
                  </button>
                )}
              </div>

              {/* Categories */}
              <div className="mb-6 md:mb-8">
                <button
                  onClick={() => toggleFilterSection("categories")}
                  className="w-full flex items-center justify-between text-left font-semibold text-black mb-4"
                >
                  <span>Categories</span>
                  {expandedFilters.categories ? (
                    <FiChevronUp />
                  ) : (
                    <FiChevronDown />
                  )}
                </button>

                {expandedFilters.categories && (
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        navigate("/shop");
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategory === "all"
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      All Categories
                    </button>
                    {visibleCategories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => {
                          setSelectedCategory(category._id);
                          navigate(`/shop?category=${category._id}`);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                          selectedCategory === category._id
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        <span>{category.name}</span>
                        {category.type && (
                          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded">
                            {category.type}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Types */}
              <div className="mb-6 md:mb-8">
                <button
                  onClick={() => toggleFilterSection("types")}
                  className="w-full flex items-center justify-between text-left font-semibold text-black mb-4"
                >
                  <span>Category Type</span>
                  {expandedFilters.types ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {expandedFilters.types && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedCategoryType("all")}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedCategoryType === "all"
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      All Types
                    </button>
                    {visibleCategoryTypes.length > 0 ? (
                      visibleCategoryTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => setSelectedCategoryType(type)}
                          className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                            selectedCategoryType === type
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic px-3 py-2">
                        {visibleCategories.length > 0
                          ? "No category types defined"
                          : "Loading categories..."}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Price Range */}
              <div className="mb-6 md:mb-8">
                <button
                  onClick={() => toggleFilterSection("price")}
                  className="w-full flex items-center justify-between text-left font-semibold text-black mb-4"
                >
                  <span>Price Range</span>
                  {expandedFilters.price ? <FiChevronUp /> : <FiChevronDown />}
                </button>

                {expandedFilters.price && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>৳{priceRange[0].toFixed(2)}</span>
                      <span>৳{priceRange[1].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={
                        Math.max(
                          ...products.map((p) => getProductDisplayPrice(p)),
                        ) || 10000
                      }
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value)])
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
              </div>

              {/* Results Info */}
              <div className="pt-4 sm:pt-6 border-t border-gray-200 text-sm text-gray-600">
                <div className="text-center">
                  Showing {filteredProducts.length} of {products.length}{" "}
                  products
                </div>
              </div>
            </div>
          </div>

          {/* Products Section */}
          <div className="lg:col-span-3">
            {/* Mobile Filter Toggle & Controls */}
            <div className="lg:hidden mb-6">
              <div className="flex items-center justify-between gap-4">
                <button
                  onClick={() => setShowMobileFilters(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-full text-sm"
                >
                  <FiFilter /> Filters
                  {(selectedCategory !== "all" ||
                    selectedCategoryType !== "all") && (
                    <span className="ml-1 bg-white text-black text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      !
                    </span>
                  )}
                </button>

                <div className="flex items-center gap-3">
                  {/* View Mode */}
                  <div className="hidden xs:flex items-center gap-1 bg-gray-100 rounded-full p-1">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={`p-1.5 sm:p-2 rounded-full ${
                        viewMode === "grid"
                          ? "bg-black text-white"
                          : "text-gray-600"
                      }`}
                    >
                      <FiGrid className="text-sm sm:text-base" />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`p-1.5 sm:p-2 rounded-full ${
                        viewMode === "list"
                          ? "bg-black text-white"
                          : "text-gray-600"
                      }`}
                    >
                      <FiList className="text-sm sm:text-base" />
                    </button>
                  </div>

                  {/* Sort Dropdown */}
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none px-3 py-2.5 text-sm border border-gray-300 rounded-full bg-white text-gray-700 focus:outline-none focus:border-black pr-8"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-low">Price: Low to High</option>
                      <option value="price-high">Price: High to Low</option>
                      <option value="name">Name: A to Z</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <FiChevronDown />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-xl xs:text-2xl font-bold text-black">
                  {selectedCategory !== "all" && categoryName
                    ? `${categoryName} Products`
                    : "All Products"}
                </h2>
                <p className="text-gray-600 mt-1 text-sm">
                  {filteredProducts.length} products found
                  {selectedCategoryType !== "all" &&
                    ` in ${selectedCategoryType}`}
                </p>
                {searchTerm && (
                  <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-900 text-xs sm:text-sm font-semibold">
                    Showing results for
                    <span className="bg-yellow-200 text-black px-2 py-0.5 rounded">
                      {searchTerm}
                    </span>
                  </div>
                )}
              </div>

              {/* Desktop Controls */}
              <div className="hidden lg:flex items-center gap-4">
                <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1">
                  <button
                    onClick={() => handleSetViewMode("grid")}
                    className={`p-2 rounded-full ${
                      viewMode === "grid"
                        ? "bg-black text-white"
                        : "text-gray-600"
                    }`}
                  >
                    <FiGrid />
                  </button>
                  <button
                    onClick={() => handleSetViewMode("list")}
                    className={`p-2 rounded-full ${
                      viewMode === "list"
                        ? "bg-black text-white"
                        : "text-gray-600"
                    }`}
                  >
                    <FiList />
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-full bg-white text-gray-700 focus:outline-none focus:border-black"
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <h3 className="text-xl sm:text-2xl font-bold text-black mb-3 sm:mb-4">
                  No Products Found
                </h3>
                <p className="text-gray-600 mb-6 text-sm sm:text-base">
                  {selectedCategory !== "all" || selectedCategoryType !== "all"
                    ? "No products found with the current filters"
                    : "Try adjusting your filters or check back later for new arrivals"}
                </p>
                <button
                  onClick={resetFilters}
                  className="px-5 sm:px-6 py-2.5 sm:py-3 bg-black text-white rounded-full hover:bg-gray-900 transition-colors text-sm sm:text-base"
                >
                  Reset Filters
                </button>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <>
                <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {filteredProducts.slice(0, displayLimit).map((product) => {
                    const categoryType = getCategoryTypeForProduct(product);
                    const categoryName = getCategoryNameForProduct(product);
                    const vendor = getVendorForProduct(product);
                    const pricing = getProductPricing(product);
                    const vendorName = vendor?.storeName
                      ? `Sold by ${vendor.storeName}`
                      : "";
                    const productMetaLine = getProductCardMetaLine(product);
                    const metaSummary = [
                      getVendorSummary(vendor),
                      product.marketplaceType
                        ? `Type: ${product.marketplaceType}`
                        : null,
                      product.showStockToPublic === true
                        ? `Stock: ${Number(product.stock || 0)}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" | ");
                    const previewColors = Array.isArray(product.colors)
                      ? product.colors.slice(0, 4)
                      : [];
                    const hasMoreColors =
                      Array.isArray(product.colors) && product.colors.length > 4;

                    return (
                      <div
                        key={product._id}
                        className="group relative flex flex-col h-[300px] sm:h-[330px] md:h-[350px] rounded-2xl border border-gray-200/80 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_40px_rgba(15,23,42,0.12)]"
                      >
                        {/* Product Image */}
                        <div
                          className="relative overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-100 p-2 sm:p-3 cursor-pointer"
                          onClick={() => {
                            navigate(`/product/${product._id}`);
                            window.scrollTo(0, 0);
                          }}
                        >
                          <div className="aspect-square rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-200/60">
                            <ProductImage
                              src={product.images?.[0]}
                              alt={product.title}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                          </div>

                          {/* Category Badge */}
                          {categoryName && (
                            <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1 bg-black text-white text-[10px] sm:text-xs font-semibold rounded-full shadow-sm">
                                {categoryName}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Product Info */}
                        <div className="flex flex-col px-3 pb-3 pt-2 sm:px-3.5 sm:pb-3 sm:pt-2.5 flex-1">
                          <div className="space-y-1">
                            <h3
                              className="font-semibold text-black line-clamp-2 text-xs sm:text-sm cursor-pointer hover:text-gray-700 tracking-tight leading-tight"
                              onClick={() => navigate(`/product/${product._id}`)}
                            >
                              {highlightText(product.title, searchTerm)}
                            </h3>
                            {vendor?.slug ? (
                              <button
                                onClick={() => navigate(`/store/${vendor.slug}`)}
                                className="self-start text-[10px] sm:text-[11px] text-gray-500 hover:text-black line-clamp-1"
                              >
                                {vendorName || "Sold by Vendor"}
                              </button>
                            ) : vendorName ? (
                              <p className="self-start text-[10px] sm:text-[11px] text-gray-500 line-clamp-1">
                                {vendorName}
                              </p>
                            ) : null}
                            {metaSummary ? (
                              <p className="text-[10px] sm:text-[11px] text-gray-400 line-clamp-1">
                                {metaSummary}
                              </p>
                            ) : null}
                            {productMetaLine ? (
                              <p className="text-[10px] sm:text-[11px] text-gray-500 line-clamp-1">
                                {productMetaLine}
                              </p>
                            ) : null}
                            {previewColors.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {previewColors.map((color, idx) => (
                                  <div
                                    key={idx}
                                    className="w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border border-gray-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                                {hasMoreColors ? (
                                  <span className="inline-flex items-center justify-center min-w-[1.05rem] h-[1.05rem] sm:min-w-[1.2rem] sm:h-[1.2rem] rounded-full bg-linear-to-br from-black to-gray-700 text-white text-[8px] sm:text-[9px] font-bold shadow-sm">
                                    4+
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          {/* Price & Action */}
                          <div className="mt-auto pt-2 border-t border-gray-100 flex flex-col xs:flex-row xs:items-center xs:justify-between gap-2">
                            <div>
                              {pricing.isTba ? (
                                <div className="text-sm sm:text-base font-bold text-black leading-none">
                                  TBA
                                </div>
                              ) : (
                                <div className="flex items-baseline gap-2">
                                  {pricing.hasDiscount && (
                                    <span className="text-xs sm:text-sm text-gray-400 line-through">
                                      {`${pricing.previousPrice.toFixed(2)} TK`}
                                    </span>
                                  )}
                                  <div className="text-sm sm:text-base font-bold text-black leading-none">
                                    {`${Number(pricing.currentPrice || 0).toFixed(2)} TK`}
                                  </div>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                navigate(`/product/${product._id}`);
                                window.scrollTo(0, 0);
                              }}
                              className="cursor-pointer w-full xs:w-auto h-8 px-3 sm:px-3.5 bg-black text-white rounded-full text-[11px] sm:text-xs font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-1 sm:gap-2"
                            >
                              <FiEye className="text-xs sm:text-sm" />
                              <span className="hidden xs:inline">
                                View Details
                              </span>
                              <span className="xs:hidden">View</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {filteredProducts.length > 5 && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleViewMore}
                      className="px-6 py-3 bg-gray-900 text-white rounded-full font-semibold hover:bg-black transition-colors text-sm sm:text-base"
                    >
                      {allProductsVisible ? (
                        <>
                          <FiChevronUp className="inline mr-2" />
                          Show Less Products
                        </>
                      ) : (
                        <>
                          View More Products ({filteredProducts.length - 5}{" "}
                          more)
                          <FiChevronDown className="inline ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* List View */
              <>
                <div className="grid gap-4 md:gap-6">
                  {filteredProducts
                    .slice(0, displayLimit)
                    .map((product, index) => {
                      const categoryType = getCategoryTypeForProduct(product);
                      const vendor = getVendorForProduct(product);
                      const pricing = getProductPricing(product);
                      const productTypeLabel = String(product.productType || "")
                        .trim();
                      const categoryTypeLabel = String(categoryType || "")
                        .trim();
                      const showProductTypeBadge = Boolean(productTypeLabel);
                      const showCategoryTypeBadge = Boolean(categoryTypeLabel) &&
                        categoryTypeLabel.toLowerCase() !==
                          productTypeLabel.toLowerCase();
                      return (
                        <motion.div
                          key={product._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:shadow-xl transition-all duration-500 overflow-hidden hover:-translate-y-1 cursor-pointer"
                          onClick={() => {
                            navigate(`/product/${product._id}`);
                            window.scrollTo(0, 0);
                          }}
                        >
                          <div className="flex flex-col lg:flex-row lg:h-64">
                            {/* Image - Left Side */}
                            <div className="relative lg:shrink-0 overflow-hidden">
                              <div className="w-full h-64 lg:h-full p-6 flex items-center justify-center">
                                <div className="relative w-full h-full lg:w-52 lg:h-52 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 mx-auto">
                                  <ProductImage
                                    src={product.images && product.images[0]}
                                    alt={product.title}
                                    className="w-full h-full object-cover"
                                  />
                                  {!product.images?.[0] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-gray-100 to-gray-200">
                                      <div className="text-center text-gray-400 p-6">
                                        <svg
                                          className="w-16 h-16 mx-auto mb-2"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                          />
                                        </svg>
                                        <p className="text-sm font-medium">
                                          No Image
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Content - Right Side */}
                            <div className="flex-1 p-6 lg:pl-2">
                              <div className="flex flex-col h-full">
                                {/* Header */}
                                <div className="flex-1">
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1 min-w-0 pr-4">
                                      <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-1 hover:text-black transition-colors group-hover:underline">
                                        {highlightText(product.title, searchTerm)}
                                      </h2>
                                      {vendor?.slug && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/store/${vendor.slug}`);
                                          }}
                                          className="text-xs text-gray-500 hover:text-black mb-3"
                                        >
                                          Sold by {vendor.storeName || "Vendor"}
                                        </button>
                                      )}
                                      {!vendor?.slug && vendor?.storeName && (
                                        <p className="text-xs text-gray-500 mb-3">
                                          Sold by {vendor.storeName}
                                        </p>
                                      )}
                                      {vendor && getVendorSummary(vendor) && (
                                        <p className="text-xs text-gray-400 -mt-2 mb-3">
                                          {getVendorSummary(vendor)}
                                        </p>
                                      )}

                                      {/* Category & Price Badges */}
                                      <div className="flex flex-wrap items-center gap-2 mb-4">
                                        {product.category?.name && (
                                          <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                                            {product.category.name}
                                          </span>
                                        )}
                                        {showProductTypeBadge && (
                                          <span className="px-3 py-1.5 bg-indigo-100 text-indigo-800 text-xs font-semibold rounded-lg">
                                            {productTypeLabel}
                                          </span>
                                        )}
                                        {product.marketplaceType && (
                                          <span className="px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg capitalize">
                                            {product.marketplaceType}
                                          </span>
                                        )}
                                        {product.showStockToPublic === true && (
                                          <span className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg">
                                            Stock: {Number(product.stock || 0)}
                                          </span>
                                        )}

                                        <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                                          {product.brand}
                                        </span>
                                        {showCategoryTypeBadge && (
                                          <span className=" bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                                            {categoryTypeLabel}
                                          </span>
                                        )}
                                      </div>

                                      {/* Description */}
                                      {product.description && (
                                        <p className="text-gray-600 leading-relaxed line-clamp-2 text-sm mb-4">
                                          {highlightText(
                                            product.description,
                                            searchTerm,
                                          )}
                                        </p>
                                      )}

                                      {/* Colors & Dimensions */}
                                      {(product.colors &&
                                        product.colors.length > 0) ||
                                      product.dimensions ? (
                                        <div className="flex flex-col gap-2 mb-6">
                                          {product.colors &&
                                            product.colors.length > 0 && (
                                              <div className="flex items-center gap-3">
                                                <span className="text-xs font-medium text-gray-500 whitespace-nowrap">
                                                  Colors:
                                                </span>
                                                <div className="flex gap-1.5 -space-x-1">
                                                  {product.colors
                                                    .slice(0, 4)
                                                    .map((color, idx) => (
                                                      <div
                                                        key={idx}
                                                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                                                        style={{
                                                          backgroundColor:
                                                            color,
                                                        }}
                                                        title={color}
                                                      />
                                                    ))}
                                                  {product.colors.length > 4 ? (
                                                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-linear-to-br from-black to-gray-700 text-white text-[8px] font-bold shadow-sm">
                                                      4+
                                                    </span>
                                                  ) : null}
                                                </div>
                                              </div>
                                            )}
                                          {product.dimensions && (
                                            <div className="text-xs font-medium text-gray-500">
                                              Dim: {product.dimensions}
                                            </div>
                                          )}
                                        </div>
                                      ) : null}
                                    </div>

                                    {/* Price & View Button - Right Aligned */}
                                    <div className="flex flex-col items-end gap-4 mt-2 lg:mt-0 lg:text-right">
                                      {pricing.isTba ? (
                                        <div className="text-2xl font-bold text-black whitespace-nowrap">
                                          TBA
                                        </div>
                                      ) : (
                                        <div className="flex items-baseline gap-2 whitespace-nowrap">
                                          {pricing.hasDiscount && (
                                            <span className="text-sm text-gray-400 line-through">
                                              {`${pricing.previousPrice.toFixed(2)} TK`}
                                            </span>
                                          )}
                                          <div className="text-2xl font-bold text-black">
                                            {`${Number(pricing.currentPrice || 0).toFixed(2)} TK`}
                                          </div>
                                        </div>
                                      )}
                                      {/* View Details Button - Under Price */}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation(); // Prevent card click
                                          navigate(`/product/${product._id}`);
                                          window.scrollTo(0, 0);
                                        }}
                                        className="w-full lg:w-auto bg-gray-600 text-white py-2 px-6 rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl hover:bg-gray-800 transition-all duration-300 whitespace-nowrap"
                                      >
                                        View Details →
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                </div>
                {filteredProducts.length > 5 && (
                  <div className="text-center mt-8">
                    <button
                      onClick={handleViewMore}
                      className="px-6 py-3 bg-gray-900 text-white rounded-full font-semibold hover:bg-black transition-colors text-sm sm:text-base"
                    >
                      {allProductsVisible ? (
                        <>
                          <FiChevronUp className="inline mr-2" />
                          Show Less Products
                        </>
                      ) : (
                        <>
                          View More Products ({filteredProducts.length - 5}{" "}
                          more)
                          <FiChevronDown className="inline ml-2" />
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}

            {/* Results Info */}
            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-200 text-center text-gray-600 text-sm sm:text-base">
              Showing {filteredProducts.length} of {products.length} products
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Filters Modal */}
      {showMobileFilters && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-70 lg:hidden">
          <div className="absolute right-0 top-0 h-full w-full max-w-xs sm:max-w-sm bg-white overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-black">Filters</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <FiX className="text-xl" />
                </button>
              </div>

              {/* Mobile filter content */}
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-black mb-3">Categories</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    <button
                      onClick={() => {
                        setSelectedCategory("all");
                        navigate("/shop");
                        setShowMobileFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg ${
                        selectedCategory === "all"
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      All Categories
                    </button>
                    {visibleCategories.map((category) => (
                      <button
                        key={category._id}
                        onClick={() => {
                          setSelectedCategory(category._id);
                          navigate(`/shop?category=${category._id}`);
                          setShowMobileFilters(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg ${
                          selectedCategory === category._id
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-black mb-3">
                    Category Type
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                    <button
                      onClick={() => {
                        setSelectedCategoryType("all");
                        setShowMobileFilters(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg ${
                        selectedCategoryType === "all"
                          ? "bg-black text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      All Types
                    </button>
                    {visibleCategoryTypes.length > 0 ? (
                      visibleCategoryTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            setSelectedCategoryType(type);
                            setShowMobileFilters(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg ${
                            selectedCategoryType === type
                              ? "bg-gray-900 text-white"
                              : "text-gray-600 hover:bg-gray-100"
                          }`}
                        >
                          {type}
                        </button>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500 italic px-3 py-2">
                        {categories.length > 0
                          ? "No category types defined"
                          : "Loading categories..."}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Range in Mobile */}
                <div>
                  <h4 className="font-semibold text-black mb-3">Price Range</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <span>৳{priceRange[0].toFixed(2)}</span>
                      <span>৳{priceRange[1].toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={
                        Math.max(
                          ...products.map((p) => getProductDisplayPrice(p)),
                        ) || 10000
                      }
                      value={priceRange[1]}
                      onChange={(e) =>
                        setPriceRange([priceRange[0], parseInt(e.target.value)])
                      }
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      resetFilters();
                      setShowMobileFilters(false);
                    }}
                    className="flex-1 py-3 bg-gray-100 text-black rounded-full font-semibold text-sm"
                  >
                    Reset All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ProductGrid;




