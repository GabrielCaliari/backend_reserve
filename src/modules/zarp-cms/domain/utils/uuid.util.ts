/**
 * UUID Validation Utilities
 * 
 * Provides validation for UUID format used in CMS entities.
 * UUIDs are 12-character cuid strings.
 */

/**
 * Validates if a string is a valid UUID (12-character cuid)
 * @param value - The string to validate
 * @returns true if valid UUID format, false otherwise
 */
export function isValidUUID(value: string): boolean {
  if (typeof value !== 'string') {
    return false;
  }

  // UUID format: 12-character lowercase alphanumeric string (cuid)
  const uuidRegex = /^[a-z0-9]{12}$/;
  return uuidRegex.test(value);
}

/**
 * Validates if a value is a valid UUID or null
 * @param value - The value to validate
 * @returns true if valid UUID or null, false otherwise
 */
export function isValidUUIDOrNull(value: string | null): boolean {
  if (value === null) {
    return true;
  }
  return isValidUUID(value);
}

/**
 * Throws an error if the value is not a valid UUID
 * @param value - The value to validate
 * @param fieldName - The name of the field being validated (for error message)
 * @throws Error if value is not a valid UUID
 */
export function assertValidUUID(value: string, fieldName: string): void {
  if (!isValidUUID(value)) {
    throw new Error(`${fieldName} must be a valid UUID (12-character cuid)`);
  }
}
