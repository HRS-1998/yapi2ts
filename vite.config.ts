import vue from '@vitejs/plugin-vue';
import path from 'path';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'popup.html'),
        background: path.resolve(__dirname, 'src/background.ts'),
        content: path.resolve(__dirname, 'src/content.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
      plugins: [
        // 复制manifest.json到dist目录
        {
          name: 'copy-manifest',
          generateBundle() {
            const fs = require('fs');
            const manifestContent = fs.readFileSync(
              path.resolve(__dirname, 'manifest.json'),
              'utf-8'
            );
            this.emitFile({
              type: 'asset',
              fileName: 'manifest.json',
              source: manifestContent,
            });

            // 复制icons目录到dist
            const iconsDir = path.resolve(__dirname, 'icons');
            const distIconsDir = path.resolve(__dirname, 'dist/icons');

            if (!fs.existsSync(distIconsDir)) {
              fs.mkdirSync(distIconsDir, { recursive: true });
            }

            const iconFiles = fs.readdirSync(iconsDir);
            iconFiles.forEach((file) => {
              const iconContent = fs.readFileSync(
                path.resolve(iconsDir, file),
                'binary'
              );
              this.emitFile({
                type: 'asset',
                fileName: `icons/${file}`,
                source: iconContent,
              });
            });
          },
        },
      ],
    },
  },
});
