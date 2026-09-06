import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: [
                'resources/js/main.tsx',
                'resources/js/brand2026.ts',
                'resources/js/brand2026-access.ts',
                'resources/js/client-search.ts',
                'resources/js/order-maintenance.ts',
                'resources/js/order-workflow.ts',
                'resources/js/new-order-search.ts',
                'resources/js/record-management.ts',
                'resources/js/ui-final-polish.ts',
                'resources/js/ui-regression-guard.ts',
                'resources/js/manual-equipment.ts',
                'resources/js/mobile-home.ts',
                'resources/js/page-isolation.ts',
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
