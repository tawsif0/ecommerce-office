/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiChevronLeft } from "react-icons/fi";
import axios from "axios";
import { toast } from "react-hot-toast";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../hooks/useAuth";

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

const normalizePaymentMethodValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object") {
    return String(value.type || value.name || value.method || "").trim();
  }
  return "";
};

const isGatewayPaymentMethod = (method) =>
  ["stripe", "paypal", "sslcommerz"].includes(
    String(method?.channelType || "").trim().toLowerCase(),
  );

const normalizeBangladeshPhone = (value) => {
  const sanitized = String(value || "").trim().replace(/[^\d+]/g, "");
  if (sanitized.startsWith("+88")) return `0${sanitized.slice(3)}`;
  if (sanitized.startsWith("880")) return `0${sanitized.slice(3)}`;
  if (!sanitized.startsWith("0")) return `0${sanitized}`;
  return sanitized;
};

const isValidBangladeshPhone = (value) => /^01[3-9]\d{8}$/.test(value);

const ProductImage = ({ src, alt, className }) => {
  const [imageSrc, setImageSrc] = useState(getFullImageUrl(src));

  useEffect(() => {
    setImageSrc(getFullImageUrl(src));
  }, [src]);

  if (!imageSrc) {
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-100 text-xs text-gray-400`}
      >
        No image
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={className}
      onError={() => setImageSrc("")}
    />
  );
};

const CheckOut = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart, getCartSubtotal } = useCart();
  const { isLoggedIn, user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [isEstimatingShipping, setIsEstimatingShipping] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingEstimate, setShippingEstimate] = useState(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: user?.email || "",
    phone: user?.phone || user?.originalPhone || "",
    address: "",
    city: "",
    district: "",
    postalCode: "",
    country: "Bangladesh",
    notes: "",
    agreeTerms: false,
  });

  const subtotal = getCartSubtotal();
  const selectedPaymentMethod = useMemo(
    () =>
      paymentMethods.find(
        (method) => String(method?._id || "") === String(selectedPaymentMethodId || ""),
      ) || null,
    [paymentMethods, selectedPaymentMethodId],
  );
  const paymentMethodValue = normalizePaymentMethodValue(selectedPaymentMethod);
  const paymentMethodChannel = String(
    selectedPaymentMethod?.channelType || "manual",
  ).toLowerCase();
  const requiresTransactionProof =
    selectedPaymentMethod?.requiresTransactionProof === undefined
      ? true
      : Boolean(selectedPaymentMethod?.requiresTransactionProof);
  const selectedPaymentAccount = String(selectedPaymentMethod?.accountNo || "").trim();
  const isExternalGateway = isGatewayPaymentMethod(selectedPaymentMethod);

  const discount = Math.min(
    Number(appliedCoupon?.discount || 0),
    Number(subtotal || 0),
  );
  const total = Math.max(subtotal + shippingFee - discount, 0);

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

  const getShippingItemsPayload = () =>
    cartItems
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

  const clearAppliedCoupon = (showToast = false) => {
    setAppliedCoupon(null);
    localStorage.removeItem(COUPON_STORAGE_KEY);

    if (showToast) {
      toast.success("Coupon removed");
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

  const estimateShipping = async (addressData = formData, silent = true) => {
    if (cartItems.length === 0) {
      setShippingFee(0);
      setShippingEstimate(null);
      return { success: true, shippingFee: 0, shippingMeta: {} };
    }

    setIsEstimatingShipping(true);
    try {
      const response = await axios.post(`${baseUrl}/shipping/estimate`, {
        items: getShippingItemsPayload(),
        city: String(addressData?.city || "").trim(),
        district: String(addressData?.district || "").trim(),
        country: String(addressData?.country || "Bangladesh").trim(),
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Shipping estimate failed");
      }

      const fee = Number(response.data.shippingFee || 0);
      setShippingFee(fee);
      setShippingEstimate(response.data);

      return {
        success: true,
        shippingFee: fee,
        shippingMeta: {
          breakdown: response.data.breakdown || [],
          estimatedMinDays: response.data.estimatedMinDays || 0,
          estimatedMaxDays: response.data.estimatedMaxDays || 0,
          destination: response.data.destination || {},
        },
      };
    } catch (error) {
      setShippingFee(0);
      setShippingEstimate(null);
      if (!silent) {
        toast.error(
          error.response?.data?.message || "Failed to estimate shipping fee",
        );
      }
      return { success: false, shippingFee: 0, shippingMeta: {} };
    } finally {
      setIsEstimatingShipping(false);
    }
  };

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

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

  useEffect(() => {
    if (cartItems.length === 0 && appliedCoupon) {
      clearAppliedCoupon(false);
    }
  }, [cartItems.length, appliedCoupon]);

  useEffect(() => {
    if (cartItems.length === 0) {
      setShippingFee(0);
      setShippingEstimate(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      estimateShipping(formData, true);
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [cartItems, formData.city, formData.district, formData.country]);

  const fetchPaymentMethods = async () => {
    try {
      const response = await axios.get(`${baseUrl}/auth/payment-methods`);
      const methods = response.data || [];
      setPaymentMethods(methods);

      if (methods.length > 0) {
        setSelectedPaymentMethodId(String(methods[0]?._id || ""));
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      toast.error("Failed to load payment methods");
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    const resolvedMethod = selectedPaymentMethod || paymentMethods[0] || null;
    const resolvedPaymentMethodValue =
      paymentMethodValue || normalizePaymentMethodValue(resolvedMethod);
    const resolvedRequiresProof =
      resolvedMethod?.requiresTransactionProof === undefined
        ? true
        : Boolean(resolvedMethod?.requiresTransactionProof);
    const resolvedChannelType = String(
      resolvedMethod?.channelType || "manual",
    ).toLowerCase();
    const resolvedAccountNo = String(
      resolvedMethod?.accountNo || resolvedMethod?.accountNumber || "",
    ).trim();
    const normalizedPhone = normalizeBangladeshPhone(formData.phone);

    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return;
    }

    if (!formData.firstName || !formData.lastName || !formData.address || !formData.city || !formData.district || !formData.postalCode || !formData.phone || !formData.email) {
      toast.error("Please fill all required fields");
      return;
    }

    if (!isValidBangladeshPhone(normalizedPhone)) {
      toast.error("Please enter a valid Bangladesh phone number (01XXXXXXXXX)");
      return;
    }

    if (!resolvedPaymentMethodValue) {
      toast.error("Please select a payment method");
      return;
    }

    if (resolvedRequiresProof && !transactionId.trim()) {
      toast.error("Transaction ID is required");
      return;
    }

    if (!formData.agreeTerms) {
      toast.error("Please accept terms and conditions");
      return;
    }

    try {
      setLoading(true);

      if (appliedCoupon?.code) {
        const isCouponValid = await applyCoupon(appliedCoupon.code, true);
        if (!isCouponValid) {
          clearAppliedCoupon(false);
          toast.error("Applied coupon is no longer valid");
          return;
        }
      }

      const shippingResult = await estimateShipping(formData, false);
      if (!shippingResult.success) {
        return;
      }

      const finalShippingFee = Number(shippingResult.shippingFee || 0);
      const finalTotal = Math.max(subtotal + finalShippingFee - discount, 0);

      const payload = {
        shippingAddress: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: normalizedPhone,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          postalCode: formData.postalCode,
          country: "Bangladesh",
          notes: formData.notes,
        },
        items: cartItems.map((item) => {
          const itemData = getItemData(item);
          return {
            product: itemData.productId,
            productId: itemData.productId,
            quantity: itemData.quantity,
            price: itemData.price,
            variationId: itemData.variationId || "",
            variationLabel: itemData.variationLabel || "",
            color: itemData.color,
            dimensions: itemData.dimensions,
            title: itemData.title,
          };
        }),
        subtotal,
        shippingFee: finalShippingFee,
        shippingMeta: shippingResult.shippingMeta,
        discount,
        total: finalTotal,
        couponCode: appliedCoupon?.code || "",
        paymentMethodId: resolvedMethod?._id || "",
        paymentMethod: resolvedPaymentMethodValue,
        paymentDetails: {
          method: resolvedPaymentMethodValue,
          accountNo: resolvedAccountNo,
          transactionId: resolvedRequiresProof ? transactionId.trim() : "",
          sentTo: resolvedAccountNo,
          meta: {
            channelType: resolvedChannelType,
          },
        },
      };

      const endpoint = isLoggedIn ? "/orders" : "/orders/guest-checkout";
      const token = localStorage.getItem("token");

      const response = await axios.post(`${baseUrl}${endpoint}`, payload, {
        headers: isLoggedIn && token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.data?.success) {
        throw new Error(response.data?.message || "Order failed");
      }

      const order = response.data.order;
      const paymentRedirectUrl = String(response.data?.paymentRedirectUrl || "").trim();

      if (!isLoggedIn && order) {
        const previous = JSON.parse(localStorage.getItem("guestOrders") || "[]");
        localStorage.setItem("guestOrders", JSON.stringify([order, ...previous]));
        localStorage.setItem("lastOrder", JSON.stringify(order));
      }

      await clearCart();
      localStorage.removeItem(COUPON_STORAGE_KEY);
      setAppliedCoupon(null);

      if (paymentRedirectUrl) {
        toast.success("Redirecting to payment gateway...");
        window.location.href = paymentRedirectUrl;
        return;
      }

      toast.success("Order placed successfully");
      navigate("/thank-you", { state: { orderId: order?._id, order } });
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <section className="min-h-screen bg-white py-10">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-gray-600 mb-4">Your cart is empty.</p>
          <button
            onClick={() => navigate("/shop")}
            className="px-5 py-2 bg-black text-white rounded-lg"
          >
            Go to Shop
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-white py-8 md:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate("/cart")}
          className="flex items-center gap-2 text-gray-600 hover:text-black mb-6"
        >
          <FiChevronLeft />
          Back to cart
        </button>

        <h1 className="text-3xl font-bold text-black mb-6">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleSubmitOrder}
            className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5 space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="First name*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Last name*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Email*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
              <input
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Phone*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
            </div>

            <input
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Address*"
              className="w-full px-3 py-3 border border-gray-200 rounded-lg"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                name="city"
                value={formData.city}
                onChange={handleInputChange}
                placeholder="City*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
              <input
                name="district"
                value={formData.district}
                onChange={handleInputChange}
                placeholder="District*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
              <input
                name="postalCode"
                value={formData.postalCode}
                onChange={handleInputChange}
                placeholder="Postal code*"
                className="px-3 py-3 border border-gray-200 rounded-lg"
              />
            </div>

            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Order notes (optional)"
              className="w-full px-3 py-3 border border-gray-200 rounded-lg"
            />

            <div className="border border-gray-200 rounded-lg p-4 space-y-3">
              <p className="font-semibold text-gray-900">Payment Method</p>

              <div className="space-y-2">
                {paymentMethods.map((method) => {
                  const methodValue = normalizePaymentMethodValue(method);
                  const accountValue = String(
                    method?.accountNo || method?.accountNumber || "",
                  ).trim();
                  const channelType = String(method?.channelType || "manual").toLowerCase();
                  const methodRequiresProof =
                    method?.requiresTransactionProof === undefined
                      ? true
                      : Boolean(method?.requiresTransactionProof);

                  return (
                    <label
                      key={method._id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={selectedPaymentMethodId === String(method?._id || "")}
                          onChange={() => {
                            setSelectedPaymentMethodId(String(method?._id || ""));
                          }}
                        />
                        <div>
                          <span className="font-medium">{methodValue}</span>
                          <p className="text-[11px] text-gray-500">
                            {channelType.toUpperCase()}
                            {methodRequiresProof ? " - Manual Proof Required" : ""}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm text-gray-600">{accountValue}</span>
                    </label>
                  );
                })}
              </div>

              {selectedPaymentMethod?.instructions && (
                <p className="text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded-lg p-2.5">
                  {selectedPaymentMethod.instructions}
                </p>
              )}

              {requiresTransactionProof ? (
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Transaction ID*"
                  className="w-full px-3 py-3 border border-gray-200 rounded-lg"
                />
              ) : (
                <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
                  {isExternalGateway
                    ? "You will be redirected to secure payment gateway after placing order."
                    : "No transaction ID needed for this payment method."}
                </p>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleInputChange}
              />
              I agree to the terms and conditions
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-black text-white rounded-lg font-semibold hover:bg-gray-900 disabled:opacity-60"
            >
              {loading
                ? "Processing..."
                : isExternalGateway
                  ? "Proceed to Payment"
                  : "Place Order"}
            </button>
          </form>

          <div className="bg-white border border-gray-200 rounded-xl p-5 h-fit">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>

            <div className="space-y-3 max-h-72 overflow-auto pr-1">
              {cartItems.map((item) => {
                const itemData = getItemData(item);
                return (
                <div
                  key={`${itemData.productId}-${itemData.variationId || ""}-${itemData.color || ""}-${itemData.dimensions || ""}`}
                  className="flex gap-3"
                >
                  <ProductImage
                    src={itemData.image}
                    alt={itemData.title}
                    className="w-14 h-14 rounded-md object-cover bg-gray-100"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{itemData.title}</p>
                    {itemData.variationLabel && (
                      <p className="text-xs text-gray-500">
                        Variant: {itemData.variationLabel}
                      </p>
                    )}
                    <p className="text-xs text-gray-500">Qty: {itemData.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {(itemData.price * itemData.quantity).toFixed(2)} TK
                  </p>
                </div>
              )})}
            </div>

            <div className="border-t border-gray-200 mt-4 pt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{subtotal.toFixed(2)} TK</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Shipping</span>
                <span className="font-medium">
                  {isEstimatingShipping ? "Calculating..." : `${shippingFee.toFixed(2)} TK`}
                </span>
              </div>
              {shippingEstimate?.estimatedMaxDays > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Estimated Delivery</span>
                  <span className="font-medium">
                    {shippingEstimate.estimatedMinDays > 0
                      ? `${shippingEstimate.estimatedMinDays}-${shippingEstimate.estimatedMaxDays} days`
                      : `${shippingEstimate.estimatedMaxDays} days`}
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 space-y-2">
                <div className="flex gap-2">
                  <input
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="Coupon code"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    type="button"
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
                      type="button"
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
                  <span className="font-medium text-green-600">
                    -{discount.toFixed(2)} TK
                  </span>
                </div>
              )}

              <div className="flex justify-between text-base font-semibold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>{total.toFixed(2)} TK</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CheckOut;
