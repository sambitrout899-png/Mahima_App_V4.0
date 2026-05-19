import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  base: mode === "mobile" ? "./" : "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "https://mahimaministries.in",
        changeOrigin: true,
        secure: false,
      },
    },
  },
}));
