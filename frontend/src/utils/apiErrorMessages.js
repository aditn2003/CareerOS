/**
 * Utility functions for displaying user-friendly API error messages
 * UC-117: Display user-facing messages for API limitations
 */

/**
 * Get user-friendly error message based on API error response
 * @param {Error|Object} error - The error object from API call
 * @param {string} serviceName - Optional service name for context
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyErrorMessage(error, serviceName = null) {
  // Handle different error formats
  const response = error?.response || error;
  const status = response?.status || response?.statusCode;
  const data = response?.data || {};
  const message = data?.error || data?.message || error?.message || '';

  // Check for rate limit errors (429)
  if (status === 429) {
    const service = serviceName || getServiceNameFromError(message);
    return `⚠️ ${service ? `${service} ` : ''}API rate limit reached. Please wait a few minutes and try again. Your request is being processed in the background.`;
  }

  // Check for quota exceeded errors
  if (status === 403 && (message.toLowerCase().includes('quota') || message.toLowerCase().includes('limit'))) {
    const service = serviceName || getServiceNameFromError(message);
    return `⚠️ ${service ? `${service} ` : ''}API quota exceeded for this month. The feature is temporarily unavailable. Please try again next month or contact support.`;
  }

  // Check for authentication errors (401)
  if (status === 401) {
    return `🔐 Authentication failed. Please refresh the page and try again.`;
  }

  // Check for service unavailable (503)
  if (status === 503) {
    const service = serviceName || getServiceNameFromError(message);
    return `🔧 ${service ? `${service} ` : ''}API is temporarily unavailable. Our system is using a fallback method. Please try again in a few moments.`;
  }

  // Check for timeout errors
  if (error?.code === 'ETIMEDOUT' || error?.code === 'ECONNABORTED' || message.toLowerCase().includes('timeout')) {
    return `⏱️ Request timed out. The API is taking longer than expected. Please try again.`;
  }

  // Check for network errors
  if (error?.code === 'ECONNREFUSED' || error?.code === 'ENOTFOUND' || error?.code === 'ERR_NETWORK') {
    return `🌐 Network error. Please check your internet connection and try again.`;
  }

  // Check for fallback messages (indicates API failed but fallback was used)
  if (message.toLowerCase().includes('fallback') || data?.fallback_used) {
    return `ℹ️ Using fallback data. The primary API is temporarily unavailable, but we've provided alternative results.`;
  }

  // Check for rate limit messages in error text
  if (message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('too many requests')) {
    const service = serviceName || getServiceNameFromError(message);
    return `⚠️ ${service ? `${service} ` : ''}API rate limit reached. Please wait a few minutes and try again.`;
  }

  // Generic error messages based on service
  if (serviceName) {
    return `❌ ${serviceName} API error: ${message || 'Unable to complete request. Please try again.'}`;
  }

  // Default generic error
  return message || 'An error occurred. Please try again.';
}

/**
 * Extract service name from error message
 * @param {string} message - Error message
 * @returns {string|null} Service name if found
 */
function getServiceNameFromError(message) {
  const lowerMessage = message.toLowerCase();
  const services = [
    { keywords: ['openai', 'gpt'], name: 'OpenAI' },
    { keywords: ['gemini', 'google'], name: 'Google Gemini' },
    { keywords: ['github'], name: 'GitHub' },
    { keywords: ['serp', 'serpapi'], name: 'SERP' },
    { keywords: ['news', 'newsapi'], name: 'News API' },
    { keywords: ['resend', 'email'], name: 'Resend' },
    { keywords: ['wikipedia', 'wiki'], name: 'Wikipedia' },
    { keywords: ['linkedin'], name: 'LinkedIn' },
    { keywords: ['geocoding', 'google maps'], name: 'Google Geocoding' },
  ];

  for (const service of services) {
    if (service.keywords.some(keyword => lowerMessage.includes(keyword))) {
      return service.name;
    }
  }

  return null;
}

/**
 * Check if error is a rate limit/quota error
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export function isRateLimitError(error) {
  const response = error?.response || error;
  const status = response?.status || response?.statusCode;
  const message = (response?.data?.error || response?.data?.message || error?.message || '').toLowerCase();
  
  return status === 429 || 
         status === 403 && (message.includes('quota') || message.includes('limit')) ||
         message.includes('rate limit') || 
         message.includes('too many requests');
}

/**
 * Check if error indicates service is unavailable
 * @param {Error|Object} error - The error object
 * @returns {boolean}
 */
export function isServiceUnavailableError(error) {
  const response = error?.response || error;
  const status = response?.status || response?.statusCode;
  
  return status === 503 || status === 502 || status === 504;
}

/**
 * Get actionable advice based on error type
 * @param {Error|Object|string} error - The error object or error message string
 * @returns {string|null} Actionable advice or null
 */
export function getErrorAdvice(error) {
  // Handle string messages (friendly error messages we've already generated)
  if (typeof error === 'string') {
    const lowerMessage = error.toLowerCase();
    if (lowerMessage.includes('rate limit') || lowerMessage.includes('quota exceeded')) {
      return '💡 Tip: Rate limits reset automatically. Try again in a few minutes.';
    }
    if (lowerMessage.includes('temporarily unavailable') || lowerMessage.includes('fallback')) {
      return '💡 Tip: The service should be back online shortly. Our system will automatically retry.';
    }
    return null;
  }
  
  // Handle error objects
  if (isRateLimitError(error)) {
    return '💡 Tip: Rate limits reset automatically. Try again in a few minutes.';
  }
  
  if (isServiceUnavailableError(error)) {
    return '💡 Tip: The service should be back online shortly. Our system will automatically retry.';
  }
  
  return null;
}
