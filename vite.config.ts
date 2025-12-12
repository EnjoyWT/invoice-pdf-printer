import vue from "@vitejs/plugin-vue";
import path from "path";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const resolve = (dir: string) => path.join(__dirname, dir);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "src/assets/favicons/favicon.ico",
        "src/assets/favicons/apple-touch-icon.png",
        "src/assets/favicons/logo-rounded.png",
      ],
      manifest: {
        name: "发票打印",
        short_name: "发票打印",
        start_url: "/",
        display: "standalone",
        theme_color: "#ffffff",
        background_color: "#ffffff",
        description: "发票打印助手，支持发票处理与打印。",
        icons: [
          { src: "/icons/pwa-72.png", sizes: "72x72", type: "image/png" },
          { src: "/icons/pwa-96.png", sizes: "96x96", type: "image/png" },
          { src: "/icons/pwa-128.png", sizes: "128x128", type: "image/png" },
          { src: "/icons/pwa-144.png", sizes: "144x144", type: "image/png" },
          { src: "/icons/pwa-152.png", sizes: "152x152", type: "image/png" },
          { src: "/icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/pwa-256.png", sizes: "256x256", type: "image/png" },
          { src: "/icons/pwa-384.png", sizes: "384x384", type: "image/png" },
          { src: "/icons/pwa-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": resolve("src"),
      "@assets": resolve("src/assets"),
      "@components": resolve("src/components"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
});