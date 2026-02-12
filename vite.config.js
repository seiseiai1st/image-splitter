import { defineConfig } from 'vite';

export default defineConfig({
    // GitHub Pagesのリポジトリ名に合わせてbaseを設定
    // リポジトリ名が "image-splitter" の場合:
    base: '/image-splitter/',
    build: {
        outDir: 'dist',
        assetsInlineLimit: 0,
    },
});
