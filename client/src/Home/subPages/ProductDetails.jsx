/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaHeart,
  FaShare,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaTruck,
  FaUndo,
} from "react-icons/fa";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

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
  <div className={`${className} bg-gray-100 flex items-center justify-center`}>
    <svg
      className="w-12 h-12 text-gray-400"
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
const ProductImage = ({ src, alt, className, isCurrent = false }) => {
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
    return <FallbackImage className={className} alt={alt} />;
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      crossOrigin={
        imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://")
          ? "anonymous"
          : undefined
      }
    />
  );
};

const ProductDetails = () => {
  const { id } = useParams();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedVariationId, setSelectedVariationId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [product, setProduct] = useState(null);
  const [productLoading, setProductLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ ratingAverage: 0, ratingCount: 0 });
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [myReview, setMyReview] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const { addToCart, isLoading: cartLoading } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  useEffect(() => {
    if (!id) return;

    const loadReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await axios.get(`${baseUrl}/products/public/${id}/reviews`);
        setReviews(response.data?.reviews || []);
        setReviewSummary(
          response.data?.summary || {
            ratingAverage: Number(product?.ratingAverage || 0),
            ratingCount: Number(product?.ratingCount || 0),
          },
        );
      } catch (error) {
        setReviews([]);
        setReviewSummary({
          ratingAverage: Number(product?.ratingAverage || 0),
          ratingCount: Number(product?.ratingCount || 0),
        });
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [id, product?.ratingAverage, product?.ratingCount]);

  useEffect(() => {
    if (!id || !isLoggedIn) {
      setMyReview(null);
      setReviewForm({ rating: 5, title: "", comment: "" });
      return;
    }

    const loadMyReview = async () => {
      try {
        const response = await axios.get(`${baseUrl}/products/${id}/reviews/me`, {
          headers: getAuthHeaders(),
        });
        const review = response.data?.review || null;
        setMyReview(review);
        if (review) {
          setReviewForm({
            rating: Number(review.rating || 5),
            title: review.title || "",
            comment: review.comment || "",
          });
        } else {
          setReviewForm({ rating: 5, title: "", comment: "" });
        }
      } catch (_error) {
        setMyReview(null);
        setReviewForm({ rating: 5, title: "", comment: "" });
      }
    };

    loadMyReview();
  }, [id, isLoggedIn]);

  // Fetch product details
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setProductLoading(true);
        const response = await axios.get(`${baseUrl}/products/public/${id}`);

        const productData =
          response.data.product || response.data.data || response.data;

        if (productData) {
          setProduct(productData);

          // Set default selections
          if (productData.colors && productData.colors.length > 0) {
            setSelectedColor(productData.colors[0]);
          }

          if (
            productData.marketplaceType === "variable" &&
            Array.isArray(productData.variations) &&
            productData.variations.length > 0
          ) {
            setSelectedVariationId(String(productData.variations[0]._id || ""));
          }
        }
      } catch (err) {
        console.error("Error fetching product:", err);
        toast.error("Failed to load product details", {
          autoClose: 3000,
        });
      } finally {
        setProductLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  useEffect(() => {
    if (!id || !isLoggedIn) {
      setIsWishlisted(false);
      return;
    }

    const checkWishlist = async () => {
      try {
        const response = await axios.get(`${baseUrl}/wishlist/check/${id}`, {
          headers: getAuthHeaders(),
        });
        setIsWishlisted(Boolean(response.data?.isWishlisted));
      } catch (_error) {
        setIsWishlisted(false);
      }
    };

    checkWishlist();
  }, [id, isLoggedIn]);

  const marketplaceType = String(product?.marketplaceType || "simple");
  const priceType = String(product?.priceType || "single");
  const isTbaPrice = priceType === "tba";
  const isRecurringProduct = Boolean(product?.isRecurring);
  const showPublicStock = Boolean(product?.showStockToPublic);
  const selectedVariation =
    marketplaceType === "variable"
      ? (product?.variations || []).find(
          (variation) => String(variation?._id || "") === String(selectedVariationId || ""),
        ) || null
      : null;

  // Get current price based on marketplace type
  const getCurrentPrice = () => {
    if (!product) return 0;

    if (marketplaceType === "variable" && selectedVariation) {
      const hasVariationSalePrice =
        selectedVariation?.salePrice !== null &&
        selectedVariation?.salePrice !== undefined &&
        String(selectedVariation.salePrice).trim() !== "";
      const salePrice = hasVariationSalePrice ? Number(selectedVariation.salePrice) : NaN;
      const regularPrice = Number(selectedVariation.price);
      if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
      if (Number.isFinite(regularPrice) && regularPrice >= 0) return regularPrice;
    }

    const hasSalePrice =
      String(product?.priceType || "single") === "best" &&
      product?.salePrice !== null &&
      product?.salePrice !== undefined &&
      String(product.salePrice).trim() !== "";
    const salePrice = hasSalePrice ? Number(product.salePrice) : NaN;
    const regularPrice = Number(product.price);
    if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
    if (Number.isFinite(regularPrice) && regularPrice >= 0) return regularPrice;
    return 0;
  };

  const getCurrentStock = () => {
    if (!product) return 0;
    if (marketplaceType === "variable") {
      return Number(selectedVariation?.stock || 0);
    }
    return Number(product.stock || 0);
  };

  const isInStock = () => {
    if (!product) return false;
    if (product.allowBackorder) return true;
    return getCurrentStock() > 0;
  };

  // Handle quantity changes
  const increaseQuantity = () =>
    setQuantity((prev) => {
      if (product?.allowBackorder) return prev + 1;
      const maxStock = getCurrentStock();
      if (!maxStock) return 1;
      return Math.min(prev + 1, maxStock);
    });
  const decreaseQuantity = () =>
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));

  // Handle add to cart
  const handleAddToCart = async () => {
    if (!product) return;

    if (isTbaPrice) {
      toast.error("This product price is TBA and cannot be purchased now.");
      return;
    }

    if (marketplaceType === "grouped") {
      toast.error("Please add individual grouped items from below.");
      return;
    }

    if (marketplaceType === "variable" && !selectedVariationId) {
      toast.error("Please select a variation");
      return;
    }

    if (!isInStock()) {
      toast.error("This item is currently out of stock");
      return;
    }

    setLoading(true);

    try {
      const result = await addToCart(product, quantity, selectedColor, "", {
        variationId: selectedVariationId || "",
        variationLabel: selectedVariation?.label || "",
        unitPrice: getCurrentPrice(),
      });
      if (!result?.success) {
        toast.error(result?.error || "Failed to add to cart");
      }
    } catch (err) {
      console.error("Error adding to cart:", err);
      toast.error("Failed to add to cart", {
        autoClose: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle buy now
  // ProductDetails.jsx - Update handleBuyNow function
  const handleBuyNow = async () => {
    if (isTbaPrice) {
      toast.error("This product price is TBA and cannot be purchased now.");
      return;
    }

    if (marketplaceType === "grouped") {
      toast.error("Please add individual grouped items from below.");
      return;
    }

    try {
      if (marketplaceType === "variable" && !selectedVariationId) {
        toast.error("Please select a variation");
        return;
      }

      if (!isInStock()) {
        toast.error("This item is currently out of stock");
        return;
      }

      // Add to cart first
      const result = await addToCart(product, quantity, selectedColor, "", {
        variationId: selectedVariationId || "",
        variationLabel: selectedVariation?.label || "",
        unitPrice: getCurrentPrice(),
      });

      if (result.success) {
        // Navigate to checkout regardless of login status
        navigate("/checkout");
      } else {
        toast.error("Failed to add item to cart", {
          autoClose: 3000,
        });
      }
    } catch (err) {
      console.error("Error in buy now:", err);
      toast.error("Failed to proceed", {
        autoClose: 3000,
      });
    }
  };

  const renderStars = (rating = 0) =>
    Array.from({ length: 5 }).map((_, index) => (
      <FaStar
        key={`star-${index}`}
        className={`w-4 h-4 ${
          index < Math.round(Number(rating || 0))
            ? "text-yellow-500 fill-yellow-500"
            : "text-gray-300"
        }`}
      />
    ));

  const refreshReviews = async () => {
    if (!id) return;
    try {
      const response = await axios.get(`${baseUrl}/products/public/${id}/reviews`);
      setReviews(response.data?.reviews || []);
      setReviewSummary(response.data?.summary || { ratingAverage: 0, ratingCount: 0 });
    } catch (_error) {
      // Keep the current UI state if refresh fails.
    }
  };

  const handleToggleWishlist = async () => {
    if (!isLoggedIn) {
      toast.error("Please login to use wishlist");
      navigate("/login");
      return;
    }

    if (!id) return;

    try {
      setWishlistLoading(true);
      if (isWishlisted) {
        await axios.delete(`${baseUrl}/wishlist/${id}`, {
          headers: getAuthHeaders(),
        });
        setIsWishlisted(false);
        toast.success("Removed from wishlist");
      } else {
        await axios.post(
          `${baseUrl}/wishlist`,
          { productId: id },
          { headers: getAuthHeaders() },
        );
        setIsWishlisted(true);
        toast.success("Added to wishlist");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareUrl = window.location.href;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Product link copied");
    } catch (_error) {
      toast.error("Failed to copy product link");
    }
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
      toast.error("Please login to submit a review");
      navigate("/login");
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error("Please write your review comment");
      return;
    }

    try {
      setReviewSubmitting(true);
      const response = await axios.post(
        `${baseUrl}/products/${id}/reviews`,
        {
          rating: Number(reviewForm.rating || 5),
          title: String(reviewForm.title || "").trim(),
          comment: String(reviewForm.comment || "").trim(),
        },
        { headers: getAuthHeaders() },
      );

      if (response.data?.review) {
        setMyReview(response.data.review);
      }
      if (response.data?.summary) {
        setReviewSummary(response.data.summary);
      }

      toast.success(response.data?.message || "Review submitted");
      await refreshReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!id) return;

    try {
      setReviewDeleting(true);
      const response = await axios.delete(`${baseUrl}/products/${id}/reviews/me`, {
        headers: getAuthHeaders(),
      });
      setMyReview(null);
      setReviewForm({ rating: 5, title: "", comment: "" });
      if (response.data?.summary) {
        setReviewSummary(response.data.summary);
      }
      toast.success(response.data?.message || "Review deleted");
      await refreshReviews();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete review");
    } finally {
      setReviewDeleting(false);
    }
  };

  // Image modal navigation
  const nextImage = () => {
    if (product?.images) {
      setCurrentImageIndex((prev) =>
        prev === product.images.length - 1 ? 0 : prev + 1,
      );
    }
  };

  const prevImage = () => {
    if (product?.images) {
      setCurrentImageIndex((prev) =>
        prev === 0 ? product.images.length - 1 : prev - 1,
      );
    }
  };

  const currentPrice = getCurrentPrice();
  const currentStock = getCurrentStock();
  const recurringInterval = String(product?.recurringInterval || "monthly");
  const recurringIntervalCount = Math.max(1, Number(product?.recurringIntervalCount || 1));
  const recurringTotalCycles = Math.max(0, Number(product?.recurringTotalCycles || 0));
  const recurringTrialDays = Math.max(0, Number(product?.recurringTrialDays || 0));
  const regularPriceForDisplay =
    marketplaceType === "variable"
      ? Number(selectedVariation?.price || currentPrice || 0)
      : Number(product?.price || currentPrice || 0);
  const hasDiscountPrice =
    !isTbaPrice &&
    Number.isFinite(regularPriceForDisplay) &&
    regularPriceForDisplay > Number(currentPrice || 0);

  // Loading state
  if (productLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="mt-6 text-gray-600 font-medium">
            Loading product details...
          </p>
        </div>
      </div>
    );
  }

  // Product not found
  if (!product) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-white">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-12 h-12 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Product Not Found
          </h2>
          <p className="text-gray-600 mb-8">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate("/shop")}
            className="px-8 py-3.5 bg-black text-white rounded-lg hover:bg-gray-900 font-medium transition-all duration-300 transform hover:-translate-y-0.5"
          >
            Browse Products
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
            onClick={() => setShowImageModal(false)}
          >
            <div
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300 transition-colors"
              >
                ✕
              </button>

              <div className="relative">
                <ProductImage
                  src={product.images[currentImageIndex]}
                  alt={product.title}
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
                />

                {product.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
                    >
                      <FaChevronLeft />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
                    >
                      <FaChevronRight />
                    </button>
                  </>
                )}

                <div className="text-white text-center mt-4">
                  {currentImageIndex + 1} / {product.images.length}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <button
                onClick={() => navigate("/")}
                className="text-gray-500 hover:text-black transition-colors"
              >
                Home
              </button>
            </li>
            <li className="text-gray-400">›</li>
            <li>
              <button
                onClick={() => navigate("/shop")}
                className="text-gray-500 hover:text-black transition-colors"
              >
                Shop
              </button>
            </li>
            <li className="text-gray-400">›</li>
            <li className="text-gray-500 truncate max-w-xs">{product.title}</li>
          </ol>
        </nav>

        {/* Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-16">
          {/* Images Section */}
          <div>
            {/* Main Image */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-6"
            >
              <div
                className="relative group cursor-pointer"
                onClick={() => {
                  setShowImageModal(true);
                  setCurrentImageIndex(selectedImage);
                }}
              >
                <div className="relative overflow-hidden rounded-3xl">
                  <ProductImage
                    src={product.images && product.images[selectedImage]}
                    alt={product.title}
                    className="w-full object-contain transition-transform duration-700"
                    isCurrent={true}
                  />
                </div>
              </div>
            </motion.div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="flex gap-3 overflow-x-auto pb-4"
              >
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      selectedImage === index
                        ? "border-black shadow-lg transform"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <ProductImage
                      src={image}
                      alt={`${product.title} - ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {/* Product Details */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-2"
          >
            {/* Header */}
            <div>
              <div className="flex flex-wrap gap-2 mb-4">
                {product.category && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs font-medium">
                    {typeof product.category === "object"
                      ? product.category.name
                      : product.category}
                  </span>
                )}
                {product.brand && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs font-medium">
                    {product.brand}
                  </span>
                )}
                {product.productType && (
                  <span className="px-3 py-1 bg-gray-100 text-gray-900 rounded-full text-xs font-medium">
                    {product.productType}
                  </span>
                )}
                {product.marketplaceType && (
                  <span className="px-3 py-1 bg-black text-white rounded-full text-xs font-medium capitalize">
                    {product.marketplaceType}
                  </span>
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4 leading-tight">
                {product.title}
              </h1>

              <div className="flex items-center gap-2 mb-3">
                <div className="flex items-center gap-1">
                  {renderStars(reviewSummary.ratingAverage || product.ratingAverage || 0)}
                </div>
                <span className="text-sm text-gray-600">
                  {Number(reviewSummary.ratingAverage || product.ratingAverage || 0).toFixed(1)} (
                  {Number(reviewSummary.ratingCount || product.ratingCount || 0)} reviews)
                </span>
              </div>

              {product.vendor?.slug && (
                <button
                  onClick={() => navigate(`/store/${product.vendor.slug}`)}
                  className="text-sm text-gray-600 hover:text-black"
                >
                  Sold by{" "}
                  <span className="font-semibold text-black">
                    {product.vendor.storeName || "Vendor Store"}
                  </span>{" "}
                  - Visit Store
                </button>
              )}

              {product.vendor && (
                <div className="mt-4 p-4 border border-gray-200 rounded-xl bg-gray-50">
                  <p className="text-sm font-semibold text-black">
                    Marketplace Vendor
                  </p>
                  <p className="text-sm text-gray-700 mt-1">
                    {product.vendor.storeName || "Vendor Store"}
                  </p>
                  {(product.vendor.city || product.vendor.country) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {[product.vendor.city, product.vendor.country]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  )}
                  {product.vendor.ratingAverage !== undefined && (
                    <p className="text-xs text-gray-500 mt-1">
                      Rating: {Number(product.vendor.ratingAverage || 0).toFixed(1)} (
                      {product.vendor.ratingCount || 0})
                    </p>
                  )}
                  {product.vendor.openingHours && (
                    <p className="text-xs text-gray-500 mt-1">
                      Hours: {product.vendor.openingHours}
                    </p>
                  )}
                  {product.vendor.vacationMode && (
                    <p className="text-xs text-amber-700 mt-1">
                      This store is currently in vacation mode.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                    isWishlisted
                      ? "border-red-200 text-red-600 bg-red-50"
                      : "border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <FaHeart className={`w-4 h-4 ${isWishlisted ? "fill-current" : ""}`} />
                  {wishlistLoading
                    ? "Updating..."
                    : isWishlisted
                      ? "Wishlisted"
                      : "Add to Wishlist"}
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm hover:bg-gray-50"
                >
                  <FaShare className="w-4 h-4" />
                  Share
                </button>
              </div>
            </div>

                        {/* Price Section */}
            <div className="pb-6 border-b border-gray-200">
              <div className="flex items-baseline gap-4 mb-2">
                {isTbaPrice ? (
                  <span className="text-4xl lg:text-5xl font-bold text-gray-900">TBA</span>
                ) : (
                  <>
                    <span className="text-4xl lg:text-5xl font-bold text-gray-900">
                      {`${currentPrice.toFixed(2)} TK`}
                    </span>
                    {hasDiscountPrice && (
                      <span className="text-xl text-gray-400 line-through">
                        {`${regularPriceForDisplay.toFixed(2)} TK`}
                      </span>
                    )}
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                {isRecurringProduct && (
                  <span className="inline-flex items-center rounded-full px-3 py-1 font-medium bg-blue-50 text-blue-700">
                    Subscription: every {recurringIntervalCount} {recurringInterval}
                  </span>
                )}
                {showPublicStock && (
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 font-medium ${
                      isInStock()
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isInStock()
                      ? product.allowBackorder
                        ? "In stock (backorder available)"
                        : `${currentStock} in stock`
                      : "Out of stock"}
                  </span>
                )}
                {Number(product?.deliveryMaxDays || 0) > 0 && (
                  <span className="text-gray-600">
                    Estimated delivery:{" "}
                    {Number(product.deliveryMinDays || 0) > 0
                      ? `${product.deliveryMinDays}-${product.deliveryMaxDays} days`
                      : `${product.deliveryMaxDays} days`}
                  </span>
                )}
                {isRecurringProduct && recurringTrialDays > 0 && (
                  <span className="text-gray-600">
                    Trial: {recurringTrialDays} day{recurringTrialDays > 1 ? "s" : ""}
                  </span>
                )}
                {isRecurringProduct && recurringTotalCycles > 0 && (
                  <span className="text-gray-600">
                    Billing cycles: {recurringTotalCycles}
                  </span>
                )}
              </div>
            </div>

            {marketplaceType === "variable" &&
              Array.isArray(product.variations) &&
              product.variations.length > 0 && (
                <div className="space-y-3 pt-4">
                  <h3 className="text-base font-semibold text-gray-800">Variation</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {product.variations
                      .filter((variation) => variation?.isActive !== false)
                      .map((variation) => {
                        const variationId = String(variation?._id || "");
                        const isSelected = variationId === String(selectedVariationId || "");
                        const variationPrice =
                          variation.salePrice !== null &&
                          variation.salePrice !== undefined
                            ? Number(variation.salePrice)
                            : Number(variation.price || 0);

                        return (
                          <button
                            key={variationId}
                            type="button"
                            onClick={() => {
                              setSelectedVariationId(variationId);
                              setQuantity(1);
                            }}
                            className={`border rounded-lg p-3 text-left transition-colors ${
                              isSelected
                                ? "border-black bg-gray-50"
                                : "border-gray-200 hover:border-gray-400"
                            }`}
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {variation.label}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {Number.isFinite(variationPrice)
                                ? `${variationPrice.toFixed(2)} TK`
                                : "N/A"}
                            </p>
                            <p className="text-xs text-gray-500">
                              {showPublicStock
                                ? `Stock: ${Number(variation.stock || 0)}`
                                : "Variation available"}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-base font-semibold text-gray-800">Color</h3>

                <div className="flex flex-wrap gap-2">
                  {product.colors.map((color, index) => {
                    const isSelected =
                      (selectedColor || product.colors[0]) === color;
                    return (
                      <button
                        key={index}
                        onClick={() => setSelectedColor(color)}
                        className="shrink-0 group"
                      >
                        <div className="relative">
                          {/* Background glow on selection */}
                          {isSelected && (
                            <div className="absolute -inset-1 bg-linear-to-r from-black/10 via-black/5 to-transparent rounded-full blur opacity-50"></div>
                          )}

                          {/* Color circle with responsive sizing */}
                          <div
                            className={`relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 transition-all duration-200 ${
                              isSelected
                                ? "border-black shadow-md"
                                : "border-gray-300 group-hover:border-gray-400"
                            }`}
                          >
                            {/* Main color */}
                            <div
                              className="absolute inset-0.5 rounded-full"
                              style={{ backgroundColor: color }}
                            >
                              {/* Shine effect */}
                              <div className="absolute top-0.5 left-0.5 w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-white/30 blur-sm" />
                            </div>

                            {/* Selection checkmark - smaller and responsive */}
                            {isSelected && (
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-black rounded-full flex items-center justify-center">
                                <svg
                                  className="w-2 h-2 sm:w-3 sm:h-3 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="3"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity & Actions */}
            <div className="space-y-6">
              {marketplaceType !== "grouped" && !isTbaPrice && (
                <div className="flex items-center gap-6">
                  <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                    <button
                      onClick={decreaseQuantity}
                      className="px-5 py-3 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
                    >
                      <FaMinus />
                    </button>
                    <span className="px-6 py-3 text-xl font-semibold min-w-[60px] text-center">
                      {quantity}
                    </span>
                    <button
                      onClick={increaseQuantity}
                      className="px-5 py-3 text-gray-700 hover:text-black hover:bg-gray-100 transition-colors"
                      disabled={!product.allowBackorder && quantity >= currentStock}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
              )}

              {isTbaPrice ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  Price is TBA for this product. Checkout is disabled until price is updated.
                </div>
              ) : marketplaceType === "grouped" ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  This is a grouped product. Select an individual item from the grouped products list.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={loading || cartLoading || !isInStock()}
                    className={`py-4 px-8 rounded-xl font-semibold text-lg flex items-center justify-center gap-3 transition-all duration-300 transform hover:-translate-y-0.5 ${
                      loading || cartLoading || !isInStock()
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-white border-2 border-black text-black hover:bg-black hover:text-white"
                    }`}
                  >
                    {loading || cartLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-black border-t-transparent"></div>
                        Adding...
                      </>
                    ) : (
                      <>
                        <FaShoppingCart />
                        Add to Cart
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleBuyNow}
                    disabled={!isInStock()}
                    className={`py-4 px-8 rounded-xl font-semibold text-lg transition-all duration-300 transform hover:-translate-y-0.5 ${
                      isInStock()
                        ? "bg-black hover:bg-gray-900 text-white"
                        : "bg-gray-300 text-gray-500 cursor-not-allowed"
                    }`}
                  >
                    Buy Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
        {/* Description */}
        {product.description && (
          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Description
            </h3>
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {product.description}
            </div>
          </div>
        )}

        {/* Features */}
        {product.features && product.features.length > 0 && (
          <div className="pt-6 pb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Key Features
            </h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {product.features.map((feature, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-2 h-2 bg-black rounded-full mt-2"></div>
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {marketplaceType === "grouped" &&
          Array.isArray(product.groupedProducts) &&
          product.groupedProducts.length > 0 && (
            <div className="pt-6 pb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Grouped Products
              </h3>
              <div className="space-y-3">
                {product.groupedProducts.map((groupedProduct) => {
                  const groupedPriceType = String(groupedProduct?.priceType || "single");
                  const groupedPrice =
                    Number(groupedProduct?.salePrice) > 0
                      ? Number(groupedProduct.salePrice)
                      : Number(groupedProduct?.price || 0);

                  return (
                    <div
                      key={groupedProduct._id}
                      className="flex items-center gap-3 rounded-xl border border-gray-200 p-3"
                    >
                      <ProductImage
                        src={groupedProduct?.images?.[0]}
                        alt={groupedProduct?.title}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {groupedProduct?.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {groupedPriceType === "tba"
                            ? "TBA"
                            : Number.isFinite(groupedPrice)
                              ? `${groupedPrice.toFixed(2)} TK`
                              : "Price not available"}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/product/${groupedProduct._id}`)}
                        className="px-3 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-900"
                      >
                        View
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        {/* Specifications */}
        {(product.specifications && product.specifications.length > 0) ||
        product.weight ||
        product.dimensions ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-8">
              Specifications
            </h2>
            <div className="bg-gray-50 rounded-2xl p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.specifications &&
                  product.specifications.map((spec, index) => (
                    <div
                      key={index}
                      className="flex justify-between py-3 border-b border-gray-200 last:border-0"
                    >
                      <div className="font-medium text-gray-900">
                        {spec.key}
                      </div>
                      <div className="text-gray-700 text-right">
                        {spec.value}
                      </div>
                    </div>
                  ))}
                {product.weight && (
                  <div className="flex justify-between py-3 border-b border-gray-200">
                    <div className="font-medium text-gray-900">Weight</div>
                    <div className="text-gray-700">{product.weight}KG</div>
                  </div>
                )}
                {product.dimensions && (
                  <div className="flex justify-between py-3">
                    <div className="font-medium text-gray-900">Dimensions</div>
                    <div className="text-gray-700">{product.dimensions}</div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Product Reviews</h2>
            <div className="text-sm text-gray-600">
              {Number(reviewSummary.ratingAverage || 0).toFixed(1)} / 5 (
              {Number(reviewSummary.ratingCount || 0)} reviews)
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              {reviewsLoading ? (
                <p className="text-gray-600">Loading reviews...</p>
              ) : reviews.length === 0 ? (
                <p className="text-gray-600">No reviews yet. Be the first to review.</p>
              ) : (
                <div className="space-y-4 max-h-[520px] overflow-auto pr-1">
                  {reviews.map((review) => (
                    <div
                      key={review._id}
                      className="border border-gray-200 rounded-lg p-4 bg-gray-50"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-gray-900">
                            {review.user?.name || review.reviewerName || "Customer"}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            {renderStars(review.rating || 0)}
                          </div>
                        </div>
                        {review.verifiedPurchase ? (
                          <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                            Verified Purchase
                          </span>
                        ) : null}
                      </div>
                      {review.title ? (
                        <p className="text-sm font-semibold text-gray-900 mt-2">{review.title}</p>
                      ) : null}
                      <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">
                        {review.comment}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {myReview ? "Update Your Review" : "Write a Review"}
              </h3>
              {!isLoggedIn ? (
                <div className="text-sm text-gray-600">
                  Please{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-black font-semibold underline"
                  >
                    login
                  </button>{" "}
                  to submit a review.
                </div>
              ) : (
                <form onSubmit={handleSubmitReview} className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rating
                    </label>
                    <select
                      value={reviewForm.rating}
                      onChange={(event) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          rating: Number(event.target.value),
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value={5}>5 - Excellent</option>
                      <option value={4}>4 - Good</option>
                      <option value={3}>3 - Average</option>
                      <option value={2}>2 - Poor</option>
                      <option value={1}>1 - Bad</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Title (optional)
                    </label>
                    <input
                      type="text"
                      value={reviewForm.title}
                      onChange={(event) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          title: event.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Short summary of your experience"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Comment
                    </label>
                    <textarea
                      rows={5}
                      value={reviewForm.comment}
                      onChange={(event) =>
                        setReviewForm((prev) => ({
                          ...prev,
                          comment: event.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Share your review"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={reviewSubmitting}
                      className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {reviewSubmitting
                        ? myReview
                          ? "Updating..."
                          : "Submitting..."
                        : myReview
                          ? "Update Review"
                          : "Submit Review"}
                    </button>
                    {myReview ? (
                      <button
                        type="button"
                        onClick={handleDeleteReview}
                        disabled={reviewDeleting}
                        className="px-4 py-2 border border-red-200 text-red-700 rounded-lg text-sm font-medium disabled:opacity-60"
                      >
                        {reviewDeleting ? "Deleting..." : "Delete Review"}
                      </button>
                    ) : null}
                  </div>
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProductDetails;



