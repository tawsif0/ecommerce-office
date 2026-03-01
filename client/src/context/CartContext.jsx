/* eslint-disable no-unused-vars */
/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  buildDataLayerItem,
  getDataLayerCurrency,
  pushDataLayerEvent,
} from "../utils/marketingDataLayer";
import {
  clearCartState,
  setCartItems,
  setCartLoading,
  setCartLoggedIn,
} from "../store/cartSlice";

const baseUrl = import.meta.env.VITE_API_URL;
const GUEST_CART_KEY = "guestCart";

let cartBootstrapped = false;
let cartListenersBound = false;

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

const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const dispatchCartItems = (dispatch, items) => {
  const normalizedItems = Array.isArray(items) ? items : [];
  dispatch(setCartItems(normalizedItems));
  window.dispatchEvent(
    new CustomEvent("cartCountUpdated", { detail: normalizedItems.length }),
  );
  return normalizedItems;
};

const loadGuestCartState = async (dispatch) => {
  try {
    const guestCart = localStorage.getItem(GUEST_CART_KEY);
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

      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
    }

    return dispatchCartItems(dispatch, items);
  } catch (_error) {
    localStorage.removeItem(GUEST_CART_KEY);
    return dispatchCartItems(dispatch, []);
  }
};

const fetchCartFromDatabaseState = async (dispatch) => {
  try {
    dispatch(setCartLoading(true));
    const response = await axios.get(`${baseUrl}/cart`, {
      headers: getAuthHeaders(),
      timeout: 10000,
    });

    if (response.data.success) {
      const items = response.data.cart?.items || [];
      return dispatchCartItems(dispatch, items);
    }
    return [];
  } catch (err) {
    if (err.response?.status === 401) {
      dispatch(setCartLoggedIn(false));
      return loadGuestCartState(dispatch);
    }
    return [];
  } finally {
    dispatch(setCartLoading(false));
  }
};

const syncGuestCartToDatabaseState = async (dispatch) => {
  const token = localStorage.getItem("token");
  const guestCart = localStorage.getItem(GUEST_CART_KEY);

  if (token && guestCart) {
    try {
      dispatch(setCartLoading(true));
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
      localStorage.removeItem(GUEST_CART_KEY);
      await fetchCartFromDatabaseState(dispatch);
      toast.success("Cart items synced to your account!");
      return true;
    } catch (_error) {
      toast.error("Failed to sync cart items. Please try again.");
      return false;
    } finally {
      dispatch(setCartLoading(false));
    }
  }

  return false;
};

const bindCartEventListeners = (dispatch) => {
  if (cartListenersBound) return;
  cartListenersBound = true;

  window.addEventListener("userLoggedIn", async () => {
    dispatch(setCartLoggedIn(true));
    await syncGuestCartToDatabaseState(dispatch);
  });

  window.addEventListener("userLoggedOut", async () => {
    dispatch(setCartLoggedIn(false));
    await loadGuestCartState(dispatch);
  });

  window.addEventListener("cartUpdated", async () => {
    const token = localStorage.getItem("token");
    if (token) {
      await fetchCartFromDatabaseState(dispatch);
    }
  });
};

export const useCart = () => {
  const dispatch = useDispatch();
  const { cartItems, cartCount, isLoading, isLoggedIn } = useSelector(
    (state) => state.cart,
  );

  useEffect(() => {
    bindCartEventListeners(dispatch);

    if (cartBootstrapped) return;
    cartBootstrapped = true;

    const init = async () => {
      const token = localStorage.getItem("token");
      dispatch(setCartLoggedIn(Boolean(token)));

      if (token) {
        await fetchCartFromDatabaseState(dispatch);
      } else {
        await loadGuestCartState(dispatch);
      }
    };

    init();
  }, [dispatch]);

  const loadGuestCart = useCallback(async () => {
    return loadGuestCartState(dispatch);
  }, [dispatch]);

  const fetchCartFromDatabase = useCallback(async () => {
    return fetchCartFromDatabaseState(dispatch);
  }, [dispatch]);

  const syncGuestCartToDatabase = useCallback(async () => {
    return syncGuestCartToDatabaseState(dispatch);
  }, [dispatch]);

  const addToCart = useCallback(
    async (product, quantity = 1, color = "", dimensions = "", options = {}) => {
      if (String(product?.priceType || "single") === "tba") {
        const error = "This product is marked as TBA and cannot be purchased right now";
        toast.error(error);
        return { success: false, error };
      }

      const token = localStorage.getItem("token");
      const loggedIn = Boolean(token);
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
          dispatch(setCartLoading(true));
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
            dispatchCartItems(dispatch, items);
            pushDataLayerEvent("add_to_cart", {
              ecommerce: {
                currency: getDataLayerCurrency(),
                value: Number(resolvedProductPrice || 0) * Number(quantity || 1),
                items: [
                  buildDataLayerItem({
                    productId: product._id || product.id,
                    title: product.title,
                    price: resolvedProductPrice,
                    quantity,
                    category: product?.category?.name || product?.category || "",
                    brand: product?.brand || "",
                    variationLabel: normalizedVariationLabel,
                    vendorName: product?.vendor?.storeName || "",
                  }),
                ],
              },
            });
            toast.success("Added to cart!");
            return { success: true, items };
          }

          return { success: false, error: "Failed to add to cart" };
        } catch (err) {
          const errorMessage =
            err.response?.data?.message || "Failed to add to cart";
          toast.error(errorMessage);
          return { success: false, error: errorMessage };
        } finally {
          dispatch(setCartLoading(false));
        }
      }

      try {
        const guestCart = localStorage.getItem(GUEST_CART_KEY);
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

        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
        dispatchCartItems(dispatch, items);
        pushDataLayerEvent("add_to_cart", {
          ecommerce: {
            currency: getDataLayerCurrency(),
            value: Number(resolvedProductPrice || 0) * Number(quantity || 1),
            items: [
              buildDataLayerItem({
                productId: product._id || product.id,
                title: product.title,
                price: resolvedProductPrice,
                quantity,
                category: product?.category?.name || product?.category || "",
                brand: product?.brand || "",
                variationLabel: normalizedVariationLabel,
                vendorName: product?.vendor?.storeName || "",
              }),
            ],
          },
        });
        toast.success("Added to cart!");
        return { success: true, items };
      } catch (_error) {
        toast.error("Failed to add to cart");
        return { success: false, error: "Failed to add to cart" };
      }
    },
    [dispatch],
  );

  const removeCartItem = useCallback(
    async (productId, color = "", dimensions = "", variationId = "") => {
      const token = localStorage.getItem("token");
      const loggedIn = Boolean(token);
      const normalizedVariationId = String(variationId || "").trim();

      if (loggedIn) {
        try {
          dispatch(setCartLoading(true));
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
            dispatchCartItems(dispatch, items);
            toast.success("Item removed from cart");
            return { success: true, items };
          }

          return { success: false, error: "Failed to remove item" };
        } catch (err) {
          const message = err.response?.data?.message || "Failed to remove item";
          toast.error(message);
          return {
            success: false,
            error: message,
          };
        } finally {
          dispatch(setCartLoading(false));
        }
      }

      try {
        const guestCart = localStorage.getItem(GUEST_CART_KEY);
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

          localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
          dispatchCartItems(dispatch, items);
          toast.success("Item removed from cart");
          return { success: true, items };
        }

        return { success: false, error: "Cart is empty" };
      } catch (_error) {
        toast.error("Failed to remove item");
        return { success: false, error: "Failed to remove item" };
      }
    },
    [dispatch],
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
      const loggedIn = Boolean(token);
      const normalizedVariationId = String(variationId || "").trim();

      if (quantity < 1) {
        return removeCartItem(productId, color, dimensions, normalizedVariationId);
      }

      if (loggedIn) {
        try {
          dispatch(setCartLoading(true));
          const response = await axios.put(
            `${baseUrl}/cart/${productId}`,
            { quantity, color, dimensions, variationId: normalizedVariationId },
            { headers: getAuthHeaders() },
          );

          if (response.data.success) {
            const items = response.data.cart?.items || [];
            dispatchCartItems(dispatch, items);
            return { success: true, items };
          }

          return { success: false, error: "Failed to update cart" };
        } catch (err) {
          const message = err.response?.data?.message || "Failed to update cart";
          toast.error(message);
          return {
            success: false,
            error: message,
          };
        } finally {
          dispatch(setCartLoading(false));
        }
      }

      try {
        const guestCart = localStorage.getItem(GUEST_CART_KEY);
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
            localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
            dispatchCartItems(dispatch, items);
            return { success: true, items };
          }
        }

        return { success: false, error: "Item not found in cart" };
      } catch (_error) {
        toast.error("Failed to update cart");
        return { success: false, error: "Failed to update cart" };
      }
    },
    [dispatch, removeCartItem],
  );

  const clearCart = useCallback(async () => {
    const token = localStorage.getItem("token");
    const loggedIn = Boolean(token);

    if (loggedIn) {
      try {
        await axios.delete(`${baseUrl}/cart`, {
          headers: getAuthHeaders(),
        });
      } catch (_err) {
        // Ignore clear cart API errors and still clear local state.
      }
    }

    localStorage.removeItem(GUEST_CART_KEY);
    dispatch(clearCartState());
    window.dispatchEvent(new CustomEvent("cartCountUpdated", { detail: 0 }));
  }, [dispatch]);

  const getCartSubtotal = useCallback(() => {
    return cartItems.reduce(
      (sum, item) =>
        sum +
        (item.unitPrice || item.product?.salePrice || item.product?.price || item.price || 0) *
          (item.quantity || 1),
      0,
    );
  }, [cartItems]);

  return {
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
};
