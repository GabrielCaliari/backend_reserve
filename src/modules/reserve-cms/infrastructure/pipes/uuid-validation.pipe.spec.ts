import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { UuidValidationPipe } from './uuid-validation.pipe';

describe('UuidValidationPipe', () => {
  let pipe: UuidValidationPipe;

  beforeEach(() => {
    pipe = new UuidValidationPipe();
  });

  describe('transform', () => {
    it('should return valid UUID unchanged', () => {
      const validUUIDs = [
        'ckl1234abcd5',
        'cl9876zyxwvu',
        'cm0000000000',
        'CKLABC123XYZ',
      ];

      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      validUUIDs.forEach(uuid => {
        expect(pipe.transform(uuid, metadata)).toBe(uuid);
      });
    });

    it('should throw BadRequestException for invalid UUID', () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      expect(() => pipe.transform('invalid', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('short', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('toolongstring123', metadata)).toThrow(BadRequestException);
    });

    it('should include field name in error message', () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'blogId',
      };

      try {
        pipe.transform('invalid', metadata);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Invalid UUID format for blogId');
        expect(error.message).toContain('invalid');
        expect(error.message).toContain('12-character alphanumeric string');
      }
    });

    it('should use "ID" as default field name when metadata.data is undefined', () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
      };

      try {
        pipe.transform('invalid', metadata);
        fail('Should have thrown BadRequestException');
      } catch (error) {
        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.message).toContain('Invalid UUID format for ID');
      }
    });

    it('should work with different metadata types', () => {
      const validUUID = 'ckl1234abcd5';

      const paramMetadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      const queryMetadata: ArgumentMetadata = {
        type: 'query',
        metatype: String,
        data: 'blogId',
      };

      const bodyMetadata: ArgumentMetadata = {
        type: 'body',
        metatype: String,
        data: 'authorId',
      };

      expect(pipe.transform(validUUID, paramMetadata)).toBe(validUUID);
      expect(pipe.transform(validUUID, queryMetadata)).toBe(validUUID);
      expect(pipe.transform(validUUID, bodyMetadata)).toBe(validUUID);
    });

    it('should handle edge case UUIDs', () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      expect(pipe.transform('000000000000', metadata)).toBe('000000000000');
      expect(pipe.transform('zzzzzzzzzzzz', metadata)).toBe('zzzzzzzzzzzz');
      expect(pipe.transform('aaaaaaaaaaaa', metadata)).toBe('aaaaaaaaaaaa');
    });

    it('should reject UUIDs with special characters', () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      expect(() => pipe.transform('ckl-1234-abc', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('ckl 1234 abc', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('ckl_1234_abc', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('ckl@1234#abc', metadata)).toThrow(BadRequestException);
    });

    it('should reject empty or whitespace strings', () => {
      const metadata: ArgumentMetadata = {
        type: 'param',
        metatype: String,
        data: 'id',
      };

      expect(() => pipe.transform('', metadata)).toThrow(BadRequestException);
      expect(() => pipe.transform('   ', metadata)).toThrow(BadRequestException);
    });
  });
});
