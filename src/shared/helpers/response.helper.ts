/**
 * Legacy response helpers
 * @deprecated Use NestJS HttpException/HttpStatus or structured responses instead
 */

export function errorResponse(code: string, status: number, err?: unknown) {
  if (err) {
    console.error('[ErrorResponse]', err);
  }

  return {
    status,
    data: {
      code,
    },
  };
}

export function successResponse(data: unknown, status = 200) {
  return {
    data,
    status,
  };
}
