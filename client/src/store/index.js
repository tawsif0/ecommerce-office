import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import cartReducer from "./cartSlice";
import compareReducer from "./compareSlice";
import publicSettingsReducer from "./publicSettingsSlice";
import recentlyViewedReducer from "./recentlyViewedSlice";
import voiceAssistantReducer from "./voiceAssistantSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    compare: compareReducer,
    publicSettings: publicSettingsReducer,
    recentlyViewed: recentlyViewedReducer,
    voiceAssistant: voiceAssistantReducer,
  },
});

export default store;
