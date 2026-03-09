## UC-134: Production Performance Optimization

This document explains how the production performance improvements are wired into the app and what extra steps are needed in infrastructure (e.g. CDN/Cloudflare).

### Frontend: Code Splitting & Tree Shaking

- The main React routes in `frontend/src/App.jsx` now use `React.lazy` and `<Suspense>` so that large pages are code-split and loaded on demand.
- Vite is configured in `frontend/vite.config.js` with a dedicated `vendor-react` chunk so React and routing libraries can be cached aggressively by browsers/CDNs.
- Vite already performs tree shaking for unused imports in production builds; no additional changes are required beyond keeping imports lean.

### Backend: Gzip Compression & Caching

- `compression` middleware is registered early in `backend/server.js` so that all responses larger than 1KB are served with gzip encoding when the client supports it.
- Static uploads served from `/uploads` now use long-lived cache headers (`Cache-Control` via `maxAge: "30d"` and `immutable: true`) to let browsers and CDNs reuse these assets.

### Images & Asset Optimization

- Resume preview thumbnails in `ResumeTemplateChooser` use `loading=\"lazy\"` to avoid blocking the initial render with large images.
- Public assets under `frontend/public` are intended to be served via a CDN (see below) so that image bytes are cached at the edge.

### CDN (Cloudflare Free Tier) Setup

To use Cloudflare as a CDN for static assets:

1. **Point DNS to your hosting provider**
   - In Cloudflare DNS, create an `A` or `CNAME` record for your app domain pointing at your hosting provider.
   - Enable the orange-cloud (proxy) so traffic goes through Cloudflare.
2. **Serve the built frontend as static files**
   - Build the frontend: `npm run build` in the `frontend` directory.
   - Deploy the contents of `frontend/dist` behind your chosen host (e.g. Nginx, static host, or object storage).
3. **Add Cache Rules in Cloudflare**
   - Create a rule that matches `*.js`, `*.css`, `*.png`, `*.jpg`, `*.webp`, `*.svg`, and `*.woff2`.
   - Set a long browser cache TTL (e.g. 30 days) and enable \"cache everything\" for those assets.
4. **Enable Brotli + Gzip at the Edge**
   - In Cloudflare Speed settings, ensure Brotli is enabled so text assets are compressed between the edge and the client.

### Measuring Lighthouse & TTFB

- Run `npm run build` and `npm run preview` from `frontend`, then hit the preview URL in Chrome and run Lighthouse.
- For TTFB, use the **Network** tab to inspect initial document and API calls; with the current setup, the health endpoint `/` on the backend is lightweight and should stay well below 600ms in typical production environments.


