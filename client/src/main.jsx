// App.js
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./hooks/useAuth";
import { CartProvider } from "./context/CartContext";
import { configureGlobalToasts } from "./utils/globalToast";

configureGlobalToasts();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <AuthProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </AuthProvider>
  </React.StrictMode>,
);
