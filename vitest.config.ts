import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/frontend"),
      "@shared": path.resolve(__dirname, "src/shared"),
    },
  },
  test: {
    environment: "node",
    globals: false,
    include: [
      "src/frontend/**/*.test.ts",
      "src/backend/**/*.test.ts",
      "src/shared/**/*.test.ts",
    ],
    setupFiles: [path.resolve(__dirname, "src/frontend/test/setup.ts")],
  },
});
