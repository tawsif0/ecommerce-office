import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          animation: ["framer-motion"],
          charts: ["recharts", "apexcharts", "react-apexcharts"],
          pdf: ["jspdf", "jspdf-autotable", "html2canvas"],
          three: ["three", "@react-three/fiber", "@react-three/drei"],
        },
      },
    },
  },
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
