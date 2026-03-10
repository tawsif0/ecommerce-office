import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import Demo03Carousel from "../demo03/Demo03Carousel";
import useDemo03Assets from "../demo03/useDemo03Assets";
import { selectPublicSettings } from "../../store/publicSettingsSlice";
import { toPublicAssetUrl } from "../../utils/publicSettings";

const HERO_SLIDES = [
  {
    id: "hero-1",
    subtitle: "Highest Quality",
    title: "High Performance and Elegant Design",
    description:
      "Sleek designs, cutting-edge tech, unmatched performance for modern living",
    cta: "View Headphones",
    href: "/shop",
    media: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/slider-03.jpg",
    overlayOpacity: 0.3,
  },
  {
    id: "hero-2",
    subtitle: "Superior Craftsmanship",
    title: "Technology That Inspires Confidence",
    description:
      "Experience innovation, style, and performance in every electronic product.",
    cta: "View Headphones",
    href: "/shop",
    media: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/slider-02-1.jpg",
    overlayOpacity: 0.3,
  },
  {
    id: "hero-3",
    subtitle: "Highest Quality",
    title: "Experience Power, Discover Style",
    description:
      "Technology redefined: sleek, powerful, reliable, designed for your lifestyle",
    cta: "View Headphones",
    href: "/shop",
    media: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/slider-03-1.jpg",
    overlayOpacity: 0.3,
  },
];

const LOGO_MARQUEE = [
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-01.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-03.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-04.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-05.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-06.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-02.png",
  "https://klbtheme.com/fynode/wp-content/uploads/2024/12/logo-08.png",
];

const CATEGORY_SLIDES = [
  {
    id: "cat-earphones",
    title: "Earphones",
    count: "10 Products",
    href: "/shop",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/category-earphones.png",
  },
  {
    id: "cat-headphones",
    title: "Headphones",
    count: "8 Products",
    href: "/shop",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/category-headphones.png",
  },
  {
    id: "cat-microphones",
    title: "Microphones",
    count: "8 Products",
    href: "/shop",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/category-microphone.png",
  },
  {
    id: "cat-smartwatches",
    title: "Smartwatches",
    count: "7 Products",
    href: "/shop",
    image: "https://demo03.arbeitonline.top/wp-content/uploads/2024/11/smartwatch.svg",
  },
  {
    id: "cat-speakers",
    title: "Speakers",
    count: "11 Products",
    href: "/shop",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/category-speakers.png",
  },
];

const BANNER_PRIMARY = {
  subtitle: "Premium Standards",
  title: "Elevate Your Audio Experience with Sony Headphones",
  titleGradient: {
    start: "rgb(255 255 255)",
    end: "rgb(39 35 36)",
    angle: "90deg",
  },
  description: "Elevate your life with electronics designed for style and performance.",
  cta: "Shop Now",
  href: "/shop",
  media: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/banner-02.jpg",
  theme: "light",
  height: { mobile: 400, tablet: 520, desktop: 640 },
  align: "justify-content-start",
};

const BANNER_SECONDARY = [
  {
    id: "banner-1",
    subtitle: "Unrivaled Precision",
    title: "Where Innovation Meets Immersive Sound",
    description: "Power meets precision in every detail.",
    cta: "Shop Now",
    href: "/shop",
    media: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/banner-01.jpg",
    theme: "dark",
    height: { mobile: 400, tablet: 520, desktop: 720 },
    contentAlign: "align-items-start",
  },
  {
    id: "banner-2",
    subtitle: "Peak Perfection",
    title: "Smart Solutions, Sleek Designs",
    description: "Smart solutions for a connected world.",
    cta: "Shop Now",
    href: "/shop",
    media: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/banner-03.jpg",
    theme: "dark",
    height: { mobile: 400, tablet: 520, desktop: 720 },
    contentAlign: "align-items-end",
  },
];

const PRODUCT_TABS = [
  { id: "headphones", label: "Headphones" },
  { id: "microphones", label: "Microphones" },
  { id: "smartwatches", label: "Smartwatches" },
  { id: "speakers", label: "Speakers" },
];

const PRODUCT_DEMOS = {
  headphones: [
    {
      id: "p-1797",
      brand: ["Headphones", "Noise Canceling"],
      title: "Wireless Gaming Headphones MS920",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-51-1024x1024.jpg",
      price: "\u09F3\u00A0335.00",
      rating: "4.67",
    },
    {
      id: "p-1608",
      brand: ["Headphones"],
      title: "Active Noise-Cancelling RW75",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-2-1024x1024.jpg",
      price: "\u09F3\u00A085.19 \u2013 \u09F3\u00A0102.77",
      rating: "4.60",
    },
    {
      id: "p-1800",
      brand: ["Headphones"],
      title: "JBL Tour Pro 2 Earbuds",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-12-1024x1024.jpg",
      price: "\u09F3\u00A0299.00",
      rating: "4.72",
    },
    {
      id: "p-1801",
      brand: ["Headphones"],
      title: "Marshall Portable Speaker",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-6-1024x1024.jpg",
      price: "\u09F3\u00A0249.00",
      rating: "4.55",
    },
  ],
  microphones: [
    {
      id: "m-1",
      brand: ["Microphones"],
      title: "Studio Microphone Pro",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-36-1024x1024.jpg",
      price: "\u09F3\u00A0129.00",
      rating: "4.80",
    },
    {
      id: "m-2",
      brand: ["Microphones"],
      title: "USB Podcast Mic X1",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-33-1024x1024.jpg",
      price: "\u09F3\u00A089.00",
      rating: "4.65",
    },
    {
      id: "m-3",
      brand: ["Microphones"],
      title: "Wireless Lavalier Mic",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-30-1024x1024.jpg",
      price: "\u09F3\u00A076.00",
      rating: "4.52",
    },
  ],
  smartwatches: [
    {
      id: "s-1",
      brand: ["Smartwatches"],
      title: "Amazfit Active Smartwatch",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-24-1024x1024.jpg",
      price: "\u09F3\u00A0199.00",
      rating: "4.71",
    },
    {
      id: "s-2",
      brand: ["Smartwatches"],
      title: "Apple Watch Series 10 GPS",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-22-1024x1024.jpg",
      price: "\u09F3\u00A0399.00",
      rating: "4.85",
    },
    {
      id: "s-3",
      brand: ["Smartwatches"],
      title: "Fitness Tracker Watch",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-25-1024x1024.jpg",
      price: "\u09F3\u00A0109.00",
      rating: "4.62",
    },
  ],
  speakers: [
    {
      id: "sp-1",
      brand: ["Speakers"],
      title: "Premium Bluetooth Speaker",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-15-1024x1024.jpg",
      price: "\u09F3\u00A0169.00",
      rating: "4.58",
    },
    {
      id: "sp-2",
      brand: ["Speakers"],
      title: "Portable Sound Bar",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-16-1024x1024.jpg",
      price: "\u09F3\u00A0219.00",
      rating: "4.66",
    },
    {
      id: "sp-3",
      brand: ["Speakers"],
      title: "Home Theater Speaker Set",
      href: "/shop",
      image:
        "https://demo03.arbeitonline.top/wp-content/uploads/2024/12/01-17-1024x1024.jpg",
      price: "\u09F3\u00A0459.00",
      rating: "4.73",
    },
  ],
};

const TESTIMONIALS = [
  {
    id: "t-1",
    title: "Best Customer Service",
    message:
      "I've been using this product for a month now, and I've had no issues. The customer service is top-notch, and the product is exactly as described.",
    author: "Hasan R Emon",
    location: "Dhaka, BD",
    stars: 5,
  },
  {
    id: "t-2",
    title: "Best Customer Service",
    message:
      "I've been using this product for a month now, and I've had no issues. The customer service is top-notch, and the product is exactly as described.",
    author: "Hasan R Emon",
    location: "Dhaka, BD",
    stars: 5,
  },
  {
    id: "t-3",
    title: "Best Customer Service",
    message:
      "I've been using this product for a month now, and I've had no issues. The customer service is top-notch, and the product is exactly as described.",
    author: "Hasan R Emon",
    location: "Dhaka, BD",
    stars: 5,
  },
  {
    id: "t-4",
    title: "Best Customer Service",
    message:
      "I've been using this product for a month now, and I've had no issues. The customer service is top-notch, and the product is exactly as described.",
    author: "Hasan R Emon",
    location: "Dhaka, BD",
    stars: 5,
  },
];

const BLOG_POSTS = [
  {
    id: "b-1",
    title: "Essential Tips for Maintaining Your Electronic Devices",
    category: "Tech Tips",
    author: "erabbihasan",
    date: "November 26, 2024",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/11/blog-1-456x486.jpg",
    href: "/about",
  },
  {
    id: "b-2",
    title: "Top 5 Home Electronics to Upgrade Your Living Space",
    category: "Home Electronics",
    author: "erabbihasan",
    date: "November 26, 2024",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/11/blog-2-456x486.jpg",
    href: "/about",
  },
  {
    id: "b-3",
    title: "How to Choose the Perfect Smartphone: A Buyer\u2019s Guide",
    category: "Product Guides",
    author: "erabbihasan",
    date: "November 26, 2024",
    image:
      "https://demo03.arbeitonline.top/wp-content/uploads/2024/11/blog-3-456x486.jpg",
    href: "/about",
  },
];

const FOOTER_FEATURES = [
  {
    id: "f-1",
    title: "Customer service",
    description: "It\u2019s not actually free we just price it into the products.",
    icon: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/footer.png",
  },
  {
    id: "f-2",
    title: "Fast Free Shipping",
    description: "Get free shipping on orders of $150 or more (within the US)",
    icon: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/footer2.png",
  },
  {
    id: "f-3",
    title: "Returns & Exchanges",
    description: "We offer free returns and exchanges within 30 days of purchase.",
    icon: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/footer3.png",
  },
  {
    id: "f-4",
    title: "Secure payment",
    description: "Your payment information is processed securely and encrypted.",
    icon: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/footer4.png",
  },
];

const COUNTER_BLOCKS = [
  {
    id: "c-1",
    value: "1.5k",
    title: "Happy Customers",
    description:
      "Ut sit amet aliquam libero. Vestibulum ut consectetur orci. Pellentesque nunc sem, consequat non blandit non dictum a mauris.",
  },
  {
    id: "c-2",
    value: "300k",
    title: "Total Sales per Month",
    description:
      "Ut sit amet aliquam libero. Vestibulum ut consectetur orci. Pellentesque nunc sem, consequat non blandit non dictum a mauris.",
  },
];

const VIDEO_BANNER = {
  subtitle: "Highest Qualitys",
  title: "Redefine Your Sound with Precision Microphones",
  description: "Innovative tech, timeless design, ultimate experience.",
  cta: "Shop Now",
  href: "/shop",
  video: "https://klbtheme.com/fynode/wp-content/uploads/2024/12/video-06.mp4",
  overlayOpacity: 0.1,
  height: { mobile: 400, tablet: 580, desktop: 760 },
};

function SiteHeader({ settings }) {
  const website = settings?.website || {};
  const storeName = String(website?.storeName || "arbeit").trim() || "arbeit";
  const logoMode = String(website?.logoMode || "image").trim().toLowerCase();
  const logoUrl = toPublicAssetUrl(website?.logoUrl);
  const logoText = String(website?.logoText || "").trim() || storeName;
  const showImageLogo = logoMode === "image" && Boolean(logoUrl);

  const preventToggleJump = (event) => {
    event.preventDefault();
  };

  return (
    <header id="masthead" className="site-header header-type1">
      <div className="site-header-row">
        <div className="container">
          <div className="site-header-inner d-flex align-items-center">
            <div className="column mobile-column">
              <div className="site-action-button">
                <a
                  href="#"
                  className="site-action-link toggle-button menu-toggle"
                  onClick={preventToggleJump}
                >
                  <div className="site-action-icon">
                    <i className="klb-icon-menu" />
                  </div>
                </a>
              </div>
            </div>

            <div className="column brand-column">
              <div className="site-brand black">
                <Link to="/" title={storeName} aria-label={storeName}>
                  {showImageLogo ? (
                    <>
                      <img
                        src={logoUrl}
                        alt={storeName}
                        className="site-brand-logo default"
                        style={{ filter: "none" }}
                      />
                      <img
                        src={logoUrl}
                        alt={storeName}
                        className="site-brand-logo transparent"
                        style={{ filter: "none" }}
                      />
                    </>
                  ) : (
                    <span className="site-brand-logo default">{logoText}</span>
                  )}
                </Link>
              </div>

              <div className="site-nav menu-horizontal primary-menu">
                <ul className="site-menu">
                  <li className="menu-item current-menu-item">
                    <Link to="/">Home</Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/shop">Shop</Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/shop">Headphones</Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/shop">Accessories</Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/blog">Blog</Link>
                  </li>
                  <li className="menu-item">
                    <Link to="/contact">Contact</Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="column actions-column">
              <div className="site-actions">
                <div className="site-action-button">
                  <a
                    href="#"
                    className="site-action-link toggle-button search-toggle"
                    onClick={preventToggleJump}
                    aria-label="Search"
                  >
                    <div className="site-action-icon">
                      <i className="klb-icon-search" />
                    </div>
                  </a>
                </div>

                <div className="site-action-button action-account">
                  <Link to="/login" className="site-action-link">
                    <div className="site-action-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                      >
                        <path
                          d="M18.5,19.3c-1.5-2-4-3.3-6.5-3.3-2.6,0-5,1.2-6.5,3.3M18.5,19.3c4.1-3.6,4.4-9.8.8-13.9-3.6-4.1-9.8-4.4-13.9-.8-4.1,3.6-4.4,9.8-.8,13.9.3.3.5.6.8.8M18.5,19.3c-1.8,1.6-4.1,2.5-6.5,2.5-2.4,0-4.7-.9-6.5-2.5M15.3,9.5c0,1.8-1.5,3.3-3.3,3.3s-3.3-1.5-3.3-3.3,1.5-3.3,3.3-3.3,3.3,1.5,3.3,3.3Z"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.4"
                        />
                      </svg>
                    </div>
                    <div className="site-action-label">
                      <p>Account</p>
                    </div>
                  </Link>
                </div>

                <div className="site-action-button">
                  <Link
                    to="/wishlist"
                    className="site-action-link toggle-button wishlist-toggle"
                  >
                    <div className="site-action-icon">
                      <i className="klb-icon-hearth" />
                      <div className="site-action-count klbwl-wishlist-count">
                        0
                      </div>
                    </div>
                  </Link>
                </div>

                <div className="site-action-button action-compare">
                  <Link to="/compare" className="site-action-link compare-toggle">
                    <div className="site-action-icon">
                      <i className="klb-icon-repeat" />
                    </div>
                  </Link>
                </div>

                <div className="site-action-button action-cart">
                  <Link
                    to="/cart"
                    className="site-action-link toggle-button cart-toggle"
                  >
                    <div className="site-action-icon">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="25"
                        height="22"
                        viewBox="0 0 25 22"
                      >
                        <path
                          d="M1.4,1.4h3.4c.2,0,.4.1.4.3l2.3,11.9c0,.2.2.3.4.3h13c.2,0,.3-.1.4-.3l2.3-9.7c0-.3-.1-.5-.4-.5H5.5"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="8.8"
                          cy="18.9"
                          r="1.9"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                        <circle
                          cx="19.2"
                          cy="18.9"
                          r="1.9"
                          fill="none"
                          stroke="currentColor"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <div className="site-action-count cart-count count">0</div>
                    </div>
                  </Link>
                </div>
              </div>
            </div>

            <div className="column mobile-column">
              <div className="site-action-button action-cart">
                <Link
                  to="/cart"
                  className="site-action-link toggle-button cart-toggle"
                >
                  <div className="site-action-icon">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="25"
                      height="22"
                      viewBox="0 0 25 22"
                    >
                      <path
                        d="M1.4,1.4h3.4c.2,0,.4.1.4.3l2.3,11.9c0,.2.2.3.4.3h13c.2,0,.3-.1.4-.3l2.3-9.7c0-.3-.1-.5-.4-.5H5.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="8.8"
                        cy="18.9"
                        r="1.9"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx="19.2"
                        cy="18.9"
                        r="1.9"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                    <div className="site-action-count cart-count count">0</div>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function BannerBlock({ slide }) {
  return (
    <div
      className="site-banner default-style light"
      style={{
        "--banner-mobile": "400px",
        "--banner-tablet": "520px",
        "--banner-desktop": "820px",
      }}
    >
      <div className="site-banner-content align-items-center justify-content-center">
        <div
          className="site-banner-inner max-width"
          style={{
            "--max-width-desktop": "820px",
            "--max-width-tablet": "820px",
            "--max-width-mobile": "100%",
          }}
        >
          <div className="site-banner-header">
            <h3 className="entry-subtitle subtitle-sm subtitle-lg">{slide.subtitle}</h3>
            <h2 className="entry-title title-6xl fw-bold tracking-tighter leading-tight">
              {slide.title}
            </h2>
          </div>
          <div className="site-banner-body">
            <div className="entry-description description-xl opacity-75 fw-light">
              <p>{slide.description}</p>
            </div>
          </div>
          <div className="site-banner-footer">
            <Link to={slide.href} className="btn btn-white btn-rounded">
              {slide.cta}
            </Link>
          </div>
        </div>
      </div>

      <div
        className="site-banner-media image-overlay dark"
        style={{ "--overlay-opacity": slide.overlayOpacity ?? 0.3 }}
      >
        <img decoding="async" src={slide.media} alt="" />
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const hoverGallery = Array.isArray(product?.gallery) ? product.gallery.filter(Boolean) : [];
  const galleryImages =
    hoverGallery.length > 0
      ? hoverGallery.slice(0, 4)
      : [product?.image, product?.image].filter(Boolean);

  const preventDefault = (event) => event.preventDefault();

  return (
    <div className="product-wrapper product-background product-type-1">
      <div className="product-inner">
        <div className="product-thumbnail-wrapper">
          <div className="product-rating simple">
            <div className="rating-count">
              <i className="klb-icon-star-solid" />
              <span className="count-text">
                <strong>{product.rating}</strong>
              </span>
            </div>
          </div>

          <div className="product-buttons">
            <div className="product-button product-quickview">
              <a href="#" onClick={preventDefault} aria-label="Quick view">
                <i className="klb-icon-eye" />
              </a>
            </div>
            <div className="product-button product-compare">
              <Link to="/compare" className="klbcp-btn">
                Compare
              </Link>
            </div>
          </div>

          <div className="product-thumbnail">
            <Link to={product.href}>
              <div className="product-card-carousel">
                <div className="hover-gallery-slider">
                  {galleryImages.map((src, idx) => (
                    <div key={idx} className="hover-gallery-item">
                      <img decoding="async" src={src} alt="" />
                    </div>
                  ))}
                </div>
                <img
                  decoding="async"
                  src={product.image}
                  alt={product.title}
                  className="wp-post-image"
                />
              </div>
            </Link>
          </div>

          <div className="product-cart-button">
            <Link
              to="/cart"
              className="button product_type_simple add_to_cart_button ajax_add_to_cart"
              role="button"
            >
              Add to cart
            </Link>
            <span className="screen-reader-text" />
          </div>
        </div>

        <div className="product-content-header" />
        <div className="product-content-wrapper">
          <div className="product-content-inner">
            <div className="product-brand">
              {(product.brand || []).map((brand) => (
                <a
                  key={brand}
                  href="#!"
                  onClick={(event) => event.preventDefault()}
                  rel="tag"
                >
                  {brand}
                </a>
              ))}
            </div>
            <h2 className="product-title">
              <Link to={product.href}>{product.title}</Link>
            </h2>
            <span className="price">{product.price}</span>
          </div>

          <div className="product-buttons">
            <div className="wishlist-button product-button product-wishlist">
              <button type="button" className="klbwl-btn" onClick={preventDefault}>
                Add to wishlist
              </button>
            </div>
          </div>
        </div>
        <div className="product-content-footer" />
      </div>
    </div>
  );
}

function SiteFooter({ settings }) {
  const website = settings?.website || {};
  const contact = settings?.contact || {};
  const storeName = String(website?.storeName || "arbeit").trim() || "arbeit";
  const logoUrl =
    toPublicAssetUrl(website?.logoUrl) ||
    "https://demo03.arbeitonline.top/wp-content/uploads/2026/03/download-3-300x120.png";
  const address =
    String(contact?.address || "").trim() || "1234 Fashion Street, Suite 567, Dhaka";
  const phone = String(contact?.phone1 || "").trim() || "+880 1707-387608";
  const email = String(contact?.email || "").trim() || "contact@arbeittechnology.com";

  return (
    <footer className="site-footer">
      <div className="site-footer-row footer-widgets">
        <div className="container">
          <div className="site-footer-inner">
            <div className="row gap-y-20">
              <div className="col col-12 col-md-6 col-lg-3">
                <div className="widget">
                  <div className="widget-body">
                    <div className="branding-detail">
                      <p>
                        <img
                          loading="lazy"
                          decoding="async"
                          src={logoUrl}
                          alt={storeName}
                          width="121"
                          height="48"
                          style={{ filter: "none" }}
                        />
                      </p>
                      <p>
                        <strong>Address:</strong> {address}
                      </p>
                      <p>
                        <strong>Phone:</strong> {phone}
                      </p>
                      <p>
                        <strong>Email:</strong> {email}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="col col-12 col-md-6 col-lg-3">
                <div className="widget">
                  <h4 className="widget-title">Let Us Help You</h4>
                  <div className="widget-body">
                    <ul className="menu">
                      <li className="menu-item">
                        <Link to="/policy/privacy">Accessibility Statement</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/track-order">Your Orders</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/policy/returns">
                          Returns &amp; Replacements
                        </Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/faqs">Shipping Rates &amp; Policies</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/policy/privacy">Privacy Policy</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/policy/terms">Terms and Conditions</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/contact">Help Center</Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col col-12 col-md-6 col-lg-3">
                <div className="widget">
                  <h4 className="widget-title">Get to Know Us</h4>
                  <div className="widget-body">
                    <ul className="menu">
                      <li className="menu-item">
                        <Link to="/about">Careers</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/about">About Us</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/about">Investor Relations</Link>
                      </li>
                      <li className="menu-item">
                        <Link to="/shop">Store Locations</Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="col col-12 col-md-6 col-lg-3">
                <div className="widget">
                  <h4 className="widget-title">Sign Up for Email</h4>
                  <div className="widget-body">
                    <div className="site-newsletter-form">
                      <p>
                        Sign up to get first dibs on new arrivals, sales,
                        exclusive content, events and more!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="site-row footer-copyright">
        <div className="container">
          <div className="site-footer-inner">
            <p className="site-copyright">
              Copyright \u00A9 {new Date().getFullYear()}
              <Link to="/"> {storeName} </Link>. All rights reserved.
            </p>

            <div className="site-payment-cards">
              <ul>
                {[
                  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment.png",
                  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment2.png",
                  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment3.png",
                  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment4.png",
                  "https://klbtheme.com/fynode/wp-content/uploads/2024/11/payment5.png",
                ].map((src) => (
                  <li key={src}>
                    <img src={src} alt="payment" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function MobileBottomNav() {
  return (
    <div className="klb-mobile-bottom site-mobile-navbar">
      <div className="site-mobile-navbar-inner">
        <nav className="site-nav menu-horizontal">
          <ul className="site-menu">
            <li className="menu-item">
              <Link to="/shop">
                <i className="klb-icon-store-minimal" />
                <span>STORE</span>
              </Link>
            </li>

            <li className="menu-item">
              <button type="button" className="toggle-button search-toggle">
                <i className="klb-icon-search" />
                <span>SEARCH</span>
              </button>
            </li>

            <li className="menu-item">
              <Link to="/wishlist" className="toggle-button wishlist-toggle">
                <i className="klb-icon-hearth" />
                <span>WISHLIST</span>
              </Link>
            </li>

            <li className="menu-item">
              <Link to="/login">
                <i className="klb-icon-user-line" />
                <span>ACCOUNT</span>
              </Link>
            </li>

            <li className="menu-item">
              <button type="button" className="toggle-button categories-toggle">
                <i className="klb-icon-layout-grid" />
                <span>CATEGORIES</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

export default function Demo03Home() {
  useDemo03Assets(true);
  const settings = useSelector(selectPublicSettings);
  const [activeTab, setActiveTab] = useState("headphones");
  const products = useMemo(() => PRODUCT_DEMOS[activeTab] || [], [activeTab]);

  return (
    <div id="page" className="page-content">
      <SiteHeader settings={settings} />

      <div id="main" className="main-content">
        <Demo03Carousel
          items={HERO_SLIDES}
          renderItem={(slide) => <BannerBlock slide={slide} />}
          className="slider-style"
          itemsDesktop={1}
          itemsTablet={1}
          itemsMobile={1}
          arrows
          dotsDesktop
          dotsTablet
          dotsMobile
          autoplay
          autoplayMs={6000}
          loop={false}
          style={{ "--dots-background": "#f3f4f6" }}
        />

        <div className="container section-margin">
          <div
            className="site-logos"
            style={{ "--logo-desktop-height": "72px", "--logo-mobile-height": "66px" }}
          >
            <div
              className="site-logos-inner animation-marquee"
              style={{
                "--marquee-speed": "45s",
                "--marquee-gap-desktop": "28px",
                "--marquee-gap-mobile": "30px",
              }}
            >
              {Array.from({ length: 3 }, (_, columnIndex) => (
                <div key={columnIndex} className="marquee-column">
                  {LOGO_MARQUEE.map((src, idx) => (
                    <div
                      key={`${columnIndex}-${idx}`}
                      className="marquee-item site-logos-item"
                    >
                      <img decoding="async" src={src} alt="" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container section-margin">
          <Demo03Carousel
            items={CATEGORY_SLIDES}
            renderItem={(category) => (
              <div className="site-category-block style-1 category-bg-gray">
                <div className="category-block-header">
                  <h3 className="entry-title">{category.title}</h3>
                  <span className="category-block-count">{category.count}</span>
                </div>
                <div className="category-block-image">
                  <Link to={category.href} className="image-padding">
                    <img
                      decoding="async"
                      src={category.image}
                      alt={category.title}
                    />
                  </Link>
                </div>
                <div className="category-block-footer">
                  <Link
                    to={category.href}
                    className="btn btn-white btn-rounded btn-small"
                  >
                    View Products
                  </Link>
                </div>
              </div>
            )}
            className="carousel-style"
            gapClass="gap-sm"
            itemsDesktop={4}
            itemsTablet={3}
            itemsMobile={2}
            arrows
            dotsDesktop={false}
            dotsTablet
            dotsMobile
            autoplay={false}
            loop={false}
          />
        </div>

        <div className="container section-margin">
          <div
            className={`site-banner default-style banner-rounded ${BANNER_PRIMARY.theme}`}
            style={{
              "--banner-mobile": `${BANNER_PRIMARY.height.mobile}px`,
              "--banner-tablet": `${BANNER_PRIMARY.height.tablet}px`,
              "--banner-desktop": `${BANNER_PRIMARY.height.desktop}px`,
            }}
          >
            <div
              className={`site-banner-content align-items-center ${BANNER_PRIMARY.align} padding-2xl`}
            >
              <div
                className="site-banner-inner max-width"
                style={{
                  "--max-width-desktop": "50%",
                  "--max-width-tablet": "50%",
                  "--max-width-mobile": "80%",
                }}
              >
                <div className="site-banner-header">
                  <h3 className="entry-subtitle subtitle-sm subtitle-lg subtitle-margin">
                    {BANNER_PRIMARY.subtitle}
                  </h3>
                  <h2
                    className="entry-title title-3xl font-bold tracking-tight leading-tight highlighted-text with-gradient title-margin"
                    style={{
                      "--gradient-start": BANNER_PRIMARY.titleGradient.start,
                      "--gradient-end": BANNER_PRIMARY.titleGradient.end,
                      "--gradient-angle": BANNER_PRIMARY.titleGradient.angle,
                    }}
                  >
                    {BANNER_PRIMARY.title}
                  </h2>
                </div>
                <div className="site-banner-body">
                  <div className="entry-description description-xl opacity-75 fw-light">
                    <p>{BANNER_PRIMARY.description}</p>
                  </div>
                </div>
                <div className="site-banner-footer">
                  <Link to={BANNER_PRIMARY.href} className="btn btn-white btn-rounded">
                    {BANNER_PRIMARY.cta} <i className="klb-icon-move-right" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="site-banner-media image-overlay">
              <img decoding="async" src={BANNER_PRIMARY.media} alt="" />
            </div>
            <Link to={BANNER_PRIMARY.href} className="wrap-link" aria-label="Shop" />
          </div>
        </div>

        <div className="container section-margin">
          <div className="row g-4">
            {BANNER_SECONDARY.map((banner) => (
              <div key={banner.id} className="col-12 col-lg-6">
                <div
                  className={`site-banner default-style banner-rounded ${banner.theme}`}
                  style={{
                    "--banner-mobile": `${banner.height.mobile}px`,
                    "--banner-tablet": `${banner.height.tablet}px`,
                    "--banner-desktop": `${banner.height.desktop}px`,
                  }}
                >
                  <div
                    className={`site-banner-content ${banner.contentAlign} justify-content-center padding-lg`}
                  >
                    <div
                      className="site-banner-inner max-width"
                      style={{
                        "--max-width-desktop": "100%",
                        "--max-width-tablet": "100%",
                        "--max-width-mobile": "100%",
                      }}
                    >
                      <div className="site-banner-header">
                        <h3 className="entry-subtitle subtitle-sm subtitle-lg">
                          {banner.subtitle}
                        </h3>
                        <h2 className="entry-title title-xl font-bold tracking-tight leading-snug">
                          {banner.title}
                        </h2>
                      </div>
                      <div className="site-banner-body">
                        <div className="entry-description description-lg opacity-75 fw-light">
                          <p>{banner.description}</p>
                        </div>
                      </div>
                      <div className="site-banner-footer">
                        <Link
                          to={banner.href}
                          className="btn btn-white btn-rounded btn-small"
                        >
                          {banner.cta} <i className="klb-icon-move-right" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="site-banner-media image-overlay">
                    <img decoding="async" src={banner.media} alt="" />
                  </div>
                  <Link to={banner.href} className="wrap-link" aria-label={banner.cta} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="container section-margin">
          <div className="klb-module">
            <div className="site-module-header">
              <div className="column">
                <h3 className="entry-title">Most sold this week</h3>
              </div>
              <div className="column">
                <div className="site-module-tabs style-1">
                  <ul>
                    {PRODUCT_TABS.map((tab) => (
                      <li key={tab.id}>
                        <a
                          className={`header-tab-link${activeTab === tab.id ? " active" : ""}`}
                          href={`#${tab.id}`}
                          onClick={(event) => {
                            event.preventDefault();
                            setActiveTab(tab.id);
                          }}
                        >
                          {tab.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="klb-products-tab">
              <Demo03Carousel
                items={products}
                renderItem={(product) => (
                  <div className="product">
                    <ProductCard product={product} />
                  </div>
                )}
                className="carousel-style products has-overflow"
                gapClass="gap-base"
                itemsDesktop={3}
                itemsTablet={3}
                itemsMobile={1}
                arrows
                dotsDesktop={false}
                dotsTablet={false}
                dotsMobile={false}
                autoplay
                autoplayMs={1600}
                loop={false}
              />
            </div>
          </div>
        </div>

        <div className="container section-margin">
          <div className="site-module-header fynode-custom-title">
            <div className="column">
              <h3 className="entry-title">Capture Every Detail</h3>
            </div>
            <div className="column">
              <div className="entry-description">
                <p>
                  Capture every nuance of your voice with this high-performance microphone.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container section-margin">
          <div
            className="site-banner default-style banner-rounded light"
            style={{
              "--banner-mobile": `${VIDEO_BANNER.height.mobile}px`,
              "--banner-tablet": `${VIDEO_BANNER.height.tablet}px`,
              "--banner-desktop": `${VIDEO_BANNER.height.desktop}px`,
            }}
          >
            <div className="site-banner-content align-items-center justify-content-center padding-2xl">
              <div
                className="site-banner-inner max-width"
                style={{
                  "--max-width-desktop": "70%",
                  "--max-width-tablet": "60%",
                  "--max-width-mobile": "80%",
                }}
              >
                <div className="site-banner-header">
                  <h3 className="entry-subtitle subtitle-sm subtitle-lg subtitle-margin">
                    {VIDEO_BANNER.subtitle}
                  </h3>
                  <h2 className="entry-title title-4xl font-bold tracking-tight leading-tight title-margin">
                    {VIDEO_BANNER.title}
                  </h2>
                </div>
                <div className="site-banner-body">
                  <div className="entry-description description-xl opacity-75 fw-light">
                    <p>{VIDEO_BANNER.description}</p>
                  </div>
                </div>
                <div className="site-banner-footer">
                  <Link to={VIDEO_BANNER.href} className="btn btn-white btn-rounded">
                    {VIDEO_BANNER.cta} <i className="klb-icon-move-right" />
                  </Link>
                </div>
              </div>
            </div>

            <div
              className="site-banner-media image-overlay dark"
              style={{ "--overlay-opacity": `${VIDEO_BANNER.overlayOpacity}` }}
            >
              <video
                src={VIDEO_BANNER.video}
                autoPlay
                muted
                loop
                playsInline
              />
            </div>
            <Link to={VIDEO_BANNER.href} className="wrap-link" aria-label="Shop" />
          </div>
        </div>

        <div className="container section-margin">
          <div className="site-module-header fynode-custom-title flex-column align-items-center">
            <div className="column">
              <h3 className="entry-title">Our Happy Clients</h3>
            </div>
            <div className="column">
              <div className="entry-description">
                <p>
                  See what our satisfied customers have to say about our electronic accessories.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container section-margin">
          <Demo03Carousel
            items={TESTIMONIALS}
            renderItem={(testimonial) => (
              <div className="site-testimonial box-style white-background">
                <div className="testimonial-header">
                  <div className="testimonial-rating">
                    {Array.from({ length: 5 }, (_, idx) => (
                      <i key={idx} className="klb-icon-star-solid" />
                    ))}
                  </div>
                  <h4 className="entry-title">{testimonial.title}</h4>
                </div>
                <div className="testimonial-comment">
                  <div className="testimonial-message">
                    <p>{testimonial.message}</p>
                  </div>
                  <div className="testimonial-author">{testimonial.author}</div>
                  <div className="testimonial-author-location">{testimonial.location}</div>
                </div>
                <div className="testimonial-products products" />
              </div>
            )}
            className="carousel-style"
            gapClass="gap-base"
            itemsDesktop={3}
            itemsTablet={2}
            itemsMobile={1}
            arrows
            dotsDesktop={false}
            dotsTablet
            dotsMobile
            autoplay={false}
            loop={false}
          />
        </div>

        <div className="container section-margin">
          <div className="row g-4">
            {COUNTER_BLOCKS.map((counter) => (
              <div key={counter.id} className="col-12 col-md-6">
                <div className="site-counter-block text-center">
                  <h3 className="entry-title title-7xl font-bold leading-none light-text">
                    {counter.value}
                  </h3>
                  <h4 className="entry-subtitle subtitle-sm font-semibold subtitle-2xl">
                    {counter.title}
                  </h4>
                  <div className="entry-description description-base opacity-75 fw-light">
                    <p>{counter.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="container section-margin">
          <div className="site-module-header fynode-custom-title flex-column align-items-center">
            <div className="column">
              <h3 className="entry-title">Our Journal</h3>
            </div>
            <div className="column">
              <div className="entry-description">
                <p>
                  See what our satisfied customers have to say about our electronic accessories.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container section-margin">
          <div>
            <div className="row">
              {BLOG_POSTS.map((post) => (
                <div key={post.id} className="col-12 col-md-6 col-lg-4">
                  <div className="post">
                    <div className="post-thumbnail">
                      <Link to={post.href}>
                        <img decoding="async" src={post.image} alt={post.title} />
                      </Link>
                      <div className="entry-post-category">
                        <Link to={post.href}>{post.category}</Link>
                      </div>
                    </div>
                    <div className="post-content">
                      <h3 className="entry-title">
                        <Link to={post.href}>{post.title}</Link>
                      </h3>
                      <div className="entry-post-meta">
                        <div className="meta-item">
                          <span className="entry-author">
                            by{" "}
                            <Link to={post.href} className="underlined-link">
                              {post.author}
                            </Link>
                          </span>
                        </div>
                        <div className="meta-item">
                          <span className="entry-date">{post.date}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="col-12" />
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div
          className="section-padding border-top section-margin"
          style={{
            "--padding-top-mobile": "40px",
            "--padding-top-tablet": "40px",
            "--padding-top-desktop": "60px",
          }}
        >
          <Demo03Carousel
            items={FOOTER_FEATURES}
            renderItem={(feature) => (
              <div className="site-iconbox horizontal">
                <div className="site-iconbox-icon">
                  <img src={feature.icon} alt="" />
                </div>
                <div className="site-iconbox-content">
                  <h4 className="entry-title">{feature.title}</h4>
                  <div className="entry-description">
                    <p>{feature.description}</p>
                  </div>
                </div>
              </div>
            )}
            className="carousel-style"
            gapClass="gap-base"
            itemsDesktop={4}
            itemsTablet={3}
            itemsMobile={1}
            arrows={false}
            dotsDesktop={false}
            dotsTablet
            dotsMobile
            autoplay={false}
            loop={false}
          />
        </div>
      </div>

      <SiteFooter settings={settings} />
      <MobileBottomNav />
    </div>
  );
}
