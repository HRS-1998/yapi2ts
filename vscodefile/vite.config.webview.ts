import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue()
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/webview/src')
    },
    // 允许解析的扩展名
    extensions: ['.vue', '.ts', '.js']
  },
  root: resolve(__dirname, 'src/webview'),
  build: {
    target: 'esnext',
    // 输出到根目录的dist/webview
    outDir: resolve(__dirname, 'dist/webview'),
    // 生成sourcemap
    sourcemap: true,
    // 确保CSS被正确处理
    cssCodeSplit: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/webview/index.html')
    }
  },
  server: {
    // 开发服务器配置
    port: 3000,
    open: true,
    // 设置根目录
    root: resolve(__dirname, 'src/webview')
  }
});