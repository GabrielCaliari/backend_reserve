import { MediaCollection } from './media-collection.entity';
import { ECollectionType } from '../enums/collection-type.enum';

describe('MediaCollection Entity', () => {
  describe('validateFileSize', () => {
    it('should return true when no max_file_size is set', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        tenant_id: '1',
      });

      expect(collection.validateFileSize(1000000)).toBe(true);
      expect(collection.validateFileSize(999999999)).toBe(true);
    });

    it('should return true when file size is within limit', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        max_file_size: 5000000, // 5MB
        tenant_id: '1',
      });

      expect(collection.validateFileSize(4999999)).toBe(true);
      expect(collection.validateFileSize(5000000)).toBe(true);
    });

    it('should return false when file size exceeds limit', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        max_file_size: 5000000, // 5MB
        tenant_id: '1',
      });

      expect(collection.validateFileSize(5000001)).toBe(false);
      expect(collection.validateFileSize(10000000)).toBe(false);
    });
  });

  describe('validateMimeType', () => {
    it('should return true when no allowed_mime_types is set', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.mixed,
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('application/pdf')).toBe(true);
      expect(collection.validateMimeType('video/mp4')).toBe(true);
    });

    it('should return true when allowed_mime_types is empty array', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.mixed,
        allowed_mime_types: [],
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('application/pdf')).toBe(true);
    });

    it('should match exact mime types', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'],
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('image/png')).toBe(true);
      expect(collection.validateMimeType('image/webp')).toBe(true);
      expect(collection.validateMimeType('image/gif')).toBe(false);
      expect(collection.validateMimeType('application/pdf')).toBe(false);
    });

    it('should match wildcard * pattern (any mime type)', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.mixed,
        allowed_mime_types: ['*'],
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('application/pdf')).toBe(true);
      expect(collection.validateMimeType('video/mp4')).toBe(true);
      expect(collection.validateMimeType('audio/mpeg')).toBe(true);
    });

    it('should match wildcard type/* pattern', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        allowed_mime_types: ['image/*'],
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('image/png')).toBe(true);
      expect(collection.validateMimeType('image/gif')).toBe(true);
      expect(collection.validateMimeType('image/webp')).toBe(true);
      expect(collection.validateMimeType('image/svg+xml')).toBe(true);
      expect(collection.validateMimeType('application/pdf')).toBe(false);
      expect(collection.validateMimeType('video/mp4')).toBe(false);
    });

    it('should match multiple wildcard patterns', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.mixed,
        allowed_mime_types: ['image/*', 'video/*'],
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('video/mp4')).toBe(true);
      expect(collection.validateMimeType('video/webm')).toBe(true);
      expect(collection.validateMimeType('application/pdf')).toBe(false);
      expect(collection.validateMimeType('audio/mpeg')).toBe(false);
    });

    it('should match combination of exact and wildcard patterns', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.mixed,
        allowed_mime_types: ['image/*', 'application/pdf', 'application/msword'],
        tenant_id: '1',
      });

      expect(collection.validateMimeType('image/jpeg')).toBe(true);
      expect(collection.validateMimeType('image/png')).toBe(true);
      expect(collection.validateMimeType('application/pdf')).toBe(true);
      expect(collection.validateMimeType('application/msword')).toBe(true);
      expect(collection.validateMimeType('application/zip')).toBe(false);
      expect(collection.validateMimeType('video/mp4')).toBe(false);
    });
  });

  describe('canAddMoreItems', () => {
    it('should return true when no max_items is set', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        tenant_id: '1',
      });

      expect(collection.canAddMoreItems(0)).toBe(true);
      expect(collection.canAddMoreItems(100)).toBe(true);
      expect(collection.canAddMoreItems(999999)).toBe(true);
    });

    it('should return true when current count is below limit', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        max_items: 10,
        tenant_id: '1',
      });

      expect(collection.canAddMoreItems(0)).toBe(true);
      expect(collection.canAddMoreItems(5)).toBe(true);
      expect(collection.canAddMoreItems(9)).toBe(true);
    });

    it('should return false when current count equals or exceeds limit', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        max_items: 10,
        tenant_id: '1',
      });

      expect(collection.canAddMoreItems(10)).toBe(false);
      expect(collection.canAddMoreItems(11)).toBe(false);
      expect(collection.canAddMoreItems(100)).toBe(false);
    });
  });

  describe('constructor', () => {
    it('should create a collection with all required fields', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        type: ECollectionType.image,
        tenant_id: '1',
      });

      expect(collection.name).toBe('Test Collection');
      expect(collection.slug).toBe('test-collection');
      expect(collection.type).toBe(ECollectionType.image);
      expect(collection.tenant_id).toBe(1);
      expect(collection.id).toBeUndefined();
      expect(collection.created_at).toBeUndefined();
      expect(collection.updated_at).toBeUndefined();
    });

    it('should create a collection with optional fields', () => {
      const collection = new MediaCollection({
        name: 'Test Collection',
        slug: 'test-collection',
        description: 'A test collection',
        type: ECollectionType.image,
        max_file_size: 5000000,
        allowed_mime_types: ['image/*'],
        max_items: 20,
        tenant_id: '1',
      });

      expect(collection.description).toBe('A test collection');
      expect(collection.max_file_size).toBe(5000000);
      expect(collection.allowed_mime_types).toEqual(['image/*']);
      expect(collection.max_items).toBe(20);
    });
  });
});
