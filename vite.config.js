import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5273,
    watch: {
      // 编辑工具会写入 .*.tmpdir 临时文件，监视它们会导致 EBUSY 崩溃
      ignored: ['**/.*.tmpdir/**', '**/*.tmp', '**/dist/**'],
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
      },
    },
  },
});
