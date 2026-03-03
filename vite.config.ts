import vue from "@vitejs/plugin-vue";
import path from "path";
import { readFileSync } from "node:fs";
import { defineConfig } from "vite";

const resolve = (dir: string) => path.join(__dirname, dir);
const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
);

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [vue()],
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
  worker: {
    format: "es",
  },
});
