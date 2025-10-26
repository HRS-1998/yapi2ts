import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    // VSCode extension不需要特殊插件
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
    extensions: ['.ts', '.js']
  },
  build: {
    target: 'node18', // VSCode的运行环境
    outDir: 'dist/extension',
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, 'src/extension.ts'),
      formats: ['cjs'],
      fileName: 'extension'
    },
    rollupOptions: {
      // 外部化VSCode API和Node.js内置模块
      external: [
        'vscode',
        'node-fetch',
        'path',
        'fs',
        'os',
        'crypto'
      ],
      output: {
        // 确保输出为CommonJS格式
        format: 'cjs',
        // 保持原始模块名称
        preserveModules: true
      }
    },
    // 禁用CSS处理，因为extension不包含CSS
    cssCodeSplit: false,
    // 跳过类型检查
    skipLibCheck: true
  },
  // 排除webview目录，避免构建冲突
  server: {
    watch: {
      ignored: ['src/webview/**']
    }
  }
});