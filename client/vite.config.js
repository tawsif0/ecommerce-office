import { defineConfig } from "vite";
import react from "@vitejs/plugin-react"; // ✅ Added React
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(), // ✅ React plugin
    tailwindcss(), // ✅ Tailwind plugin
  ],
  server: {
    proxy: {
      "/api": {
        target: "https://api-ecommerce.arbeitonline.top/api",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, "/api"),
      },
    },
  },
});
