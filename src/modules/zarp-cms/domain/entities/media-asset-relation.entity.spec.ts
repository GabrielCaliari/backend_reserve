import { MediaAssetRelation, ICreateMediaAssetRelation } from './media-asset-relation.entity';

describe('MediaAssetRelation Entity', () => {
  const validRelationData: ICreateMediaAssetRelation = {
    asset_id: 1,
    entity_type: 'article',
    entity_id: 100,
    relation_type: 'gallery',
  };

  describe('Constructor', () => {
    it('should create a relation with required fields', () => {
      const relation = new MediaAssetRelation(validRelationData);

      expect(relation.asset_id).toBe(1);
      expect(relation.entity_type).toBe('article');
      expect(relation.entity_id).toBe(100);
      expect(relation.relation_type).toBe('gallery');
      expect(relation.display_order).toBeUndefined();
      expect(relation.metadata).toBeUndefined();
    });

    it('should create a relation with optional fields', () => {
      const dataWithOptionals: ICreateMediaAssetRelation = {
        ...validRelationData,
        display_order: 5,
        metadata: { featured: true },
      };

      const relation = new MediaAssetRelation(dataWithOptionals);

      expect(relation.display_order).toBe(5);
      expect(relation.metadata).toEqual({ featured: true });
    });

    it('should convert entity_type to lowercase', () => {
      const dataWithUppercase: ICreateMediaAssetRelation = {
        ...validRelationData,
        entity_type: 'ARTICLE',
      };

      const relation = new MediaAssetRelation(dataWithUppercase);

      expect(relation.entity_type).toBe('article');
    });

    it('should convert relation_type to lowercase', () => {
      const dataWithUppercase: ICreateMediaAssetRelation = {
        ...validRelationData,
        relation_type: 'FEATURED',
      };

      const relation = new MediaAssetRelation(dataWithUppercase);

      expect(relation.relation_type).toBe('featured');
    });

    it('should convert mixed case entity_type and relation_type to lowercase', () => {
      const dataWithMixedCase: ICreateMediaAssetRelation = {
        ...validRelationData,
        entity_type: 'EmailCampaign',
        relation_type: 'Attachment',
      };

      const relation = new MediaAssetRelation(dataWithMixedCase);

      expect(relation.entity_type).toBe('emailcampaign');
      expect(relation.relation_type).toBe('attachment');
    });

    it('should support polymorphic entity types', () => {
      const entityTypes = ['article', 'brand', 'company', 'user', 'lead', 'email_campaign'];

      entityTypes.forEach((entityType) => {
        const relation = new MediaAssetRelation({
          ...validRelationData,
          entity_type: entityType,
        });

        expect(relation.entity_type).toBe(entityType);
      });
    });

    it('should support various relation types', () => {
      const relationTypes = ['featured', 'gallery', 'avatar', 'logo', 'attachment', 'thumbnail'];

      relationTypes.forEach((relationType) => {
        const relation = new MediaAssetRelation({
          ...validRelationData,
          relation_type: relationType,
        });

        expect(relation.relation_type).toBe(relationType);
      });
    });
  });

  describe('updateOrder', () => {
    it('should update display_order', () => {
      const relation = new MediaAssetRelation(validRelationData);

      expect(relation.display_order).toBeUndefined();

      relation.updateOrder(10);

      expect(relation.display_order).toBe(10);
    });

    it('should overwrite existing display_order', () => {
      const relation = new MediaAssetRelation({
        ...validRelationData,
        display_order: 5,
      });

      expect(relation.display_order).toBe(5);

      relation.updateOrder(15);

      expect(relation.display_order).toBe(15);
    });

    it('should accept zero as valid display_order', () => {
      const relation = new MediaAssetRelation(validRelationData);

      relation.updateOrder(0);

      expect(relation.display_order).toBe(0);
    });
  });
});
