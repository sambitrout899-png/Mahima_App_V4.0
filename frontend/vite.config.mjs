// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // forward all /api requests to backend running at localhost:5001
    proxy: {
      "/api": {
        target: "https://www.mahimaministries.in",
        changeOrigin: true,
        secure: false
      }
    }
  }
});
