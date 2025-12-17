import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./design/base.css";
import "./App.css";
import "./styles/accessibility.css"; // Global accessibility styles

// Optimize for back/forward cache (bfcache)
// Ensure no blocking operations that prevent bfcache
if (typeof window !== 'undefined') {
  // Clean up any resources that might block bfcache
  window.addEventListener('pagehide', (event) => {
    // Close any open connections, clear timers, etc.
    // This helps ensure the page can be cached
    if (event.persisted) {
      // Page is being cached successfully - no action needed
    }
  }, { passive: true });

  // Also listen for pageshow to detect bfcache restoration
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      // Page was restored from bfcache - might need to refresh data
      // But don't do heavy operations here
    }
  }, { passive: true });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
