import{defineConfig}from'vite';import react from'@vitejs/plugin-react';export default defineConfig({plugins:[react()],build:{manifest:true,outDir:'public/build'},server:{host:'0.0.0.0'}});
