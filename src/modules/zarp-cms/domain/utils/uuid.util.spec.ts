import { isValidUUID, validateUUID } from './uuid.util';

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

  describe('validateUUID', () => {
    it('should not throw for valid UUID', () => {
      expect(() => validateUUID('ckl1234abcd5')).not.toThrow();
      expect(() => validateUUID('cl9876zyxwvu', 'blogId')).not.toThrow();
    });

    it('should throw error for invalid UUID with default field name', () => {
      expect(() => validateUUID('invalid')).toThrow('Invalid UUID format for ID: invalid');
      expect(() => validateUUID('')).toThrow('Invalid UUID format for ID: ');
    });

    it('should throw error for invalid UUID with custom field name', () => {
      expect(() => validateUUID('short', 'articleId')).toThrow(
        'Invalid UUID format for articleId: short'
      );
      expect(() => validateUUID('toolong123456', 'blogId')).toThrow(
        'Invalid UUID format for blogId: toolong123456'
      );
    });

    it('should throw error for non-string values', () => {
      expect(() => validateUUID(null as any)).toThrow('Invalid UUID format for ID: null');
      expect(() => validateUUID(undefined as any)).toThrow('Invalid UUID format for ID: undefined');
      expect(() => validateUUID(123 as any, 'userId')).toThrow('Invalid UUID format for userId: 123');
    });
  });
});
