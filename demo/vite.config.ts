import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.VITE_BASE_PATH || "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@efficimo/dock/react": path.resolve(import.meta.dirname, "../src/react.ts"),
      "@efficimo/dock": path.resolve(import.meta.dirname, "../src/index.ts"),
    },
    // The lib is read straight from ../src, so its imports resolve against the root
    // node_modules — without this the demo would load a second copy of React.
    dedupe: ["react", "react-dom", "@efficimo/observable", "@efficimo/observable-react"],
  },
});
