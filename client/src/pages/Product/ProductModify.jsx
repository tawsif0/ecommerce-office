/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { motion } from "framer-motion";
import ConfirmModal from "../../components/ConfirmModal";
import {
  FiEdit2,
  FiTrash2,
  FiImage,
  FiRefreshCw,
  FiPlus,
  FiArrowLeft,
  FiType,
  FiFileText,
  FiTag,
  FiPackage,
  FiBox,
  FiLayers,
  FiX,
  FiUpload,
  FiCopy,
} from "react-icons/fi";

function ProductModify({ initialMode = "list" }) {
  const baseUrl = import.meta.env.VITE_API_URL;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mainImageFile, setMainImageFile] = useState(null);
  const [mainImagePreview, setMainImagePreview] = useState("");
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [currentMainImage, setCurrentMainImage] = useState("");
  const [currentMainImageId, setCurrentMainImageId] = useState(null);
  const [currentGalleryImages, setCurrentGalleryImages] = useState([]);
  const [currentGalleryImageIds, setCurrentGalleryImageIds] = useState([]);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    salePrice: "",
    priceType: "single",
    commissionType: "inherit",
    commissionValue: "",
    commissionFixed: "",
    category: "",
    productType: "General",
    marketplaceType: "simple",
    sku: "",
    stock: "",
    lowStockThreshold: "5",
    allowBackorder: false,
    showStockToPublic: false,
    deliveryMinDays: "2",
    deliveryMaxDays: "5",
    downloadUrl: "",
    serviceDurationDays: "",
    variationsJson: "[]",
    groupedProductsCsv: "",
    isRecurring: false,
    recurringInterval: "monthly",
    recurringIntervalCount: "1",
    recurringTotalCycles: "0",
    recurringTrialDays: "0",
    brand: "",
    weight: "",
    dimensions: "",
    colors: [],
  });

  const [errors, setErrors] = useState({});
  const [features, setFeatures] = useState([""]);
  const [specifications, setSpecifications] = useState([
    { key: "", value: "" },
  ]);
  const [customColorValue, setCustomColorValue] = useState("#2563eb");

  // Product type options
  const productTypes = [
    "General",
    "Popular",
    "Hot deals",
    "Best Selling",
    "Latest",
  ];
  const marketplaceTypes = [
    { value: "simple", label: "Simple Product" },
    { value: "variable", label: "Variable Product" },
    { value: "digital", label: "Digital Product" },
    { value: "service", label: "Service Product" },
    { value: "grouped", label: "Grouped Product" },
  ];
  const priceTypes = [
    { value: "single", label: "Single Price" },
    { value: "best", label: "Best Price" },
    { value: "tba", label: "TBA" },
  ];
  const allowedMarketplaceTypeValues = new Set(
    marketplaceTypes.map((entry) => entry.value),
  );

  const colorOptions = [
    { name: "Red", value: "#dc2626" },
    { name: "Blue", value: "#2563eb" },
    { name: "Green", value: "#16a34a" },
    { name: "Yellow", value: "#ca8a04" },
    { name: "Black", value: "#000000" },
    { name: "White", value: "#ffffff" },
    { name: "Purple", value: "#9333ea" },
    { name: "Pink", value: "#db2777" },
    { name: "Gray", value: "#6b7280" },
    { name: "Orange", value: "#ea580c" },
  ];

  const getToken = () => {
    return localStorage.getItem("token");
  };

  const getAuthHeaders = () => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const getEffectiveProductPrice = (product) => {
    const priceType = String(product?.priceType || "single");
    const hasSalePrice =
      priceType === "best" &&
      product?.salePrice !== null &&
      product?.salePrice !== undefined &&
      String(product.salePrice).trim() !== "";
    if (hasSalePrice) {
      const salePrice = Number(product.salePrice);
      if (Number.isFinite(salePrice) && salePrice >= 0) return salePrice;
    }
    const price = Number(product?.price);
    if (Number.isFinite(price) && price >= 0) return price;
    return 0;
  };

  const getProductPriceBadge = (product) => {
    const priceType = String(product?.priceType || "single");
    if (priceType === "tba") {
      return "TBA";
    }
    if (priceType === "best") {
      const previous = Number(product?.price || 0);
      const next = Number(product?.salePrice || 0);
      if (previous > 0 && next > 0) {
        return `${previous.toFixed(2)} -> ${next.toFixed(2)} TK`;
      }
    }
    return `${getEffectiveProductPrice(product).toFixed(2)} TK`;
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

    if (imagePath && !imagePath.startsWith("/")) {
      return baseUrl
        ? `${baseUrl}/uploads/products/${imagePath}`
        : `/uploads/products/${imagePath}`;
    }

    return null;
  };

  const FallbackImage = ({ className, alt }) => (
    <div
      className={`${className} bg-gray-200 flex items-center justify-center rounded-lg`}
    >
      <FiImage className="text-gray-400 text-2xl" />
      <span className="sr-only">{alt || "No image available"}</span>
    </div>
  );

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

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/products`, {
        headers: getAuthHeaders(),
      });

      let productsData = [];
      if (response.data.success) {
        productsData = response.data.products || [];
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        productsData = response.data.data;
      }

      setProducts(productsData);
    } catch (err) {
      toast.error(
        err.response?.data?.message || err.message || "Failed to load products",
      );

      if (err.response?.status === 401) {
        toast.error("Please login again");
        setTimeout(() => {
          window.location.href = "/login";
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${baseUrl}/categories`, {
        headers: getAuthHeaders(),
      });

      let categoriesData = [];
      if (response.data.success) {
        categoriesData = response.data.categories || [];
      } else if (Array.isArray(response.data)) {
        categoriesData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        categoriesData = response.data.data;
      }

      setCategories(categoriesData);
      // Initial filtered categories for "General" type
      filterCategoriesByType("General", categoriesData);
    } catch (err) {
      toast.error("Failed to load category options");
    }
  };

  const filterCategoriesByType = (type, categoriesList = categories) => {
    if (!type) {
      setFilteredCategories(
        categoriesList.filter((cat) => !cat.type || cat.type === "General"),
      );
      return;
    }

    // Filter categories by type (match category.type with productType)
    const filtered = categoriesList.filter((cat) => {
      // If category has no type, show it for General products
      if (!cat.type && type === "General") return true;
      // Match category type with product type
      return cat.type === type;
    });

    setFilteredCategories(filtered);

    // If current category is not in filtered list, reset category selection
    if (form.category && !filtered.find((cat) => cat._id === form.category)) {
      setForm((prev) => ({ ...prev, category: "" }));
    }
  };

  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.error("Please login first");
      setTimeout(() => {
        window.location.href = "/login";
      }, 2000);
      return;
    }

    fetchProducts();
    fetchCategories();

    if (initialMode === "create") {
      setShowForm(true);
      setEditingId(null);
    }

    const handleProductCreated = () => {
      fetchProducts();
    };

    window.addEventListener("productCreated", handleProductCreated);
    return () => {
      window.removeEventListener("productCreated", handleProductCreated);
    };
  }, [initialMode]);

  const handleDelete = (product) => {
    setDeleteConfirm(product);
  };

  const confirmDeleteProduct = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    const toastId = toast.loading("Deleting product...");
    try {
      await axios.delete(`${baseUrl}/products/${deleteConfirm._id}`, {
        headers: getAuthHeaders(),
      });
      toast.success("Product deleted successfully", { id: toastId });
      fetchProducts();
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete product",
        { id: toastId },
      );
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleDuplicate = async (productId) => {
    const toastId = toast.loading("Duplicating product...");
    try {
      await axios.post(
        `${baseUrl}/products/${productId}/duplicate`,
        {},
        { headers: getAuthHeaders() },
      );
      toast.success("Product duplicated successfully", { id: toastId });
      fetchProducts();
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Failed to duplicate product",
        { id: toastId },
      );
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    fetchProducts();
    fetchCategories();
    toast.success("Products refreshed!");
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      price: "",
      salePrice: "",
      priceType: "single",
      commissionType: "inherit",
      commissionValue: "",
      commissionFixed: "",
      category: "",
      productType: "General",
      marketplaceType: "simple",
      sku: "",
      stock: "",
      lowStockThreshold: "5",
      allowBackorder: false,
      showStockToPublic: false,
      deliveryMinDays: "2",
      deliveryMaxDays: "5",
      downloadUrl: "",
      serviceDurationDays: "",
      variationsJson: "[]",
      groupedProductsCsv: "",
      isRecurring: false,
      recurringInterval: "monthly",
      recurringIntervalCount: "1",
      recurringTotalCycles: "0",
      recurringTrialDays: "0",
      brand: "",
      weight: "",
      dimensions: "",
      colors: [],
    });
    setFeatures([""]);
    setSpecifications([{ key: "", value: "" }]);
    setMainImageFile(null);
    setMainImagePreview("");
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setCurrentMainImage("");
    setCurrentMainImageId(null);
    setCurrentGalleryImages([]);
    setCurrentGalleryImageIds([]);
    setErrors({});
    setCustomColorValue("#2563eb");
    setEditingId(null);
  };

  const startCreating = () => {
    resetForm();
    setShowForm(true);
  };

  const startEditing = async (id) => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseUrl}/products/${id}`, {
        headers: getAuthHeaders(),
      });

      const productData =
        response.data.product || response.data.data || response.data;

      // Set form data
      setForm({
        title: productData.title || "",
        description: productData.description || "",
        price: productData.price || "",
        salePrice:
          productData.salePrice !== undefined && productData.salePrice !== null
            ? productData.salePrice
            : "",
        priceType: ["single", "best", "tba"].includes(
          String(productData.priceType || "single"),
        )
          ? String(productData.priceType || "single")
          : "single",
        commissionType: ["inherit", "percentage", "fixed", "hybrid"].includes(
          String(productData.commissionType || "inherit"),
        )
          ? String(productData.commissionType || "inherit")
          : "inherit",
        commissionValue:
          productData.commissionValue !== undefined &&
          productData.commissionValue !== null
            ? String(productData.commissionValue)
            : "",
        commissionFixed:
          productData.commissionFixed !== undefined &&
          productData.commissionFixed !== null
            ? String(productData.commissionFixed)
            : "",
        category: productData.category?._id || productData.category || "",
        productType: productData.productType || "General",
        marketplaceType: allowedMarketplaceTypeValues.has(
          String(productData.marketplaceType || "simple"),
        )
          ? String(productData.marketplaceType || "simple")
          : "simple",
        sku: productData.sku || "",
        stock:
          productData.stock !== undefined && productData.stock !== null
            ? String(productData.stock)
            : "",
        lowStockThreshold:
          productData.lowStockThreshold !== undefined &&
          productData.lowStockThreshold !== null
            ? String(productData.lowStockThreshold)
            : "5",
        allowBackorder: Boolean(productData.allowBackorder),
        showStockToPublic: Boolean(productData.showStockToPublic),
        deliveryMinDays:
          productData.deliveryMinDays !== undefined &&
          productData.deliveryMinDays !== null
            ? String(productData.deliveryMinDays)
            : "2",
        deliveryMaxDays:
          productData.deliveryMaxDays !== undefined &&
          productData.deliveryMaxDays !== null
            ? String(productData.deliveryMaxDays)
            : "5",
        downloadUrl: productData.downloadUrl || "",
        serviceDurationDays:
          productData.serviceDurationDays !== undefined &&
          productData.serviceDurationDays !== null
            ? String(productData.serviceDurationDays)
            : "",
        variationsJson: JSON.stringify(productData.variations || [], null, 2),
        groupedProductsCsv: (productData.groupedProducts || [])
          .map((entry) =>
            typeof entry === "object"
              ? String(entry._id || entry.id || "")
              : String(entry || ""),
          )
          .filter(Boolean)
          .join(","),
        isRecurring: Boolean(productData.isRecurring),
        recurringInterval: ["weekly", "monthly", "quarterly", "yearly"].includes(
          String(productData.recurringInterval || "monthly"),
        )
          ? String(productData.recurringInterval || "monthly")
          : "monthly",
        recurringIntervalCount:
          productData.recurringIntervalCount !== undefined &&
          productData.recurringIntervalCount !== null
            ? String(productData.recurringIntervalCount)
            : "1",
        recurringTotalCycles:
          productData.recurringTotalCycles !== undefined &&
          productData.recurringTotalCycles !== null
            ? String(productData.recurringTotalCycles)
            : "0",
        recurringTrialDays:
          productData.recurringTrialDays !== undefined &&
          productData.recurringTrialDays !== null
            ? String(productData.recurringTrialDays)
            : "0",
        brand: productData.brand || "",
        weight: productData.weight || "",
        dimensions: productData.dimensions || "",
        colors: productData.colors || [],
      });
      setCustomColorValue(
        /^#[0-9a-fA-F]{6}$/.test(String(productData.colors?.[0] || ""))
          ? String(productData.colors[0]).toLowerCase()
          : "#2563eb",
      );

      setFeatures(
        productData.features?.length > 0 ? productData.features : [""],
      );
      setSpecifications(
        productData.specifications?.length > 0
          ? productData.specifications
          : [{ key: "", value: "" }],
      );

      if (productData.images && productData.images.length > 0) {
        const imagesWithUrls = productData.images.map(
          (img) => getFullImageUrl(img) || img,
        );
        const imageIds = productData.imageIds || [];

        setCurrentMainImage(imagesWithUrls[0] || "");
        setCurrentMainImageId(imageIds[0] || null);
        setCurrentGalleryImages(imagesWithUrls.slice(1, 5));
        setCurrentGalleryImageIds(imageIds.slice(1, 5));
      } else {
        setCurrentMainImage("");
        setCurrentMainImageId(null);
        setCurrentGalleryImages([]);
        setCurrentGalleryImageIds([]);
      }
      setMainImageFile(null);
      setMainImagePreview("");
      setGalleryFiles([]);
      setGalleryPreviews([]);

      setEditingId(id);
      setShowForm(true);

      // Filter categories based on product type
      filterCategoriesByType(productData.productType || "General");
    } catch (err) {
      toast.error("Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  const cancelForm = () => {
    resetForm();
    setShowForm(false);
  };

  const handleMainImageChange = (e) => {
    const file = e.target.files[0];
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
      return;
    }

    setMainImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setMainImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleGalleryChange = (e) => {
    const filesArray = Array.from(e.target.files);

    const validTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "image/webp",
      "image/gif",
    ];

    const validFiles = filesArray.filter((file) => {
      if (!validTypes.includes(file.type)) {
        toast.error(
          `Invalid file type: ${file.name}. Only JPG, PNG, WebP, GIF allowed.`,
        );
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const maxGallery = Math.max(0, 4 - currentGalleryImages.length);
      const newFiles = [...galleryFiles, ...validFiles].slice(0, maxGallery);
      setGalleryFiles(newFiles);

      const newPreviews = [...galleryPreviews];
      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result);
          if (newPreviews.length === newFiles.length) {
            setGalleryPreviews(newPreviews.slice(0, maxGallery));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeMainImage = () => {
    if (mainImagePreview) {
      setMainImageFile(null);
      setMainImagePreview("");
    } else {
      setCurrentMainImage("");
      setCurrentMainImageId(null);
    }
  };

  const removeGalleryImage = (index, isCurrent = false) => {
    if (isCurrent) {
      const newImages = currentGalleryImages.filter((_, i) => i !== index);
      const newIds = currentGalleryImageIds.filter((_, i) => i !== index);
      setCurrentGalleryImages(newImages);
      setCurrentGalleryImageIds(newIds);
    } else {
      const newFiles = galleryFiles.filter((_, i) => i !== index);
      const newPreviews = galleryPreviews.filter((_, i) => i !== index);
      setGalleryFiles(newFiles);
      setGalleryPreviews(newPreviews);
    }
  };

  const validateField = (name, value) => {
    let error = "";
    switch (name) {
      case "title":
        if (!value.trim()) error = "Product title is required";
        else if (value.trim().length < 3)
          error = "Title must be at least 3 characters";
        break;
      case "description":
        if (!value.trim()) error = "Description is required";
        else if (value.trim().length < 10)
          error = "Description must be at least 10 characters";
        break;
      case "price":
        if (!value || isNaN(value) || parseFloat(value) <= 0)
          error = "Valid price is required";
        break;
      case "salePrice":
        if (!value || isNaN(value) || parseFloat(value) <= 0) {
          error = "Valid new price is required";
        }
        break;
      case "category":
        if (!value) error = "Category selection is required";
        break;
      default:
        break;
    }
    setErrors((prev) => ({ ...prev, [name]: error }));
    return !error;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const nextValue = type === "checkbox" ? checked : value;

    if (name === "productType") {
      setForm((prev) => ({ ...prev, [name]: nextValue, category: "" }));
      filterCategoriesByType(nextValue);
    } else if (name === "marketplaceType") {
      setForm((prev) => {
        const updated = { ...prev, [name]: nextValue };
        if (["variable", "grouped"].includes(nextValue)) {
          updated.priceType = "single";
          updated.salePrice = "";
          updated.isRecurring = false;
          updated.recurringInterval = "monthly";
          updated.recurringIntervalCount = "1";
          updated.recurringTotalCycles = "0";
          updated.recurringTrialDays = "0";
        }
        return updated;
      });
      if (errors[name]) validateField(name, nextValue);
    } else if (name === "priceType") {
      setForm((prev) => {
        const updated = { ...prev, [name]: nextValue };
        if (nextValue === "single") {
          updated.salePrice = "";
        }
        if (nextValue === "tba") {
          updated.price = "";
          updated.salePrice = "";
          updated.stock = "0";
          updated.allowBackorder = false;
          updated.isRecurring = false;
          updated.recurringInterval = "monthly";
          updated.recurringIntervalCount = "1";
          updated.recurringTotalCycles = "0";
          updated.recurringTrialDays = "0";
        }
        return updated;
      });
      setErrors((prev) => ({ ...prev, price: "", salePrice: "" }));
    } else if (name === "isRecurring") {
      setForm((prev) => {
        const enabled = Boolean(nextValue);
        const base = {
          ...prev,
          isRecurring: enabled,
        };

        if (!enabled) {
          return {
            ...base,
            recurringInterval: "monthly",
            recurringIntervalCount: "1",
            recurringTotalCycles: "0",
            recurringTrialDays: "0",
          };
        }

        if (prev.priceType === "tba" || ["variable", "grouped"].includes(prev.marketplaceType)) {
          return {
            ...base,
            isRecurring: false,
            recurringInterval: "monthly",
            recurringIntervalCount: "1",
            recurringTotalCycles: "0",
            recurringTrialDays: "0",
          };
        }

        return base;
      });
    } else {
      setForm((prev) => ({ ...prev, [name]: nextValue }));
      if (errors[name]) validateField(name, nextValue);
    }
  };

  const handleColorAdd = (colorValue) => {
    const normalizedColor = String(colorValue || "").trim().toLowerCase();
    if (!/^#[0-9a-f]{6}$/.test(normalizedColor)) {
      return;
    }

    if (!form.colors.includes(normalizedColor)) {
      setForm((prev) => ({
        ...prev,
        colors: [...prev.colors, normalizedColor],
      }));
    }
  };

  const normalizeHexColor = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    const withHash = raw.startsWith("#") ? raw : `#${raw}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(withHash)) return "";
    return withHash.toLowerCase();
  };

  const handleCustomColorAdd = () => {
    const normalized = normalizeHexColor(customColorValue);
    if (!normalized) {
      toast.error("Enter a valid hex color like #2563eb");
      return;
    }
    handleColorAdd(normalized);
    setCustomColorValue(normalized);
  };

  const handleColorRemove = (colorToRemove) => {
    setForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((color) => color !== colorToRemove),
    }));
  };

  const handleFeatureAdd = () => {
    setFeatures([...features, ""]);
  };

  const handleFeatureChange = (index, value) => {
    const newFeatures = [...features];
    newFeatures[index] = value;
    setFeatures(newFeatures);
  };

  const handleFeatureRemove = (index) => {
    if (features.length > 1) {
      const newFeatures = features.filter((_, i) => i !== index);
      setFeatures(newFeatures);
    }
  };

  const handleSpecificationAdd = () => {
    setSpecifications([...specifications, { key: "", value: "" }]);
  };

  const handleSpecificationChange = (index, field, value) => {
    const newSpecs = [...specifications];
    newSpecs[index][field] = value;
    setSpecifications(newSpecs);
  };

  const handleSpecificationRemove = (index) => {
    if (specifications.length > 1) {
      const newSpecs = specifications.filter((_, i) => i !== index);
      setSpecifications(newSpecs);
    }
  };

  const validateForm = () => {
    let isValid = true;

    isValid = validateField("title", form.title) && isValid;
    isValid = validateField("description", form.description) && isValid;
    const needsDirectPrice = !["variable", "grouped"].includes(form.marketplaceType);
    if (needsDirectPrice) {
      if (form.priceType === "single") {
        isValid = validateField("price", form.price) && isValid;
      } else if (form.priceType === "best") {
        isValid = validateField("price", form.price) && isValid;
        isValid = validateField("salePrice", form.salePrice) && isValid;
        if (
          !isNaN(parseFloat(form.price)) &&
          !isNaN(parseFloat(form.salePrice)) &&
          parseFloat(form.salePrice) >= parseFloat(form.price)
        ) {
          setErrors((prev) => ({
            ...prev,
            salePrice: "New price must be lower than previous price",
          }));
          isValid = false;
        }
      }
    }
    isValid = validateField("category", form.category) && isValid;

    if (form.isRecurring) {
      if (form.priceType === "tba") {
        toast.error("Recurring product cannot use TBA price type");
        isValid = false;
      }

      if (!["simple", "digital", "service"].includes(form.marketplaceType)) {
        toast.error(
          "Recurring products are allowed only for simple, digital, or service types",
        );
        isValid = false;
      }

      if (!(Number(form.recurringIntervalCount || 0) >= 1)) {
        toast.error("Recurring interval count must be at least 1");
        isValid = false;
      }
    }

    const hasMainImage = Boolean(currentMainImage || mainImagePreview);
    if (!hasMainImage) {
      toast.error("Main product image is required");
      isValid = false;
    }

    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix all errors before submitting");
      return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading(
      editingId ? "Updating product..." : "Creating product...",
    );

    try {
      const token = getToken();
      if (!token) {
        toast.error("Authentication required. Please login again.", {
          id: toastId,
        });
        setIsSubmitting(false);
        return;
      }

      const formData = new FormData();
      const needsDirectPrice = !["variable", "grouped"].includes(form.marketplaceType);
      const normalizedPriceType = needsDirectPrice ? form.priceType : "single";
      const normalizedPrice =
        normalizedPriceType === "tba" ? "0" : form.price || "0";
      const normalizedSalePrice =
        normalizedPriceType === "best" ? form.salePrice || "" : "";
      const normalizedStock =
        normalizedPriceType === "tba" ? "0" : form.stock || "0";

      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("priceType", normalizedPriceType);
      formData.append("price", normalizedPrice);
      formData.append("salePrice", normalizedSalePrice);
      formData.append("commissionType", form.commissionType || "inherit");
      formData.append("commissionValue", form.commissionValue || "0");
      formData.append("commissionFixed", form.commissionFixed || "0");
      formData.append("category", form.category);
      formData.append("productType", form.productType);
      formData.append("marketplaceType", form.marketplaceType);
      formData.append("sku", form.sku.trim());
      formData.append("stock", normalizedStock);
      formData.append("lowStockThreshold", form.lowStockThreshold || "5");
      formData.append(
        "allowBackorder",
        String(
          normalizedPriceType === "tba" ? false : Boolean(form.allowBackorder),
        ),
      );
      formData.append(
        "showStockToPublic",
        String(Boolean(form.showStockToPublic)),
      );
      formData.append("deliveryMinDays", form.deliveryMinDays || "2");
      formData.append("deliveryMaxDays", form.deliveryMaxDays || "5");
      formData.append("downloadUrl", form.downloadUrl.trim());
      formData.append("serviceDurationDays", form.serviceDurationDays || "0");
      formData.append("isRecurring", String(Boolean(form.isRecurring)));
      formData.append("recurringInterval", form.recurringInterval || "monthly");
      formData.append(
        "recurringIntervalCount",
        String(Math.max(1, Number(form.recurringIntervalCount || 1))),
      );
      formData.append(
        "recurringTotalCycles",
        String(Math.max(0, Number(form.recurringTotalCycles || 0))),
      );
      formData.append(
        "recurringTrialDays",
        String(Math.max(0, Number(form.recurringTrialDays || 0))),
      );
      formData.append("brand", form.brand.trim());
      formData.append("weight", form.weight || "0");
      formData.append("dimensions", form.dimensions.trim());
      formData.append("colors", JSON.stringify(form.colors));
      formData.append(
        "features",
        JSON.stringify(features.filter((f) => f.trim())),
      );
      formData.append(
        "specifications",
        JSON.stringify(
          specifications.filter((s) => s.key.trim() && s.value.trim()),
        ),
      );

      if (form.marketplaceType === "variable") {
        formData.append("variations", form.variationsJson || "[]");
      } else {
        formData.append("variations", "[]");
      }

      if (form.marketplaceType === "grouped") {
        const groupedProductIds = (form.groupedProductsCsv || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);
        formData.append("groupedProducts", JSON.stringify(groupedProductIds));
      } else {
        formData.append("groupedProducts", "[]");
      }

      const existingImages = [];
      if (!mainImagePreview && currentMainImage) {
        existingImages.push(currentMainImageId || currentMainImage);
      }
      currentGalleryImages.forEach((img, idx) => {
        existingImages.push(currentGalleryImageIds[idx] || img);
      });
      formData.append("existingImages", JSON.stringify(existingImages));

      if (mainImageFile) {
        formData.append("images", mainImageFile);
        formData.append("mainImageFirst", "true");
      }
      galleryFiles.forEach((image) => {
        formData.append("images", image);
      });

      if (editingId) {
        await axios.put(`${baseUrl}/products/${editingId}`, formData, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success("Product updated successfully!", { id: toastId });
      } else {
        await axios.post(`${baseUrl}/products`, formData, {
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "multipart/form-data",
          },
        });

        toast.success("Product created successfully!", { id: toastId });
      }

      cancelForm();
      fetchProducts();
      fetchCategories();

      window.dispatchEvent(new CustomEvent("productCreated"));
    } catch (err) {
      let errorMessage = editingId
        ? "Failed to update product"
        : "Failed to create product";

      if (err.response?.status === 401) {
        errorMessage = "Authentication failed. Please login again.";
      } else if (err.response?.status === 413) {
        errorMessage = "Image upload failed (file too large)";
      } else if (err.response?.status === 415) {
        errorMessage = "Unsupported file type";
      } else if (err.response?.data?.message) {
        errorMessage = Array.isArray(err.response.data.message)
          ? err.response.data.message.join(", ")
          : err.response.data.message;
      }

      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading && !showForm) {
    return (
      <div className="flex justify-center items-center min-h-[60vh] w-full">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-2 border-gray-200 border-t-2 border-t-black rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full"
      >
        <div className="w-full mx-auto p-2 md:p-4">
          {/* Header */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center">
              <button
                onClick={cancelForm}
                className="mr-3 md:mr-4 p-2 rounded-full hover:bg-gray-200 transition-colors"
              >
                <FiArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-gray-900">
                  {editingId ? "Edit Product" : "Create New Product"}
                </h1>
                <p className="text-gray-600 mt-1 md:mt-2 text-sm md:text-base">
                  {editingId
                    ? "Edit the product details"
                    : "Add a new product to your store. Fill in all required details."}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 lg:gap-8">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
                >
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-4 md:mb-6 flex items-center">
                    <FiPackage className="mr-2" /> Product Information
                  </h2>

                  {/* Basic Info */}
                  <div className="space-y-4 md:space-y-6">
                    {/* Title */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <FiType className="mr-2" /> Product Title *
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={form.title}
                        onChange={handleChange}
                        onBlur={() => validateField("title", form.title)}
                        placeholder="Enter product title"
                        className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border ${
                          errors.title ? "border-red-500" : "border-gray-300"
                        } focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base`}
                      />
                      {errors.title && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-500 mt-1"
                        >
                          {errors.title}
                        </motion.p>
                      )}
                    </div>

                    {/* Description */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <FiFileText className="mr-2" /> Description *
                      </label>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        onBlur={() =>
                          validateField("description", form.description)
                        }
                        rows={4}
                        className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border ${
                          errors.description
                            ? "border-red-500"
                            : "border-gray-300"
                        } focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base`}
                        placeholder="Enter product description"
                      />
                      {errors.description && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-500 mt-1"
                        >
                          {errors.description}
                        </motion.p>
                      )}
                    </div>

                    {/* Price */}
                    <div className="grid grid-cols-1 gap-3 md:gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Price Type *
                        </label>
                        <select
                          name="priceType"
                          value={form.priceType}
                          onChange={handleChange}
                          disabled={["variable", "grouped"].includes(form.marketplaceType)}
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base disabled:bg-gray-100 disabled:text-gray-500"
                        >
                          {priceTypes.map((priceTypeOption) => (
                            <option key={priceTypeOption.value} value={priceTypeOption.value}>
                              {priceTypeOption.label}
                            </option>
                          ))}
                        </select>
                        {["variable", "grouped"].includes(form.marketplaceType) && (
                          <p className="text-xs text-gray-500 mt-1">
                            Variable and grouped products use variation/grouped pricing.
                          </p>
                        )}
                      </div>

                      {!["variable", "grouped"].includes(form.marketplaceType) &&
                        form.priceType === "single" && (
                          <div>
                            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                              Price (TK) *
                            </label>
                            <input
                              type="number"
                              name="price"
                              value={form.price}
                              onChange={handleChange}
                              onBlur={() => validateField("price", form.price)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border ${
                                errors.price ? "border-red-500" : "border-gray-300"
                              } focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base`}
                            />
                            {errors.price && (
                              <p className="text-sm text-red-500 mt-1">{errors.price}</p>
                            )}
                          </div>
                        )}

                      {!["variable", "grouped"].includes(form.marketplaceType) &&
                        form.priceType === "best" && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                            <div>
                              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                Previous Price (TK) *
                              </label>
                              <input
                                type="number"
                                name="price"
                                value={form.price}
                                onChange={handleChange}
                                onBlur={() => validateField("price", form.price)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border ${
                                  errors.price ? "border-red-500" : "border-gray-300"
                                } focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base`}
                              />
                              {errors.price && (
                                <p className="text-sm text-red-500 mt-1">{errors.price}</p>
                              )}
                            </div>
                            <div>
                              <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                                New Price (TK) *
                              </label>
                              <input
                                type="number"
                                name="salePrice"
                                value={form.salePrice}
                                onChange={handleChange}
                                onBlur={() => validateField("salePrice", form.salePrice)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border ${
                                  errors.salePrice ? "border-red-500" : "border-gray-300"
                                } focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base`}
                              />
                              {errors.salePrice && (
                                <p className="text-sm text-red-500 mt-1">{errors.salePrice}</p>
                              )}
                            </div>
                          </div>
                        )}

                      {!["variable", "grouped"].includes(form.marketplaceType) &&
                        form.priceType === "tba" && (
                          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-3 text-sm text-gray-700">
                            This product will show <span className="font-semibold">TBA</span>{" "}
                            instead of price and cannot be purchased until price type changes.
                          </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Commission Rule
                        </label>
                        <select
                          name="commissionType"
                          value={form.commissionType}
                          onChange={handleChange}
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        >
                          <option value="inherit">Inherit Global</option>
                          <option value="percentage">Percentage</option>
                          <option value="fixed">Fixed</option>
                          <option value="hybrid">Hybrid</option>
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Commission %
                        </label>
                        <input
                          type="number"
                          name="commissionValue"
                          value={form.commissionValue}
                          onChange={handleChange}
                          placeholder="0"
                          step="0.01"
                          min="0"
                          disabled={
                            form.commissionType === "inherit" ||
                            form.commissionType === "fixed"
                          }
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 disabled:bg-gray-100 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Fixed Commission (TK)
                        </label>
                        <input
                          type="number"
                          name="commissionFixed"
                          value={form.commissionFixed}
                          onChange={handleChange}
                          placeholder="0"
                          step="0.01"
                          min="0"
                          disabled={
                            form.commissionType === "inherit" ||
                            form.commissionType === "percentage"
                          }
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 disabled:bg-gray-100 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                    </div>

                    {/* Product Type */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        Product Type *
                      </label>
                      <select
                        name="productType"
                        value={form.productType}
                        onChange={handleChange}
                        className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                      >
                        {productTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Type of product for grouping
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Marketplace Type *
                        </label>
                        <select
                          name="marketplaceType"
                          value={form.marketplaceType}
                          onChange={handleChange}
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        >
                          {marketplaceTypes.map((typeOption) => (
                            <option key={typeOption.value} value={typeOption.value}>
                              {typeOption.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          SKU
                        </label>
                        <input
                          type="text"
                          name="sku"
                          value={form.sku}
                          onChange={handleChange}
                          placeholder="Stock keeping unit"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Stock Qty
                        </label>
                        <input
                          type="number"
                          name="stock"
                          value={form.stock}
                          onChange={handleChange}
                          placeholder="0"
                          min="0"
                          disabled={form.priceType === "tba"}
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Low Stock Alert
                        </label>
                        <input
                          type="number"
                          name="lowStockThreshold"
                          value={form.lowStockThreshold}
                          onChange={handleChange}
                          placeholder="5"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                      <div className="flex items-end">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            name="allowBackorder"
                            checked={form.allowBackorder}
                            onChange={handleChange}
                            disabled={form.priceType === "tba"}
                          />
                          Allow Backorder
                        </label>
                      </div>
                      <div className="flex items-end">
                        <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            name="showStockToPublic"
                            checked={form.showStockToPublic}
                            onChange={handleChange}
                          />
                          Show Stock Publicly
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Delivery Min Days
                        </label>
                        <input
                          type="number"
                          name="deliveryMinDays"
                          value={form.deliveryMinDays}
                          onChange={handleChange}
                          placeholder="2"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          Delivery Max Days
                        </label>
                        <input
                          type="number"
                          name="deliveryMaxDays"
                          value={form.deliveryMaxDays}
                          onChange={handleChange}
                          placeholder="5"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                    </div>

                    {form.marketplaceType === "variable" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Variations JSON
                        </label>
                        <textarea
                          name="variationsJson"
                          value={form.variationsJson}
                          onChange={handleChange}
                          rows={5}
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base font-mono"
                          placeholder='[{"label":"Size M","price":500,"stock":20}]'
                        />
                      </div>
                    )}

                    {form.marketplaceType === "grouped" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Grouped Product IDs (comma separated)
                        </label>
                        <textarea
                          name="groupedProductsCsv"
                          value={form.groupedProductsCsv}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base font-mono"
                          placeholder="64f...a1,64f...b2"
                        />
                      </div>
                    )}

                    {form.marketplaceType === "digital" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Download URL
                        </label>
                        <input
                          type="url"
                          name="downloadUrl"
                          value={form.downloadUrl}
                          onChange={handleChange}
                          placeholder="https://example.com/download/file.zip"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                    )}

                    {form.marketplaceType === "service" && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Service Duration (days)
                        </label>
                        <input
                          type="number"
                          name="serviceDurationDays"
                          value={form.serviceDurationDays}
                          onChange={handleChange}
                          placeholder="0"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                    )}

                    <div className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          name="isRecurring"
                          checked={Boolean(form.isRecurring)}
                          onChange={handleChange}
                          disabled={
                            form.priceType === "tba" ||
                            ["variable", "grouped"].includes(form.marketplaceType)
                          }
                        />
                        Enable recurring subscription billing
                      </label>
                      <p className="text-xs text-gray-500">
                        Recurring works with simple, digital, and service products.
                      </p>

                      {Boolean(form.isRecurring) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Billing Interval
                            </label>
                            <select
                              name="recurringInterval"
                              value={form.recurringInterval}
                              onChange={handleChange}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 text-sm"
                            >
                              <option value="weekly">Weekly</option>
                              <option value="monthly">Monthly</option>
                              <option value="quarterly">Quarterly</option>
                              <option value="yearly">Yearly</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Interval Count
                            </label>
                            <input
                              type="number"
                              name="recurringIntervalCount"
                              value={form.recurringIntervalCount}
                              onChange={handleChange}
                              min="1"
                              max="24"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Renewal Cycles
                            </label>
                            <input
                              type="number"
                              name="recurringTotalCycles"
                              value={form.recurringTotalCycles}
                              onChange={handleChange}
                              min="0"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 text-sm"
                            />
                            <p className="text-[11px] text-gray-500 mt-1">0 = Unlimited</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Trial Days
                            </label>
                            <input
                              type="number"
                              name="recurringTrialDays"
                              value={form.recurringTrialDays}
                              onChange={handleChange}
                              min="0"
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 text-sm"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <FiTag className="mr-2" /> Category *
                      </label>
                      <select
                        name="category"
                        value={form.category}
                        onChange={handleChange}
                        onBlur={() => validateField("category", form.category)}
                        className={`w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border ${
                          errors.category ? "border-red-500" : "border-gray-300"
                        } focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base`}
                        disabled={filteredCategories.length === 0}
                      >
                        <option value="">
                          {filteredCategories.length === 0
                            ? `No categories available for ${form.productType} type`
                            : "Select a category"}
                        </option>
                        {filteredCategories.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name} ({cat.type || "General"})
                          </option>
                        ))}
                      </select>
                      {filteredCategories.length === 0 && (
                        <p className="text-sm text-yellow-600 mt-1">
                          No categories found for {form.productType} type.
                          Please create a category first.
                        </p>
                      )}
                      {errors.category && (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-sm text-red-500 mt-1"
                        >
                          {errors.category}
                        </motion.p>
                      )}
                    </div>

                    {/* Brand */}
                    <div>
                      <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                        <FiPackage className="mr-2" /> Brand
                      </label>
                      <input
                        type="text"
                        name="brand"
                        value={form.brand}
                        onChange={handleChange}
                        placeholder="Enter brand name"
                        className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                      />
                    </div>

                    {/* Physical Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          <FiBox className="mr-2" /> Weight (kg)
                        </label>
                        <input
                          type="number"
                          name="weight"
                          value={form.weight}
                          onChange={handleChange}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                      <div>
                        <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                          <FiLayers className="mr-2" /> Dimensions
                        </label>
                        <input
                          type="text"
                          name="dimensions"
                          value={form.dimensions}
                          onChange={handleChange}
                          placeholder="e.g., 10×5×2 cm"
                          className="w-full px-3 md:px-4 py-2 md:py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:border-gray-500 transition-all text-sm md:text-base"
                        />
                      </div>
                    </div>

                    {/* Features */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Key Features
                      </label>
                      {features.map((feature, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) =>
                              handleFeatureChange(index, e.target.value)
                            }
                            className="flex-1 px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 text-sm md:text-base"
                            placeholder="Enter a feature"
                          />
                          {features.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleFeatureRemove(index)}
                              className="px-3 py-2 text-red-600 hover:text-red-800"
                            >
                              <FiX />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleFeatureAdd}
                        className="mt-2 flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        <FiPlus /> Add Feature
                      </button>
                    </div>

                    {/* Specifications */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Specifications
                      </label>
                      {specifications.map((spec, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2"
                        >
                          <input
                            type="text"
                            value={spec.key}
                            onChange={(e) =>
                              handleSpecificationChange(
                                index,
                                "key",
                                e.target.value,
                              )
                            }
                            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 text-sm md:text-base"
                            placeholder="Key"
                          />
                          <input
                            type="text"
                            value={spec.value}
                            onChange={(e) =>
                              handleSpecificationChange(
                                index,
                                "value",
                                e.target.value,
                              )
                            }
                            className="px-3 md:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:border-gray-500 text-sm md:text-base"
                            placeholder="Value"
                          />
                          {specifications.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleSpecificationRemove(index)}
                              className="px-3 py-2 text-red-600 hover:text-red-800 flex items-center justify-center"
                            >
                              <FiTrash2 />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleSpecificationAdd}
                        className="mt-2 flex items-center gap-2 text-gray-600 hover:text-gray-800 text-sm"
                      >
                        <FiPlus /> Add Specification
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Right Column - Images & Colors */}
              <div className="space-y-4 md:space-y-6 lg:space-y-8">
                {/* Images Upload */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
                >
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4 flex items-center">
                    <FiImage className="mr-2" /> Product Images *
                  </h2>

                  {/* Main Image Upload */}
                  <div className="mb-4 md:mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Main Product Image *
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 md:p-6 text-center hover:border-gray-500 transition-colors">
                      {mainImagePreview ? (
                        <div className="relative">
                          <img
                            src={mainImagePreview}
                            alt="Main product preview"
                            className="w-full h-40 md:h-48 object-contain rounded-lg mx-auto"
                          />
                          <button
                            type="button"
                            onClick={removeMainImage}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                          >
                            <FiX size={14} />
                          </button>
                          <div className="text-xs text-gray-500 mt-2 text-center">
                            New Main Image
                          </div>
                        </div>
                      ) : currentMainImage ? (
                        <div className="relative">
                          <ProductImage
                            src={currentMainImage}
                            alt="Current main product"
                            className="w-full h-40 md:h-48 object-contain rounded-lg mx-auto"
                            isCurrent={true}
                          />
                          <button
                            type="button"
                            onClick={removeMainImage}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full hover:bg-red-700"
                          >
                            <FiX size={14} />
                          </button>
                          <div className="text-xs text-gray-500 mt-2 text-center">
                            Current Main Image
                          </div>
                        </div>
                      ) : (
                        <>
                          <FiImage className="mx-auto text-gray-400 text-2xl md:text-3xl mb-2" />
                          <p className="text-gray-600 mb-2 text-sm md:text-base">
                            Click to upload main product image
                          </p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleMainImageChange}
                            className="hidden"
                            id="main-image-upload"
                          />
                          <label
                            htmlFor="main-image-upload"
                            className="inline-flex items-center gap-2 px-3 md:px-4 py-2 bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800 transition-colors text-sm md:text-base"
                          >
                            <FiUpload /> Upload Main Image
                          </label>
                      <p className="text-xs text-gray-500 mt-2">
                        JPG, PNG, WebP, GIF (auto-optimized on upload)
                      </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Gallery Images Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gallery Images ({currentGalleryImages.length + galleryPreviews.length}/4)
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 md:p-4 text-center hover:border-gray-500 transition-colors">
                      <p className="text-gray-600 mb-2 text-sm md:text-base">
                        Add up to 4 images for product gallery
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleGalleryChange}
                        className="hidden"
                        id="gallery-upload"
                        disabled={currentGalleryImages.length + galleryPreviews.length >= 4}
                      />
                      <label
                        htmlFor="gallery-upload"
                        className={`inline-flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg cursor-pointer text-sm md:text-base ${
                          currentGalleryImages.length + galleryPreviews.length >= 4
                            ? "bg-gray-400 text-gray-200 cursor-not-allowed"
                            : "bg-gray-900 text-white hover:bg-gray-800"
                        }`}
                      >
                        <FiUpload /> Add Gallery Images
                      </label>
                      <p className="text-xs text-gray-500 mt-2">
                        JPG, PNG, WebP, GIF (auto-optimized on upload)
                      </p>
                    </div>

                    {/* Current Gallery Images */}
                    {currentGalleryImages.length > 0 && (
                      <div className="mt-3 md:mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Current Gallery
                        </label>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          {currentGalleryImages.map((image, index) => (
                            <div
                              key={`current-gallery-${index}`}
                              className="relative group"
                            >
                              <ProductImage
                                src={image}
                                alt={`Current gallery ${index + 1}`}
                                className="w-full h-28 md:h-32 object-cover rounded-lg"
                                isCurrent={true}
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(index, true)}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <FiX size={12} />
                              </button>
                              <div className="text-xs text-gray-500 mt-1 text-center">
                                Gallery {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Gallery Previews */}
                    {galleryPreviews.length > 0 && (
                      <div className="mt-3 md:mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Gallery Preview
                        </label>
                        <div className="grid grid-cols-2 gap-2 md:gap-3">
                          {galleryPreviews.map((preview, index) => (
                            <div key={`new-gallery-${index}`} className="relative group">
                              <img
                                src={preview}
                                alt={`New gallery ${index + 1}`}
                                className="w-full h-28 md:h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(index, false)}
                                className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <FiX size={12} />
                              </button>
                              <div className="text-xs text-gray-500 mt-1 text-center">
                                New Gallery {index + 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Colors */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
                >
                  <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-3 md:mb-4">
                    Available Colors
                  </h2>

                  <div className="space-y-3 md:space-y-4">
                    {/* Selected Colors */}
                    {form.colors.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Selected Colors
                        </label>
                        <div className="flex flex-wrap gap-1 md:gap-2">
                          {form.colors.map((color, index) => {
                            const colorObj = colorOptions.find(
                              (c) => c.value === color,
                            );
                            return (
                              <div
                                key={index}
                                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 bg-gray-100 rounded-full"
                              >
                                <div
                                  className="w-3 h-3 md:w-4 md:h-4 rounded-full border"
                                  style={{ backgroundColor: color }}
                                />
                                <span className="text-xs md:text-sm">
                                  {colorObj?.name || color}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleColorRemove(color)}
                                  className="text-gray-500 hover:text-red-600"
                                >
                                  <FiX size={10} className="md:h-3 md:w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Color Options */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Colors
                      </label>
                      <div className="grid grid-cols-4 gap-1 md:gap-2">
                        {colorOptions.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => handleColorAdd(color.value)}
                            className={`relative p-1 md:p-2 rounded-lg border ${
                              form.colors.includes(color.value)
                                ? "ring-1 md:ring-2 ring-gray-500"
                                : "hover:ring-1 hover:ring-gray-300"
                            }`}
                          >
                            <div
                              className="w-full h-6 md:h-8 rounded"
                              style={{ backgroundColor: color.value }}
                            />
                            <div className="text-xs mt-1 truncate">
                              {color.name}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Add Custom Color
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={customColorValue}
                          onChange={(event) =>
                            setCustomColorValue(event.target.value.toLowerCase())
                          }
                          className="h-10 w-14 p-1 border border-gray-300 rounded-lg bg-white cursor-pointer"
                          aria-label="Choose custom color"
                        />
                        <input
                          type="text"
                          value={customColorValue}
                          onChange={(event) => setCustomColorValue(event.target.value)}
                          placeholder="#2563eb"
                          className="flex-1 h-10 px-3 border border-gray-300 rounded-lg text-sm"
                        />
                        <button
                          type="button"
                          onClick={handleCustomColorAdd}
                          className="inline-flex h-10 items-center gap-1.5 px-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-900"
                        >
                          <FiPlus className="w-4 h-4" />
                          Add
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Pick any color from the palette and click Add.
                      </p>
                    </div>
                  </div>
                </motion.div>

                {/* Submit & Cancel Buttons */}
                <div className="space-y-2 md:space-y-3">
                  <button
                    type="button"
                    onClick={cancelForm}
                    className="w-full py-2 md:py-3 px-3 md:px-4 rounded-lg font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-all shadow-sm md:shadow-md text-sm md:text-base"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSubmitting || filteredCategories.length === 0}
                    className={`w-full py-2 md:py-3 px-3 md:px-4 rounded-lg font-medium text-white ${
                      isSubmitting || filteredCategories.length === 0
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-gray-900 hover:bg-gray-800"
                    } transition-all shadow-sm md:shadow-md flex items-center justify-center text-sm md:text-base`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {editingId ? "Updating..." : "Creating..."}
                      </>
                    ) : filteredCategories.length === 0 ? (
                      "No Categories Available"
                    ) : editingId ? (
                      "Update Product"
                    ) : (
                      "Create Product"
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <div className="w-full mx-auto p-2 md:p-4">
        {/* Products List */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-4 md:p-6 border border-gray-200"
        >
          <div className="py-1 border-b border-gray-100 mb-4 md:mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-2xl font-bold text-gray-900">
                  Product List
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  View and manage your products
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 md:px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {products.length} products
                </span>
                <button
                  onClick={handleRefresh}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  title="Refresh"
                >
                  <FiRefreshCw className="w-4 h-4" />
                  <span className="hidden md:inline">Refresh</span>
                </button>
                <button
                  onClick={startCreating}
                  className="flex items-center gap-2 px-3 md:px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  <span className="hidden md:inline">Add Product</span>
                  <span className="md:hidden">Add</span>
                </button>
              </div>
            </div>
          </div>

          {products.length === 0 ? (
            <div className="py-8 md:py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                No products found
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new product.
              </p>
              <div className="mt-4 md:mt-6">
                <button
                  onClick={startCreating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <FiPlus className="w-4 h-4" />
                  Create Your First Product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6">
              {products.map((product) => (
                <motion.div
                  key={product._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-4 md:p-6">
                    <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                      {/* Product Image */}
                      <div className="shrink-0 self-center">
                        <div className="relative w-full h-full md:w-40 md:h-40 rounded-lg overflow-hidden">
                          <ProductImage
                            src={product.images && product.images[0]}
                            alt={product.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h2 className="text-lg md:text-xl font-semibold text-gray-900 line-clamp-1">
                                {product.title}
                              </h2>
                            </div>
                            <p className="text-gray-600 text-xs md:text-sm mb-3 line-clamp-2">
                              {product.description}
                            </p>

                            <div className="flex flex-wrap gap-1 md:gap-2 mb-3">
                              <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded">
                                {product.category?.name || "Uncategorized"}
                              </span>
                              <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded">
                                {product.productType || "General"}
                              </span>
                              <span className="bg-gray-900 text-white text-xs px-2 py-1 rounded capitalize">
                                {product.marketplaceType || "simple"}
                              </span>
                              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                {getProductPriceBadge(product)}
                              </span>
                            </div>

                            {/* Colors Preview */}
                            {product.colors && product.colors.length > 0 && (
                              <div className="flex items-center gap-1 mb-2">
                                <span className="text-xs text-gray-500">
                                  Colors:
                                </span>
                                <div className="flex gap-1">
                                  {product.colors
                                    .slice(0, 3)
                                    .map((color, idx) => (
                                      <div
                                        key={idx}
                                        className="w-3 h-3 md:w-4 md:h-4 rounded-full border border-gray-300"
                                        style={{ backgroundColor: color }}
                                        title={color}
                                      />
                                    ))}
                                  {product.colors.length > 3 && (
                                    <span className="text-xs text-gray-500">
                                      +{product.colors.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 self-end md:self-start">
                            <button
                              onClick={() => handleDuplicate(product._id)}
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors"
                              title="Duplicate"
                            >
                              <FiCopy className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => startEditing(product._id)}
                              className="text-gray-600 hover:text-gray-800 p-2 rounded-full hover:bg-gray-50 transition-colors"
                              title="Edit"
                            >
                              <FiEdit2 className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(product)}
                              className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <FiTrash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>

                        {/* Product Meta */}
                        <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-gray-100 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                          <div className="text-xs md:text-sm text-gray-500">
                            Created:{" "}
                            {product.createdAt
                              ? new Date(product.createdAt).toLocaleDateString()
                              : "N/A"}
                          </div>
                          {product.brand && (
                            <div className="text-xs md:text-sm text-gray-600">
                              Brand: {product.brand}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          <ConfirmModal
            isOpen={Boolean(deleteConfirm)}
            title="Delete product"
            message={
              deleteConfirm?.title
                ? `Delete "${deleteConfirm.title}" product?`
                : "Delete this product?"
            }
            confirmLabel="Delete"
            isDanger
            isLoading={isDeleting}
            onCancel={() => setDeleteConfirm(null)}
            onConfirm={confirmDeleteProduct}
          />
        </motion.div>
      </div>
    </motion.div>
  );
}

export default ProductModify;

