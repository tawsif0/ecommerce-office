import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiClock,
  FiCopy,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiShare2,
  FiStar,
} from "react-icons/fi";
import { FaFacebookF, FaTwitter, FaWhatsapp, FaPaperPlane } from "react-icons/fa";
import { useAuth } from "../hooks/useAuth";
import usePublicSettings from "../hooks/usePublicSettings";
import StorefrontProductCard from "../Home/components/StorefrontProductCard";
import { formatDocumentTitle } from "../utils/publicSettings";
import { hasHtmlContent, stripHtml } from "../utils/richText";

const baseUrl = import.meta.env.VITE_API_URL;

const fallbackBanner =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";

const getFullVendorMediaUrl = (mediaPath) => {
  if (!mediaPath) return null;
  if (
    mediaPath.startsWith("http://") ||
    mediaPath.startsWith("https://") ||
    mediaPath.startsWith("data:")
  ) {
    return mediaPath;
  }
  if (mediaPath.startsWith("/")) {
    return `${baseUrl}${mediaPath}`;
  }
  return `${baseUrl}/${mediaPath}`;
};

const renderStars = (rating = 0) =>
  [...Array(5)].map((_, index) => (
    <FiStar
      key={`star-${index}`}
      className={`w-4 h-4 ${
        index < Math.round(Number(rating || 0))
          ? "text-yellow-500 fill-yellow-500"
          : "text-gray-300"
      }`}
    />
  ));

const VendorStore = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuth();
  const { settings } = usePublicSettings();

  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
  });

  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const storeUrl = typeof window !== "undefined" ? window.location.href : "";
  const storeShareText = vendor?.description
    ? stripHtml(vendor.description).slice(0, 140)
    : `Visit ${vendor?.storeName || "this store"} on our marketplace`;

  const hasPolicies = useMemo(() => {
    const policies = vendor?.storePolicies || {};
    return Boolean(
      policies.shippingPolicy ||
        policies.refundPolicy ||
        policies.privacyPolicy ||
        policies.termsConditions,
    );
  }, [vendor]);

  const renderRichText = (value, className) => {
    if (!String(value || "").trim()) return null;
    if (hasHtmlContent(value)) {
      return <div className={className} dangerouslySetInnerHTML={{ __html: value }} />;
    }
    return <p className={className}>{value}</p>;
  };

  useEffect(() => {
    if (user) {
      setContactForm((prev) => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || user.originalPhone || "",
      }));
    }
  }, [user]);

  const fetchStore = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/${slug}/store`);
      setVendor(response.data?.vendor || null);
      setProducts(response.data?.products || []);
    } catch {
      setVendor(null);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const fetchReviews = useCallback(async () => {
    try {
      setReviewLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/${slug}/reviews`);
      setReviews(response.data?.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchStore();
    fetchReviews();
  }, [fetchReviews, fetchStore]);

    useEffect(() => {
      if (!vendor) return undefined;

      const descriptionTag = document.querySelector('meta[name="description"]');
      const previousDescription = descriptionTag?.getAttribute("content");
      const timer = window.setTimeout(() => {
        document.title = formatDocumentTitle(
          settings,
          String(vendor.seoTitle || vendor.storeName || "Vendor Store").trim(),
        );
      }, 0);

    if (descriptionTag && String(vendor.seoDescription || "").trim()) {
      descriptionTag.setAttribute("content", String(vendor.seoDescription).trim());
    }

      return () => {
        window.clearTimeout(timer);
        if (descriptionTag && previousDescription !== null) {
          descriptionTag.setAttribute("content", previousDescription);
        }
      };
    }, [settings, vendor]);

  const submitReview = async (event) => {
    event.preventDefault();

    if (!isLoggedIn) {
      toast.error("Please login to submit a review");
      return;
    }

    if (!reviewForm.comment.trim()) {
      toast.error("Review comment is required");
      return;
    }

    try {
      setSubmittingReview(true);
      const token = localStorage.getItem("token");
      await axios.post(
        `${baseUrl}/vendors/${slug}/reviews`,
        {
          rating: Number(reviewForm.rating || 5),
          title: reviewForm.title,
          comment: reviewForm.comment,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      toast.success("Review submitted");
      setReviewForm({
        rating: 5,
        title: "",
        comment: "",
      });
      fetchReviews();
      fetchStore();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const submitContact = async (event) => {
    event.preventDefault();

    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast.error("Name, email and message are required");
      return;
    }

    try {
      setSendingMessage(true);
      await axios.post(`${baseUrl}/vendors/${slug}/contact`, {
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        subject: contactForm.subject,
        message: contactForm.message,
      });
      toast.success("Message sent to vendor");
      setContactForm((prev) => ({
        ...prev,
        subject: "",
        message: "",
      }));
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setSendingMessage(false);
    }
  };

  const shareStoreTo = (platform) => {
    const encodedUrl = encodeURIComponent(storeUrl);
    const encodedText = encodeURIComponent(
      `${vendor?.storeName || "Store"} - ${storeShareText}`,
    );
    const links = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      whatsapp: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`,
    };
    const targetUrl = links[platform];
    if (!targetUrl) return;
    window.open(targetUrl, "_blank", "noopener,noreferrer,width=640,height=640");
  };

  const copyStoreLink = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      toast.success("Store link copied");
    } catch {
      toast.error("Failed to copy store link");
    }
  };

  const shareStore = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: vendor?.storeName || "Vendor Store",
          text: storeShareText,
          url: storeUrl,
        });
        return;
      }
      await copyStoreLink();
    } catch {
      toast.error("Failed to share store link");
    }
  };

  const goToVendorMessages = () => {
    if (!isLoggedIn) {
      toast.error("Please login to message vendor");
      return;
    }

    const vendorId = String(vendor?._id || "").trim();
    if (!vendorId) {
      toast.error("Vendor is unavailable for messaging");
      return;
    }

    localStorage.setItem("vendorMessagesPresetVendorId", vendorId);
    localStorage.setItem("dashboardActiveTab", "vendor-messages");
    window.location.href = "/dashboard";
  };

  const handleOpenProduct = (productId) => {
    navigate(`/product/${productId}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4 py-12">
        <div className="rounded-[28px] border border-black/5 bg-white p-10 shadow-sm">
          <div className="h-12 w-12 rounded-full border-2 border-gray-200 border-t-black animate-spin" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <section className="flex min-h-screen items-center justify-center bg-[#f5f5f5] px-4 py-12">
        <div className="max-w-lg rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-black">Store not found</h1>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            This vendor store may be unavailable or not published yet.
          </p>
          <Link
            to="/shop"
            className="mt-6 inline-flex items-center rounded-full bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-900"
          >
            Browse Shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-[#f5f5f5] pb-16">
      <div className="relative h-64 overflow-hidden md:h-80 lg:h-96">
        <img
          src={getFullVendorMediaUrl(vendor.banner) || fallbackBanner}
          alt={vendor.storeName}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.2)_0%,rgba(0,0,0,0.75)_100%)]" />
      </div>

      <div className="site-shell relative z-10 -mt-16">
        <div className="mb-6">
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur transition hover:text-black"
          >
            Back to marketplace
          </Link>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-black/5 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.08)]">
          <div className="grid gap-0 xl:grid-cols-[1.25fr,0.75fr]">
            <div className="p-6 md:p-8 lg:p-10">
              <div className="flex flex-col gap-6 md:flex-row md:items-start">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-gray-200 bg-gray-100 text-xl font-bold text-gray-500">
                  {vendor.logo ? (
                    <img
                      src={getFullVendorMediaUrl(vendor.logo)}
                      alt={vendor.storeName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{String(vendor.storeName || "ST").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center rounded-full bg-black px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white">
                    Vendor Store
                  </span>
                  <h1 className="mt-4 text-3xl font-bold tracking-tight text-black md:text-4xl">
                    {vendor.storeName}
                  </h1>
                  {vendor.description ? (
                    renderRichText(
                      vendor.description,
                      "mt-3 max-w-3xl text-sm leading-6 text-gray-600 md:text-base",
                    )
                  ) : (
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 md:text-base">
                      Marketplace vendor with curated catalog, direct messaging, and customer reviews.
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#fafafa] px-3 py-1.5">
                      <div className="flex items-center gap-1">{renderStars(vendor.ratingAverage || 0)}</div>
                      <span>
                        {Number(vendor.ratingAverage || 0).toFixed(1)} rating
                      </span>
                    </div>
                    <span className="rounded-full bg-[#fafafa] px-3 py-1.5">
                      {vendor.ratingCount || 0} reviews
                    </span>
                    <span className="rounded-full bg-[#fafafa] px-3 py-1.5">
                      {products.length} products
                    </span>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={goToVendorMessages}
                      className="inline-flex items-center gap-2 rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-900"
                    >
                      <FaPaperPlane className="h-3.5 w-3.5" />
                      Message Vendor
                    </button>
                    <button
                      type="button"
                      onClick={shareStore}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black"
                    >
                      <FiShare2 className="h-4 w-4" />
                      Share Store
                    </button>
                    <button
                      type="button"
                      onClick={copyStoreLink}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black"
                    >
                      <FiCopy className="h-4 w-4" />
                      Copy Link
                    </button>
                    <button
                      type="button"
                      onClick={() => shareStoreTo("facebook")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-black hover:text-black"
                      aria-label="Share on Facebook"
                    >
                      <FaFacebookF className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shareStoreTo("twitter")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-black hover:text-black"
                      aria-label="Share on X/Twitter"
                    >
                      <FaTwitter className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => shareStoreTo("whatsapp")}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 text-gray-700 transition hover:border-black hover:text-black"
                      aria-label="Share on WhatsApp"
                    >
                      <FaWhatsapp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 bg-[radial-gradient(circle_at_top_left,_rgba(0,0,0,0.08),_transparent_60%),linear-gradient(135deg,_#111111_0%,_#2a2a2a_100%)] p-6 text-white md:p-8 xl:border-l xl:border-t-0 xl:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/70">
                Store Overview
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Location</p>
                  <p className="mt-2 text-lg font-semibold">{vendor.city || "Bangladesh"}</p>
                  <p className="mt-1 text-xs text-white/70">Marketplace seller region</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Availability</p>
                  <p className="mt-2 text-lg font-semibold">{vendor.openingHours || "Always open"}</p>
                  <p className="mt-1 text-xs text-white/70">Store operating hours</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Direct Contact</p>
                  <div className="mt-2 space-y-2 text-sm text-white/80">
                    {vendor.phone ? (
                      <p className="inline-flex items-center gap-2">
                        <FiPhone className="h-4 w-4" />
                        {vendor.phone}
                      </p>
                    ) : null}
                    {vendor.email ? (
                      <p className="inline-flex items-center gap-2">
                        <FiMail className="h-4 w-4" />
                        {vendor.email}
                      </p>
                    ) : (
                      <p>No direct email published</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {vendor.vacationMode ? (
          <div className="mt-6 rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-900 shadow-sm">
            <p className="font-semibold">This store is currently on vacation mode.</p>
            <p className="mt-1 text-sm">
              Products remain visible, but checkout or delivery may be temporarily limited.
            </p>
          </div>
        ) : null}

        <div className="mt-6 rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                Store Products
              </p>
              <h2 className="mt-1 text-2xl font-semibold text-black">
                Browse the full vendor catalog
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                The vendor shelf now uses the same storefront card style as shop, home, wishlist, and related products.
              </p>
            </div>
            <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
              {products.length} live listing{products.length === 1 ? "" : "s"}
            </span>
          </div>

          {products.length === 0 ? (
            <div className="mt-5 rounded-[24px] border border-dashed border-gray-300 bg-[#fafafa] p-10 text-center">
              <p className="text-sm text-gray-600">No products are available in this store yet.</p>
            </div>
          ) : (
            <div className="storefront-card-grid mt-5">
              {products.map((product) => (
                <div key={product._id} className="storefront-card-grid__item">
                  <StorefrontProductCard
                    product={product}
                    className="!w-full"
                    onViewDetails={() => handleOpenProduct(product._id)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Store Reviews
                </p>
                <h2 className="mt-1 text-xl font-semibold text-black">
                  What customers say about this vendor
                </h2>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
                {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </div>

            {reviewLoading ? (
              <p className="mt-5 text-sm text-gray-600">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <div className="mt-5 rounded-[24px] border border-dashed border-gray-300 bg-[#fafafa] p-8 text-center text-sm text-gray-600">
                No reviews yet.
              </div>
            ) : (
              <div className="mt-5 space-y-3 max-h-96 overflow-auto pr-1">
                {reviews.map((review) => (
                  <div key={review._id} className="rounded-2xl border border-gray-100 bg-[#fafafa] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-900">
                          {review.user?.name || review.reviewerName || "Customer"}
                        </p>
                        <div className="mt-1 flex items-center gap-1">
                          {renderStars(review.rating || 0)}
                        </div>
                      </div>
                      {review.verifiedPurchase ? (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-green-700">
                          Verified Purchase
                        </span>
                      ) : null}
                    </div>
                    {review.title ? (
                      <p className="mt-3 text-sm font-semibold text-gray-900">{review.title}</p>
                    ) : null}
                    <p className="mt-1 text-sm leading-6 text-gray-600">{review.comment}</p>
                    <p className="mt-2 text-xs text-gray-500">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={submitReview} className="mt-5 border-t border-gray-100 pt-5 space-y-3">
              <h3 className="text-sm font-semibold text-black">Write a review</h3>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <select
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((prev) => ({ ...prev, rating: Number(event.target.value) }))
                  }
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                >
                  <option value={5}>5 - Excellent</option>
                  <option value={4}>4 - Good</option>
                  <option value={3}>3 - Average</option>
                  <option value={2}>2 - Poor</option>
                  <option value={1}>1 - Bad</option>
                </select>
                <input
                  value={reviewForm.title}
                  onChange={(event) =>
                    setReviewForm((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Review title (optional)"
                  className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                />
              </div>
              <textarea
                rows={4}
                value={reviewForm.comment}
                onChange={(event) =>
                  setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
                }
                placeholder="Share your experience with this store"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-lg font-semibold text-black">Contact Vendor</h2>
              {vendor.contactFormEnabled === false ? (
                <p className="mt-3 text-sm text-gray-600">
                  This vendor has disabled the contact form.
                </p>
              ) : (
                <form onSubmit={submitContact} className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <input
                      value={contactForm.name}
                      onChange={(event) =>
                        setContactForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Your name"
                      className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                    <input
                      value={contactForm.email}
                      onChange={(event) =>
                        setContactForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="Your email"
                      className="rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                    />
                  </div>
                  <input
                    value={contactForm.phone}
                    onChange={(event) =>
                      setContactForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="Phone (optional)"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  />
                  <input
                    value={contactForm.subject}
                    onChange={(event) =>
                      setContactForm((prev) => ({ ...prev, subject: event.target.value }))
                    }
                    placeholder="Subject"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  />
                  <textarea
                    rows={4}
                    value={contactForm.message}
                    onChange={(event) =>
                      setContactForm((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="Write your message"
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-black"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="inline-flex items-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingMessage ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {hasPolicies ? (
              <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-black">Store Policies</h2>
                <div className="mt-4 space-y-4 text-sm">
                  {vendor.storePolicies?.shippingPolicy ? (
                    <div>
                      <h3 className="font-semibold text-gray-900">Shipping Policy</h3>
                      {renderRichText(
                        vendor.storePolicies.shippingPolicy,
                        "mt-1 leading-6 text-gray-600",
                      )}
                    </div>
                  ) : null}
                  {vendor.storePolicies?.refundPolicy ? (
                    <div>
                      <h3 className="font-semibold text-gray-900">Refund Policy</h3>
                      {renderRichText(
                        vendor.storePolicies.refundPolicy,
                        "mt-1 leading-6 text-gray-600",
                      )}
                    </div>
                  ) : null}
                  {vendor.storePolicies?.privacyPolicy ? (
                    <div>
                      <h3 className="font-semibold text-gray-900">Privacy Policy</h3>
                      {renderRichText(
                        vendor.storePolicies.privacyPolicy,
                        "mt-1 leading-6 text-gray-600",
                      )}
                    </div>
                  ) : null}
                  {vendor.storePolicies?.termsConditions ? (
                    <div>
                      <h3 className="font-semibold text-gray-900">Terms and Conditions</h3>
                      {renderRichText(
                        vendor.storePolicies.termsConditions,
                        "mt-1 leading-6 text-gray-600",
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            {vendor.locationMapUrl ? (
              <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-sm md:p-6">
                <h2 className="text-lg font-semibold text-black">Store Location</h2>
                <a
                  href={vendor.locationMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-full border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-black hover:text-black"
                >
                  <FiMapPin className="h-4 w-4" />
                  Open store map
                </a>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorStore;

