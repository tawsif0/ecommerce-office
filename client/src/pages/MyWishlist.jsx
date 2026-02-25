import React, { useCallback, useEffect, useState } from "react";
import { FiHeart, FiTrash2, FiExternalLink } from "react-icons/fi";
import { Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getProductPricingDisplay } from "../utils/productPricing";

const baseUrl = import.meta.env.VITE_API_URL;

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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

  return baseUrl
    ? `${baseUrl}/uploads/products/${imagePath}`
    : `/uploads/products/${imagePath}`;
};

const toProductPrice = (product) => {
  const pricing = getProductPricingDisplay(product);
  return pricing;
};

export default function MyWishlist() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState("");

  const fetchWishlist = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${baseUrl}/wishlist`, {
        headers: getAuthHeaders(),
      });
      setItems(response.data?.wishlist?.items || []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const handleRemove = async (productId) => {
    try {
      setRemovingId(productId);
      await axios.delete(`${baseUrl}/wishlist/${productId}`, {
        headers: getAuthHeaders(),
      });
      setItems((prev) =>
        prev.filter(
          (entry) => String(entry?.product?._id || entry?.product || "") !== String(productId),
        ),
      );
      toast.success("Removed from wishlist");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to remove item");
    } finally {
      setRemovingId("");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-black">My Wishlist</h1>
        <p className="text-gray-600 mt-1">Saved products for later purchase.</p>
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-600">
          Loading wishlist...
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <FiHeart className="w-10 h-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Your wishlist is empty.</p>
          <Link
            to="/shop"
            className="inline-block mt-4 px-4 py-2 rounded-lg bg-black text-white text-sm"
          >
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((entry, index) => {
            const product = entry?.product;
            if (!product?._id) return null;

            const image = getFullImageUrl(product?.images?.[0]);
            const productId = String(product._id);
            const pricing = toProductPrice(product);

            return (
              <div
                key={`${productId}-${index}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden"
              >
                <Link to={`/product/${productId}`} className="block aspect-square bg-gray-100">
                  {image ? (
                    <img
                      src={image}
                      alt={product.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </Link>
                <div className="p-4 space-y-2">
                  <Link
                    to={`/product/${productId}`}
                    className="font-semibold text-gray-900 line-clamp-2 hover:text-black"
                  >
                    {product.title}
                  </Link>
                  <p className="text-sm text-gray-600">
                    {product?.vendor?.storeName || "Marketplace Product"}
                  </p>
                  <div className="text-base font-bold text-black">
                    {pricing.isTba ? (
                      "TBA"
                    ) : pricing.hasDiscount ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm text-gray-400 line-through font-medium">
                          {Number(pricing.previousPrice || 0).toFixed(2)} TK
                        </span>
                        <span>{Number(pricing.currentPrice || 0).toFixed(2)} TK</span>
                      </div>
                    ) : (
                      `${Number(pricing.currentPrice || 0).toFixed(2)} TK`
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/product/${productId}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50"
                    >
                      <FiExternalLink className="w-4 h-4" />
                      View
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleRemove(productId)}
                      disabled={removingId === productId}
                      className="inline-flex items-center justify-center gap-2 text-sm border border-red-200 text-red-700 rounded-lg px-3 py-2 hover:bg-red-50 disabled:opacity-60"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      {removingId === productId ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
