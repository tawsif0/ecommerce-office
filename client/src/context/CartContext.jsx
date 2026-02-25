/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import axios from "axios";
import { toast } from "react-hot-toast";

const baseUrl = import.meta.env.VITE_API_URL;
const CartContext = createContext();

const resolveEffectiveUnitPrice = (product, variationId = "") => {
  if (!product) return 0;

  const marketplaceType = String(product.marketplaceType || "simple");
  const normalizedVariationId = String(variationId || "").trim();
  if (
    marketplaceType === "variable" &&
    normalizedVariationId &&
    Array.isArray(product.variations)
  ) {
    const selectedVariation =
      product.variations.find(
        (variation) =>
          String(variation?._id || "") === normalizedVariationId &&
          variation?.isActive !== false,
      ) || null;

    if (selectedVariation) {
      const variationSalePrice = Number(selectedVariation.salePrice);
      if (Number.isFinite(variationSalePrice) && variationSalePrice >= 0) {
        return variationSalePrice;
      }
      const variationPrice = Number(selectedVariation.price);
      if (Number.isFinite(variationPrice) && variationPrice >= 0) {
        return variationPrice;
      }
    }
  }

  const priceType = String(product.priceType || "single");
  if (priceType === "best") {
    const salePrice = Number(product.salePrice);
    if (Number.isFinite(salePrice) && salePrice >= 0) {
      return salePrice;
    }
  }

  const regularPrice = Number(product.price);
  if (Number.isFinite(regularPrice) && regularPrice >= 0) {
    return regularPrice;
  }

  return 0;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const updateCartCount = useCallback((items) => {
    const count = Array.isArray(items) ? items.length : 0;
    setCartCount(count);
    window.dispatchEvent(new CustomEvent("cartCountUpdated", { detail: count }));
    return count;
  }, []);

  const loadGuestCart = useCallback(async () => {
    try {
      const guestCart = localStorage.getItem("guestCart");
      let items = guestCart ? JSON.parse(guestCart) : [];

      if (Array.isArray(items) && items.length > 0) {
        const productIds = [
          ...new Set(
            items
              .map((item) => item?.product?._id || item?.productId)
              .map((id) => String(id || "").trim())
              .filter((id) => /^[0-9a-fA-F]{24}$/.test(id)),
          ),
        ];

        const productMap = new Map();
        await Promise.all(
          productIds.map(async (productId) => {
            try {
              const response = await axios.get(`${baseUrl}/products/public/${productId}`);
              const productData =
                response.data?.product || response.data?.data || response.data;
              if (productData?._id) {
                productMap.set(String(productData._id), productData);
              }
            } catch (_error) {
              // Skip invalid products in guest cart refresh.
            }
          }),
        );

        items = items.map((item) => {
          const itemProductId = String(item?.product?._id || item?.productId || "").trim();
          const latestProduct = productMap.get(itemProductId);
          if (!latestProduct) return item;

          const latestPrice = resolveEffectiveUnitPrice(
            latestProduct,
            String(item?.variationId || "").trim(),
          );

          return {
            ...item,
            unitPrice: latestPrice,
            product: {
              ...(item.product || {}),
              _id: latestProduct._id,
              title: latestProduct.title || item?.product?.title,
              price: latestPrice,
              salePrice: latestProduct.salePrice,
              priceType: latestProduct.priceType,
              images: latestProduct.images || item?.product?.images || [],
            },
          };
        });

        localStorage.setItem("guestCart", JSON.stringify(items));
      }

      setCartItems(items);
      updateCartCount(items);
      return items;
    } catch (error) {
      console.error("Error loading guest cart:", error);
      localStorage.removeItem("guestCart");
      setCartItems([]);
      updateCartCount([]);
      return [];
    }
  }, [updateCartCount]);

  const fetchCartFromDatabase = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${baseUrl}/cart`, {
        headers: getAuthHeaders(),
        timeout: 10000,
      });

      if (response.data.success) {
        const items = response.data.cart?.items || [];
        setCartItems(items);
        updateCartCount(items);
        return items;
      }
      return [];
    } catch (err) {
      if (err.response?.status === 401) {
        setIsLoggedIn(false);
        await loadGuestCart();
      } else if (err.response?.status !== 404) {
        console.error("Error fetching cart:", err);
      }
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeaders, updateCartCount, loadGuestCart]);

  const syncGuestCartToDatabase = useCallback(async () => {
    const token = localStorage.getItem("token");
    const guestCart = localStorage.getItem("guestCart");

    if (token && guestCart) {
      try {
        setIsLoading(true);
        const guestItems = JSON.parse(guestCart);

        const syncPromises = guestItems.map((item) =>
          axios.post(
            `${baseUrl}/cart`,
            {
              productId: item.product?._id || item.productId,
              quantity: item.quantity || 1,
              color: item.color || "",
              dimensions: item.dimensions || "",
              variationId: item.variationId || "",
            },
            {
              headers: getAuthHeaders(),
              timeout: 10000,
            },
          ),
        );

        await Promise.all(syncPromises);
        localStorage.removeItem("guestCart");
        await fetchCartFromDatabase();
        toast.success("Cart items synced to your account!");
        return true;
      } catch (error) {
        console.error("Error syncing cart:", error);
        toast.error("Failed to sync cart items. Please try again.");
        return false;
      } finally {
        setIsLoading(false);
      }
    }

    return false;
  }, [fetchCartFromDatabase, getAuthHeaders]);

  const addToCart = useCallback(
    async (product, quantity = 1, color = "", dimensions = "", options = {}) => {
      if (String(product?.priceType || "single") === "tba") {
        const error = "This product is marked as TBA and cannot be purchased right now";
        toast.error(error);
        return { success: false, error };
      }

      const token = localStorage.getItem("token");
      const loggedIn = !!token;
      const normalizedVariationId = String(options?.variationId || "").trim();
      const normalizedVariationLabel = String(options?.variationLabel || "").trim();
      const normalizedUnitPrice = Number(options?.unitPrice);
      const resolvedProductPrice =
        Number.isFinite(normalizedUnitPrice) && normalizedUnitPrice >= 0
          ? normalizedUnitPrice
          : resolveEffectiveUnitPrice(product, normalizedVariationId);

      const cartItem = {
        product: {
          _id: product._id || product.id,
          title: product.title,
          price: resolvedProductPrice,
          images: product.images || [product.image],
        },
        quantity,
        unitPrice: resolvedProductPrice,
        variationId: normalizedVariationId,
        variationLabel: normalizedVariationLabel,
        color,
        dimensions,
        productId: product._id || product.id,
      };

      if (loggedIn) {
        try {
          setIsLoading(true);
          const response = await axios.post(
            `${baseUrl}/cart`,
            {
              productId: product._id || product.id,
              quantity,
              color,
              dimensions,
              variationId: normalizedVariationId,
            },
            {
              headers: getAuthHeaders(),
              timeout: 10000,
            },
          );

          if (response.data.success) {
            const items = response.data.cart?.items || [];
            setCartItems(items);
            updateCartCount(items);
            toast.success("Added to cart!");
            return { success: true, items };
          }

          return { success: false, error: "Failed to add to cart" };
        } catch (err) {
          console.error("Error adding to cart:", err);
          const errorMessage =
            err.response?.data?.message || "Failed to add to cart";
          toast.error(errorMessage);
          return { success: false, error: errorMessage };
        } finally {
          setIsLoading(false);
        }
      }

      try {
        const guestCart = localStorage.getItem("guestCart");
        let items = guestCart ? JSON.parse(guestCart) : [];

        const existingIndex = items.findIndex(
          (item) =>
            item.product?._id === (product._id || product.id) &&
            item.color === color &&
            item.dimensions === dimensions &&
            String(item.variationId || "") === normalizedVariationId,
        );

        if (existingIndex > -1) {
          items[existingIndex].quantity += quantity;
          items[existingIndex].unitPrice = resolvedProductPrice;
          items[existingIndex].variationLabel = normalizedVariationLabel;
        } else {
          items.push(cartItem);
        }

        localStorage.setItem("guestCart", JSON.stringify(items));
        setCartItems(items);
        updateCartCount(items);
        toast.success("Added to cart!");
        return { success: true, items };
      } catch (error) {
        console.error("Error saving to guest cart:", error);
        toast.error("Failed to add to cart");
        return { success: false, error: "Failed to add to cart" };
      }
    },
    [getAuthHeaders, updateCartCount],
  );

  const removeCartItem = useCallback(
    async (productId, color = "", dimensions = "", variationId = "") => {
      const token = localStorage.getItem("token");
      const loggedIn = !!token;
      const normalizedVariationId = String(variationId || "").trim();

      if (loggedIn) {
        try {
          setIsLoading(true);
          const response = await axios.delete(`${baseUrl}/cart/${productId}`, {
            headers: getAuthHeaders(),
            params: {
              color,
              dimensions,
              variationId: normalizedVariationId,
            },
          });

          if (response.data.success) {
            const items = response.data.cart?.items || [];
            setCartItems(items);
            updateCartCount(items);
            toast.success("Item removed from cart");
            return { success: true, items };
          }

          return { success: false, error: "Failed to remove item" };
        } catch (err) {
          console.error("Error removing item:", err);
          toast.error(err.response?.data?.message || "Failed to remove item");
          return {
            success: false,
            error: err.response?.data?.message || "Failed to remove item",
          };
        } finally {
          setIsLoading(false);
        }
      }

      try {
        const guestCart = localStorage.getItem("guestCart");
        if (guestCart) {
          let items = JSON.parse(guestCart);
          items = items.filter(
            (item) =>
              !(
                item.product?._id === productId &&
                item.color === color &&
                item.dimensions === dimensions &&
                String(item.variationId || "") === normalizedVariationId
              ),
          );

          localStorage.setItem("guestCart", JSON.stringify(items));
          setCartItems(items);
          updateCartCount(items);
          toast.success("Item removed from cart");
          return { success: true, items };
        }

        return { success: false, error: "Cart is empty" };
      } catch (error) {
        console.error("Error removing guest cart item:", error);
        toast.error("Failed to remove item");
        return { success: false, error: "Failed to remove item" };
      }
    },
    [getAuthHeaders, updateCartCount],
  );

  const updateCartItem = useCallback(
    async (
      productId,
      quantity,
      color = "",
      dimensions = "",
      variationId = "",
    ) => {
      const token = localStorage.getItem("token");
      const loggedIn = !!token;
      const normalizedVariationId = String(variationId || "").trim();

      if (quantity < 1) {
        return removeCartItem(productId, color, dimensions, normalizedVariationId);
      }

      if (loggedIn) {
        try {
          setIsLoading(true);
          const response = await axios.put(
            `${baseUrl}/cart/${productId}`,
            { quantity, color, dimensions, variationId: normalizedVariationId },
            { headers: getAuthHeaders() },
          );

          if (response.data.success) {
            const items = response.data.cart?.items || [];
            setCartItems(items);
            updateCartCount(items);
            return { success: true, items };
          }

          return { success: false, error: "Failed to update cart" };
        } catch (err) {
          console.error("Error updating cart:", err);
          toast.error(err.response?.data?.message || "Failed to update cart");
          return {
            success: false,
            error: err.response?.data?.message || "Failed to update cart",
          };
        } finally {
          setIsLoading(false);
        }
      }

      try {
        const guestCart = localStorage.getItem("guestCart");
        if (guestCart) {
          let items = JSON.parse(guestCart);
          const itemIndex = items.findIndex(
            (item) =>
              item.product?._id === productId &&
              item.color === color &&
              item.dimensions === dimensions &&
              String(item.variationId || "") === normalizedVariationId,
          );

          if (itemIndex > -1) {
            items[itemIndex].quantity = quantity;
            localStorage.setItem("guestCart", JSON.stringify(items));
            setCartItems(items);
            updateCartCount(items);
            return { success: true, items };
          }
        }

        return { success: false, error: "Item not found in cart" };
      } catch (error) {
        console.error("Error updating guest cart:", error);
        toast.error("Failed to update cart");
        return { success: false, error: "Failed to update cart" };
      }
    },
    [getAuthHeaders, removeCartItem, updateCartCount],
  );

  const clearCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    const loggedIn = !!token;

    if (loggedIn) {
      try {
        await axios.delete(`${baseUrl}/cart`, {
          headers: getAuthHeaders(),
        });
      } catch (err) {
        console.error("Error clearing cart:", err);
      }
    }

    localStorage.removeItem("guestCart");
    setCartItems([]);
    updateCartCount([]);
  }, [getAuthHeaders, updateCartCount]);

  const getCartSubtotal = useCallback(() => {
    return cartItems.reduce(
      (sum, item) =>
        sum +
        (item.unitPrice || item.product?.salePrice || item.product?.price || item.price || 0) *
          (item.quantity || 1),
      0,
    );
  }, [cartItems]);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("token");
      setIsLoggedIn(!!token);

      if (token) {
        await fetchCartFromDatabase();
      } else {
        loadGuestCart();
      }
    };

    init();
  }, []);

  useEffect(() => {
    const handleLogin = () => {
      setIsLoggedIn(true);
      syncGuestCartToDatabase();
    };

    const handleLogout = () => {
      setIsLoggedIn(false);
      loadGuestCart();
    };

    window.addEventListener("userLoggedIn", handleLogin);
    window.addEventListener("userLoggedOut", handleLogout);

    return () => {
      window.removeEventListener("userLoggedIn", handleLogin);
      window.removeEventListener("userLoggedOut", handleLogout);
    };
  }, [loadGuestCart, syncGuestCartToDatabase]);

  useEffect(() => {
    const handleCartUpdate = () => {
      const token = localStorage.getItem("token");
      if (token) {
        fetchCartFromDatabase();
      }
    };

    window.addEventListener("cartUpdated", handleCartUpdate);
    return () => window.removeEventListener("cartUpdated", handleCartUpdate);
  }, [fetchCartFromDatabase]);

  const value = {
    cartItems,
    cartCount,
    isLoading,
    isLoggedIn,
    addToCart,
    updateCartItem,
    removeCartItem,
    clearCart,
    getCartSubtotal,
    fetchCartFromDatabase,
    syncGuestCartToDatabase,
    loadGuestCart,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
