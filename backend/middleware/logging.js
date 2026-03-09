// =======================
// logging.js — Request Logging and Response Time Middleware (UC-133)
// =======================
import { logHttp, logError } from '../utils/logger.js';
import { metricsCollector } from '../utils/monitoring.js';

/**
 * Middleware to log HTTP requests and track response times
 */
export const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  
  // Log request
  logHttp('Incoming request', {
    requestId,
    method: req.method,
    path: req.path,
    route: req.route?.path || req.path,
    query: req.query,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null,
  });

  // Capture response
  const originalSend = res.send;
  res.send = function (body) {
    const responseTime = Date.now() - startTime;
    
    // Record metrics
    metricsCollector.recordRequest(
      req.method,
      req.route?.path || req.path,
      res.statusCode,
      responseTime,
      req.user?.id || null
    );
    
    // Log response
    const logLevel = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    const logContext = {
      requestId,
      method: req.method,
      path: req.path,
      route: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userId: req.user?.id || null,
    };
    
    if (logLevel === 'error') {
      logError('Request completed with error', null, logContext);
    } else {
      logHttp('Request completed', logContext);
    }
    
    // Call original send
    return originalSend.call(this, body);
  };
  
  next();
};

/**
 * Middleware to log errors with full context
 */
export const errorLogger = (err, req, res, next) => {
  logError('Unhandled error in request', err, {
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    route: req.route?.path || req.path,
    userId: req.user?.id || null,
    body: req.body,
    query: req.query,
    headers: {
      'user-agent': req.get('user-agent'),
      'content-type': req.get('content-type'),
    },
  });
  
  next(err);
};

