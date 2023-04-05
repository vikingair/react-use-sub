/// <reference types="vitest" />

import { resolve } from 'path';
import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
    build: {
        lib: {
            formats: ['cjs', 'es'],
            entry: resolve(__dirname, 'src/index.tsx'),
            fileName: (format) => `index.${format}.js`,
        },
        // library code should not be minified according to this article
        // https://stackoverflow.com/a/48673965/15090924
        minify: false,
        rollupOptions: {
            // make sure to externalize deps that shouldn't be bundled
            // into your library
            external: ['react', 'react-dom'],
            output: {
                dir: 'dist',
            },
        },
    },
    test: {
        environment: 'jsdom',
        watch: false,
        coverage: {
            reporter: ['text-summary', 'lcov', 'html'],
            lines: 100,
            functions: 100,
            statements: 100,
            branches: 100,
        },
    },
});
