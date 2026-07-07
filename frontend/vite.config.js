import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "mobile" ? "./" : "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://srv1620165.hstgr.cloud:5001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
