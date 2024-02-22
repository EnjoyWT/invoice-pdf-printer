import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
const resolve = (dir) => path.join(__dirname, dir);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve:  {
    alias: {
      "@":resolve('src'),
      "@assets":resolve('src/assets'),
      "@components":resolve('src/components')
    }
}
})