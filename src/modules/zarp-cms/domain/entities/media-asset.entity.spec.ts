import { MediaAsset, ICreateMediaAsset } from './media-asset.entity';
import { EAssetStatus } from '../enums/asset-status.enum';

describe('MediaAsset Entity', () => {
  const validAssetData: ICreateMediaAsset = {
    url: 'https://storage.example.com/test.webp',
    storage_key: 'cms/1/test/123-test.webp',
    filename: 'test.png',
    mime_type: 'image/webp',
    file_size: 1024,
    collection_id: 1,
    tenant_id: 1,
    created_by: 1,
  };

  describe('Constructor Validation', () => {
    it('should create a valid MediaAsset with required fields', () => {
      const asset = new MediaAsset(validAssetData);

      expect(asset.url).toBe(validAssetData.url);
      expect(asset.storage_key).toBe(validAssetData.storage_key);
      expect(asset.filename).toBe(validAssetData.filename);
      expect(asset.mime_type).toBe(validAssetData.mime_type);
      expect(asset.file_size).toBe(validAssetData.file_size);
      expect(asset.collection_id).toBe(validAssetData.collection_id);
      expect(asset.tenant_id).toBe(validAssetData.tenant_id);
      expect(asset.created_by).toBe(validAssetData.created_by);
      expect(asset.status).toBe(EAssetStatus.processing);
    });

    it('should create asset with optional fields', () => {
      const dataWithOptionals: ICreateMediaAsset = {
        ...validAssetData,
        width: 800,
        height: 600,
        alt_text: 'Test image',
        metadata: { category: 'test' },
        status: EAssetStatus.ready,
      };

      const asset = new MediaAsset(dataWithOptionals);

      expect(asset.width).toBe(800);
      expect(asset.height).toBe(600);
      expect(asset.alt_text).toBe('Test image');
      expect(asset.metadata).toEqual({ category: 'test' });
      expect(asset.status).toBe(EAssetStatus.ready);
    });

    it('should throw error when url is empty', () => {
      const invalidData = { ...validAssetData, url: '' };
      expect(() => new MediaAsset(invalidData)).toThrow('URL is required');
    });

    it('should throw error when storage_key is empty', () => {
      const invalidData = { ...validAssetData, storage_key: '' };
      expect(() => new MediaAsset(invalidData)).toThrow('Storage key is required');
    });

    it('should throw error when filename is empty', () => {
      const invalidData = { ...validAssetData, filename: '' };
      expect(() => new MediaAsset(invalidData)).toThrow('Filename is required');
    });

    it('should throw error when mime_type is empty', () => {
      const invalidData = { ...validAssetData, mime_type: '' };
      expect(() => new MediaAsset(invalidData)).toThrow('Mime type is required');
    });

    it('should throw error when file_size is zero or negative', () => {
      const invalidData = { ...validAssetData, file_size: 0 };
      expect(() => new MediaAsset(invalidData)).toThrow('File size must be greater than 0');

      const negativeData = { ...validAssetData, file_size: -100 };
      expect(() => new MediaAsset(negativeData)).toThrow('File size must be greater than 0');
    });

    it('should throw error when collection_id is zero or negative', () => {
      const invalidData = { ...validAssetData, collection_id: 0 };
      expect(() => new MediaAsset(invalidData)).toThrow('Collection ID must be greater than 0');
    });

    it('should throw error when tenant_id is zero or negative', () => {
      const invalidData = { ...validAssetData, tenant_id: 0 };
      expect(() => new MediaAsset(invalidData)).toThrow('Tenant ID must be greater than 0');
    });

    it('should throw error when created_by is zero or negative', () => {
      const invalidData = { ...validAssetData, created_by: 0 };
      expect(() => new MediaAsset(invalidData)).toThrow('Created by must be greater than 0');
    });
  });

  describe('Business Rules', () => {
    let asset: MediaAsset;

    beforeEach(() => {
      asset = new MediaAsset(validAssetData);
    });

    describe('markAsReady', () => {
      it('should change status to ready', () => {
        expect(asset.status).toBe(EAssetStatus.processing);
        asset.markAsReady();
        expect(asset.status).toBe(EAssetStatus.ready);
      });
    });

    describe('markAsFailed', () => {
      it('should change status to failed', () => {
        expect(asset.status).toBe(EAssetStatus.processing);
        asset.markAsFailed();
        expect(asset.status).toBe(EAssetStatus.failed);
      });
    });

    describe('archive', () => {
      it('should change status to archived', () => {
        asset.markAsReady();
        expect(asset.status).toBe(EAssetStatus.ready);
        asset.archive();
        expect(asset.status).toBe(EAssetStatus.archived);
      });
    });

    describe('updateMetadata', () => {
      it('should update alt_text only', () => {
        expect(asset.alt_text).toBeUndefined();
        asset.updateMetadata('New alt text');
        expect(asset.alt_text).toBe('New alt text');
      });

      it('should update metadata only', () => {
        expect(asset.metadata).toBeUndefined();
        asset.updateMetadata(undefined, { key: 'value' });
        expect(asset.metadata).toEqual({ key: 'value' });
      });

      it('should update both alt_text and metadata', () => {
        asset.updateMetadata('Alt text', { category: 'test' });
        expect(asset.alt_text).toBe('Alt text');
        expect(asset.metadata).toEqual({ category: 'test' });
      });

      it('should merge metadata with existing values', () => {
        asset.updateMetadata(undefined, { key1: 'value1' });
        asset.updateMetadata(undefined, { key2: 'value2' });
        expect(asset.metadata).toEqual({ key1: 'value1', key2: 'value2' });
      });

      it('should not change metadata when undefined is passed', () => {
        asset.updateMetadata(undefined, { key: 'value' });
        const originalMetadata = asset.metadata;
        asset.updateMetadata(undefined, undefined);
        expect(asset.metadata).toEqual(originalMetadata);
      });
    });
  });
});
