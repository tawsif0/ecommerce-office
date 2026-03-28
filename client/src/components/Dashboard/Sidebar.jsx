/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
  FiX,
  FiLogOut,
  FiHome,
  FiFolder,
  FiPlus,
  FiEdit,
  FiChevronDown,
  FiChevronUp,
  FiGlobe,
  FiList,
  FiShoppingBag,
  FiPackage,
  FiDollarSign,
  FiTag,
  FiTruck,
  FiBarChart2,
  FiMail,
  FiMessageSquare,
  FiHeart,
  FiCheckCircle,
  FiMapPin,
  FiShield,
  FiArchive,
  FiMic,
  FiUsers,
  FiCreditCard,
} from "react-icons/fi";
import { fetchPublicSettings } from "../../utils/publicSettings";
import {
  canAccessDashboardTab,
  isSuperAdminUser,
  normalizeMarketplaceMode,
  resolveUserRole,
} from "../../utils/dashboardAccess";

const ROLE_LABELS = {
  admin: "Admin Dashboard",
  vendor: "Vendor Studio",
  staff: "Operations Desk",
  user: "Customer Dashboard",
};

const CONSOLE_TITLES = {
  admin: "Admin Console",
  vendor: "Vendor Console",
  staff: "Staff Console",
  user: "Customer Console",
};

const AVATAR_ROLE_CLASSES = {
  admin: "bg-black text-white",
  vendor: "bg-green-600 text-white",
  staff: "bg-blue-600 text-white",
  user: "bg-slate-900 text-white",
};

const getDashboardLabel = (role, isSuperAdmin) =>
  role === "admin" && isSuperAdmin
    ? "Super Admin Dashboard"
    : ROLE_LABELS[role] || ROLE_LABELS.user;

const getConsoleTitle = (role, isSuperAdmin) =>
  role === "admin" && isSuperAdmin
    ? "Super Admin Console"
    : CONSOLE_TITLES[role] || CONSOLE_TITLES.user;

const MODULE_CHILDREN = [
  {
    name: "Campaign Offers",
    icon: FiTag,
    tab: "module-campaign-offers",
  },
  {
    name: "Ads",
    icon: FiGlobe,
    tab: "module-ads",
  },
  {
    name: "Support Tickets",
    icon: FiMessageSquare,
    tab: "module-support",
  },
  {
    name: "Subscriptions",
    icon: FiTag,
    tab: "module-subscriptions",
  },
  {
    name: "Staff Roles",
    icon: FiSettings,
    tab: "module-staff",
  },
  {
    name: "Verification",
    icon: FiCheckCircle,
    tab: "module-verifications",
  },
  {
    name: "Bookings",
    icon: FiList,
    tab: "module-bookings",
  },
  {
    name: "Auctions",
    icon: FiDollarSign,
    tab: "module-auctions",
  },
  {
    name: "Suppliers",
    icon: FiPackage,
    tab: "module-suppliers",
  },
  {
    name: "Purchases",
    icon: FiShoppingBag,
    tab: "module-purchases",
  },
  {
    name: "Accounts",
    icon: FiDollarSign,
    tab: "module-accounts",
  },
  {
    name: "Brands",
    icon: FiTag,
    tab: "module-brands",
  },
  {
    name: "Voice Assistant",
    icon: FiMic,
    tab: "module-voice",
  },
  {
    name: "Business Reports",
    icon: FiBarChart2,
    tab: "module-business-reports",
  },
  {
    name: "Geolocation",
    icon: FiMapPin,
    tab: "module-geolocation",
  },
  {
    name: "Abandoned Orders",
    icon: FiArchive,
    tab: "module-abandoned",
  },
  {
    name: "Website Setup",
    icon: FiSettings,
    tab: "module-website-setup",
  },
];

const getRoleSections = (role, marketplaceMode = "multi", isSuperAdmin = false) => {
  const dashboardLabel = getDashboardLabel(role, isSuperAdmin);
  const isSingleMode = normalizeMarketplaceMode(marketplaceMode) === "single";

  if (role === "admin") {
    return [
      {
        title: "Overview",
        items: [
          {
            name: dashboardLabel,
            icon: FiHome,
            tab: "dashboard",
          },
        ],
      },
      {
        title: "Commerce",
        items: [
          {
            name: "Order List",
            icon: FiPackage,
            tab: "order-list",
          },
          {
            name: "Add Order",
            icon: FiPlus,
            tab: "add-order",
          },
          {
            name: "Shipping Zones",
            icon: FiTruck,
            tab: "shipping-zones",
          },
          {
            name: "Customers",
            icon: FiUsers,
            tab: "customers",
          },
          {
            name: "Payment Methods",
            icon: FiDollarSign,
            tab: "payment-methods",
          },
          {
            name: "Coupons",
            icon: FiTag,
            tab: "coupons",
          },
        ],
      },
      {
        title: "Catalog & Inventory",
        items: [
          {
            name: "Products",
            icon: FiFolder,
            tab: "catalog-products",
            children: [
              {
                name: "Create Product",
                icon: FiPlus,
                tab: "create-product",
              },
              {
                name: "Modify Product",
                icon: FiEdit,
                tab: "modify-product",
              },
            ],
          },
          {
            name: "Categories",
            icon: FiFolder,
            tab: "catalog-categories",
            children: [
              {
                name: "Create Category",
                icon: FiPlus,
                tab: "create-category",
              },
              {
                name: "Modify Category",
                icon: FiEdit,
                tab: "modify-category",
              },
            ],
          },
          {
            name: "Brands",
            icon: FiTag,
            tab: "module-brands",
          },
          {
            name: "Inventory Center",
            icon: FiPackage,
            tab: "module-inventory",
          },
          ...(!isSingleMode
            ? [
                {
                  name: "Product Approvals",
                  icon: FiCheckCircle,
                  tab: "product-approvals",
                },
              ]
            : []),
        ],
      },
      ...(!isSingleMode
        ? [
            {
              title: "Marketplace",
              items: [
                {
                  name: "Vendor Management",
                  icon: FiShoppingBag,
                  tab: "vendors-admin",
                },
                {
                  name: "Review Moderation",
                  icon: FiMessageSquare,
                  tab: "vendor-reviews",
                },
                {
                  name: "Vendor Payouts",
                  icon: FiCreditCard,
                  tab: "module-vendor-payouts",
                },
              ],
            },
          ]
        : []),
      {
        title: "Growth & Marketing",
        items: [
          {
            name: "Campaign Center",
            icon: FiTag,
            tab: "module-campaign-offers",
          },
          ...(!isSingleMode
            ? [
                {
                  name: "Ad Campaigns",
                  icon: FiGlobe,
                  tab: "module-ads",
                },
              ]
            : []),
        ],
      },
      {
        title: "Reports & Insights",
        items: [
          ...(!isSingleMode
            ? [
                {
                  name: "Vendor Reports",
                  icon: FiBarChart2,
                  tab: "vendor-reports",
                },
              ]
            : []),
          {
            name: "Product Reports",
            icon: FiBarChart2,
            tab: "product-reports",
          },
          {
            name: "Business Reports",
            icon: FiBarChart2,
            tab: "module-business-reports",
          },
          {
            name: "Customer Risk",
            icon: FiShield,
            tab: "customer-risk",
          },
        ],
      },
      {
        title: "Operations",
        items: [
          {
            name: "Suppliers",
            icon: FiPackage,
            tab: "module-suppliers",
          },
          {
            name: "Purchases",
            icon: FiShoppingBag,
            tab: "module-purchases",
          },
          {
            name: "Accounts",
            icon: FiDollarSign,
            tab: "module-accounts",
          },
        ],
      },
      {
        title: "Brand & Storefront",
        items: [
          {
            name: "Slider",
            icon: FiFolder,
            tab: "catalog-banners",
            children: [
              {
                name: "Create Banner",
                icon: FiPlus,
                tab: "create-banner",
              },
              {
                name: "Modify Banner",
                icon: FiEdit,
                tab: "modify-banner",
              },
            ],
          },
          {
            name: "Website Setup",
            icon: FiSettings,
            tab: "module-website-setup",
          },
          {
            name: "Contacted Users",
            icon: FiMail,
            tab: "contacted-list",
          },
        ],
      },
      {
        title: "Administration",
        items: [
          {
            name: "Super Admin Control",
            icon: FiShield,
            tab: "module-super-admin",
          },
          {
            name: "Admin Users",
            icon: FiUsers,
            tab: "module-admin-users",
          },
        ],
      },
      {
        title: "Advanced Modules",
        items: [
          {
            name: "Marketplace Modules",
            icon: FiSettings,
            tab: "modules-admin",
            children: MODULE_CHILDREN,
          },
        ],
      },
    ];
  }

  if (role === "vendor") {
    return [
      {
        title: "Overview",
        items: [
          {
            name: dashboardLabel,
            icon: FiHome,
            tab: "dashboard",
          },
        ],
      },
      {
        title: "Commerce",
        items: [
          {
            name: "Orders",
            icon: FiPackage,
            tab: "vendor-orders",
          },
          {
            name: "Customer Messages",
            icon: FiMail,
            tab: "vendor-messages",
          },
          {
            name: "Shipping",
            icon: FiTruck,
            tab: "vendor-shipping",
          },
          {
            name: "Coupons",
            icon: FiTag,
            tab: "coupons",
          },
        ],
      },
      {
        title: "Catalog & Inventory",
        items: [
          {
            name: "Products",
            icon: FiFolder,
            tab: "vendor-products",
            children: [
              {
                name: "Create Product",
                icon: FiPlus,
                tab: "create-product",
              },
              {
                name: "Modify Product",
                icon: FiEdit,
                tab: "modify-product",
              },
            ],
          },
          {
            name: "Brands",
            icon: FiTag,
            tab: "module-brands",
          },
          {
            name: "Inventory Center",
            icon: FiPackage,
            tab: "module-inventory",
          },
        ],
      },
      {
        title: "Growth & Marketing",
        items: [
          {
            name: "Campaign Center",
            icon: FiTag,
            tab: "module-campaign-offers",
          },
          {
            name: "Ad Campaigns",
            icon: FiGlobe,
            tab: "module-ads",
          },
        ],
      },
      {
        title: "Operations & Reports",
        items: [
          {
            name: "Sales Report",
            icon: FiBarChart2,
            tab: "module-business-reports",
          },
          {
            name: "Suppliers",
            icon: FiPackage,
            tab: "module-suppliers",
          },
          {
            name: "Purchases",
            icon: FiShoppingBag,
            tab: "module-purchases",
          },
          {
            name: "Accounts",
            icon: FiDollarSign,
            tab: "module-accounts",
          },
        ],
      },
      {
        title: "Storefront",
        items: [
          {
            name: "Store Profile",
            icon: FiSettings,
            tab: "vendor-store",
          },
        ],
      },
      {
        title: "Advanced Modules",
        items: [
          {
            name: "Marketplace Modules",
            icon: FiSettings,
            tab: "modules-vendor",
            children: MODULE_CHILDREN,
          },
        ],
      },
    ];
  }

  if (role === "staff") {
    return [
      {
        title: "Overview",
        items: [
          {
            name: dashboardLabel,
            icon: FiHome,
            tab: "dashboard",
          },
        ],
      },
      {
        title: "Service Desk",
        items: [
          {
            name: "Support Tickets",
            icon: FiMessageSquare,
            tab: "module-support",
          },
          {
            name: "Vendor Messages",
            icon: FiMail,
            tab: "vendor-messages",
          },
          {
            name: "Campaign Center",
            icon: FiTag,
            tab: "module-campaign-offers",
          },
          {
            name: "Sales Report",
            icon: FiBarChart2,
            tab: "module-business-reports",
          },
        ],
      },
      {
        title: "Advanced Modules",
        items: [
          {
            name: "Marketplace Modules",
            icon: FiSettings,
            tab: "modules-staff",
            children: MODULE_CHILDREN,
          },
        ],
      },
    ];
  }

  return [
    {
      title: "Overview",
      items: [
        {
          name: dashboardLabel,
          icon: FiHome,
          tab: "dashboard",
        },
      ],
    },
    {
    title: "Orders & Lists",
      items: [
        {
          name: "My Orders",
          icon: FiPackage,
          tab: "my-orders",
        },
        {
          name: "Saved Addresses",
          icon: FiMapPin,
          tab: "my-addresses",
        },
        {
          name: "Wishlist",
          icon: FiHeart,
          tab: "wishlist",
        },
      ],
    },
    {
      title: "Services",
      items: [
        {
          name: "Bookings",
          icon: FiList,
          tab: "module-bookings",
        },
        {
          name: "Auctions",
          icon: FiDollarSign,
          tab: "module-auctions",
        },
      ],
    },
    {
      title: "Support",
      items: [
        {
          name: "Vendor Messages",
          icon: FiMail,
          tab: "vendor-messages",
        },
        {
          name: "Support Tickets",
          icon: FiMessageSquare,
          tab: "module-support",
        },
      ],
    },
  ];
};

const Sidebar = ({
  isMobile,
  isMobileOpen,
  sidebarOpen,
  activeTab,
  user,
  handleTabChange,
  toggleSidebar,
  setIsMobileOpen,
  handleLogout,
  isHovered,
  setIsHovered,
}) => {
  const [openSubmenus, setOpenSubmenus] = useState({});
  const [marketplaceMode, setMarketplaceMode] = useState("multi");

  const role = resolveUserRole(user);
  const isSuperAdmin = isSuperAdminUser(user);
  const roleSections = useMemo(
    () => getRoleSections(role, marketplaceMode, isSuperAdmin),
    [role, marketplaceMode, isSuperAdmin],
  );
  const dashboardLabel = getDashboardLabel(role, isSuperAdmin);
  const consoleTitle = getConsoleTitle(role, isSuperAdmin);

  const accessibleRoleSections = useMemo(() => {
    const filterItem = (item) => {
      if (!item) return null;

      if (Array.isArray(item.children) && item.children.length > 0) {
        const allowedChildren = item.children.filter((child) =>
          canAccessDashboardTab({
            user,
            tab: child.tab,
            marketplaceMode,
          }),
        );

        if (!allowedChildren.length) return null;
        return {
          ...item,
          children: allowedChildren,
        };
      }

      if (
        !canAccessDashboardTab({
          user,
          tab: item.tab,
          marketplaceMode,
        })
      ) {
        return null;
      }

      return item;
    };

    return roleSections
      .map((section) => {
        const filteredItems = (section.items || [])
          .map((item) => filterItem(item))
          .filter(Boolean);

        if (!filteredItems.length) return null;

        return {
          ...section,
          items: filteredItems,
        };
      })
      .filter(Boolean);
  }, [roleSections, user, marketplaceMode]);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async () => {
      const settings = await fetchPublicSettings();
      if (cancelled) return;

      setMarketplaceMode(normalizeMarketplaceMode(settings?.marketplaceMode));
    };

    loadSettings();

    return () => {
      cancelled = true;
    };
  }, []);

  const navSections = useMemo(
    () => [
      ...accessibleRoleSections,
      {
        title: "Account",
        items: [
          {
            name: "Settings",
            icon: FiSettings,
            tab: "settings",
          },
          {
            name: "Back to Home",
            icon: FiGlobe,
            tab: "home",
          },
        ],
      },
    ],
    [accessibleRoleSections],
  );

  useEffect(() => {
    const activeParentMap = {};

    navSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.children?.some((child) => child.tab === activeTab)) {
          activeParentMap[item.tab] = true;
        }
      });
    });

    if (Object.keys(activeParentMap).length > 0) {
      setOpenSubmenus((prev) => ({ ...prev, ...activeParentMap }));
    }
  }, [activeTab, navSections]);

  const toggleSubmenu = (tab) => {
    setOpenSubmenus((prev) => ({
      ...prev,
      [tab]: !prev[tab],
    }));
  };

  const showLabels = (isMobileView) => sidebarOpen || isMobileView;

  const isActiveSubmenu = (item) =>
    Array.isArray(item.children) &&
    item.children.some((child) => child.tab === activeTab);

  const getUserInitials = () => {
    if (!user?.name) return "U";
    return String(user.name)
      .split(" ")
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleNavItemClick = (item) => {
    if (item.tab === "home") {
      window.location.href = "/";
    } else {
      handleTabChange(item.tab);
    }

    if (isMobile) {
      setIsMobileOpen(false);
    }
  };

  const handleParentClick = (item, isMobileView) => {
    if (!showLabels(isMobileView)) {
      toggleSidebar();
      return;
    }

    toggleSubmenu(item.tab);
  };

  const renderNavItem = (item, isMobileView = false) => {
    const isActive = activeTab === item.tab;
    const hasChildren = Array.isArray(item.children) && item.children.length > 0;
    const isSubmenuOpen = Boolean(openSubmenus[item.tab]);
    const activeChild = isActiveSubmenu(item);
    const Icon = item.icon;

    const itemBaseClass = `group flex w-full items-center rounded-2xl transition-colors duration-200 ${
      showLabels(isMobileView)
        ? "justify-start gap-3 px-3.5 py-3"
        : "mx-auto h-11 w-11 justify-center"
    } ${
      isActive || activeChild
        ? "bg-black text-white shadow-[0_12px_22px_rgba(15,23,42,0.16)]"
        : "text-gray-700 hover:bg-white hover:text-black"
    }`;

    if (hasChildren) {
      return (
        <li key={item.tab} className="space-y-1">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => handleParentClick(item, isMobileView)}
            className={itemBaseClass}
            title={item.name}
          >
            <span className="flex h-5 w-5 items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </span>

            {showLabels(isMobileView) && (
              <>
                <span className="flex-1 truncate text-sm font-medium text-left">
                  {item.name}
                </span>
                <span className="flex h-4 w-4 items-center justify-center shrink-0">
                  {isSubmenuOpen ? (
                    <FiChevronUp className="h-4 w-4" />
                  ) : (
                    <FiChevronDown className="h-4 w-4" />
                  )}
                </span>
              </>
            )}
          </motion.button>

          {isSubmenuOpen && showLabels(isMobileView) && (
            <motion.ul
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.16 }}
              className="ml-7 space-y-1 border-l border-black/8 pl-3"
            >
              {item.children.map((child) => {
                const childActive = activeTab === child.tab;
                const ChildIcon = child.icon;

                return (
                  <li key={child.tab}>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleNavItemClick(child)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                        childActive
                          ? "bg-gray-200 text-gray-900"
                          : "text-gray-600 hover:bg-gray-100 hover:text-black"
                      }`}
                      title={child.name}
                    >
                      <span className="flex h-4 w-4 items-center justify-center shrink-0">
                        <ChildIcon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{child.name}</span>
                    </motion.button>
                  </li>
                );
              })}
            </motion.ul>
          )}
        </li>
      );
    }

    return (
      <li key={item.tab}>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavItemClick(item)}
          className={itemBaseClass}
          title={item.name}
        >
          <span className="flex h-5 w-5 items-center justify-center shrink-0">
            <Icon className="h-4 w-4" />
          </span>
          {showLabels(isMobileView) && (
            <span className="truncate text-sm font-medium">{item.name}</span>
          )}
        </motion.button>
      </li>
    );
  };

  const renderSection = (section, isMobileView = false) => {
    if (!section?.items?.length) return null;

    return (
      <div key={section.title} className="mb-7">
        {showLabels(isMobileView) && (
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
            {section.title}
          </p>
        )}
        <ul className="space-y-1.5">
          {section.items.map((item) => renderNavItem(item, isMobileView))}
        </ul>
      </div>
    );
  };

  const avatarClass = AVATAR_ROLE_CLASSES[role] || AVATAR_ROLE_CLASSES.user;

  if (isMobile) {
    return (
      <motion.aside
        initial={{ x: -320 }}
        animate={{ x: isMobileOpen ? 0 : -320 }}
        exit={{ x: -320 }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="fixed inset-y-0 left-0 z-[60] flex h-[100dvh] max-h-[100dvh] w-72 flex-col overflow-hidden border-r border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)] text-black shadow-[0_20px_48px_rgba(15,23,42,0.14)] backdrop-blur-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-black/8 px-4">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{consoleTitle}</h1>
            <p className="truncate text-xs text-gray-500">{dashboardLabel}</p>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="rounded-lg p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
            aria-label="Close sidebar"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-5">
          {navSections.map((section) => renderSection(section, true))}
        </nav>

        <div className="shrink-0 border-t border-black/8 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarClass}`}
            >
              {getUserInitials()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-black">{user?.name || "User"}</p>
              <p className="truncate text-xs text-gray-500">{user?.email || ""}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
              title="Logout"
              aria-label="Logout"
            >
              <FiLogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.aside>
    );
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 296 : 88 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      className="relative flex h-full flex-col overflow-hidden border-r border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.96)_100%)] text-black backdrop-blur-xl"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex h-16 items-center justify-between border-b border-black/8 px-4">
        {sidebarOpen ? (
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{consoleTitle}</h1>
            <p className="truncate text-xs text-gray-500">{dashboardLabel}</p>
          </div>
        ) : (
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${avatarClass}`}>
            {getUserInitials().charAt(0)}
          </div>
        )}

        <motion.button
          animate={{
            x: isHovered ? (sidebarOpen ? -2 : 2) : 0,
            scale: isHovered ? 1.08 : 1,
          }}
          transition={{ type: "spring", stiffness: 300 }}
          className="rounded-lg p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
          onClick={toggleSidebar}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? (
            <FiChevronLeft className="h-5 w-5" />
          ) : (
            <FiChevronRight className="h-5 w-5" />
          )}
        </motion.button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5">
        {navSections.map((section) => renderSection(section))}
      </nav>

      <div className="border-t border-black/8 px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${avatarClass}`}
          >
            {sidebarOpen ? getUserInitials() : getUserInitials().charAt(0)}
          </div>

          {sidebarOpen && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-black">{user?.name || "User"}</p>
                <button
                  onClick={handleLogout}
                  className="rounded-md p-1.5 text-gray-600 transition-colors hover:bg-gray-100 hover:text-black"
                  title="Logout"
                  aria-label="Logout"
                >
                  <FiLogOut className="h-4 w-4" />
                </button>
              </div>
              <p className="truncate text-xs text-gray-500">{user?.email || ""}</p>
            </div>
          )}
        </div>
      </div>
    </motion.aside>
  );
};

export default Sidebar;
