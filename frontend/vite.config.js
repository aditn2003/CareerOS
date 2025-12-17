import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { imagetools } from "vite-imagetools";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    imagetools({
      defaultDirectives: (url) => {
        // Optimize images by default - reduce quality for smaller file sizes
        if (url.searchParams.has('webp')) {
          return new URLSearchParams({
            format: 'webp',
            quality: '80',
          });
        }
        // For PNG images, optimize them
        if (url.pathname.endsWith('.png')) {
          return new URLSearchParams({
            quality: '85',
          });
        }
        return new URLSearchParams();
      },
    }),
  ],
  build: {
    sourcemap: false,
    // Optimize chunk size limits for better code splitting
    chunkSizeWarningLimit: 1000,
    // Enable tree-shaking - be very careful with React
    treeshake: {
      moduleSideEffects: (id) => {
        // Preserve side effects for React and React-related packages
        if (id.includes('react') || id.includes('@react-oauth') || id.includes('@emotion') || id.includes('lucide-react')) {
          return true;
        }
        // Preserve side effects for all node_modules to avoid breaking dependencies
        // This is safer for production builds
        if (id.includes('node_modules')) {
          return true; // Preserve all side effects in node_modules
        }
        return false;
      },
    },
    rollupOptions: {
      output: {
        // Let Vite handle chunking automatically - it's smarter about dependencies
        // This ensures proper load order and avoids React dependency issues
        // We'll still get code splitting, just handled more safely by Vite
        // Optimize chunk file names for better caching
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: "assets/[ext]/[name]-[hash].[ext]",
        // Manual chunks for large libraries that don't depend on React
        manualChunks: (id) => {
          // Only split non-React large libraries to avoid dependency issues
          if (id.includes("node_modules/recharts")) {
            return "vendor-recharts";
          }
          if (id.includes("node_modules/three")) {
            return "vendor-three";
          }
          if (id.includes("node_modules/pdf") || id.includes("node_modules/docx") || id.includes("node_modules/mammoth")) {
            return "vendor-docs";
          }
          if (id.includes("node_modules/leaflet") || id.includes("node_modules/react-leaflet")) {
            return "vendor-maps";
          }
          // Let Vite handle everything else automatically
          return null;
        },
      },
    },
    // Enable minification - using esbuild for faster builds
    minify: "esbuild",
    // Configure esbuild to remove console statements
    esbuild: {
      drop: ['console', 'debugger'], // Remove console and debugger in production
    },
    // Reduce bundle size
    reportCompressedSize: false, // Faster builds
    cssCodeSplit: true, // Split CSS into separate files
    cssMinify: true, // Minify CSS
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom"],
  },
  // Optimize asset handling
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg'],
  // Server optimizations for development
  server: {
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  },
});
