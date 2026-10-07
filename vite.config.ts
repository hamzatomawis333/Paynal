import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // GitHub Pages is served from https://hamzatomawis333.github.io/Paynal/,
  // but LOCAL development must be served from the root: http://localhost:8080/
  base: mode === "production" ? "/Paynal/" : "/",

  server: {
    host: "0.0.0.0",
    port: 8080,
    // Never fall back to 8081/8082: if 8080 is taken, fail loudly instead.
    strictPort: true,

    proxy: {
      // The only PHP API is INSIDE this project: <project>/php-api
      //   (C:\xampp\htdocs\Paynal-main\php-api)
      //
      // Dev requests are same-origin relative paths:
      //   /php-api/...  ->  http://127.0.0.1/<project-folder>/php-api/...
      //
      // The project folder name is read from disk so the proxy keeps working
      // if the whole folder is copied to another laptop or renamed.
      "/php-api": {
        target: "http://127.0.0.1",
        changeOrigin: true,
        secure: false,
        rewrite: (requestPath) =>
          requestPath.replace(/^\/php-api/, `/${path.basename(__dirname)}/php-api`),
      },
    },
  },

  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));