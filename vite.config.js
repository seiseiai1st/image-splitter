import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    // GitHub Pagesのリポジトリ名に合わせてbaseを設定
    base: '/image-splitter/',
    build: {
        outDir: 'dist',
        assetsInlineLimit: 0,
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                'x-trick': resolve(__dirname, 'x-trick.html'),
                watermark: resolve(__dirname, 'watermark.html'),
            },
        },
    },
});
