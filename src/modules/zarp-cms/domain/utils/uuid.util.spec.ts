import { isValidUUID, assertValidUUID } from './uuid.util';

describe('UUID Utility Functions', () => {
  describe('isValidUUID', () => {
    it('should return true for valid 12-character cuid', () => {
      const validUUIDs = [
        'ckl1234abcd5',
        'cl9876zyxwvu',
        'cm0000000000',
        'CKLABC123XYZ', // uppercase should work (case-insensitive)
        'CkLaBc123XyZ', // mixed case
      ];

      validUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid)).toBe(true);
      });
    });

    it('should return false for invalid UUID formats', () => {
      const invalidUUIDs = [
        '',                    // empty string
        'short',               // too short
        'toolongstring123',    // too long
        'ckl1234abcd',         // 11 characters
        'ckl1234abcd56',       // 13 characters
        'ckl-1234-abcd',       // contains hyphens
        'ckl 1234 abcd',       // contains spaces
        'ckl1234@abcd5',       // contains special char
        'ckl1234_abcd5',       // contains underscore
        null,                  // null
        undefined,             // undefined
        123,                   // number
        {},                    // object
      ];

      invalidUUIDs.forEach(uuid => {
        expect(isValidUUID(uuid as any)).toBe(false);
      });
    });

    it('should handle edge cases', () => {
      expect(isValidUUID('000000000000')).toBe(true);  // all zeros
      expect(isValidUUID('zzzzzzzzzzzz')).toBe(true);  // all z's
      expect(isValidUUID('aaaaaaaaaaaa')).toBe(true);  // all a's
      expect(isValidUUID('999999999999')).toBe(true);  // all 9's
    });
  });

  describe('assertValidUUID', () => {
    it('should not throw for valid UUID', () => {
      expect(() => assertValidUUID('ckl1234abcd5', 'ID')).not.toThrow();
      expect(() => assertValidUUID('cl9876zyxwvu', 'blogId')).not.toThrow();
    });

    it('should throw error for invalid UUID with default field name', () => {
      expect(() => assertValidUUID('invalid', 'ID')).toThrow('ID must be a valid UUID (12-character cuid)');
      expect(() => assertValidUUID('', 'ID')).toThrow('ID must be a valid UUID (12-character cuid)');
    });

    it('should throw error for invalid UUID with custom field name', () => {
      expect(() => assertValidUUID('short', 'articleId')).toThrow(
        'articleId must be a valid UUID (12-character cuid)'
      );
      expect(() => assertValidUUID('toolong123456', 'blogId')).toThrow(
        'blogId must be a valid UUID (12-character cuid)'
      );
    });

    it('should throw error for non-string values', () => {
      expect(() => assertValidUUID(null as any, 'ID')).toThrow('ID must be a valid UUID (12-character cuid)');
      expect(() => assertValidUUID(undefined as any, 'ID')).toThrow('ID must be a valid UUID (12-character cuid)');
      expect(() => assertValidUUID(123 as any, 'userId')).toThrow('userId must be a valid UUID (12-character cuid)');
    });
  });
});
