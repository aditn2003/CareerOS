// backend/instrument.js

// 1. Import Sentry using ESM syntax
import * as Sentry from "@sentry/node";

// 2. Initialize Sentry
Sentry.init({
  dsn: "https://2d7b18467a4d971de9d3d17467ff967c@o4510531875700736.ingest.us.sentry.io/4510531894378496",
  
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,

  // Optional: Enable performance monitoring (recommended)
  // tracesSampleRate: 1.0, 
});