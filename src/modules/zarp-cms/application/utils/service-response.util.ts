/**
 * Service Response Utility
 * 
 * Provides helper functions for creating standardized service responses.
 * Services return ServiceResponse objects instead of throwing exceptions.
 */

export interface ServiceResponse<T = any> {
  status: number;
  data: T | { code: string; message?: string; error?: any };
}

/**
 * Creates a success response
 */
export function successResponse<T>(data: T, status: number = 200): ServiceResponse<T> {
  return {
    status,
    data,
  };
}

/**
 * Creates an error response from an error constant
 * Error constant format: 'STATUS:MESSAGE'
 */
export function errorResponse(
  errorConstant: string,
  defaultStatus: number = 500,
  error?: any,
): ServiceResponse {
  const [statusStr, message] = errorConstant.split(':');
  const status = parseInt(statusStr, 10) || defaultStatus;

  return {
    status,
    data: {
      code: errorConstant,
      message: message || 'An error occurred',
      ...(error && { error: error.message || error }),
    },
  };
}
