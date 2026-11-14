import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // In dev, forward /api to the FastAPI backend so the frontend uses the same paths as production.
    proxy: { "/api": "http://localhost:8000" },
  },
});
