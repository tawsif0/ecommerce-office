import React, { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  FiCheckCircle,
  FiEyeOff,
  FiRefreshCw,
  FiSearch,
  FiStar,
} from "react-icons/fi";
import { useAuth } from "../hooks/useAuth";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const renderStars = (rating = 0) =>
  [...Array(5)].map((_, index) => (
    <FiStar
      key={`review-star-${index}`}
      className={`w-3.5 h-3.5 ${
        index < Math.round(Number(rating || 0))
          ? "text-yellow-500 fill-yellow-500"
          : "text-gray-300"
      }`}
    />
  ));

const AdminVendorReviews = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
  });

  const fetchReviews = useCallback(async (nextPage = 1) => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/vendors/admin/reviews`, {
        headers: getAuthHeaders(),
        params: {
          page: nextPage,
          limit: 20,
          status: statusFilter,
          search: search.trim() || undefined,
        },
      });

      setReviews(response.data?.reviews || []);
      setPagination(
        response.data?.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
        },
      );
      setPage(nextPage);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load reviews");
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (user?.userType === "admin") {
      fetchReviews(1);
    }
  }, [user, fetchReviews]);

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    fetchReviews(1);
  };

  const updateStatus = async (reviewId, isApproved) => {
    try {
      setSavingId(reviewId);
      await axios.patch(
        `${baseUrl}/vendors/admin/reviews/${reviewId}/status`,
        { isApproved },
        { headers: getAuthHeaders() },
      );
      toast.success("Review moderation updated");
      fetchReviews(page);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update review");
    } finally {
      setSavingId("");
    }
  };

  if (user?.userType !== "admin") {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-black mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Only admins can moderate vendor reviews.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-linear-to-r from-slate-900 to-black rounded-xl p-6 md:p-8 text-white">
        <h1 className="text-2xl md:text-3xl font-bold">Vendor Review Moderation</h1>
        <p className="text-slate-200 mt-2">
          Approve or hide vendor store reviews for marketplace quality control.
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 mb-4">
          <form onSubmit={handleSearchSubmit} className="flex-1">
            <div className="flex gap-2 border border-gray-200 rounded-lg px-3 py-2">
              <FiSearch className="w-4 h-4 text-gray-500 mt-1" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search review text, reviewer or title..."
                className="flex-1 outline-none text-sm"
              />
            </div>
          </form>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm"
          >
            <option value="all">All</option>
            <option value="approved">Approved</option>
            <option value="hidden">Hidden</option>
          </select>

          <button
            onClick={() => fetchReviews(page)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {loading ? (
          <p className="text-gray-600">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="text-gray-600">No reviews found.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review._id}
                className="border border-gray-200 rounded-lg p-4 grid grid-cols-1 lg:grid-cols-12 gap-3"
              >
                <div className="lg:col-span-8">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-black">
                      {review.vendor?.storeName || "Vendor Store"}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        review.isApproved
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {review.isApproved ? "Approved" : "Hidden"}
                    </span>
                    {review.verifiedPurchase && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        Verified Purchase
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 mt-1">
                    {renderStars(review.rating || 0)}
                  </div>

                  <p className="text-sm text-gray-700 mt-2">
                    <span className="font-medium">
                      {review.user?.name || review.reviewerName || "Customer"}:
                    </span>{" "}
                    {review.comment}
                  </p>
                  {review.title && (
                    <p className="text-sm text-gray-600 mt-1">
                      <span className="font-medium">Title:</span> {review.title}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    {new Date(review.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="lg:col-span-4 flex lg:justify-end items-start gap-2">
                  <button
                    onClick={() => updateStatus(review._id, true)}
                    disabled={savingId === review._id}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-green-200 text-green-700 disabled:opacity-60"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    onClick={() => updateStatus(review._id, false)}
                    disabled={savingId === review._id}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs rounded-lg border border-gray-200 text-gray-700 disabled:opacity-60"
                  >
                    <FiEyeOff className="w-4 h-4" />
                    Hide
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>Total: {pagination.totalItems || 0}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchReviews(Math.max(1, page - 1))}
              disabled={page <= 1 || loading}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
            >
              Prev
            </button>
            <span>
              Page {pagination.currentPage || 1} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() =>
                fetchReviews(Math.min(pagination.totalPages || 1, page + 1))
              }
              disabled={page >= (pagination.totalPages || 1) || loading}
              className="px-3 py-1.5 border border-gray-200 rounded-lg disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminVendorReviews;
