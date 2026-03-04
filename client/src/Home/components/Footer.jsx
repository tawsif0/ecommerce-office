import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaTruckFast,
  FaArrowRotateLeft,
  FaGift,
  FaHeadset,
  FaFacebookF,
  FaWhatsapp,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex,
  FaCcDiscover,
  FaCcPaypal,
  FaPhone,
  FaEnvelope,
  FaChevronRight,
} from "react-icons/fa6";
import { FaMapMarkerAlt } from "react-icons/fa";
import { fetchPublicSettings } from "../../utils/publicSettings";

const baseUrl = import.meta.env.VITE_API_URL || "";

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

const toPublicAssetUrl = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:")
  ) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return baseUrl ? `${baseUrl}${raw}` : raw;
  }

  return baseUrl ? `${baseUrl}/${raw.replace(/^\/+/, "")}` : raw;
};

const Footer = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const lastScrollY = useRef(0);
  const [scrollDir, setScrollDir] = useState("down");
  const [isAtTop, setIsAtTop] = useState(true);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const [publicSettings, setPublicSettings] = useState(null);

  // Function to handle navigation with scroll to top
  const handleNavigation = (path) => {
    // Navigate to the page
    navigate(path);

    // Scroll to top of the page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const updateScrollState = () => {
      const y = window.scrollY || window.pageYOffset || 0;
      const doc = document.documentElement;
      const winHeight = window.innerHeight || 0;
      const docHeight = doc.scrollHeight || 0;

      const atTop = y <= 0;
      const atBottom = y + winHeight >= docHeight - 2;

      setIsAtTop(atTop);
      setIsAtBottom(atBottom);

      const delta = y - lastScrollY.current;
      if (Math.abs(delta) > 4) {
        setScrollDir(delta > 0 ? "down" : "up");
        lastScrollY.current = y;
      }
    };

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      window.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadSettings = async (force = false) => {
      const data = await fetchPublicSettings({ force });
      if (!cancelled) {
        setPublicSettings(data);
      }
    };

    loadSettings(false);

    const handleSettingsUpdated = () => {
      loadSettings(true);
    };

    window.addEventListener("publicSettingsUpdated", handleSettingsUpdated);

    return () => {
      cancelled = true;
      window.removeEventListener("publicSettingsUpdated", handleSettingsUpdated);
    };
  }, []);

  const socialLinks = useMemo(() => {
    const social = publicSettings?.social || {};
    return {
      facebook: String(social.facebook || "https://www.facebook.com/").trim(),
      whatsapp: String(social.whatsapp || "https://wa.me/8801700000000").trim(),
    };
  }, [publicSettings]);

  const contactInfo = useMemo(() => {
    const contact = publicSettings?.contact || {};
    const phone1 = String(contact.phone1 || "+880 1700-000000").trim();
    const phone2 = String(contact.phone2 || "+880 1800-000000").trim();
    const email = String(contact.email || "support@marketplace.com.bd").trim();

    const normalizePhoneForTel = (value) => String(value || "").replace(/[^\d+]/g, "");

    return {
      address:
        String(contact.address || "").trim() ||
        "Shop 12, Level 3, Bashundhara City, Panthapath, Dhaka 1215, Bangladesh",
      addressLink:
        String(contact.addressLink || "").trim() ||
        "https://maps.google.com/?q=Bashundhara+City+Panthapath+Dhaka+1215+Bangladesh",
      phone1,
      phone1Link: `tel:${normalizePhoneForTel(phone1)}`,
      phone2,
      phone2Link: `tel:${normalizePhoneForTel(phone2)}`,
      email,
      emailLink: `mailto:${email}`,
    };
  }, [publicSettings]);

  const website = useMemo(() => publicSettings?.website || {}, [publicSettings]);
  const brandColor = useMemo(
    () => normalizeThemeColor(website?.themeColor),
    [website?.themeColor],
  );
  const brandLogo = useMemo(
    () => toPublicAssetUrl(website?.logoUrl || ""),
    [website?.logoUrl],
  );

  // Quick links configuration
  const quickLinks = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: "About Us", path: "/about" },
    { name: "Contact", path: "/contact" },
    { name: "FAQs", path: "/faqs" },
    { name: "Shipment Policy", path: "/policy/shipment" },
    { name: "Delivery Policy", path: "/policy/delivery" },
    { name: "Terms & Conditions", path: "/policy/terms" },
    { name: "Return Policy", path: "/policy/return" },
    { name: "Privacy Policy", path: "/policy/privacy" },
  ];

  return (
    <footer className="bg-black text-white">
      {/* TOP FEATURES */}
      <div className="border-b border-gray-800 py-8 md:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <FaTruckFast className="text-xl" />,
                title: "All Bangladesh Delivery",
                text: "Fast courier across Bangladesh",
              },
              {
                icon: <FaArrowRotateLeft className="text-xl" />,
                title: "Money Back Guarantee",
                text: "Return request within 7 days",
              },
              {
                icon: <FaGift className="text-xl" />,
                title: "Offers And Discounts",
                text: "Regular campaign and coupons",
              },
              {
                icon: <FaHeadset className="text-xl" />,
                title: "24/7 Support Services",
                text: "Phone and WhatsApp support",
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className="flex items-center gap-4 p-4 hover:bg-gray-900/50 rounded-xl transition-all duration-300"
              >
                <div className="p-3 bg-gray-900 rounded-lg">{feature.icon}</div>
                <div>
                  <h3 className="font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN FOOTER CONTENT */}
      <div className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* CONTACT INFO */}
            <div className="lg:col-span-5">
              <div className="mb-8">
                <button
                  onClick={() => handleNavigation("/")}
                  className="inline-block cursor-pointer"
                >
                  <h2 className="text-3xl font-bold mb-4 hover:opacity-90 transition-opacity flex items-center gap-3">
                    {brandLogo ? (
                      <img
                        src={brandLogo}
                        alt={String(website.storeName || "Store")}
                        className="h-10 w-10 rounded-xl object-cover border border-white/30"
                      />
                    ) : null}
                    <span style={{ color: brandColor }}>
                      {String(website.storeName || "E-Commerce")}
                    </span>
                  </h2>
                </button>
                <p className="text-gray-400 leading-relaxed">
                  {String(website.tagline || "").trim() ||
                    "Multi-vendor ecommerce platform for Bangladesh with trusted sellers, secure checkout, and nationwide delivery."}
                </p>
              </div>

              <div className="space-y-4">
                {/* Address - Clickable Google Maps Link */}
                <a
                  href={contactInfo.addressLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 hover:text-white transition-colors duration-200 group"
                >
                  <FaMapMarkerAlt className="text-gray-400 mt-1 shrink-0 group-hover:text-white" />
                  <div>
                    <p className="font-medium text-gray-300 group-hover:text-white">
                      Address
                    </p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300">
                      {contactInfo.address}
                    </p>
                  </div>
                </a>

                {/* Phone Numbers - Clickable */}
                <div className="space-y-2">
                  <a
                    href={contactInfo.phone1Link}
                    className="flex items-center gap-3 hover:text-white transition-colors duration-200 group"
                  >
                    <FaPhone className="text-gray-400 shrink-0 group-hover:text-white" />
                    <div>
                      <p className="font-medium text-gray-300 group-hover:text-white">
                        Phone
                      </p>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300">
                        {contactInfo.phone1}
                      </p>
                    </div>
                  </a>
                  <a
                    href={contactInfo.phone2Link}
                    className="flex items-center gap-3 hover:text-white transition-colors duration-200 group ml-8"
                  >
                    <div>
                      <p className="text-sm text-gray-400 group-hover:text-gray-300">
                        {contactInfo.phone2}
                      </p>
                    </div>
                  </a>
                </div>

                {/* Email - Clickable */}
                <a
                  href={contactInfo.emailLink}
                  className="flex items-center gap-3 hover:text-white transition-colors duration-200 group"
                >
                  <FaEnvelope className="text-gray-400 shrink-0 group-hover:text-white" />
                  <div>
                    <p className="font-medium text-gray-300 group-hover:text-white">
                      Email
                    </p>
                    <p className="text-sm text-gray-400 group-hover:text-gray-300">
                      {contactInfo.email}
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {/* QUICK LINKS - Using custom handler for scroll to top */}
            <div className="lg:col-span-3">
              <h4 className="font-bold text-lg mb-6 pb-2 border-b border-gray-800">
                Quick Links
              </h4>
              <ul className="space-y-3">
                {quickLinks.map((link) => (
                  <li key={link.name}>
                    <button
                      onClick={() => handleNavigation(link.path)}
                      className="text-gray-400 hover:text-white flex items-center gap-2 transition-colors duration-200 group w-full text-left"
                    >
                      <FaChevronRight className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                      {link.name}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* SOCIAL MEDIA - External links open in new tab */}
            <div className="lg:col-span-4">
              <h4 className="font-bold text-lg mb-6 pb-2 border-b border-gray-800">
                Connect With Us
              </h4>

              <div className="space-y-4">
                {/* Facebook Link */}
                <a
                  href={socialLinks.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-linear-to-br from-gray-900 to-gray-800 border border-gray-800 hover:border-blue-500 transition-all duration-300 group block"
                >
                  <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center group-hover:bg-blue-500 transition-colors duration-300">
                    <FaFacebookF className="text-xl text-blue-400 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">Facebook</p>
                    <p className="text-sm text-gray-400">Follow our page</p>
                  </div>
                </a>

                {/* WhatsApp Link */}
                <a
                  href={socialLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 rounded-xl bg-linear-to-br from-gray-900 to-gray-800 border border-gray-800 hover:border-green-500 transition-all duration-300 group block"
                >
                  <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center group-hover:bg-green-500 transition-colors duration-300">
                    <FaWhatsapp className="text-xl text-green-400 group-hover:text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-white">WhatsApp</p>
                    <p className="text-sm text-gray-400">Chat with us</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div className="border-t border-gray-900 py-6 md:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center">
            {/* COPYRIGHT - CENTERED */}
            <div className="text-center">
              <p className="text-gray-400 text-sm">
                Copyright {currentYear} {String(website.storeName || "E-Commerce Store")}. All rights reserved.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Built for Bangladesh marketplace operations
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SCROLL DIRECTION BUTTON */}
      {!isAtTop && !isAtBottom && (
        <button
          onClick={() => {
            if (scrollDir === "down") {
              const bottom =
                document.documentElement.scrollHeight - window.innerHeight;
              window.scrollTo({ top: bottom, behavior: "smooth" });
            } else {
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
          className="fixed bottom-6 right-6 w-12 h-12 bg-white text-black rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center z-50 group border border-gray-300"
          aria-label={scrollDir === "down" ? "Go to bottom" : "Back to top"}
          title={scrollDir === "down" ? "Go to bottom" : "Back to top"}
        >
          <svg
            className={`w-5 h-5 transition-transform duration-200 ${
              scrollDir === "down"
                ? "rotate-180 group-hover:translate-y-0.5"
                : "group-hover:-translate-y-0.5"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 15l7-7 7 7"
            />
          </svg>
        </button>
      )}
    </footer>
  );
};

export default Footer;
