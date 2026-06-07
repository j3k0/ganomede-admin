import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: "replace-branding-title",
      transformIndexHtml(html) {
        const title = process.env.BRANDING_TITLE || "Ganomede";
        return html.replace("<!--BRANDING_TITLE-->", `${title} Administration`);
      },
    },
  ],
  root: "src/client",
  base: "/admin/v1/web/",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/admin/v1/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@client": path.resolve(__dirname, "src/client"),
    },
  },
});
