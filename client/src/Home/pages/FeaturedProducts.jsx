/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTag, FaArrowRight, FaStar, FaEye } from "react-icons/fa6";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FaShoppingBag, FaShoppingCart } from "react-icons/fa";
import { FiEye } from "react-icons/fi";
import { getProductPricingDisplay } from "../../utils/productPricing";

const baseUrl = import.meta.env.VITE_API_URL;
const getCardMetaLine = (product) => (product?.dimensions ? `Dim: ${product.dimensions}` : "");

// Helper function to get full image URL
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

  if (imagePath && !imagePath.startsWith("/")) {
    return baseUrl
      ? `${baseUrl}/uploads/products/${imagePath}`
      : `/uploads/products/${imagePath}`;
  }

  return null;
};

// Simple fallback image component
const FallbackImage = ({ className, alt }) => (
  <div
    className={`${className} bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center`}
  >
    <svg
      className="w-8 h-8 text-gray-300"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
    <span className="sr-only">{alt || "No image available"}</span>
  </div>
);

// Image component with proper fallback
const ProductImage = ({ src, alt, className, onClick }) => {
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
      <div onClick={onClick} className="cursor-pointer">
        <FallbackImage className={className} alt={alt} />
      </div>
    );
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={`${className} cursor-pointer`}
      onClick={onClick}
      onError={handleError}
      crossOrigin={
        imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://")
          ? "anonymous"
          : undefined
      }
    />
  );
};

const FeaturedProducts = () => {
  const [groupedProducts, setGroupedProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingBuyNow, setProcessingBuyNow] = useState(null);
  const [activeCategory, setActiveCategory] = useState(null);
  const [showAllProducts, setShowAllProducts] = useState({});
  const navigate = useNavigate();

  // Fetch General products using PUBLIC route
  const fetchGeneralProducts = async () => {
    try {
      const response = await axios.get(
        `${baseUrl}/products/public/type/General`,
      );

      let productsData = [];
      if (response.data.success) {
        productsData = response.data.products || [];
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      }

      // Add random ratings for demo
      return productsData.map((product) => ({
        ...product,
      }));
    } catch (err) {
      console.error("Error fetching general products:", err);
      toast.error("Failed to load general products", {
        autoClose: 3000,
      });
      return [];
    }
  };

  // Group General type products by category
  const groupProductsByCategory = (productsList) => {
    const grouped = {};

    productsList.forEach((product) => {
      const productCategory = product.category;

      if (!productCategory) return;

      let categoryId, categoryName;

      if (typeof productCategory === "object" && productCategory._id) {
        categoryId = productCategory._id;
        categoryName = productCategory.name || "General";
      } else if (productCategory) {
        categoryId = productCategory;
        categoryName = "General";
      } else {
        return;
      }

      if (!grouped[categoryId]) {
        grouped[categoryId] = {
          categoryName: categoryName,
          products: [],
        };
      }

      // Extract colors properly - handle both array and string formats
      let colorsArray = [];
      if (product.colors) {
        if (Array.isArray(product.colors)) {
          colorsArray = product.colors;
        } else if (typeof product.colors === "string") {
          // Try to parse if it's a JSON string
          try {
            const parsedColors = JSON.parse(product.colors);
            if (Array.isArray(parsedColors)) {
              colorsArray = parsedColors;
            }
          } catch (e) {
            // If not JSON, split by comma or treat as single color
            colorsArray = product.colors.split(",").map((c) => c.trim());
          }
        }
      }

      grouped[categoryId].products.push({
        id: product._id,
        title: product.title,
        price: product.price || 0,
        salePrice: product.salePrice ?? null,
        priceType: product.priceType || "single",
        image:
          product.images && product.images.length > 0
            ? product.images[0]
            : null,
        brand: product.brand,
        category: product.category,
        productType: product.productType,
        colors: colorsArray, // Use the properly extracted colors array
        dimensions: product.dimensions || "",
      });
    });

    return grouped;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productsData = await fetchGeneralProducts();
        const grouped = groupProductsByCategory(productsData);
        setGroupedProducts(grouped);

        // Initialize showAllProducts state
        const initialState = {};
        Object.keys(grouped).forEach((categoryId) => {
          initialState[categoryId] = false;
        });
        setShowAllProducts(initialState);

        // Set first category as active
        const firstCategory = Object.keys(grouped)[0];
        if (firstCategory) {
          setActiveCategory(firstCategory);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load data", {
          autoClose: 3000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleViewDetails = (id) => {
    navigate(`/product/${id}`);
  };

  // Function to handle Buy Now
  const handleBuyNow = async (productId) => {
    if (processingBuyNow === productId) return;

    setProcessingBuyNow(productId);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please login to proceed with purchase", {
          autoClose: 3000,
        });
        navigate("/login");
        return;
      }

      const response = await axios.post(
        `${baseUrl}/cart`,
        {
          productId: productId,
          quantity: 1,
          color: "",
          dimensions: "",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.data.success) {
        toast.success("Added to cart! Redirecting to checkout...", {
          autoClose: 2000,
        });

        setTimeout(() => {
          navigate("/checkout");
        }, 1000);
      } else {
        throw new Error(response.data.message || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Error in Buy Now:", err);
      toast.error(
        err.response?.data?.message || err.message || "Failed to proceed",
        {
          autoClose: 3000,
        },
      );
    } finally {
      setProcessingBuyNow(null);
    }
  };

  const toggleShowAll = (categoryId) => {
    setShowAllProducts((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // Calculate grid classes based on product count and expanded state
  const getGridClasses = () =>
    "flex flex-wrap justify-center items-stretch gap-2 sm:gap-3";

  // Get product count to display
  const getDisplayProducts = (products, isExpanded) => {
    if (isExpanded) return products;
    return products.slice(0, 3);
  };

  if (loading) {
    return (
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-4">
              <FaShoppingBag className="w-6 h-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-600">
              Loading Products
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Organizing by categories...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!loading && Object.keys(groupedProducts).length === 0) {
    return null;
  }

  const categories = Object.keys(groupedProducts);
  const currentCategory = activeCategory
    ? groupedProducts[activeCategory]
    : null;
  const isExpanded = activeCategory ? showAllProducts[activeCategory] : false;
  const displayProducts = currentCategory
    ? getDisplayProducts(currentCategory.products, isExpanded)
    : [];
  const productCount = displayProducts.length;

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center">
              <FaShoppingBag className="w-4 h-4 text-white" />
            </div>
            <span className="text-xs font-semibold text-gray-600 tracking-wider uppercase">
              Featured Collections
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-black mb-3 md:mb-4">
            General Products
          </h2>

          <div className="max-w-xl mx-auto">
            <p className="text-sm md:text-base text-gray-600 leading-relaxed">
              Explore our curated collection of premium products organized by
              category.
            </p>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mb-8 md:mb-10">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((categoryId) => {
              const category = groupedProducts[categoryId];
              const isActive = activeCategory === categoryId;

              return (
                <button
                  key={categoryId}
                  onClick={() => setActiveCategory(categoryId)}
                  className={`px-3 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                    isActive
                      ? "bg-black text-white shadow-md"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm"
                  }`}
                >
                  <span className="font-medium text-sm">
                    {category.categoryName}
                  </span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {category.products.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Category Section */}
        {currentCategory && (
          <div className="mb-10 md:mb-12">
            {/* Category Header */}

            {/* Products Grid - Intelligently Centered */}
            <div className={`${getGridClasses(productCount, isExpanded)}`}>
              {displayProducts.map((product, index) => {
                const isProcessing = processingBuyNow === product.id;
                const pricing = getProductPricingDisplay(product);
                const previewColors = Array.isArray(product.colors)
                  ? product.colors.slice(0, 4)
                  : [];
                const hasMoreColors =
                  Array.isArray(product.colors) && product.colors.length > 4;
                const cardMetaLine = getCardMetaLine(product);

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-xl sm:rounded-2xl border border-gray-200 hover:shadow-xl sm:hover:shadow-2xl transition-all duration-300 overflow-hidden w-full h-[300px] sm:h-[330px] md:h-[350px] flex flex-col basis-[calc(33.333%-0.5rem)] sm:basis-[calc(33.333%-0.75rem)] md:basis-[calc(25%-0.75rem)] lg:basis-[calc(20%-0.75rem)]"
                    style={{
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {/* Product Image */}
                    <div
                      className="relative overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-100 p-2 sm:p-3 cursor-pointer"
                      onClick={() => {
                        navigate(`/product/${product.id}`);
                        window.scrollTo(0, 0);
                      }}
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-gray-200/60">
                        <ProductImage
                          src={product.image}
                          alt={product.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-3 sm:p-4 flex flex-col flex-1">
                      <div className="space-y-1">
                        <h3
                          className="font-semibold text-black line-clamp-2 text-xs sm:text-sm cursor-pointer hover:text-gray-700 leading-tight"
                          onClick={() => navigate(`/product/${product.id}`)}
                        >
                          {product.title}
                        </h3>
                        {product.brand ? (
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {`Brand: ${product.brand}`}
                          </p>
                        ) : null}
                        {previewColors.length > 0 || cardMetaLine ? (
                          <div className="flex items-center gap-2">
                            {previewColors.length > 0 ? (
                              <div className="flex items-center gap-1 shrink-0">
                                {previewColors.map((color, idx) => (
                                  <div
                                    key={idx}
                                    className="w-3 h-3 rounded-full border border-gray-300"
                                    style={{ backgroundColor: color }}
                                    title={color}
                                  />
                                ))}
                                {hasMoreColors ? (
                                  <span className="inline-flex items-center justify-center min-w-[1.05rem] h-[1.05rem] rounded-full bg-linear-to-br from-black to-gray-700 text-white text-[8px] font-bold shadow-sm">
                                    4+
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                            {cardMetaLine ? (
                              <p className="text-xs text-gray-500 line-clamp-1">
                                {cardMetaLine}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      {/* Fixed Footer */}
                      <div className="mt-auto pt-2 border-t border-gray-100 flex flex-col gap-2">
                        <div>
                          {pricing.isTba ? (
                            <div className="text-sm sm:text-base font-semibold text-gray-700">
                              TBA
                            </div>
                          ) : pricing.hasDiscount ? (
                            <div className="flex items-center gap-2">
                              <div className="text-xs text-gray-500 line-through">
                                ৳{Number(pricing.previousPrice || 0).toFixed(2)}
                              </div>
                              <div className="text-sm sm:text-base font-bold text-black">
                                ৳{Number(pricing.currentPrice || 0).toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            <div className="text-sm sm:text-base font-bold text-black">
                              ৳{Number(pricing.currentPrice || 0).toFixed(2)}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            navigate(`/product/${product.id}`);
                            window.scrollTo(0, 0);
                          }}
                          className="cursor-pointer w-full h-8 px-3 sm:px-4 bg-gray-600 text-white rounded-full text-xs sm:text-sm font-semibold hover:bg-gray-900 transition-colors flex items-center justify-center gap-1 sm:gap-2"
                        >
                          <FiEye className="text-xs sm:text-sm" />
                          <span className="hidden xs:inline">View Details</span>
                          <span className="xs:hidden">View</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom View All Button - Only show when not expanded */}
            {/* View All / Show Less Button - Always show if more than 3 products */}
            {currentCategory.products.length > 3 && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => toggleShowAll(activeCategory)}
                  className="group inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black transition-all duration-300 hover:shadow-lg"
                >
                  <span className="text-sm font-medium">
                    {isExpanded
                      ? "Show Less"
                      : `View All ${currentCategory.products.length} Products`}
                  </span>
                  <FaArrowRight
                    className={`w-3 h-3 transition-transform ${
                      isExpanded
                        ? "rotate-180 group-hover:-translate-x-1"
                        : "group-hover:translate-x-1"
                    }`}
                  />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {currentCategory && currentCategory.products.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaShoppingBag className="w-8 h-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 mb-2">
              No Products Available
            </h4>
            <p className="text-gray-600 text-sm max-w-md mx-auto mb-6">
              We're currently updating this category with exciting new products.
            </p>
            <button
              onClick={() => navigate("/shop")}
              className="px-6 py-2.5 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
            >
              Browse All Products
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default FeaturedProducts;

