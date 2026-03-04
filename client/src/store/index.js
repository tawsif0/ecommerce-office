import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import cartReducer from "./cartSlice";
import voiceAssistantReducer from "./voiceAssistantSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    voiceAssistant: voiceAssistantReducer,
  },
});

export default store;
