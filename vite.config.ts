import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
    // Both roots point at real XAMPP folders, so no duplicate copy of the
    // backend inside the htdocs root is required.
    proxy: {
      // C:\xampp\htdocs\api  (works as-is)
      "/api": {
        target: "http://127.0.0.1",
        changeOrigin: true,
        secure: false,
      },
      // C:\xampp\htdocs\Paynal-main\php-api  (the backend inside this repo)
      "/php-api": {
        target: "http://127.0.0.1",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/php-api/, "/Paynal-main/php-api"),
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
