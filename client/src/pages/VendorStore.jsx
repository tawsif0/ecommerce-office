import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiClock,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiStar,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";
import { getProductPricingDisplay } from "../utils/productPricing";

const baseUrl = import.meta.env.VITE_API_URL;

const fallbackBanner =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";

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
    return `${baseUrl}${imagePath}`;
  }
  return `${baseUrl}/uploads/products/${imagePath}`;
};

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
  const { user, isLoggedIn } = useAuth();

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

  const hasPolicies = useMemo(() => {
    const policies = vendor?.storePolicies || {};
    return Boolean(
      policies.shippingPolicy ||
        policies.refundPolicy ||
        policies.privacyPolicy ||
        policies.termsConditions,
    );
  }, [vendor]);

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

  const fetchStore = async () => {
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
  };

  const fetchReviews = async () => {
    try {
      setReviewLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/${slug}/reviews`);
      setReviews(response.data?.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    fetchStore();
    fetchReviews();
  }, [slug]);

  useEffect(() => {
    if (!vendor) return undefined;

    const previousTitle = document.title;
    const descriptionTag = document.querySelector('meta[name="description"]');
    const previousDescription = descriptionTag?.getAttribute("content");

    document.title =
      String(vendor.seoTitle || "").trim() || `${vendor.storeName} | Vendor Store`;

    if (descriptionTag && String(vendor.seoDescription || "").trim()) {
      descriptionTag.setAttribute("content", String(vendor.seoDescription).trim());
    }

    return () => {
      document.title = previousTitle;
      if (descriptionTag && previousDescription !== null) {
        descriptionTag.setAttribute("content", previousDescription);
      }
    };
  }, [vendor]);

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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-gray-200 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <section className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center max-w-lg">
          <h1 className="text-2xl font-semibold text-black mb-2">Store not found</h1>
          <p className="text-gray-600 mb-5">This vendor store may be unavailable.</p>
          <Link to="/shop" className="px-4 py-2 bg-black text-white rounded-lg text-sm">
            Browse Shop
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-white pb-12">
      <div className="h-56 md:h-72 relative overflow-hidden">
        <img
          src={getFullVendorMediaUrl(vendor.banner) || fallbackBanner}
          alt={vendor.storeName}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-10 space-y-8">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-7 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {vendor.logo ? (
                <img
                  src={getFullVendorMediaUrl(vendor.logo)}
                  alt={vendor.storeName}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-black">{vendor.storeName}</h1>
              <p className="text-gray-600 mt-1">{vendor.description || "Marketplace vendor"}</p>

              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1">{renderStars(vendor.ratingAverage || 0)}</div>
                <span className="text-sm text-gray-600">
                  {Number(vendor.ratingAverage || 0).toFixed(1)} ({vendor.ratingCount || 0} reviews)
                </span>
              </div>

              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                {vendor.city && (
                  <span className="inline-flex items-center gap-1">
                    <FiMapPin className="w-4 h-4" />
                    {vendor.city}
                  </span>
                )}
                {vendor.openingHours && (
                  <span className="inline-flex items-center gap-1">
                    <FiClock className="w-4 h-4" />
                    {vendor.openingHours}
                  </span>
                )}
                {vendor.phone && (
                  <span className="inline-flex items-center gap-1">
                    <FiPhone className="w-4 h-4" />
                    {vendor.phone}
                  </span>
                )}
                {vendor.email && (
                  <span className="inline-flex items-center gap-1">
                    <FiMail className="w-4 h-4" />
                    {vendor.email}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <FiPackage className="w-4 h-4" />
                  {products.length} products
                </span>
              </div>
            </div>
          </div>
        </div>

        {vendor.vacationMode && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
            <p className="font-semibold">This store is currently on vacation mode.</p>
            <p className="text-sm mt-1">
              Products can be viewed, but checkout may be temporarily unavailable.
            </p>
          </div>
        )}

        <div>
          <h2 className="text-xl font-semibold text-black mb-4">Store Products</h2>
          {products.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
              <p className="text-gray-600">No products available in this store.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => {
                const previewColors = Array.isArray(product.colors)
                  ? product.colors.slice(0, 4)
                  : [];
                const hasMoreColors =
                  Array.isArray(product.colors) && product.colors.length > 4;
                const pricing = getProductPricingDisplay(product);

                return (
                  <Link
                    key={product._id}
                    to={`/product/${product._id}`}
                    className="group bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col h-[300px] sm:h-[330px]"
                  >
                    <div className="aspect-square bg-gray-100">
                      {product.images?.[0] ? (
                        <img
                          src={getFullImageUrl(product.images[0]?.data || product.images[0])}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : null}
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                          {product.title}
                        </h3>
                        {previewColors.length > 0 ? (
                          <div className="flex items-center gap-1">
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
                      </div>
                      {pricing.isTba ? (
                        <p className="text-sm font-semibold text-black mt-auto">TBA</p>
                      ) : pricing.hasDiscount ? (
                        <p className="text-sm font-semibold text-black mt-auto flex items-baseline gap-2">
                          <span className="text-xs text-gray-400 line-through font-medium">
                            {Number(pricing.previousPrice || 0).toFixed(2)} TK
                          </span>
                          <span>{Number(pricing.currentPrice || 0).toFixed(2)} TK</span>
                        </p>
                      ) : (
                        <p className="text-sm font-semibold text-black mt-auto">
                          {Number(pricing.currentPrice || 0).toFixed(2)} TK
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
            <h2 className="text-lg font-semibold text-black mb-4">Store Reviews</h2>
            {reviewLoading ? (
              <p className="text-gray-600">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="text-gray-600">No reviews yet.</p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-auto pr-1">
                {reviews.map((review) => (
                  <div key={review._id} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {review.user?.name || review.reviewerName || "Customer"}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          {renderStars(review.rating || 0)}
                        </div>
                      </div>
                      {review.verifiedPurchase && (
                        <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-700">
                          Verified Purchase
                        </span>
                      )}
                    </div>
                    {review.title && (
                      <p className="text-sm font-semibold text-gray-900 mt-2">{review.title}</p>
                    )}
                    <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={submitReview} className="mt-4 border-t border-gray-200 pt-4 space-y-3">
              <h3 className="text-sm font-semibold text-black">Write a review</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <select
                  value={reviewForm.rating}
                  onChange={(event) =>
                    setReviewForm((prev) => ({ ...prev, rating: Number(event.target.value) }))
                  }
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
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
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <textarea
                rows={3}
                value={reviewForm.comment}
                onChange={(event) =>
                  setReviewForm((prev) => ({ ...prev, comment: event.target.value }))
                }
                placeholder="Share your experience with this store"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
              <h2 className="text-lg font-semibold text-black mb-4">Contact Vendor</h2>
              {vendor.contactFormEnabled === false ? (
                <p className="text-gray-600 text-sm">This vendor has disabled contact form.</p>
              ) : (
                <form onSubmit={submitContact} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input
                      value={contactForm.name}
                      onChange={(event) =>
                        setContactForm((prev) => ({ ...prev, name: event.target.value }))
                      }
                      placeholder="Your name"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <input
                      value={contactForm.email}
                      onChange={(event) =>
                        setContactForm((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="Your email"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <input
                    value={contactForm.phone}
                    onChange={(event) =>
                      setContactForm((prev) => ({ ...prev, phone: event.target.value }))
                    }
                    placeholder="Phone (optional)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <input
                    value={contactForm.subject}
                    onChange={(event) =>
                      setContactForm((prev) => ({ ...prev, subject: event.target.value }))
                    }
                    placeholder="Subject"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <textarea
                    rows={4}
                    value={contactForm.message}
                    onChange={(event) =>
                      setContactForm((prev) => ({ ...prev, message: event.target.value }))
                    }
                    placeholder="Write your message"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    type="submit"
                    disabled={sendingMessage}
                    className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium disabled:opacity-60"
                  >
                    {sendingMessage ? "Sending..." : "Send Message"}
                  </button>
                </form>
              )}
            </div>

            {hasPolicies && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <h2 className="text-lg font-semibold text-black mb-4">Store Policies</h2>
                <div className="space-y-3 text-sm">
                  {vendor.storePolicies?.shippingPolicy && (
                    <div>
                      <h3 className="font-semibold text-gray-900">Shipping Policy</h3>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                        {vendor.storePolicies.shippingPolicy}
                      </p>
                    </div>
                  )}
                  {vendor.storePolicies?.refundPolicy && (
                    <div>
                      <h3 className="font-semibold text-gray-900">Refund Policy</h3>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                        {vendor.storePolicies.refundPolicy}
                      </p>
                    </div>
                  )}
                  {vendor.storePolicies?.privacyPolicy && (
                    <div>
                      <h3 className="font-semibold text-gray-900">Privacy Policy</h3>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                        {vendor.storePolicies.privacyPolicy}
                      </p>
                    </div>
                  )}
                  {vendor.storePolicies?.termsConditions && (
                    <div>
                      <h3 className="font-semibold text-gray-900">Terms & Conditions</h3>
                      <p className="text-gray-600 mt-1 whitespace-pre-wrap">
                        {vendor.storePolicies.termsConditions}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {vendor.locationMapUrl && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
                <h2 className="text-lg font-semibold text-black mb-3">Store Location</h2>
                <a
                  href={vendor.locationMapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-700 hover:underline"
                >
                  <FiMapPin className="w-4 h-4" />
                  Open store map
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorStore;
