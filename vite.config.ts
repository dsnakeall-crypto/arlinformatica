import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/main.tsx',
                'resources/js/brand2026.ts',
                'resources/css/brand2026.css',
                'resources/css/theme.css',
                'resources/js/theme.ts',
            ],
            refresh: true,
        }),
        react(),
    ],
    server: {
        host: '0.0.0.0',
    },
});
