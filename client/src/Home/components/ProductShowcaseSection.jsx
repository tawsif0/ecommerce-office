import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import StorefrontProductCard from "./StorefrontProductCard";

const baseUrl = import.meta.env.VITE_API_URL;
const INITIAL_VISIBLE_PRODUCTS = 4;

const resolveProductsPayload = (payload) => {
  if (payload?.success) return payload.products || [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const groupProductsByCategory = (products) => {
  const grouped = {};

  products.forEach((product) => {
    const productCategory = product?.category;
    let categoryId = "general";
    let categoryName = "General";

    if (typeof productCategory === "object" && productCategory?._id) {
      categoryId = productCategory._id;
      categoryName = productCategory.name || categoryName;
    } else if (typeof productCategory === "string" && productCategory.trim()) {
      categoryId = productCategory;
    }

    if (!grouped[categoryId]) {
      grouped[categoryId] = {
        categoryName,
        products: [],
      };
    }

    grouped[categoryId].products.push(product);
  });

  return grouped;
};

const ProductShowcaseSection = ({
  sectionId,
  productType,
  eyebrow,
  title,
  description,
  icon: Icon,
  iconShellClassName = "bg-black",
  eyebrowClassName = "text-gray-600",
  activeTabClassName = "bg-black text-white shadow-md",
  inactiveTabClassName = "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:shadow-sm",
  buttonClassName = "bg-black text-white hover:bg-gray-900",
  badgeText = "",
  badgeClassName = "",
  loadingTitle,
  loadingDescription = "Organizing by categories...",
  emptyTitle,
  emptyDescription = "Please check back soon for more products.",
  viewAllNoun = "Products",
  sectionClassName = "bg-white py-10 md:py-14",
  containerClassName = "product-rail-shell",
  fallbackEndpointPath = "",
}) => {
  const navigate = useNavigate();
  const [groupedProducts, setGroupedProducts] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    let ignore = false;

    const applyProductState = (products) => {
      const grouped = groupProductsByCategory(products);
      const categoryIds = Object.keys(grouped);

      setGroupedProducts(grouped);
      setExpandedCategories(
        categoryIds.reduce((acc, categoryId) => {
          acc[categoryId] = false;
          return acc;
        }, {}),
      );
      setActiveCategory(categoryIds[0] || null);
    };

    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${baseUrl}/products/public/type/${encodeURIComponent(productType)}`,
        );

        if (ignore) return;

        let products = resolveProductsPayload(response.data);

        if (!products.length && fallbackEndpointPath) {
          const normalizedFallbackPath = fallbackEndpointPath.startsWith("/")
            ? fallbackEndpointPath
            : `/${fallbackEndpointPath}`;
          const fallbackResponse = await axios.get(`${baseUrl}${normalizedFallbackPath}`);
          products = resolveProductsPayload(fallbackResponse.data);
        }

        if (ignore) return;
        applyProductState(products);
      } catch (error) {
        console.error(`Error fetching ${productType} products:`, error);
        if (!ignore) {
          setGroupedProducts({});
          setActiveCategory(null);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      ignore = true;
    };
  }, [fallbackEndpointPath, productType, title]);

  const categories = useMemo(() => Object.keys(groupedProducts), [groupedProducts]);
  const currentCategory = activeCategory ? groupedProducts[activeCategory] : null;
  const isExpanded = activeCategory ? expandedCategories[activeCategory] : false;
  const visibleProducts = useMemo(() => {
    if (!currentCategory) return [];
    if (isExpanded) return currentCategory.products;
    return currentCategory.products.slice(0, INITIAL_VISIBLE_PRODUCTS);
  }, [currentCategory, isExpanded]);

  const toggleExpanded = () => {
    if (!activeCategory) return;
    setExpandedCategories((prev) => ({
      ...prev,
      [activeCategory]: !prev[activeCategory],
    }));
  };

  const handleViewDetails = (product) => {
    navigate(`/product/${product?._id || product?.id}`);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <section id={sectionId} className={sectionClassName}>
        <div className={containerClassName}>
          <div className="text-center">
            <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full ${iconShellClassName}`}>
              {Icon ? <Icon className="h-5 w-5 text-white" /> : null}
            </div>
            <h3 className="text-base font-semibold text-gray-700">
              {loadingTitle || `Loading ${title}`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">{loadingDescription}</p>
          </div>
        </div>
      </section>
    );
  }

  if (!categories.length || !currentCategory) {
    return (
      <section id={sectionId} className={sectionClassName}>
        <div className={containerClassName}>
          <div className="py-10 text-center">
            <div className={`mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full ${iconShellClassName}`}>
              {Icon ? <Icon className="h-6 w-6 text-white" /> : null}
            </div>
            <h4 className="text-lg font-semibold text-gray-900">
              {emptyTitle || `No ${title} Available`}
            </h4>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
              {emptyDescription}
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} className={sectionClassName}>
      <div className={containerClassName}>
        <div className="mb-8 text-center md:mb-12">
          <div className="mb-3 inline-flex items-center gap-2">
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${iconShellClassName}`}>
              {Icon ? <Icon className="h-4 w-4 text-white" /> : null}
            </div>
            <span
              className={`text-xs font-semibold uppercase tracking-wider ${eyebrowClassName}`}
            >
              {eyebrow}
            </span>
          </div>

          <h2 className="mb-3 text-2xl font-bold text-black sm:text-3xl md:mb-4 md:text-4xl">
            {title}
          </h2>
          <div className="mx-auto max-w-xl">
            <p className="text-sm leading-relaxed text-gray-600 md:text-base">
              {description}
            </p>
          </div>
        </div>

        <div className="mb-8 md:mb-10">
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((categoryId) => {
              const category = groupedProducts[categoryId];
              const isActive = activeCategory === categoryId;

              return (
                <button
                  key={categoryId}
                  type="button"
                  onClick={() => setActiveCategory(categoryId)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 ${isActive ? activeTabClassName : inactiveTabClassName}`}
                >
                  <span className="text-sm font-medium">
                    {category.categoryName}
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs ${isActive ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600"}`}
                  >
                    {category.products.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-10 overflow-visible md:mb-12">
          <div className="storefront-card-grid">
            {visibleProducts.map((product) => (
              <div
                key={product?._id || product?.id}
                className="storefront-card-grid__item"
              >
                <StorefrontProductCard
                  product={product}
                  badgeText={badgeText}
                  badgeClassName={badgeClassName}
                  className="!w-full"
                  onViewDetails={handleViewDetails}
                />
              </div>
            ))}
          </div>

          {currentCategory.products.length > INITIAL_VISIBLE_PRODUCTS ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={toggleExpanded}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-300 hover:shadow-lg ${buttonClassName}`}
              >
                <span>
                  {isExpanded
                    ? "Show Less"
                    : `View All ${currentCategory.products.length} ${viewAllNoun}`}
                </span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

export default ProductShowcaseSection;
