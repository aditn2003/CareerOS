// =======================
// logger.js — Structured Logging Utility (UC-133)
// =======================
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...metadata } = info;
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Add structured metadata if present
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    
    return log;
  })
);

// Define which transports to use
const transports = [
  // Console transport with colors
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf((info) => {
        const { timestamp, level, message, ...metadata } = info;
        let log = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
          log += ` ${JSON.stringify(metadata)}`;
        }
        return log;
      })
    ),
  }),
  // File transport for all logs
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/combined.log'),
    format: format,
  }),
  // Separate file for errors
  new winston.transports.File({
    filename: path.join(__dirname, '../logs/error.log'),
    level: 'error',
    format: format,
  }),
];

// Create the logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/exceptions.log'),
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(__dirname, '../logs/rejections.log'),
    }),
  ],
});

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Helper function for structured logging with searchable fields
export const logWithContext = (level, message, context = {}) => {
  const logData = {
    message,
    ...context,
    timestamp: new Date().toISOString(),
  };
  
  logger[level](logData);
};

// Convenience methods
export const logError = (message, error = null, context = {}) => {
  const errorContext = {
    ...context,
    error: error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : null,
  };
  logWithContext('error', message, errorContext);
};

export const logWarning = (message, context = {}) => {
  logWithContext('warn', message, context);
};

export const logInfo = (message, context = {}) => {
  logWithContext('info', message, context);
};

export const logHttp = (message, context = {}) => {
  logWithContext('http', message, context);
};

export const logDebug = (message, context = {}) => {
  logWithContext('debug', message, context);
};

export default logger;

