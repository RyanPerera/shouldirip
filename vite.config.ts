import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
//t
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/ShouldIRip",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
