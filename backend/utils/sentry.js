// =======================
// sentry.js — Sentry Error Tracking Integration (UC-133)
// =======================
import * as Sentry from '@sentry/node';

/**
 * Initialize Sentry for error tracking
 */
export const initSentry = () => {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.warn('⚠️ SENTRY_DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    integrations: [],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking
    release: process.env.APP_VERSION || '1.0.0',
    // Filter out health checks and monitoring endpoints
    beforeSend(event, hint) {
      // Don't send events for health check endpoints
      if (event.request?.url?.includes('/health') || 
          event.request?.url?.includes('/metrics')) {
        return null;
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized for error tracking');
};

/**
 * Capture exception with context
 */
export const captureException = (error, context = {}) => {
  Sentry.withScope((scope) => {
    // Add context
    Object.entries(context).forEach(([key, value]) => {
      scope.setContext(key, value);
    });
    Sentry.captureException(error);
  });
};

/**
 * Capture message
 */
export const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setContext(key, value);
    });
    Sentry.captureMessage(message, level);
  });
};

/**
 * Set user context for Sentry
 */
export const setUserContext = (user) => {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  });
};

/**
 * Clear user context
 */
export const clearUserContext = () => {
  Sentry.setUser(null);
};

export default Sentry;

