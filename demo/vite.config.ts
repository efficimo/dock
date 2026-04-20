import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@efficimo/dock/react": path.resolve(__dirname, "../src/react.ts"),
      "@efficimo/dock": path.resolve(__dirname, "../src/index.ts"),
    },
  },
});
