import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://187.127.132.149:5001",   // ✅ FIXED
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
