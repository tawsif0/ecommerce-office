/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaTrash, FaArrowLeft, FaShoppingBag } from "react-icons/fa";
import { FiMinus, FiPlus } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import ConfirmModal from "../../components/ConfirmModal";

const baseUrl = import.meta.env.VITE_API_URL;
const COUPON_STORAGE_KEY = "appliedCoupon";

const resolveImageValue = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;
  if (Array.isArray(value)) return resolveImageValue(value[0]);

  if (typeof value === "object") {
    return (
      value.data ||
      value.url ||
      value.secure_url ||
      value.src ||
      value.path ||
      ""
    );
  }

  return "";
};

const getFullImageUrl = (imagePath) => {
  const resolvedPath = resolveImageValue(imagePath);
  if (!resolvedPath) return null;

  if (
    resolvedPath.startsWith("http://") ||
    resolvedPath.startsWith("https://") ||
    resolvedPath.startsWith("data:")
  ) {
    return resolvedPath;
  }

  if (resolvedPath.startsWith("/")) {
    return baseUrl ? `${baseUrl}${resolvedPath}` : resolvedPath;
  }

  return baseUrl
    ? `${baseUrl}/uploads/products/${resolvedPath}`
    : `/uploads/products/${resolvedPath}`;
};

const FallbackImage = ({ className, alt }) => (
  <div className={`${className} bg-gray-100 flex items-center justify-center`}>
    <span className="text-xs text-gray-500">{alt || "No image"}</span>
  </div>
);

const ProductImage = ({ src, alt, className }) => {
  const [imgSrc, setImgSrc] = useState(getFullImageUrl(src));
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setImgSrc(getFullImageUrl(src));
    setHasError(false);
  }, [src]);

  const handleError = () => {
    setHasError(true);
  };

  if (hasError || !imgSrc) {
    return <FallbackImage className={className} alt={alt} />;
  }

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      onError={handleError}
      crossOrigin={
        imgSrc?.startsWith("http://") || imgSrc?.startsWith("https://")
          ? "anonymous"
          : undefined
      }
    />
  );
};

const AddToCart = () => {
  const navigate = useNavigate();
  const {
    cartItems,
    cartCount,
    isLoading,
    updateCartItem,
    removeCartItem,
    getCartSubtotal,
  } = useCart();

  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const subtotal = getCartSubtotal();
  const discount = Math.min(
    Number(appliedCoupon?.discount || 0),
    Number(subtotal || 0),
  );
  const total = Math.max(subtotal - discount, 0);

  const clearAppliedCoupon = (showToast = false) => {
    setAppliedCoupon(null);
    localStorage.removeItem(COUPON_STORAGE_KEY);

    if (showToast) {
      toast.success("Coupon removed");
    }
  };

  useEffect(() => {
    const savedCoupon = localStorage.getItem(COUPON_STORAGE_KEY);
    if (!savedCoupon) return;

    try {
      const parsedCoupon = JSON.parse(savedCoupon);
      if (parsedCoupon?.code) {
        setAppliedCoupon(parsedCoupon);
        setCouponCode(parsedCoupon.code);
      }
    } catch (error) {
      localStorage.removeItem(COUPON_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (cartItems.length === 0 && appliedCoupon) {
      clearAppliedCoupon(false);
    }
  }, [cartItems.length, appliedCoupon]);

  const handleUpdateCartItem = async (
    productId,
    newQuantity,
    color = "",
    dimensions = "",
    variationId = "",
  ) => {
    const lineKey = `${productId}-${variationId || ""}-${color || ""}-${dimensions || ""}`;
    setUpdatingItemId(lineKey);
    try {
      await updateCartItem(productId, newQuantity, color, dimensions, variationId);
    } catch (error) {
      console.error("Error updating cart item:", error);
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleRemoveCartItem = (
    productId,
    color = "",
    dimensions = "",
    variationId = "",
    title = "",
  ) => {
    setRemoveConfirm({ productId, color, dimensions, variationId, title });
  };

  const confirmRemoveCartItem = async () => {
    if (!removeConfirm) return;

    setIsRemoving(true);
    try {
      await removeCartItem(
        removeConfirm.productId,
        removeConfirm.color,
        removeConfirm.dimensions,
        removeConfirm.variationId,
      );
    } catch (error) {
      console.error("Error removing cart item:", error);
    } finally {
      setIsRemoving(false);
      setRemoveConfirm(null);
    }
  };

  const applyCoupon = async (inputCode = couponCode, silent = false) => {
    const normalizedCode = String(inputCode || "").trim().toUpperCase();

    if (!normalizedCode) {
      if (!silent) toast.error("Please enter a coupon code");
      return false;
    }

    if (subtotal <= 0) {
      if (!silent) toast.error("Cart subtotal must be greater than zero");
      return false;
    }

    setIsApplyingCoupon(true);
    try {
      const couponItems = cartItems
        .map((item) => {
          const product = typeof item.product === "object" ? item.product : null;
          const productId = item.productId || product?._id || item.product;
          if (!productId) return null;

          return {
            productId,
            quantity: Number(item.quantity || 1),
            price: Number(
              item.unitPrice ??
                item.price ??
                product?.salePrice ??
                product?.price ??
                0,
            ),
            vendor:
              item.vendor ||
              product?.vendor?._id ||
              product?.vendor ||
              null,
          };
        })
        .filter(Boolean);

      const response = await axios.post(`${baseUrl}/coupons/apply`, {
        code: normalizedCode,
        subtotal,
        items: couponItems,
      });

      const discountValue = Number(response.data?.discount || 0);
      const couponData = {
        code: response.data?.code || normalizedCode,
        discount: discountValue,
        finalAmount: Number(response.data?.finalAmount || subtotal - discountValue),
      };

      setAppliedCoupon(couponData);
      setCouponCode(couponData.code);
      localStorage.setItem(COUPON_STORAGE_KEY, JSON.stringify(couponData));

      if (!silent) {
        toast.success("Coupon applied successfully");
      }

      return true;
    } catch (error) {
      if (!silent) {
        toast.error(error.response?.data?.message || "Failed to apply coupon");
      }
      return false;
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  useEffect(() => {
    if (!appliedCoupon?.code || subtotal <= 0) return;

    let isCancelled = false;

    const refreshCoupon = async () => {
      const isValid = await applyCoupon(appliedCoupon.code, true);
      if (!isValid && !isCancelled) {
        clearAppliedCoupon(false);
      }
    };

    refreshCoupon();

    return () => {
      isCancelled = true;
    };
  }, [subtotal]);

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    navigate("/checkout");
  };

  const getItemData = (item) => {
    const product = typeof item.product === "object" ? item.product : null;
    return {
      productId: item.productId || product?._id || item.product,
      title: item.title || product?.title || "Product",
      price: Number(
        item.unitPrice ??
          item.price ??
          product?.salePrice ??
          product?.price ??
          0,
      ),
      image: resolveImageValue(
        item.image || product?.images?.[0] || product?.image || "",
      ),
      quantity: Number(item.quantity || 1),
      color: item.color || "",
      dimensions: item.dimensions || "",
      variationId: String(item.variationId || "").trim(),
      variationLabel: String(item.variationLabel || "").trim(),
    };
  };

  if (isLoading) {
    return (
      <section className="min-h-screen bg-white py-10">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gray-100 rounded-full mb-4">
            <FaShoppingBag className="w-6 h-6 text-gray-400 animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Loading cart...</h3>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-white py-8 md:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate("/shop")}
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-8 transition-colors group"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Shopping</span>
        </button>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center">
            <FaShoppingBag className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-black">Your Cart ({cartCount})</h1>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">
            <p className="text-gray-600 mb-4">Your cart is empty.</p>
            <button
              onClick={() => navigate("/shop")}
              className="px-5 py-2 bg-black text-white rounded-lg"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const itemData = getItemData(item);
                const key = `${itemData.productId}-${itemData.variationId || ""}-${itemData.color || ""}-${itemData.dimensions || ""}`;
                return (
                  <div
                    key={key}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex gap-4"
                  >
                    <ProductImage
                      src={itemData.image}
                      alt={itemData.title}
                      className="w-24 h-24 object-cover rounded-lg"
                    />

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{itemData.title}</h3>
                      <p className="text-sm text-gray-500 mt-1">Price: {itemData.price} TK</p>
                      {itemData.variationLabel && (
                        <p className="text-sm text-gray-500">
                          Variant: {itemData.variationLabel}
                        </p>
                      )}
                      {itemData.color && (
                        <p className="text-sm text-gray-500">Color: {itemData.color}</p>
                      )}
                      {itemData.dimensions && (
                        <p className="text-sm text-gray-500">Size: {itemData.dimensions}</p>
                      )}

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() =>
                              handleUpdateCartItem(
                                itemData.productId,
                                Math.max(1, itemData.quantity - 1),
                                itemData.color,
                                itemData.dimensions,
                                itemData.variationId,
                              )
                            }
                            className="px-3 py-2 hover:bg-gray-50"
                            disabled={updatingItemId === key}
                          >
                            <FiMinus />
                          </button>
                          <span className="px-3 py-2 text-sm font-medium">{itemData.quantity}</span>
                          <button
                            onClick={() =>
                              handleUpdateCartItem(
                                itemData.productId,
                                itemData.quantity + 1,
                                itemData.color,
                                itemData.dimensions,
                                itemData.variationId,
                              )
                            }
                            className="px-3 py-2 hover:bg-gray-50"
                            disabled={updatingItemId === key}
                          >
                            <FiPlus />
                          </button>
                        </div>

                        <button
                          onClick={() =>
                            handleRemoveCartItem(
                              itemData.productId,
                              itemData.color,
                              itemData.dimensions,
                              itemData.variationId,
                              itemData.title,
                            )
                          }
                          className="text-red-500 hover:text-red-600"
                          title="Remove item"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 h-fit">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Items</span>
                  <span className="font-medium">{cartCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-semibold">{subtotal.toFixed(2)} TK</span>
                </div>

                <div className="pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex gap-2">
                    <input
                      value={couponCode}
                      onChange={(event) => setCouponCode(event.target.value)}
                      placeholder="Coupon code"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                    <button
                      onClick={() => applyCoupon()}
                      disabled={isApplyingCoupon}
                      className="px-3 py-2 bg-gray-900 text-white rounded-lg text-sm disabled:opacity-60"
                    >
                      {isApplyingCoupon ? "Applying..." : "Apply"}
                    </button>
                  </div>

                  {appliedCoupon?.code && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-green-600 font-medium">
                        Applied: {appliedCoupon.code}
                      </span>
                      <button
                        onClick={() => clearAppliedCoupon(true)}
                        className="text-red-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Discount</span>
                    <span className="font-semibold text-green-600">
                      -{discount.toFixed(2)} TK
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-200 pt-2 text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold">{total.toFixed(2)} TK</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="mt-5 w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!removeConfirm}
        title="Remove item"
        message={`Are you sure you want to remove "${removeConfirm?.title || "this item"}" from your cart?`}
        confirmText={isRemoving ? "Removing..." : "Remove"}
        cancelText="Cancel"
        onConfirm={confirmRemoveCartItem}
        onCancel={() => setRemoveConfirm(null)}
        isLoading={isRemoving}
        danger
      />
    </section>
  );
};

export default AddToCart;
