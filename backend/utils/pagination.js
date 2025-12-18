/**
 * UC-136: Standardized Pagination Utility
 * 
 * Provides consistent pagination across all API endpoints.
 * Supports cursor-based and offset-based pagination.
 */

/**
 * Default pagination configuration
 */
export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100,
  defaultSortField: 'created_at',
  defaultSortOrder: 'DESC',
};

/**
 * Parse pagination parameters from request query
 * @param {object} query - Express request query object
 * @param {object} options - Override default options
 * @returns {object} Parsed pagination parameters
 */
export function parsePaginationParams(query, options = {}) {
  const defaults = { ...PAGINATION_DEFAULTS, ...options };
  
  // Parse page number
  let page = parseInt(query.page || query.p, 10);
  if (isNaN(page) || page < 1) page = defaults.page;
  
  // Parse limit (items per page)
  let limit = parseInt(query.limit || query.per_page || query.size, 10);
  if (isNaN(limit) || limit < 1) limit = defaults.limit;
  if (limit > defaults.maxLimit) limit = defaults.maxLimit;
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  // Parse sort parameters
  let sortField = query.sort || query.sortBy || query.order_by || defaults.defaultSortField;
  let sortOrder = (query.order || query.sortOrder || query.direction || defaults.defaultSortOrder).toUpperCase();
  
  // Validate sort order
  if (!['ASC', 'DESC'].includes(sortOrder)) {
    sortOrder = defaults.defaultSortOrder;
  }
  
  // Parse cursor for cursor-based pagination
  const cursor = query.cursor || query.after || null;
  
  return {
    page,
    limit,
    offset,
    sortField,
    sortOrder,
    cursor,
  };
}

/**
 * Generate pagination metadata for response
 * @param {number} totalItems - Total number of items
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {string} baseUrl - Base URL for pagination links (optional)
 * @returns {object} Pagination metadata
 */
export function generatePaginationMeta(totalItems, page, limit, baseUrl = null) {
  const totalPages = Math.ceil(totalItems / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  
  const meta = {
    pagination: {
      total: totalItems,
      page,
      limit,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
  
  // Add navigation links if baseUrl provided
  if (baseUrl) {
    const links = {};
    
    if (hasPrevPage) {
      links.prev = `${baseUrl}?page=${page - 1}&limit=${limit}`;
      links.first = `${baseUrl}?page=1&limit=${limit}`;
    }
    
    if (hasNextPage) {
      links.next = `${baseUrl}?page=${page + 1}&limit=${limit}`;
      links.last = `${baseUrl}?page=${totalPages}&limit=${limit}`;
    }
    
    meta.links = links;
  }
  
  return meta;
}

/**
 * Apply pagination to a PostgreSQL query
 * @param {string} baseQuery - Base SQL query without LIMIT/OFFSET
 * @param {object} paginationParams - Pagination parameters
 * @param {string} allowedSortFields - Array of allowed sort field names
 * @returns {object} { query, countQuery, values }
 */
export function applyPaginationToQuery(baseQuery, paginationParams, allowedSortFields = []) {
  const { limit, offset, sortField, sortOrder } = paginationParams;
  
  // Validate sort field to prevent SQL injection
  const safeSortField = allowedSortFields.includes(sortField) 
    ? sortField 
    : 'created_at';
  
  // Build count query (for total items)
  const countQuery = `SELECT COUNT(*) as total FROM (${baseQuery}) as count_query`;
  
  // Build paginated query
  const paginatedQuery = `
    ${baseQuery}
    ORDER BY ${safeSortField} ${sortOrder}
    LIMIT $${baseQuery.split('$').length} OFFSET $${baseQuery.split('$').length + 1}
  `;
  
  return {
    query: paginatedQuery,
    countQuery,
    paginationValues: [limit, offset],
  };
}

/**
 * Middleware to parse pagination from request
 */
export function paginationMiddleware(options = {}) {
  return (req, res, next) => {
    req.pagination = parsePaginationParams(req.query, options);
    next();
  };
}

/**
 * Helper to format paginated response
 * @param {Array} data - Data items
 * @param {number} total - Total count
 * @param {object} pagination - Pagination params
 * @returns {object} Formatted response
 */
export function formatPaginatedResponse(data, total, pagination) {
  return {
    success: true,
    data,
    ...generatePaginationMeta(total, pagination.page, pagination.limit),
  };
}

/**
 * SQL helper for generating LIMIT OFFSET clause
 * @param {number} limit 
 * @param {number} offset 
 * @returns {string}
 */
export function limitOffsetSQL(limit, offset) {
  return `LIMIT ${parseInt(limit, 10)} OFFSET ${parseInt(offset, 10)}`;
}

/**
 * SQL helper for generating ORDER BY clause
 * @param {string} field - Sort field
 * @param {string} order - ASC or DESC
 * @param {Array} allowedFields - Whitelist of allowed fields
 * @returns {string}
 */
export function orderBySQL(field, order = 'DESC', allowedFields = []) {
  // Validate field against whitelist
  const safeField = allowedFields.length > 0 && !allowedFields.includes(field)
    ? allowedFields[0] || 'created_at'
    : field;
    
  const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  
  return `ORDER BY ${safeField} ${safeOrder}`;
}

export default {
  parsePaginationParams,
  generatePaginationMeta,
  applyPaginationToQuery,
  paginationMiddleware,
  formatPaginatedResponse,
  limitOffsetSQL,
  orderBySQL,
  PAGINATION_DEFAULTS,
};

