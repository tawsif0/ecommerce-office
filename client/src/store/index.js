import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import cartReducer from "./cartSlice";
import publicSettingsReducer from "./publicSettingsSlice";
import voiceAssistantReducer from "./voiceAssistantSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    publicSettings: publicSettingsReducer,
    voiceAssistant: voiceAssistantReducer,
  },
});

export default store;
