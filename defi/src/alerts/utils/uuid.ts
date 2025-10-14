/**
 * UUID validation utility
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  return UUID_REGEX.test(uuid);
}

/**
 * Validate UUID and return error response if invalid
 */
export function validateUUIDParam(uuid: string | undefined, paramName: string = 'id'): { valid: boolean; error?: any } {
  if (!uuid) {
    return {
      valid: false,
      error: {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: `${paramName} is required`,
        }),
      },
    };
  }

  if (!isValidUUID(uuid)) {
    return {
      valid: false,
      error: {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Bad Request',
          message: `Invalid ${paramName} format. Must be a valid UUID.`,
        }),
      },
    };
  }

  return { valid: true };
}

