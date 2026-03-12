/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDispatch, useSelector } from "react-redux";
import {
  FaShoppingCart,
  FaPlus,
  FaMinus,
  FaHeart,
  FaShare,
  FaFacebookF,
  FaTwitter,
  FaWhatsapp,
  FaLink,
  FaPaperPlane,
  FaStar,
  FaChevronLeft,
  FaChevronRight,
  FaTruck,
  FaUndo,
} from "react-icons/fa";
import { FiShuffle } from "react-icons/fi";
import { toast } from "react-hot-toast";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../hooks/useAuth";
import { toggleCompareItem } from "../../store/compareSlice";
import { addRecentlyViewedItem } from "../../store/recentlyViewedSlice";
import {
  buildDataLayerItem,
  getDataLayerCurrency,
  pushDataLayerEvent,
} from "../../utils/marketingDataLayer";
import { createProductSnapshot } from "../../utils/productSnapshot";
import {
  getPublicStockBadgeText,
  isPublicStockVisible,
} from "../../utils/publicProduct";

const baseUrl = import.meta.env.VITE_API_URL;

const resolveImageValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (Array.isArray(value)) return resolveImageValue(value[0]);

  if (typeof value === "object") {
    return (
      value.data ||
      value.url ||
      value.secure_url ||
      value.src ||
      value.path ||
      ""
    );
  }

  return "";
};

// Helper function to get full image URL
const getFullImageUrl = (imagePath) => {
  const resolvedPath = resolveImageValue(imagePath);
  if (!resolvedPath) return null;

  if (
    resolvedPath.startsWith("http://") ||
    resolvedPath.startsWith("https://") ||
    resolvedPath.startsWith("data:")
  ) {
    return resolvedPath;
  }

  if (resolvedPath.startsWith("/")) {
    return baseUrl ? `${baseUrl}${resolvedPath}` : resolvedPath;
  }

  return baseUrl
    ? `${baseUrl}/uploads/products/${resolvedPath}`
    : `/uploads/products/${resolvedPath}`;
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
    if (typeof src === "string" && src.startsWith("/uploads/products/")) {
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
  const [hoverRating, setHoverRating] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDeleting, setReviewDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [relatedProductsLoading, setRelatedProductsLoading] = useState(false);
  const [relatedCarouselHasOverflow, setRelatedCarouselHasOverflow] = useState(false);
  const [thumbnailRailState, setThumbnailRailState] = useState({
    hasOverflow: false,
    canScrollUp: false,
    canScrollDown: false,
  });
  const { addToCart, isLoading: cartLoading } = useCart();
  const { user } = useAuth();
  const dispatch = useDispatch();
  const compareItems = useSelector((state) => state.compare.items || []);
  const navigate = useNavigate();
  const productTopRef = useRef(null);
  const verticalThumbsRef = useRef(null);
  const thumbnailButtonRefs = useRef([]);
  const relatedCarouselRef = useRef(null);
  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = product?.title || "Product";
  const shareText = product?.description
    ? String(product.description).slice(0, 140)
    : "Check this product";
  const isCompared = compareItems.some(
    (item) => String(item?._id || "") === String(product?._id || ""),
  );
  const liveViewingCount = (() => {
    const seed = String(product?._id || id || "");
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = (hash * 31 + seed.charCodeAt(i)) % 997;
    }
    return 7 + (hash % 17);
  })();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    const activeThumb = thumbnailButtonRefs.current?.[selectedImage];
    if (
      activeThumb &&
      typeof activeThumb.scrollIntoView === "function" &&
      activeThumb.offsetParent !== null
    ) {
      activeThumb.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  }, [selectedImage]);

  useEffect(() => {
    const container = verticalThumbsRef.current;
    if (!container) {
      setThumbnailRailState({
        hasOverflow: false,
        canScrollUp: false,
        canScrollDown: false,
      });
      return undefined;
    }

    const updateThumbnailRailState = () => {
      const node = verticalThumbsRef.current;
      if (!node) return;

      const maxScrollTop = Math.max(node.scrollHeight - node.clientHeight, 0);

      setThumbnailRailState({
        hasOverflow: maxScrollTop > 2,
        canScrollUp: node.scrollTop > 2,
        canScrollDown: node.scrollTop < maxScrollTop - 2,
      });
    };

    updateThumbnailRailState();
    container.addEventListener("scroll", updateThumbnailRailState, {
      passive: true,
    });

    let observer;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => updateThumbnailRailState());
      observer.observe(container);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateThumbnailRailState);
    }

    return () => {
      container.removeEventListener("scroll", updateThumbnailRailState);
      observer?.disconnect();
      if (typeof window !== "undefined") {
        window.removeEventListener("resize", updateThumbnailRailState);
      }
    };
  }, [product?.images?.length]);

  useEffect(() => {
    const container = relatedCarouselRef.current;
    if (!container) {
      setRelatedCarouselHasOverflow(false);
      return undefined;
    }

    const updateOverflow = () => {
      const node = relatedCarouselRef.current;
      if (!node) return;
      setRelatedCarouselHasOverflow(node.scrollWidth > node.clientWidth + 2);
    };

    updateOverflow();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateOverflow());
      observer.observe(container);
      return () => observer.disconnect();
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", updateOverflow);
      return () => window.removeEventListener("resize", updateOverflow);
    }

    return undefined;
  }, [relatedProductsLoading, relatedProducts.length]);

  const handleScrollToReviews = () => {
    if (typeof document === "undefined") return;
    setActiveTab("reviews");

    setTimeout(() => {
      const reviewSection = document.getElementById("reviews");
      if (reviewSection) {
        reviewSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
  };

  const handleScrollToTopCapture = (event) => {
    if (typeof window === "undefined") return;
    const interactive = event.target?.closest?.(
      'button, a, [role="button"], input[type="submit"]',
    );
    if (!interactive) return;

    if (interactive.hasAttribute("data-no-scroll-top")) return;
    if (interactive.closest("[data-review-section]")) return;
    if (interactive.closest("[data-skip-scroll-top]")) return;

    const topTarget = productTopRef.current;
    if (topTarget && typeof topTarget.scrollIntoView === "function") {
      topTarget.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
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
    if (!product?._id) return;

	    const hasAdditionalInfo = Boolean(
	      (Array.isArray(product.specifications) && product.specifications.length > 0) ||
	        product.brand ||
	        product.weight ||
	        product.dimensions,
	    );

    if (product.description) {
      setActiveTab("description");
      return;
    }

    if (hasAdditionalInfo) {
      setActiveTab("additional");
      return;
    }

    setActiveTab("reviews");
  }, [product?._id]);

  useEffect(() => {
    if (!product?._id) return;
    const snapshot = createProductSnapshot(product);
    if (!snapshot) return;
    dispatch(addRecentlyViewedItem(snapshot));
  }, [dispatch, product]);

  useEffect(() => {
    if (!product?._id) {
      setRelatedProducts([]);
      return;
    }

    const resolveCategoryId = (value) => {
      if (!value) return "";
      if (typeof value === "string") return value;
      return value?._id ? String(value._id) : "";
    };

    const categoryId = resolveCategoryId(product.category);
    const productType = String(product.productType || "").trim();
    let cancelled = false;

    const fetchRelatedProducts = async () => {
      try {
        setRelatedProductsLoading(true);
        const response = await axios.get(`${baseUrl}/products/public`, {
          timeout: 15000,
        });
        const payload = response.data?.products || response.data?.data || response.data;
        const products = Array.isArray(payload) ? payload : [];

        const otherProducts = products.filter(
          (entry) => String(entry?._id || "") !== String(product._id || ""),
        );

        const resolveEntryCategoryId = (value) => {
          if (!value) return "";
          if (typeof value === "string") return value;
          return value?._id ? String(value._id) : "";
        };

        let resolvedRelated = otherProducts;
        if (categoryId) {
          const sameCategory = otherProducts.filter(
            (entry) => resolveEntryCategoryId(entry.category) === categoryId,
          );
          if (sameCategory.length > 0) resolvedRelated = sameCategory;
        }

        if (!categoryId && productType) {
          const sameType = otherProducts.filter(
            (entry) => String(entry?.productType || "").trim() === productType,
          );
          if (sameType.length > 0) resolvedRelated = sameType;
        }

        if (!cancelled) {
          setRelatedProducts(resolvedRelated.slice(0, 8));
        }
      } catch (_error) {
        if (!cancelled) setRelatedProducts([]);
      } finally {
        if (!cancelled) setRelatedProductsLoading(false);
      }
    };

    fetchRelatedProducts();
    return () => {
      cancelled = true;
    };
  }, [product?._id, product?.category, product?.productType]);

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

  useEffect(() => {
    if (!product?._id) return;

    const resolvedPrice =
      Number(product?.salePrice ?? product?.price ?? 0) > 0
        ? Number(product?.salePrice ?? product?.price ?? 0)
        : Number(product?.price || 0);

    pushDataLayerEvent("view_item", {
      ecommerce: {
        currency: getDataLayerCurrency(),
        value: Number.isFinite(resolvedPrice) ? resolvedPrice : 0,
        items: [
          buildDataLayerItem({
            productId: product._id,
            title: product.title,
            price: resolvedPrice,
            category: product?.category?.name || product?.category || product?.productType || "",
            brand: product?.brand || "",
            vendorName: product?.vendor?.storeName || "",
          }),
        ],
      },
    });
  }, [
    product?._id,
    product?.brand,
    product?.category,
    product?.category?.name,
    product?.price,
    product?.productType,
    product?.salePrice,
    product?.title,
    product?.vendor?.storeName,
  ]);

  const marketplaceType = String(product?.marketplaceType || "simple");
  const priceType = String(product?.priceType || "single");
  const isTbaPrice = priceType === "tba";
  const isRecurringProduct = Boolean(product?.isRecurring);
  const showPublicStock = isPublicStockVisible(product);
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
      toast.error("Please select a size");
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
        toast.error("Please select a size");
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

  const handleToggleCompare = () => {
    if (!product?._id) return;
    const snapshot = createProductSnapshot(product);
    if (!snapshot) return;
    const exists = compareItems.some(
      (item) => String(item?._id || "") === String(snapshot._id),
    );
    dispatch(toggleCompareItem(snapshot));
    toast.success(exists ? "Removed from compare" : "Added to compare");
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Product link copied");
    } catch (_error) {
      toast.error("Failed to copy product link");
    }
  };

  const handleSharePlatform = (platform) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedText = encodeURIComponent(`${shareTitle} - ${shareText}`);
    const platformUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    };

    const targetUrl = platformUrls[platform];
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer,width=640,height=640");
  };

  const handleCopyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied");
    } catch (_error) {
      toast.error("Failed to copy link");
    }
  };

  const handleNavigateToProduct = (productId) => {
    const resolvedId = String(productId || "").trim();
    if (!resolvedId) return;
    navigate(`/product/${resolvedId}`);
    if (typeof window !== "undefined") {
      window.scrollTo(0, 0);
    }
  };

  const scrollRelatedCarousel = (direction) => {
    const container = relatedCarouselRef.current;
    if (!container) return;
    const delta = Math.max(240, container.clientWidth);
    container.scrollBy({
      left: direction * delta,
      behavior: "smooth",
    });
  };

  const getRelatedProductPricing = (entry) => {
    const formatPrice = (value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) return null;
      return `${Math.round(parsed)} Tk`;
    };

    const priceType = String(entry?.priceType || "single").trim().toLowerCase();
    if (priceType === "tba") {
      return {
        isTba: true,
        isRange: false,
        hasDiscount: false,
        currentValue: null,
        previousValue: null,
        currentText: "TBA",
        previousText: null,
      };
    }

    const marketplaceType = String(entry?.marketplaceType || "simple")
      .trim()
      .toLowerCase();

    if (
      marketplaceType === "variable" &&
      Array.isArray(entry?.variations) &&
      entry.variations.length > 0
    ) {
      const prices = entry.variations
        .filter((variation) => variation?.isActive !== false)
        .map((variation) => {
          const hasSalePrice =
            variation?.salePrice !== null &&
            variation?.salePrice !== undefined &&
            String(variation.salePrice).trim() !== "";
          const salePrice = hasSalePrice ? Number(variation.salePrice) : NaN;
          const regularPrice = Number(variation?.price);

          if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
          if (Number.isFinite(regularPrice) && regularPrice >= 0) return regularPrice;
          return null;
        })
        .filter((price) => price !== null);

      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        const currentText =
          min !== max
            ? `${formatPrice(min) || ""} – ${formatPrice(max) || ""}`.trim()
            : formatPrice(min) || "";

        return {
          isTba: false,
          isRange: min !== max,
          hasDiscount: false,
          currentValue: Number.isFinite(min) ? min : null,
          previousValue: null,
          currentText,
          previousText: null,
        };
      }
    }

    const regularPrice = Number(entry?.price);
    const normalizedRegularPrice =
      Number.isFinite(regularPrice) && regularPrice >= 0 ? regularPrice : 0;

    const hasSalePrice =
      priceType === "best" &&
      entry?.salePrice !== null &&
      entry?.salePrice !== undefined &&
      String(entry.salePrice).trim() !== "";
    const salePrice = hasSalePrice ? Number(entry.salePrice) : NaN;
    const normalizedSalePrice =
      Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : null;

    const hasDiscount =
      normalizedSalePrice !== null && normalizedSalePrice < normalizedRegularPrice;

    const currentValue = hasDiscount ? normalizedSalePrice : normalizedRegularPrice;

    return {
      isTba: false,
      isRange: false,
      hasDiscount,
      currentValue,
      previousValue: normalizedRegularPrice,
      currentText: formatPrice(currentValue) || "",
      previousText: hasDiscount ? formatPrice(normalizedRegularPrice) : null,
    };
  };

  const handleRelatedWishlist = async (event, relatedProductId) => {
    event.stopPropagation();

    if (!isLoggedIn) {
      toast.error("Please login to use wishlist");
      navigate("/login");
      return;
    }

    const productId = String(relatedProductId || "").trim();
    if (!productId) return;

    try {
      await axios.post(
        `${baseUrl}/wishlist`,
        { productId },
        { headers: getAuthHeaders() },
      );
      toast.success("Added to wishlist");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update wishlist");
    }
  };

  const handleRelatedCompare = (event, entry) => {
    event.stopPropagation();
    const snapshot = createProductSnapshot(entry);
    if (!snapshot) return;

    const exists = compareItems.some(
      (item) => String(item?._id || "") === String(snapshot._id || ""),
    );
    dispatch(toggleCompareItem(snapshot));
    toast.success(exists ? "Removed from compare" : "Added to compare");
  };

  const handleRelatedAddToCart = async (event, entry) => {
    event.stopPropagation();

    if (!entry?._id) return;

    const priceType = String(entry?.priceType || "single").trim().toLowerCase();
    if (priceType === "tba") {
      toast.error("This product price is TBA and cannot be purchased right now");
      return;
    }

    const marketplaceType = String(entry?.marketplaceType || "simple")
      .trim()
      .toLowerCase();

    if (
      marketplaceType === "variable" &&
      Array.isArray(entry?.variations) &&
      entry.variations.length > 0
    ) {
      handleNavigateToProduct(entry._id);
      return;
    }

    if (marketplaceType === "grouped") {
      handleNavigateToProduct(entry._id);
      return;
    }

    try {
      await addToCart(entry, 1);
    } catch (_error) {
      // addToCart already handles toast
    }
  };

  const handleRelatedBuyNow = async (event, entry) => {
    event.stopPropagation();

    if (!entry?._id) return;

    const priceType = String(entry?.priceType || "single").trim().toLowerCase();
    if (priceType === "tba") {
      toast.error("This product price is TBA and cannot be purchased right now");
      return;
    }

    const marketplaceType = String(entry?.marketplaceType || "simple")
      .trim()
      .toLowerCase();

    if (marketplaceType === "variable" || marketplaceType === "grouped") {
      handleNavigateToProduct(entry._id);
      return;
    }

    if (!entry.allowBackorder && Number(entry.stock || 0) <= 0) {
      toast.error("This item is currently out of stock");
      return;
    }

    try {
      const result = await addToCart(entry, 1);
      if (result?.success) {
        navigate("/checkout");
        if (typeof window !== "undefined") window.scrollTo(0, 0);
      }
    } catch (_error) {
      // addToCart already handles toast
    }
  };

  const handleMessageVendor = () => {
    if (!isLoggedIn) {
      toast.error("Please login to message vendor");
      navigate("/login");
      return;
    }

    const vendorId = String(product?.vendor?._id || "").trim();
    if (!vendorId) {
      toast.error("Vendor information unavailable");
      return;
    }

    localStorage.setItem("vendorMessagesPresetVendorId", vendorId);
    localStorage.setItem("dashboardActiveTab", "vendor-messages");
    navigate("/dashboard");
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

      setReviewForm({ rating: 5, title: "", comment: "" });
      setHoverRating(null);
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

  const nextSelectedImage = () => {
    if (!product?.images?.length) return;
    setSelectedImage((prev) => (prev === product.images.length - 1 ? 0 : prev + 1));
  };

  const prevSelectedImage = () => {
    if (!product?.images?.length) return;
    setSelectedImage((prev) => (prev === 0 ? product.images.length - 1 : prev - 1));
  };

  const scrollVerticalThumbs = (direction) => {
    const container = verticalThumbsRef.current;
    if (!container) return;
    const delta = direction === "up" ? -180 : 180;
    container.scrollBy({ top: delta, behavior: "smooth" });
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
  const discountPercentForDisplay =
    hasDiscountPrice && regularPriceForDisplay > 0
      ? Math.round(
          ((regularPriceForDisplay - Number(currentPrice || 0)) /
            regularPriceForDisplay) *
            100,
        )
      : null;
  const variationPriceBounds = (() => {
    if (marketplaceType !== "variable" || !Array.isArray(product?.variations)) return null;
    const prices = product.variations
      .filter((variation) => variation?.isActive !== false)
      .map((variation) => {
        const hasSalePrice =
          variation?.salePrice !== null &&
          variation?.salePrice !== undefined &&
          String(variation.salePrice).trim() !== "";
        const salePrice = hasSalePrice ? Number(variation.salePrice) : NaN;
        const regularPrice = Number(variation?.price);
        if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
        if (Number.isFinite(regularPrice) && regularPrice >= 0) return regularPrice;
        return NaN;
      })
      .filter((value) => Number.isFinite(value));
    if (!prices.length) return null;
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  })();
  const showVariationPriceRange = Boolean(
    !selectedVariationId &&
      variationPriceBounds &&
      variationPriceBounds.min !== variationPriceBounds.max,
  );
  const purchaseActionDisabled =
    loading ||
    cartLoading ||
    !isInStock() ||
    (marketplaceType === "variable" &&
      Array.isArray(product?.variations) &&
      product.variations.length > 0 &&
      !selectedVariationId);
  const quantityStatusText = product?.allowBackorder
    ? "Backorders allowed"
    : currentStock > 0
      ? `${currentStock} available`
      : "Out of stock";
  const additionalInfoRows = (() => {
	    const rows = [];

	    if (Array.isArray(product?.specifications)) {
	      product.specifications.forEach((spec) => {
	        const label = String(spec?.key || "").trim();
	        const value = String(spec?.value || "").trim();
	        if (!label || !value) return;
	        rows.push({ label, value });
	      });
	    }

	    if (String(product?.brand || "").trim()) {
	      const hasBrandRow = rows.some(
	        (row) => String(row.label || "").trim().toLowerCase() === "brand",
	      );
	      if (!hasBrandRow) {
	        rows.unshift({ label: "Brand", value: String(product.brand).trim() });
	      }
	    }

	    if (Number(product?.weight || 0) > 0) {
	      rows.push({ label: "Weight", value: `${Number(product.weight)}KG` });
	    }

    if (String(product?.dimensions || "").trim()) {
      rows.push({ label: "Dimensions", value: String(product.dimensions).trim() });
    }

    return rows;
  })();
  const detailFacts = [
    {
      label: "Availability",
      value: isTbaPrice
        ? "Price pending"
        : product?.allowBackorder
          ? "Backorder enabled"
          : isInStock()
            ? "Ready to ship"
            : "Currently unavailable",
    },
    {
      label: "Buyer view",
      value: showPublicStock ? "Exact stock shown" : "Stock kept private",
    },
    {
      label: "Delivery",
      value:
        Number(product?.deliveryMaxDays || 0) > 0
          ? Number(product?.deliveryMinDays || 0) > 0
            ? `${product.deliveryMinDays}-${product.deliveryMaxDays} days`
            : `${product.deliveryMaxDays} days`
          : "Shown at checkout",
    },
    {
      label: "Pricing mode",
      value:
        priceType === "best"
          ? "Offer pricing"
          : priceType === "tba"
            ? "TBA"
            : "Standard price",
    },
  ];

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
    <div
      className="min-h-screen bg-white"
      onClickCapture={handleScrollToTopCapture}
    >
      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
           <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             data-skip-scroll-top
             className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4"
             onClick={() => setShowImageModal(false)}
           >
            <div
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowImageModal(false)}
                className="absolute -top-14 right-0 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
              >
                Close
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

              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="site-shell py-6 sm:py-8 lg:py-10">
        <div ref={productTopRef} id="product-top" className="scroll-mt-24" />

        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          {/* Product images */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-[32px] border border-gray-200 bg-[radial-gradient(circle_at_top,#ffffff_0%,#f7f8fa_42%,#eef1f5_100%)] p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-5">
              <div className="flex gap-4">
              {product.images && product.images.length > 1 ? (
                <div className="hidden lg:flex flex-col items-center gap-3">
                  {thumbnailRailState.canScrollUp ? (
                    <button
                      type="button"
                      data-no-scroll-top
                      onClick={() => scrollVerticalThumbs("up")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white"
                      aria-label="Scroll thumbnails up"
                    >
                      <FaChevronLeft className="h-3.5 w-3.5 rotate-90" />
                    </button>
                  ) : null}

                  <div
                    ref={verticalThumbsRef}
                    className="flex max-h-[560px] w-24 flex-col gap-3 overflow-y-auto pr-1"
                  >
                    {product.images.map((image, index) => (
                      <button
                        key={index}
                        type="button"
                        data-no-scroll-top
                        ref={(el) => {
                          thumbnailButtonRefs.current[index] = el;
                        }}
                        onClick={() => setSelectedImage(index)}
                        className={`h-20 w-20 overflow-hidden rounded-[22px] border bg-white/80 p-1 shadow-sm transition-all ${
                          selectedImage === index
                            ? "border-black shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
                            : "border-gray-200 hover:border-gray-400 hover:bg-white"
                        }`}
                      >
                        <ProductImage
                          src={image}
                          alt={`${product.title} - ${index + 1}`}
                          className="h-full w-full rounded-[18px] bg-linear-to-br from-gray-50 to-white object-contain"
                        />
                      </button>
                    ))}
                  </div>

                  {thumbnailRailState.canScrollDown ? (
                    <button
                      type="button"
                      data-no-scroll-top
                      onClick={() => scrollVerticalThumbs("down")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white/90 text-gray-700 shadow-sm transition hover:bg-white"
                      aria-label="Scroll thumbnails down"
                    >
                      <FaChevronLeft className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="relative flex-1 overflow-hidden rounded-[30px] border border-white/70 bg-white/80 shadow-[0_20px_45px_rgba(15,23,42,0.10)] backdrop-blur">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.98),rgba(255,255,255,0))]" />

                <button
                  type="button"
                  data-no-scroll-top
                  onClick={() => {
                    setCurrentImageIndex(selectedImage);
                    setShowImageModal(true);
                  }}
                  className="block w-full cursor-zoom-in p-4 sm:p-6"
                  aria-label="Open product image"
                >
                  <div className="relative overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_top,#ffffff_0%,#f8fafc_55%,#eef2f6_100%)] ring-1 ring-gray-100">
                    <ProductImage
                      src={product.images?.[selectedImage]}
                      alt={product.title}
                      className="h-[420px] w-full object-contain p-4 sm:h-[560px] sm:p-8"
                    />
                  </div>
                </button>

                {product.images && product.images.length > 1 ? (
                  <>
                    <button
                      type="button"
                      data-no-scroll-top
                      onClick={(event) => {
                        event.stopPropagation();
                        prevSelectedImage();
                      }}
                      className="absolute left-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white shadow-sm transition hover:bg-black/75"
                      aria-label="Previous image"
                    >
                      <FaChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      data-no-scroll-top
                      onClick={(event) => {
                        event.stopPropagation();
                        nextSelectedImage();
                      }}
                      className="absolute right-4 top-1/2 z-10 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-black/60 text-white shadow-sm transition hover:bg-black/75"
                      aria-label="Next image"
                    >
                      <FaChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : null}
              </div>
              </div>
            </div>

            {product.images && product.images.length > 1 ? (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:hidden">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    data-no-scroll-top
                    onClick={() => setSelectedImage(index)}
                    className={`shrink-0 h-20 w-20 overflow-hidden rounded-[22px] border bg-white/80 p-1 shadow-sm transition-all ${
                      selectedImage === index
                        ? "border-black shadow-[0_12px_24px_rgba(15,23,42,0.12)]"
                        : "border-gray-200 hover:border-gray-400 hover:bg-white"
                    }`}
                  >
                    <ProductImage
                      src={image}
                      alt={`${product.title} - ${index + 1}`}
                      className="h-full w-full rounded-[18px] bg-linear-to-br from-gray-50 to-white object-contain"
                    />
                  </button>
                ))}
              </div>
            ) : null}


          </div>

          {/* Product summary */}
          <div className="rounded-[32px] border border-gray-200 bg-white p-5 shadow-sm sm:p-6 text-left">
            <nav aria-label="Breadcrumb" className="text-sm text-gray-600">
              <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <li>
                  <button
                    type="button"
                    data-no-scroll-top
                    onClick={() => navigate("/")}
                    className="hover:text-black transition-colors"
                  >
                    Home
                  </button>
                </li>
                <li aria-hidden="true" className="text-gray-300">
                  /
                </li>
                <li>
                  <button
                    type="button"
                    data-no-scroll-top
                    onClick={() => navigate("/shop")}
                    className="hover:text-black transition-colors"
                  >
                    Shop
                  </button>
                </li>
                {product.category ? (
                  <>
                    <li aria-hidden="true" className="text-gray-300">
                      /
                    </li>
                    <li>
                      {typeof product.category === "object" && product.category?._id ? (
                        <button
                          type="button"
                          data-no-scroll-top
                          onClick={() =>
                            navigate(`/shop?category=${product.category._id}`)
                          }
                          className="hover:text-black transition-colors"
                        >
                          {product.category?.name || "Category"}
                        </button>
                      ) : (
                        <span className="text-gray-600">
                          {typeof product.category === "object"
                            ? product.category?.name || "Category"
                            : product.category}
                        </span>
                      )}
                    </li>
                  </>
                ) : null}
              </ol>
            </nav>

              <div className="mt-2 flex flex-wrap items-center gap-2">
              {isTbaPrice ? (
                <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  Price pending
                </span>
              ) : marketplaceType === "variable" &&
                Array.isArray(product.variations) &&
                product.variations.length > 0 &&
                !selectedVariationId ? (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700">
                  Select size
                </span>
              ) : product.allowBackorder && currentStock <= 0 ? (
                <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700">
                  Backorder available
                </span>
              ) : isInStock() ? (
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {showPublicStock && currentStock > 0 ? `${currentStock} in stock` : "In stock"}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                  Out of stock
                </span>
              )}
            </div>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              {product.title}
            </h1>

            <div className="mt-2">
              <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
                <p className="text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                  {isTbaPrice ? (
                    <span className="text-gray-700">TBA</span>
                  ) : showVariationPriceRange ? (
                    <>
                      <span>{variationPriceBounds.min.toFixed(2)}</span>
                      <span className="mx-1 text-gray-400">–</span>
                      <span>{variationPriceBounds.max.toFixed(2)}</span>
                      <span className="ml-1 text-base font-semibold text-gray-700 sm:text-lg">
                        Tk
                      </span>
                    </>
                  ) : (
                    <>
                      <span>{currentPrice.toFixed(2)}</span>
                      <span className="ml-1 text-base font-semibold text-gray-700 sm:text-lg">
                        Tk
                      </span>
                    </>
                  )}
                </p>

                {!isTbaPrice &&
                !showVariationPriceRange &&
                discountPercentForDisplay &&
                discountPercentForDisplay > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-xs font-bold text-white shadow-sm">
                    -{discountPercentForDisplay}%
                  </span>
                ) : null}
              </div>

              {!isTbaPrice && !showVariationPriceRange && hasDiscountPrice ? (
                <p className="mt-1 text-sm font-medium text-gray-500 line-through">
                  {regularPriceForDisplay.toFixed(2)} Tk
                </p>
              ) : null}
            </div>

              <div className="mt-3 border-t border-gray-200 pt-3">
              {isTbaPrice ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  Price is TBA for this product. Checkout is disabled until price is updated.
                </div>
              ) : marketplaceType === "grouped" ? (
                <div className="rounded border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                  This is a grouped product. Select an item from the grouped products list.
                </div>
              ) : (
                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleAddToCart();
                  }}
                >
                  {marketplaceType === "variable" &&
                  Array.isArray(product.variations) &&
                  product.variations.length > 0 ? (
                    <div>
                      <div className="flex items-end justify-between gap-3">
                        <label
                          htmlFor="product-variation"
                          className="text-sm font-medium text-gray-900"
                        >
                          Select size
                        </label>
                        <button
                          type="button"
                          data-no-scroll-top
                          onClick={() => setSelectedVariationId("")}
                          className="text-xs underline decoration-gray-300 underline-offset-2 text-gray-600 hover:text-black"
                        >
                          Clear
                        </button>
                      </div>
                      <select
                        id="product-variation"
                        data-no-scroll-top
                        value={selectedVariationId}
                        onChange={(event) => {
                          setSelectedVariationId(event.target.value);
                          setQuantity(1);
                        }}
	                        className="mt-1.5 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-black focus:outline-none"
                      >
                        <option value="">Select size</option>
                        {product.variations
                          .filter((variation) => variation?.isActive !== false)
                          .map((variation) => (
                            <option
                              key={String(variation?._id || "")}
                              value={String(variation?._id || "")}
                            >
                              {variation.label}
                            </option>
                          ))}
                      </select>
                    </div>
                  ) : null}

                  {product.colors && product.colors.length > 0 ? (
                    <div>
                      <div className="text-sm font-medium text-gray-900">Color</div>
                      <div
                        className="mt-2 flex flex-wrap gap-3"
                        role="radiogroup"
                        aria-label="Color"
                      >
                        {product.colors.map((color, index) => {
                          const isSelected =
                            (selectedColor || product.colors[0]) === color;
                          const label = String(color || "").trim();
                          const displayLabel =
                            label.toLowerCase() === "#000000" ||
                            label.toLowerCase() === "#000" ||
                            label.toLowerCase() === "black"
                              ? "Black"
                              : label.toLowerCase() === "#ffffff" ||
                                  label.toLowerCase() === "#fff" ||
                                  label.toLowerCase() === "white"
                                ? "White"
                                : label.toLowerCase() === "#f0deba" ||
                                    label.toLowerCase() === "beige"
                                  ? "Beige"
                                  : label
                                      ? label.startsWith("#")
                                        ? label.toUpperCase()
                                        : label
                                      : `Color ${index + 1}`;

                          return (
                            <button
                              key={`${color}-${index}`}
                              type="button"
                              data-no-scroll-top
                              onClick={() => setSelectedColor(color)}
                              role="radio"
                              aria-checked={isSelected}
                              aria-label={displayLabel}
                              title={displayLabel}
                              className="group shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                            >
                              <div className="relative">
                                <div
                                  className={`absolute -inset-1 rounded-full bg-linear-to-r from-black/10 via-black/5 to-transparent blur transition-opacity ${
                                    isSelected
                                      ? "opacity-60"
                                      : "opacity-0 group-hover:opacity-50"
                                  }`}
                                />
                                <div
                                  className={`relative h-10 w-10 rounded-full border-2 transition-all duration-200 sm:h-12 sm:w-12 md:h-14 md:w-14 ${
                                    isSelected
                                      ? "border-black shadow-md"
                                      : "border-gray-300 hover:border-gray-400"
                                  }`}
                                >
                                  <div
                                    className="absolute inset-0.5 rounded-full"
                                    style={{ backgroundColor: color }}
                                    aria-hidden="true"
                                  >
                                    <div className="absolute left-0.5 top-0.5 h-2 w-2 rounded-full bg-white/30 blur-sm sm:h-3 sm:w-3" />
                                  </div>

                                  {isSelected ? (
                                    <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black shadow-sm sm:h-6 sm:w-6">
                                      <svg
                                        className="h-2.5 w-2.5 text-white sm:h-3 sm:w-3"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden="true"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth="3"
                                          d="M5 13l4 4L19 7"
                                        />
                                      </svg>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    <div className="rounded-[24px] border border-gray-200 bg-gray-50 p-3 sm:p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                          Quantity
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            currentStock > 0 || product?.allowBackorder
                              ? "bg-white text-gray-700 shadow-sm"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {quantityStatusText}
                        </span>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
                          <button
                            type="button"
                            data-no-scroll-top
                            onClick={decreaseQuantity}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100 hover:text-black"
                            aria-label="Decrease quantity"
                          >
                            <FaMinus className="h-3.5 w-3.5" />
                          </button>
                          <label className="sr-only" htmlFor="quantity-input">
                            {product.title} quantity
                          </label>
                          <input
                            id="quantity-input"
                            type="number"
                            min={1}
                            value={quantity}
                            onChange={(event) => {
                              const parsed = Math.max(1, Number(event.target.value || 1));
                              if (product?.allowBackorder) {
                                setQuantity(parsed);
                                return;
                              }
                              if (!currentStock) {
                                setQuantity(1);
                                return;
                              }
                              setQuantity(Math.min(parsed, currentStock));
                            }}
                            className="h-11 w-16 border-0 bg-transparent text-center text-base font-bold text-gray-950 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            inputMode="numeric"
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            data-no-scroll-top
                            onClick={increaseQuantity}
                            disabled={!product.allowBackorder && quantity >= currentStock}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-black text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                            aria-label="Increase quantity"
                          >
                            <FaPlus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className="text-xs leading-5 text-gray-500 sm:max-w-[220px] sm:text-right">
                          Adjust the quantity before adding this item to cart or proceeding directly
                          to checkout.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={purchaseActionDisabled}
                        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-black px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(17,24,39,0.18)] transition hover:-translate-y-0.5 hover:bg-gray-900 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                      >
                        <FaShoppingCart className="h-4 w-4" />
                        {loading || cartLoading ? "Adding..." : "Add to cart"}
                      </button>

                      <button
                        type="button"
                        onClick={handleBuyNow}
                        disabled={purchaseActionDisabled}
                        className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl border border-black bg-white px-5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:bg-black hover:text-white disabled:cursor-not-allowed disabled:border-gray-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none"
                      >
                        Buy now
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {product.vendor?.slug ? (
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={() => navigate(`/store/${product.vendor.slug}`)}
	                  className="mt-3 block text-sm text-gray-600 hover:text-black"
                >
                  Sold by{" "}
                  <span className="font-medium text-gray-900">
                    {product.vendor.storeName || "Vendor Store"}
                  </span>
                </button>
              ) : null}

	              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={handleToggleCompare}
                  className="inline-flex items-center gap-2 text-gray-700 transition hover:text-black"
                >
                  <FiShuffle className="h-4 w-4" />
                  {isCompared ? "Remove from compare" : "Compare"}
                </button>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={handleToggleWishlist}
                  disabled={wishlistLoading}
                  className="inline-flex items-center gap-2 text-gray-700 transition hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FaHeart className={`h-4 w-4 ${isWishlisted ? "text-red-600" : ""}`} />
                  {isWishlisted ? "Wishlisted" : "Add to wishlist"}
                </button>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 text-gray-700 transition hover:text-black"
                >
                  <FaShare className="h-4 w-4" />
                  Share
                </button>
              </div>

	              <div className="mt-4 border-t border-gray-200 pt-4 text-sm text-gray-700">
                {product.sku ? (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium text-gray-900">SKU:</span>
                    <span>{product.sku}</span>
                  </div>
                ) : null}
                {product.category ? (
                  <div className="mt-2 flex flex-wrap gap-x-2">
                    <span className="font-medium text-gray-900">Category:</span>
                    <span>
                      {typeof product.category === "object"
                        ? product.category?.name || "Category"
                        : product.category}
                    </span>
                  </div>
                ) : null}
              </div>

	              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-700">
                <span className="mr-1 font-medium text-gray-900">Share:</span>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={() => handleSharePlatform("facebook")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:text-black"
                  aria-label="Share on Facebook"
                >
                  <FaFacebookF className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={() => handleSharePlatform("twitter")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:text-black"
                  aria-label="Share on X"
                >
                  <FaTwitter className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={() => handleSharePlatform("whatsapp")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:text-black"
                  aria-label="Share on WhatsApp"
                >
                  <FaWhatsapp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={() => handleSharePlatform("telegram")}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:text-black"
                  aria-label="Share on Telegram"
                >
                  <FaPaperPlane className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-no-scroll-top
                  onClick={handleCopyShareLink}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-gray-400 hover:text-black"
                  aria-label="Copy share link"
                >
                  <FaLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
	        </div>
	        {/* Tabs */}
	        <div className="pt-10">
	          <div className="bg-white">
		            <div
		              role="tablist"
		              aria-label="Product details tabs"
		              className="flex flex-wrap justify-center gap-8 border-b border-gray-200 px-6"
		            >
	              <button
	                type="button"
	                data-no-scroll-top
                id="product-tab-description"
                role="tab"
                aria-selected={activeTab === "description"}
                aria-controls="product-tabpanel-description"
                tabIndex={activeTab === "description" ? 0 : -1}
                onClick={() => setActiveTab("description")}
		                className={`-mb-px border-b-2 py-4 text-sm font-semibold transition ${
		                  activeTab === "description"
		                    ? "border-black text-black"
		                    : "border-transparent text-gray-600 hover:text-black"
		                }`}
	              >
                Description
              </button>
              <button
                type="button"
                data-no-scroll-top
                id="product-tab-additional"
                role="tab"
                aria-selected={activeTab === "additional"}
                aria-controls="product-tabpanel-additional"
                tabIndex={activeTab === "additional" ? 0 : -1}
                onClick={() => setActiveTab("additional")}
		                className={`-mb-px border-b-2 py-4 text-sm font-semibold transition ${
		                  activeTab === "additional"
		                    ? "border-black text-black"
		                    : "border-transparent text-gray-600 hover:text-black"
		                }`}
	              >
                Additional information
              </button>
              <button
                type="button"
                data-no-scroll-top
                id="product-tab-reviews"
                role="tab"
                aria-selected={activeTab === "reviews"}
                aria-controls="product-tabpanel-reviews"
                tabIndex={activeTab === "reviews" ? 0 : -1}
                onClick={() => setActiveTab("reviews")}
		                className={`hidden sm:inline-flex -mb-px border-b-2 py-4 text-sm font-semibold transition ${
		                  activeTab === "reviews"
		                    ? "border-black text-black"
		                    : "border-transparent text-gray-600 hover:text-black"
		                }`}
	              >
                Reviews ({Number(reviewSummary.ratingCount || 0)})
              </button>
            </div>

            <div className="p-6">
              {activeTab === "description" ? (
                <div
                  id="product-tabpanel-description"
                  role="tabpanel"
                  aria-labelledby="product-tab-description"
                  className="space-y-8"
                >
                  <div className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {product.description || "No description available."}
                  </div>

                  {product.features && product.features.length > 0 ? (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Key Features
                      </h3>
                      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {product.features.map((feature, index) => (
                          <li
                            key={index}
                            className="flex items-start gap-3 rounded-lg bg-gray-50 p-3"
                          >
                            <div className="mt-2 h-2 w-2 rounded-full bg-black" />
                            <span className="text-gray-700">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {marketplaceType === "grouped" &&
                  Array.isArray(product.groupedProducts) &&
                  product.groupedProducts.length > 0 ? (
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">
                        Grouped Products
                      </h3>
                      <div className="mt-4 space-y-3">
                        {product.groupedProducts.map((groupedProduct) => {
                          const groupedPriceType = String(
                            groupedProduct?.priceType || "single",
                          );
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
                                className="h-16 w-16 rounded-lg object-cover"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-medium text-gray-900">
                                  {groupedProduct?.title}
                                </p>
                                <p className="mt-1 text-sm text-gray-500">
                                  {groupedPriceType === "tba"
                                    ? "TBA"
                                    : Number.isFinite(groupedPrice)
                                      ? `${groupedPrice.toFixed(2)} Tk`
                                      : "Price not available"}
                                </p>
                              </div>
                              <button
                                type="button"
                                data-no-scroll-top
                                onClick={() => navigate(`/product/${groupedProduct._id}`)}
                                className="rounded-lg bg-black px-3 py-2 text-sm text-white hover:bg-gray-900"
                              >
                                View
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {activeTab === "additional" ? (
                <div
                  id="product-tabpanel-additional"
                  role="tabpanel"
                  aria-labelledby="product-tab-additional"
                >
                  {additionalInfoRows.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-[560px] w-full text-sm">
                        <tbody className="divide-y divide-gray-200">
                          {additionalInfoRows.map((row) => (
                            <tr
                              key={`${row.label}-${row.value}`}
                              className="align-top"
                            >
                              <th
                                scope="row"
                                className="w-56 bg-gray-50 px-4 py-3 text-left font-medium text-gray-900"
                              >
                                {row.label}
                              </th>
                              <td className="px-4 py-3 text-gray-700 whitespace-pre-line">
                                {row.value}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      No additional information available.
                    </p>
                  )}
                </div>
              ) : null}

              {activeTab === "reviews" ? (
                <div
                  id="product-tabpanel-reviews"
                  role="tabpanel"
                  aria-labelledby="product-tab-reviews"
                >
                  <section
                    id="reviews"
                    data-review-section
                    className="scroll-mt-24"
                  >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
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
                      className="border border-gray-200 rounded-2xl p-4 bg-gradient-to-br from-white via-gray-50 to-white shadow-sm"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="font-semibold text-gray-900 flex items-center gap-2">
                            {review.user?.name || review.reviewerName || "Customer"}
                            {review.verifiedPurchase ? (
                              <span className="text-[10px] px-2 py-1 rounded-full bg-green-100 text-green-700">
                                Verified
                              </span>
                            ) : null}
                          </p>
                          <div className="flex items-center gap-1">
                            {renderStars(review.rating || 0)}
                            <span className="text-xs text-gray-500">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        {user &&
                          String(review.user?._id || review.user || review.userId || "") ===
                            String(user._id || user.id || "") && (
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setMyReview(review);
                                  setReviewForm({
                                    rating: Number(review.rating || 5),
                                    title: review.title || "",
                                    comment: review.comment || "",
                                  });
                                  if (typeof document !== "undefined") {
                                    document
                                      .getElementById("review-form")
                                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }
                                }}
                                className="text-xs px-3 py-1 rounded-full border border-gray-200 hover:border-gray-400"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteReview}
                                className="text-xs px-3 py-1 rounded-full border border-red-200 text-red-600 hover:border-red-400"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                      </div>
                      {review.title ? (
                        <p className="text-sm font-semibold text-gray-900 mt-2">{review.title}</p>
                      ) : null}
                      <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap leading-relaxed">
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div id="review-form" className="bg-white border border-gray-200 rounded-xl p-5">
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
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const active = (hoverRating || reviewForm.rating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onMouseEnter={() => setHoverRating(star)}
                            onMouseLeave={() => setHoverRating(null)}
                            onClick={() =>
                              setReviewForm((prev) => ({ ...prev, rating: star }))
                            }
                            className="p-1"
                            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
                          >
                            <svg
                              className={`w-7 h-7 ${active ? "text-amber-500" : "text-gray-300"}`}
                              fill={active ? "currentColor" : "none"}
                              stroke="currentColor"
                              strokeWidth="1.5"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11.48 3.499a.75.75 0 011.04 0l2.12 2.063a.75.75 0 00.564.218l2.94-.226a.75.75 0 01.792.98l-.966 2.82a.75.75 0 00.186.766l2.118 2.063a.75.75 0 01-.428 1.287l-2.937.328a.75.75 0 00-.6.43l-1.14 2.63a.75.75 0 01-1.38 0l-1.14-2.63a.75.75 0 00-.6-.43l-2.938-.328a.75.75 0 01-.427-1.287l2.118-2.063a.75.75 0 00.186-.766l-.966-2.82a.75.75 0 01.792-.98l2.94.226a.75.75 0 00.564-.218L11.48 3.5z"
                              />
                            </svg>
                          </button>
                        );
                      })}
                    </div>
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
                  </section>
                </div>
              ) : null}
            </div>
          </div>
        </div>
        {relatedProductsLoading || relatedProducts.length > 0 ? (
          <section className="mt-10">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 className="text-2xl font-bold text-gray-900">Related products</h2>
              <button
                type="button"
                data-no-scroll-top
                onClick={() => {
                  const categoryId =
                    product?.category && typeof product.category === "object"
                      ? String(product.category?._id || "").trim()
                      : "";
                  navigate(categoryId ? `/shop?category=${categoryId}` : "/shop");
                  if (typeof window !== "undefined") window.scrollTo(0, 0);
                }}
                className="text-sm font-semibold text-gray-700 transition hover:text-black"
              >
                View all
              </button>
            </div>

            <div className="relative mt-5 group">
              <div
                ref={relatedCarouselRef}
                className="flex gap-3 sm:gap-4 lg:gap-5 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory"
              >
                {relatedProductsLoading
                  ? Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={`related-skeleton-${index}`}
                        className="snap-start shrink-0 w-[48%] sm:w-[31%] md:w-[23%] lg:w-[18.5%] xl:w-[15.5%]"
                      >
                        <div className="h-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                          <div className="aspect-square bg-gray-100 animate-pulse" />
                          <div className="space-y-2 p-3">
                            <div className="h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
                            <div className="h-4 w-4/5 rounded bg-gray-100 animate-pulse" />
                            <div className="h-3 w-3/5 rounded bg-gray-100 animate-pulse" />
                          </div>
                          <div className="h-9 bg-gray-100 animate-pulse" />
                        </div>
                      </div>
                    ))
                  : relatedProducts.map((entry) => {
                      const primaryImage = entry?.images?.[0];
                      const pricing = getRelatedProductPricing(entry);
                      const discountPercent =
                        pricing.hasDiscount &&
                        Number.isFinite(pricing.previousValue) &&
                        Number.isFinite(pricing.currentValue) &&
                        Number(pricing.previousValue || 0) > 0
                          ? Math.round(
                              ((Number(pricing.previousValue) - Number(pricing.currentValue)) /
                                Number(pricing.previousValue)) *
                                100,
                            )
                          : null;
                      const rawColorLabel = Array.isArray(entry?.colors)
                        ? entry.colors[0]
                        : "";
                      const colorLabelText = (() => {
                        const raw = String(rawColorLabel || "").trim();
                        if (!raw) return "";
                        if (/^#([0-9a-f]{3}){1,2}$/i.test(raw)) return "";
                        if (/^rgb\(/i.test(raw) || /^hsl\(/i.test(raw)) return "";
                        return raw.length > 22 ? `${raw.slice(0, 22)}...` : raw;
                      })();
                      const relatedCategoryName =
                        typeof entry?.category === "object"
                          ? String(entry?.category?.name || "").trim()
                          : String(entry?.category || "").trim();
                      const relatedStockText = isPublicStockVisible(entry)
                        ? getPublicStockBadgeText(entry)
                        : "";
                      const previewColors = Array.isArray(entry?.colors)
                        ? entry.colors.slice(0, 4)
                        : [];
                      const hasMoreColors =
                        Array.isArray(entry?.colors) && entry.colors.length > 4;

                      return (
                        <div
                          key={entry._id}
                          className="snap-start shrink-0 w-[48%] sm:w-[31%] md:w-[23%] lg:w-[18.5%] xl:w-[15.5%]"
                        >
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleNavigateToProduct(entry._id)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleNavigateToProduct(entry._id);
                              }
                            }}
                            className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-1 hover:border-gray-300 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-black/40"
                          >
                            <div className="relative aspect-square overflow-hidden bg-linear-to-br from-gray-50 via-white to-gray-100 p-2 sm:p-2.5">
                              {discountPercent && discountPercent > 0 ? (
                                <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-black px-3 py-1 text-xs font-bold text-white shadow-sm">
                                  -{discountPercent}%
                                </span>
                              ) : null}

                              {colorLabelText ? (
                                <span className="absolute bottom-3 right-3 text-xs font-semibold text-gray-700">
                                  {colorLabelText}
                                </span>
                              ) : null}

                              <div className="relative h-full w-full">
                                <ProductImage
                                  src={primaryImage}
                                  alt={entry.title}
                                  className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                                />
                              </div>
                            </div>

                            <div className="px-3 py-2.5 text-left sm:px-4 sm:py-3">
                              {relatedCategoryName ? (
                                <p className="line-clamp-1 text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500">
                                  {relatedCategoryName}
                                </p>
                              ) : null}
                              <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-black sm:text-sm">
                                {entry.title}
                              </h3>
                              {previewColors.length > 0 ? (
                                <div className="mt-2 flex items-center justify-start gap-1">
                                  {previewColors.map((color, idx) => (
                                    <div
                                      key={idx}
                                      className="h-3 w-3 rounded-full border border-gray-600 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)] sm:h-3.5 sm:w-3.5"
                                      style={{ backgroundColor: color }}
                                      title={color}
                                    />
                                  ))}
                                  {hasMoreColors ? (
                                    <span className="inline-flex h-[1.05rem] min-w-[1.05rem] items-center justify-center rounded-full bg-linear-to-br from-black to-gray-700 text-[8px] font-bold text-white shadow-sm sm:h-[1.2rem] sm:min-w-[1.2rem] sm:text-[9px]">
                                      4+
                                    </span>
                                  ) : null}
                                </div>
                              ) : null}
                              {relatedStockText ? (
                                <div className="mt-2 flex flex-wrap items-center justify-start gap-1.5">
                                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    {relatedStockText}
                                  </span>
                                </div>
                              ) : null}
                              <div className="mt-2 flex items-baseline justify-start gap-2">
                                {pricing.previousText ? (
                                  <span className="text-xs text-gray-400 line-through sm:text-sm">
                                    {pricing.previousText}
                                  </span>
                                ) : null}
                                <span className="text-sm font-black text-black sm:text-base">
                                  {pricing.currentText}
                                </span>
                              </div>
                            </div>

                            <button
                              type="button"
                              data-no-scroll-top
                              onClick={(event) => {
                                event.stopPropagation();
                                handleNavigateToProduct(entry._id);
                              }}
                              className="mt-auto w-full rounded-none bg-gray-900 py-2 text-xs font-semibold text-white transition hover:bg-black sm:py-2.5 sm:text-sm"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
              </div>

              {!relatedProductsLoading && relatedCarouselHasOverflow ? (
                <>
                  <button
                    type="button"
                    data-no-scroll-top
                    onClick={() => scrollRelatedCarousel(-1)}
                    className="hidden sm:inline-flex absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-gray-50"
                    aria-label="Previous related products"
                  >
                    <FaChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    data-no-scroll-top
                    onClick={() => scrollRelatedCarousel(1)}
                    className="hidden sm:inline-flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm opacity-0 transition group-hover:opacity-100 hover:bg-gray-50"
                    aria-label="Next related products"
                  >
                    <FaChevronRight className="h-4 w-4" />
                  </button>
                </>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
	  );
};

export default ProductDetails;



