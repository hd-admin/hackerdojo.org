/**
 * Auction API error codes — see docs/auction/API.md
 */

export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  BID_TOO_LOW: 'BID_TOO_LOW',
  AUCTION_CLOSED: 'AUCTION_CLOSED',
  AUCTION_NOT_ACTIVE: 'AUCTION_NOT_ACTIVE',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  ARTWORK_NOT_DELETABLE: 'ARTWORK_NOT_DELETABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVER_ERROR: 'SERVER_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
};

/** @type {Record<string, number>} */
const HTTP_BY_CODE = {
  VALIDATION_ERROR: 400,
  INVALID_AMOUNT: 400,
  BID_TOO_LOW: 409,
  AUCTION_CLOSED: 409,
  AUCTION_NOT_ACTIVE: 409,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  ARTWORK_NOT_DELETABLE: 409,
  RATE_LIMITED: 429,
  SERVER_ERROR: 500,
  CONFIG_ERROR: 500,
};

export class ApiError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} [status]
   * @param {Record<string, unknown>} [details]
   */
  constructor(code, message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status ?? HTTP_BY_CODE[code] ?? 500;
    this.details = details ?? undefined;
  }
}

/**
 * @param {string} code
 * @param {string} message
 * @param {Record<string, unknown>} [details]
 */
export function apiError(code, message, details) {
  return new ApiError(code, message, undefined, details);
}
