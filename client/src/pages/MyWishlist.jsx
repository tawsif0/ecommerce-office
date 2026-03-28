import React, { useEffect, useMemo } from "react";
import { FiHeart, FiTrash2 } from "react-icons/fi";
import { FaHeart } from "react-icons/fa6";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { clearWishlist, loadWishlist } from "../store/wishlistSlice";
import StorefrontProductCard from "../Home/components/StorefrontProductCard";

export default function MyWishlist() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const items = useSelector((state) => state.wishlist.items || []);
  const status = useSelector((state) => state.wishlist.status);
  const source = useSelector((state) => state.wishlist.source || "guest");
  const clearStatus = useSelector((state) => state.wishlist.clearStatus);
  const loading = status === "loading" && items.length === 0;
  const clearing = clearStatus === "loading";

  useEffect(() => {
    dispatch(loadWishlist());
  }, [dispatch]);

  const sourceLabel = useMemo(
    () => (source === "auth" ? "Saved to your account" : "Saved on this device"),
    [source],
  );

  const handleClear = async () => {
    try {
      await dispatch(clearWishlist()).unwrap();
      toast.success("Wishlist cleared");
    } catch (error) {
      toast.error(error || "Failed to clear wishlist");
    }
  };

  return (
    <div className="site-shell py-8">
      <div className="app-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mt-1 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white sm:h-11 sm:w-11">
                <FaHeart className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </span>
              <div>
                <h1 className="text-2xl font-black text-black">Wishlist</h1>
                <p className="mt-1 text-sm leading-6 text-gray-600 sm:leading-normal">
                  {sourceLabel}. Logged-in users keep wishlist items in the database, while guests keep them in local storage.
                </p>
              </div>
            </div>
          </div>

          {items.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={clearing}
              className="app-btn-danger px-4 py-2 text-sm disabled:opacity-60"
            >
              <FiTrash2 className="h-4 w-4" />
              {clearing ? "Clearing..." : "Clear Wishlist"}
            </button>
          ) : null}
        </div>

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
            Loading wishlist...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <FiHeart className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="text-gray-600">Your wishlist is empty.</p>
            <Link
              to="/shop"
              className="inline-block mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white"
            >
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="storefront-card-grid pt-6">
            {items.map((product) =>
              product?._id ? (
                <div
                  key={String(product._id)}
                  className="storefront-card-grid__item"
                >
                  <StorefrontProductCard
                    product={product}
                    className="!w-full"
                    onViewDetails={() => {
                      navigate(`/product/${product._id}`);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                </div>
              ) : null,
            )}
          </div>
        )}
      </div>
    </div>
  );
}
