/* eslint-disable no-unused-vars */
// components/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useCart } from "../../context/CartContext";
import usePublicSettings from "../../hooks/usePublicSettings";
import { FiPackage, FiShuffle } from "react-icons/fi";
import { toPublicAssetUrl } from "../../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL;

const normalizeThemeColor = (value) => {
  const raw = String(value || "")
    .trim()
    .toLowerCase();

  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`;
  }

  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    return raw;
  }

  return "#000000";
};

const normalizeLogoMode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase() === "text"
    ? "text"
    : "image";

const getReadableTextColor = (backgroundHex) => {
  const normalized = normalizeThemeColor(backgroundHex);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#ffffff";
};

const hexToRgba = (value, alpha) => {
  const normalized = normalizeThemeColor(value);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};



const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

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

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Login check state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState("");
  const [userRole, setUserRole] = useState("user");
  const { settings: publicSettings } = usePublicSettings();
  const { cartCount } = useCart();
  const compareCount = useSelector((state) => state.compare.items?.length || 0);

  const website = useMemo(() => publicSettings?.website || {}, [publicSettings]);
  const contact = useMemo(() => publicSettings?.contact || {}, [publicSettings]);
  const storefront = useMemo(() => publicSettings?.storefront || {}, [publicSettings]);
  const brandName = useMemo(() => {
    const resolved = String(website?.storeName || "E-Commerce").trim();
    return resolved || "E-Commerce";
  }, [website?.storeName]);
  const brandLogoMode = useMemo(
    () => normalizeLogoMode(website?.logoMode),
    [website?.logoMode],
  );
  const brandLogoText = useMemo(() => {
    const resolved = String(website?.logoText || "").trim();
    return resolved || brandName;
  }, [website?.logoText, brandName]);
  const brandTagline = useMemo(() => {
    const resolved = String(website?.tagline || "").trim();
    return resolved || "Premium marketplace picks with a polished shopping flow.";
  }, [website?.tagline]);
  const brandLogoUrl = useMemo(
    () =>
      brandLogoMode === "text"
        ? ""
        : toPublicAssetUrl(website?.logoUrl || ""),
    [brandLogoMode, website?.logoUrl],
  );
  const hasBrandLogoImage = useMemo(
    () => brandLogoMode === "image" && Boolean(brandLogoUrl),
    [brandLogoMode, brandLogoUrl],
  );
  const themeColor = useMemo(
    () => normalizeThemeColor(website?.themeColor),
    [website?.themeColor],
  );
  const themeTextColor = useMemo(
    () => getReadableTextColor(themeColor),
    [themeColor],
  );
  const supportPhone = useMemo(() => {
    const resolved = String(contact?.phone1 || "").trim();
    return resolved || "+880 1700-000000";
  }, [contact?.phone1]);
  const supportEmail = useMemo(() => {
    const resolved = String(contact?.email || "").trim();
    return resolved || "support@demo.com";
  }, [contact?.email]);
  const storefrontTrustBullets = useMemo(() => {
    const items = Array.isArray(storefront?.trustBullets)
      ? storefront.trustBullets
          .map((entry) => String(entry || "").trim())
          .filter(Boolean)
      : [];

    return items.length > 0
      ? items
      : [
          "Secure checkout built for fast daily shopping.",
          "Curated campaigns and arrivals across the marketplace.",
          "Support is one tap away when you need it.",
        ];
  }, [storefront?.trustBullets]);
  const storefrontQuickLinks = useMemo(() => {
    const items = Array.isArray(storefront?.navQuickLinks)
      ? storefront.navQuickLinks
      : [];
    const filtered = items.filter((entry) => {
      const label = String(entry?.label || "").trim();
      const normalizedLabel = label.toLowerCase();
      const path = String(entry?.path || "").trim();
      const normalizedPath = path.toLowerCase();

      if (!label || !path) return false;
      if (normalizedLabel.includes("categor")) return false;
      if (normalizedPath.includes("top-categories")) return false;

      return true;
    });

    return (filtered.length > 0
      ? filtered
      : [
          { label: "Daily Deals", path: "/shop?collection=deals" },
          { label: "New Arrivals", path: "/shop?collection=new-arrivals" },
          { label: "Buyer Protection", path: "/faqs#buyer-protection" },
          { label: "Track Order", path: "/track-order" },
        ]
    ).slice(0, 4);
  }, [storefront?.navQuickLinks]);
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
        setUserRole(String(user.userType || "user").toLowerCase());
      } catch (e) {
        console.error("Error parsing user data:", e);
        setUserRole("user");
      }
    }
  }, []);

  useEffect(() => {
    const handleLoggedIn = () => {
      setIsLoggedIn(true);
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        setUserName(user.name || user.email?.split("@")[0] || "User");
        setUserRole(String(user.userType || "user").toLowerCase());
      } catch (e) {
        setUserName("User");
        setUserRole("user");
      }
    };

    const handleLoggedOut = () => {
      setIsLoggedIn(false);
      setUserName("");
      setUserRole("user");
    };

    window.addEventListener("userLoggedIn", handleLoggedIn);
    window.addEventListener("userLoggedOut", handleLoggedOut);

    return () => {
      window.removeEventListener("userLoggedIn", handleLoggedIn);
      window.removeEventListener("userLoggedOut", handleLoggedOut);
    };
  }, []);

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

  // Handle cart icon click
  const handleCartClick = () => {
    navigate("/added-to-cart");
    setIsMobileMenuOpen(false);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setIsLoggedIn(false);
    setUserName("");
    setUserRole("user");
    navigate("/");
    setIsMobileMenuOpen(false);
    toast.success("Logged out successfully!");
    window.dispatchEvent(new CustomEvent("userLoggedOut"));
  };

  const openDashboardTab = (tab) => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }

    localStorage.setItem("dashboardActiveTab", tab);
    navigate("/dashboard");
    setIsMobileMenuOpen(false);
  };

  const handleCompareClick = () => {
    navigate("/compare");
    setIsMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const landingQuickLinks = useMemo(() => {
    if (userRole === "admin") {
      return [
        { label: "Order Management", tab: "order-list" },
        { label: "Customer Risk", tab: "customer-risk" },
        { label: "Support Tickets", tab: "module-support" },
        { label: "Vendor Messages", tab: "vendor-messages" },
      ];
    }

    if (userRole === "vendor") {
      return [
        { label: "Vendor Orders", tab: "vendor-orders" },
        { label: "Store Messages", tab: "vendor-messages" },
        { label: "Support Tickets", tab: "module-support" },
      ];
    }

    if (userRole === "staff") {
      return [
        { label: "Support Tickets", tab: "module-support" },
        { label: "Vendor Messages", tab: "vendor-messages" },
      ];
    }

    return [
      { label: "My Orders", tab: "my-orders" },
      { label: "Wishlist", tab: "wishlist" },
      { label: "Vendor Messages", tab: "vendor-messages" },
      { label: "Support Tickets", tab: "module-support" },
    ];
  }, [userRole]);


  const primaryNavItems = useMemo(
    () => [
      { label: "Home", to: "/" },
      { label: "Shop", to: "/shop" },
      { label: "About", to: "/about" },
      { label: "Contact", to: "/contact" },
      { label: "FAQs", to: "/faqs" },
    ],
    [],
  );

  const isPrimaryNavActive = (to) => {
    const pathname = location.pathname || "/";

    if (to === "/") {
      return pathname === "/" || pathname === "/demo03" || pathname === "/demo03-home";
    }

    if (to === "/shop") {
      return pathname === "/shop" || pathname.startsWith("/shop/");
    }

    return pathname === to || pathname.startsWith(`${to}/`);
  };
  const navigateStorefrontLink = (path) => {
    const target = String(path || "/").trim() || "/";
    navigate(target);
    setIsMobileMenuOpen(false);
    setIsMobileSearchOpen(false);
    setShowSuggestions(false);

    const hash = target.includes("#") ? target.split("#")[1] : "";
    if (hash) {
      window.setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 180);
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
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
      <div className="hidden lg:block border-b border-black/5 bg-slate-950 text-white">
        <div className="site-shell flex items-center justify-between gap-6 py-2.5 text-[11px]">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] shadow-lg"
              style={{
                backgroundColor: themeColor,
                color: themeTextColor,
                boxShadow: `0 16px 30px -18px ${hexToRgba(themeColor, 0.95)}`,
              }}
            >
              Marketplace
            </span>
            <p className="truncate text-white/70">{storefrontTrustBullets[0]}</p>
          </div>

          <div className="flex items-center gap-3 text-white/75">
            <a
              href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>{supportPhone}</span>
            </a>

            <a
              href={`mailto:${supportEmail}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>{supportEmail}</span>
            </a>
          </div>
        </div>
      </div>

      <nav className="relative overflow-visible border-b border-black/5 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] text-slate-950">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-100"
          style={{
            background: `radial-gradient(circle at 12% 12%, ${hexToRgba(themeColor, 0.18)} 0%, transparent 28%), radial-gradient(circle at 88% 8%, rgba(15, 23, 42, 0.08) 0%, transparent 30%)`,
          }}
        />

        <div className="site-shell relative py-3 sm:py-4">
          <div className="rounded-[30px] border border-white/80 bg-white/80 p-3 shadow-[0_28px_90px_-42px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link to="/" className="group flex min-w-0 items-center gap-3">
                  <div className="min-w-0">
                    {!hasBrandLogoImage ? (
                      <span className="block truncate text-base font-black tracking-[0.18em] text-slate-950 sm:text-lg">
                        {brandLogoText}
                      </span>
                    ) : (
                      <>
                        <img
                          src={brandLogoUrl}
                          alt={brandName}
                          className="block h-10 w-auto max-w-[210px] object-contain"
                        />
                        <span className="sr-only">{brandName}</span>
                      </>
                    )}
                    <p className="mt-0.5 hidden max-w-[24rem] truncate text-xs text-slate-500 sm:block">
                      {brandTagline}
                    </p>
                  </div>
                </Link>
              </div>

              <div className="hidden lg:flex min-w-0 flex-1 justify-center px-2">
                <div className="flex items-center rounded-full border border-black/10 bg-slate-50/90 p-1.5 shadow-inner shadow-slate-200/70">
                  {primaryNavItems.map(({ label, to }) => {
                    const isActive = isPrimaryNavActive(to);

                    return (
                      <Link
                        key={label}
                        to={to}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          isActive
                            ? "bg-slate-950 text-white shadow-[0_12px_26px_-16px_rgba(15,23,42,0.9)]"
                            : "text-slate-600 hover:bg-white hover:text-slate-950"
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              <div className="hidden lg:flex items-center gap-2.5">
                {isLoggedIn ? (
                  <div className="relative group">
                    <button className="flex items-center gap-3 rounded-full border border-black/10 bg-white/75 px-3 py-2 pr-4 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-white">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black"
                        style={{ backgroundColor: themeColor, color: themeTextColor }}
                      >
                        {userName.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden xl:block text-left">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                          Account
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {userName}
                        </p>
                      </div>
                      <svg
                        className="h-4 w-4 text-slate-500"
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

                    <div className="absolute right-0 z-50 mt-3 w-60 rounded-[24px] border border-black/10 bg-white/95 p-2 shadow-[0_30px_70px_-36px_rgba(15,23,42,0.45)] opacity-0 invisible transition-all duration-200 group-hover:visible group-hover:opacity-100">
                      <div className="rounded-[18px] bg-slate-50 px-4 py-3">
                        <p className="text-sm font-semibold text-slate-900">
                          {userName}
                        </p>
                        <p className="text-xs text-slate-500">Welcome back!</p>
                      </div>
                      <div className="mt-2 space-y-1">
                        <Link
                          to="/dashboard"
                          className="flex items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          <svg
                            className="mr-3 h-4 w-4"
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
                        {landingQuickLinks.map((entry) => (
                          <button
                            key={entry.tab}
                            type="button"
                            onClick={() => openDashboardTab(entry.tab)}
                            className="flex w-full items-center rounded-2xl px-4 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                          >
                            <span
                              className="mr-3 inline-block h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: themeColor }}
                            />
                            {entry.label}
                          </button>
                        ))}
                        <button
                          onClick={handleLogout}
                          className="flex w-full items-center rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                        >
                          <svg
                            className="mr-3 h-4 w-4"
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
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/login"
                      className="rounded-full border border-black/10 bg-white/70 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="rounded-full px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5"
                      style={{
                        backgroundColor: themeColor,
                        color: themeTextColor,
                        boxShadow: `0 18px 34px -22px ${hexToRgba(themeColor, 0.95)}`,
                      }}
                    >
                      Join now
                    </Link>
                  </div>
                )}

                <button
                  onClick={handleCompareClick}
                  className="relative rounded-2xl border border-black/10 bg-white/75 p-2.5 text-slate-900 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-white"
                  aria-label="Open compare products"
                >
                  <FiShuffle className="h-5 w-5 text-slate-900" />
                  {compareCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-xs font-bold text-white">
                      {compareCount > 99 ? "99+" : compareCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleCartClick}
                  className="relative rounded-2xl border border-black/10 bg-white/75 p-2.5 text-slate-900 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:border-black/15 hover:bg-white"
                >
                  <svg
                    className="h-6 w-6 text-slate-900"
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
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>
              </div>

              <div className="ml-auto flex items-center gap-1.5 lg:hidden">
                <button
                  onClick={toggleMobileSearch}
                  aria-label="Toggle mobile search"
                  className={`rounded-2xl border p-2.5 transition ${
                    isMobileSearchOpen
                      ? "border-transparent"
                      : "border-black/10 bg-white/70 text-slate-900 hover:bg-slate-50"
                  }`}
                  style={
                    isMobileSearchOpen
                      ? {
                          backgroundColor: themeColor,
                          color: themeTextColor,
                          boxShadow: `0 16px 30px -20px ${hexToRgba(themeColor, 0.92)}`,
                        }
                      : undefined
                  }
                >
                  <svg
                    className="h-5 w-5"
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

                <button
                  onClick={handleCompareClick}
                  className="relative rounded-2xl border border-black/10 bg-white/70 p-2.5 text-slate-900 transition hover:bg-slate-50"
                  aria-label="Open compare products"
                >
                  <FiShuffle className="h-5 w-5 text-slate-900" />
                  {compareCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-xs font-bold text-white">
                      {compareCount > 99 ? "99+" : compareCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={handleCartClick}
                  className="relative rounded-2xl border border-black/10 bg-white/70 p-2.5 text-slate-900 transition hover:bg-slate-50"
                >
                  <svg
                    className="h-6 w-6 text-slate-900"
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
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </button>

                <button
                  id="mobile-menu-button"
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  aria-label="Toggle mobile menu"
                  className={`rounded-2xl border p-2.5 transition focus:outline-none ${
                    isMobileMenuOpen
                      ? "border-transparent"
                      : "border-white/10 bg-slate-950 text-white"
                  }`}
                  style={
                    isMobileMenuOpen
                      ? {
                          backgroundColor: themeColor,
                          color: themeTextColor,
                          boxShadow: `0 16px 30px -20px ${hexToRgba(themeColor, 0.92)}`,
                        }
                      : undefined
                  }
                >
                  {isMobileMenuOpen ? (
                    <svg
                      className="h-5 w-5"
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
                  ) : (
                    <svg
                      className="h-5 w-5"
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
                  )}
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_auto] lg:items-center">
              <div ref={searchRef} className="relative min-w-0">
                <form
                  onSubmit={handleSearchSubmit}
                  className="group flex items-center rounded-[24px] border border-white/10 bg-slate-950 px-4 py-2 shadow-[0_24px_48px_-32px_rgba(15,23,42,0.92)]"
                >
                  <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/65">
                    <svg
                      className="h-4 w-4"
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
                    placeholder="Search products, brands, or order numbers..."
                    className="h-11 w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="ml-2 hidden h-10 shrink-0 items-center rounded-full px-4 text-sm font-semibold transition hover:-translate-y-0.5 sm:inline-flex"
                    style={{
                      backgroundColor: themeColor,
                      color: themeTextColor,
                      boxShadow: `0 16px 30px -18px ${hexToRgba(themeColor, 0.95)}`,
                    }}
                  >
                    Search
                  </button>
                </form>

                <p className="mt-2 pl-1 text-xs text-slate-500">
                  Search products, brands, or order numbers in one jump.
                </p>

                {showSuggestions && searchQuery.trim() && (
                  <div className="absolute inset-x-0 top-full z-50 mt-3 max-h-96 overflow-y-auto rounded-[24px] border border-black/10 bg-white/95 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.42)] backdrop-blur-xl animate-fadeIn">
                    <div className="border-b border-black/5 p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Results for "{searchQuery}"
                        </h3>
                        <button
                          onClick={() => setShowSuggestions(false)}
                          className="text-slate-500 transition hover:text-slate-900"
                        >
                          <svg
                            className="h-4 w-4"
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
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-b-2 border-slate-900"></div>
                        <p className="mt-2 text-sm text-slate-600">Searching...</p>
                      </div>
                    ) : orderSearchResults.length > 0 &&
                      isOrderNumberQuery(searchQuery) ? (
                      <div className="divide-y divide-black/5">
                        <div className="bg-slate-50/80 p-3">
                          <div className="flex items-center gap-2">
                            <FiPackage className="h-4 w-4 text-slate-600" />
                            <span className="text-xs font-medium text-slate-700">
                              Order Tracking
                            </span>
                          </div>
                        </div>
                        {orderSearchResults.slice(0, 5).map((order, index) => (
                          <div
                            key={`order-${order._id}-${index}`}
                            className="cursor-pointer p-4 transition-colors duration-150 hover:bg-slate-50"
                            onClick={() =>
                              handleOrderResultClick(order.orderNumber)
                            }
                          >
                            <div className="flex items-center">
                              <div className="rounded-2xl bg-blue-100 p-2">
                                <FiPackage className="h-5 w-5 text-blue-700" />
                              </div>
                              <div className="ml-4 flex-1">
                                <div className="text-sm font-medium text-slate-900">
                                  Order #{order.orderNumber}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                  <div>Customer: {order.customerName}</div>
                                  <div>Product: {order.productName}</div>
                                  <div className="mt-1 flex items-center gap-2">
                                    <span
                                      className={`rounded px-2 py-0.5 text-xs ${
                                        order.status === "delivered"
                                          ? "bg-green-100 text-green-700"
                                          : order.status === "confirmed"
                                            ? "bg-cyan-100 text-cyan-700"
                                          : order.status === "shipped"
                                            ? "bg-purple-100 text-purple-700"
                                          : order.status === "processing"
                                            ? "bg-blue-100 text-blue-700"
                                          : order.status === "pending"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : order.status === "returned"
                                              ? "bg-orange-100 text-orange-700"
                                              : "bg-red-100 text-red-700"
                                      }`}
                                    >
                                      {order.status}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                      {new Date(order.date).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                                TRACK
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchSuggestions.length > 0 ? (
                      <div className="divide-y divide-black/5">
                        <div className="bg-slate-50/80 p-3">
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 text-slate-600"
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
                            <span className="text-xs font-medium text-slate-700">
                              Products & Categories
                            </span>
                          </div>
                        </div>
                        {searchSuggestions.slice(0, 5).map((suggestion, index) => (
                          <div
                            key={`${suggestion.type}-${suggestion._id}-${index}`}
                            className="cursor-pointer p-4 transition-colors duration-150 hover:bg-slate-50"
                            onClick={() => handleSuggestionClick(suggestion)}
                          >
                            <div className="flex items-center">
                              <div
                                className={`rounded-2xl p-2 ${
                                  suggestion.type === "product"
                                    ? "bg-slate-100"
                                    : "bg-slate-200"
                                }`}
                              >
                                {suggestion.type === "product" ? (
                                  <svg
                                    className="h-5 w-5 text-slate-700"
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
                                    className="h-5 w-5 text-slate-700"
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
                                <div className="text-sm font-medium text-slate-900">
                                  {suggestion.type === "product"
                                    ? suggestion.title
                                    : suggestion.name}
                                </div>
                                <div className="mt-1 text-xs text-slate-600">
                                  {suggestion.type === "product"
                                    ? suggestion.brand || "Product"
                                    : "Category"}
                                  {suggestion.type === "product" &&
                                    (suggestion.priceType === "tba" ? (
                                      <span className="ml-2 font-medium">TBA</span>
                                    ) : suggestion.price !== null &&
                                      suggestion.price !== undefined ? (
                                      <span className="ml-2 font-medium">
                                        Tk {Number(suggestion.price).toFixed(2)}
                                      </span>
                                    ) : null)}
                                </div>
                              </div>
                              <div
                                className={`rounded-full px-2 py-1 text-xs font-medium ${
                                  suggestion.type === "product"
                                    ? "bg-slate-100 text-slate-800"
                                    : "bg-slate-200 text-slate-800"
                                }`}
                              >
                                {suggestion.type === "product" ? "VIEW" : "BROWSE"}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-600">
                        No results found for "{searchQuery}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden lg:flex flex-wrap items-center justify-end gap-2">
                {storefrontQuickLinks.map((entry, index) => (
                  <button
                    key={`${entry.label}-${entry.path}`}
                    type="button"
                    onClick={() => navigateStorefrontLink(entry.path)}
                    className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                      index === 0
                        ? "border-transparent"
                        : "border-black/10 bg-white/70 text-slate-700 hover:border-black/20 hover:bg-slate-50 hover:text-slate-950"
                    }`}
                    style={
                      index === 0
                        ? {
                            backgroundColor: themeColor,
                            color: themeTextColor,
                            boxShadow: `0 18px 34px -22px ${hexToRgba(themeColor, 0.95)}`,
                          }
                        : undefined
                    }
                  >
                    {entry.label}
                  </button>
                ))}

                {storefrontTrustBullets[1] ? (
                  <span className="ml-1 inline-flex items-center gap-2 rounded-full border border-black/10 bg-slate-50/90 px-3.5 py-2 text-xs font-medium text-slate-600">
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: themeColor }}
                    />
                    {storefrontTrustBullets[1]}
                  </span>
                ) : null}
              </div>
            </div>

          </div>
        </div>

        {isMobileSearchOpen && (
          <div className="site-shell pb-4 lg:hidden">
            <div className="rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
              <form
                onSubmit={handleSearchSubmit}
                className="flex items-center rounded-[22px] border border-white/10 bg-slate-950 px-4 py-2 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.9)]"
              >
                <div className="mr-3 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/65">
                  <svg
                    className="h-4 w-4"
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
                  className="h-11 w-full bg-transparent text-sm text-white placeholder:text-white/55 focus:outline-none"
                />
              </form>

              {showSuggestions && searchQuery.trim() && (
                <div className="mt-3 max-h-60 overflow-y-auto rounded-[20px] border border-black/10 bg-white shadow-[0_20px_50px_-35px_rgba(15,23,42,0.45)]">
                  <div className="border-b border-black/5 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-700">
                        Search Results
                      </span>
                      <button
                        onClick={() => setShowSuggestions(false)}
                        className="text-xs text-slate-500 hover:text-slate-900"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  {isFetchingSuggestions || searchingOrders ? (
                    <div className="p-4 text-center">
                      <div className="inline-block h-4 w-4 animate-spin rounded-full border-b-2 border-slate-400"></div>
                      <span className="ml-2 text-xs text-slate-600">
                        Searching...
                      </span>
                    </div>
                  ) : orderSearchResults.length > 0 &&
                    isOrderNumberQuery(searchQuery) ? (
                    <div className="divide-y divide-black/5">
                      {orderSearchResults.slice(0, 3).map((order, index) => (
                        <div
                          key={`mobile-order-${index}`}
                          className="cursor-pointer p-3 hover:bg-slate-50"
                          onClick={() =>
                            handleOrderResultClick(order.orderNumber)
                          }
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-xl bg-blue-100 p-1.5">
                              <FiPackage className="h-3 w-3 text-blue-700" />
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-medium text-slate-900">
                                Order #{order.orderNumber}
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {order.customerName}
                              </div>
                              <div className="mt-1 flex items-center gap-1">
                                <span
                                  className={`rounded px-1.5 py-0.5 text-xs ${
                                    order.status === "delivered"
                                      ? "bg-green-100 text-green-700"
                                      : order.status === "confirmed"
                                        ? "bg-cyan-100 text-cyan-700"
                                      : order.status === "shipped"
                                        ? "bg-purple-100 text-purple-700"
                                        : order.status === "processing"
                                          ? "bg-blue-100 text-blue-700"
                                          : order.status === "pending"
                                            ? "bg-yellow-100 text-yellow-700"
                                            : order.status === "returned"
                                              ? "bg-orange-100 text-orange-700"
                                              : "bg-red-100 text-red-700"
                                  }`}
                                >
                                  {order.status}
                                </span>
                              </div>
                            </div>
                            <div className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                              TRACK
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : searchSuggestions.length > 0 ? (
                    <div className="divide-y divide-black/5">
                      {searchSuggestions.slice(0, 3).map((suggestion, index) => (
                        <div
                          key={`mobile-${suggestion.type}-${index}`}
                          className="cursor-pointer p-3 hover:bg-slate-50"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-xl p-1.5 ${
                                suggestion.type === "product"
                                  ? "bg-slate-100"
                                  : "bg-slate-200"
                              }`}
                            >
                              {suggestion.type === "product" ? (
                                <svg
                                  className="h-3 w-3 text-slate-700"
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
                                  className="h-3 w-3 text-slate-700"
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
                              <div className="truncate text-xs font-medium text-slate-900">
                                {suggestion.type === "product"
                                  ? suggestion.title
                                  : suggestion.name}
                              </div>
                              <div className="text-xs text-slate-500">
                                {suggestion.type === "product"
                                  ? "Product"
                                  : "Category"}
                                {suggestion.type === "product" &&
                                  (suggestion.priceType === "tba" ? (
                                    <span className="ml-1 font-medium">- TBA</span>
                                  ) : suggestion.price !== null &&
                                    suggestion.price !== undefined ? (
                                    <span className="ml-1 font-medium">
                                      - Tk {Number(suggestion.price).toFixed(2)}
                                    </span>
                                  ) : null)}
                              </div>
                            </div>
                            <div
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                suggestion.type === "product"
                                  ? "bg-slate-100 text-slate-800"
                                  : "bg-slate-200 text-slate-800"
                              }`}
                            >
                              {suggestion.type === "product" ? "VIEW" : "BROWSE"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-600">
                      No results found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {isMobileMenuOpen && (
          <div className="site-shell pb-4 lg:hidden">
            <div
              id="mobile-menu"
              className="overflow-hidden rounded-[28px] border border-white/80 bg-white/92 p-4 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl"
            >
              <div className="space-y-4">
                <div className="rounded-[24px] bg-slate-950 p-4 text-white shadow-[0_22px_48px_-30px_rgba(15,23,42,0.95)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/45">
                        {isLoggedIn ? "Your Space" : "Discover Faster"}
                      </p>
                      <p className="mt-2 text-lg font-semibold">
                        {isLoggedIn ? `Hi, ${userName}` : "Fresh deals, fast checkout."}
                      </p>
                      <p className="mt-1 text-sm text-white/65">
                        {storefrontTrustBullets[0]}
                      </p>
                    </div>
                    <span
                      className="inline-flex shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em]"
                      style={{ backgroundColor: themeColor, color: themeTextColor }}
                    >
                      Live
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {isLoggedIn ? (
                      <Link
                        to="/dashboard"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="inline-flex flex-1 items-center justify-center rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                      >
                        Dashboard
                      </Link>
                    ) : (
                      <>
                        <Link
                          to="/login"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="inline-flex flex-1 items-center justify-center rounded-full bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                        >
                          Login
                        </Link>
                        <Link
                          to="/register"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="inline-flex flex-1 items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition"
                          style={{ backgroundColor: themeColor, color: themeTextColor }}
                        >
                          Join now
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {isLoggedIn ? (
                  <div className="rounded-[22px] border border-black/10 bg-slate-50/90 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                      Dashboard Quick Links
                    </p>
                    <div className="mt-3 grid gap-2">
                      {landingQuickLinks.map((entry) => (
                        <button
                          key={entry.tab}
                          type="button"
                          onClick={() => openDashboardTab(entry.tab)}
                          className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-3 text-left text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
                        >
                          <span>{entry.label}</span>
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: themeColor }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="grid grid-cols-2 gap-2">
                  {primaryNavItems.map(({ label, to }) => {
                    const isActive = isPrimaryNavActive(to);

                    return (
                      <Link
                        key={label}
                        to={to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                          isActive
                            ? "bg-slate-950 text-white shadow-[0_18px_34px_-22px_rgba(15,23,42,0.9)]"
                            : "border border-black/10 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>

                <div className="rounded-[22px] border border-black/10 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Quick Jumps
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {storefrontQuickLinks.map((entry, index) => (
                      <button
                        key={`${entry.label}-${entry.path}-mobile`}
                        type="button"
                        onClick={() => navigateStorefrontLink(entry.path)}
                        className={`rounded-full px-3.5 py-2 text-xs font-semibold transition ${
                          index === 0
                            ? ""
                            : "border border-black/10 bg-slate-50 text-slate-700 hover:border-black/20 hover:bg-slate-100"
                        }`}
                        style={
                          index === 0
                            ? {
                                backgroundColor: themeColor,
                                color: themeTextColor,
                              }
                            : undefined
                        }
                      >
                        {entry.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-black/10 bg-white p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
                    Support
                  </p>
                  <div className="mt-3 space-y-2">
                    <a
                      href={`tel:${supportPhone.replace(/[^\d+]/g, "")}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    >
                      <span>{supportPhone}</span>
                      <span className="text-xs text-slate-400">Call</span>
                    </a>
                    <a
                      href={`mailto:${supportEmail}`}
                      className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                    >
                      <span className="truncate">{supportEmail}</span>
                      <span className="text-xs text-slate-400">Email</span>
                    </a>
                  </div>
                </div>

                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center justify-center rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                  >
                    Logout
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
};

export default Navbar;
