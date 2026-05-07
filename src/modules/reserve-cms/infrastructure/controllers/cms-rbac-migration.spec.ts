import 'reflect-metadata';
import { REQUIRE_PERMISSIONS_KEY } from '../../../../shared/auth/decorators/require-permissions.decorator';
import { ArticleController } from './article.controller';
import { ArticleImageController } from './article-image.controller';
import { AuthorController } from './author.controller';
import { BlogController } from './blog.controller';
import { MediaAssetController } from './media-asset.controller';
import { MediaCollectionController } from './media-collection.controller';
import { MediaRelationController } from './media-relation.controller';

function permissionsOf(target: any, method: string): string[] | undefined {
  return Reflect.getMetadata(REQUIRE_PERMISSIONS_KEY, target.prototype[method]);
}

describe('reserve-cms RBAC migration', () => {
  it('ArticleController', () => {
    expect(permissionsOf(ArticleController, 'create')).toEqual(['cms.article.create']);
    expect(permissionsOf(ArticleController, 'findAll')).toEqual(['cms.article.read']);
    expect(permissionsOf(ArticleController, 'findOne')).toEqual(['cms.article.read']);
    expect(permissionsOf(ArticleController, 'update')).toEqual(['cms.article.update']);
    expect(permissionsOf(ArticleController, 'delete')).toEqual(['cms.article.delete']);
    expect(permissionsOf(ArticleController, 'publish')).toEqual(['cms.article.publish']);
    expect(permissionsOf(ArticleController, 'updatePublishedAt')).toEqual(['cms.article.publish']);
    expect(permissionsOf(ArticleController, 'archive')).toEqual(['cms.article.update']);
    expect(permissionsOf(ArticleController, 'unarchive')).toEqual(['cms.article.update']);
  });

  it('ArticleImageController', () => {
    expect(permissionsOf(ArticleImageController, 'upload')).toEqual(['cms.article-image.create']);
    expect(permissionsOf(ArticleImageController, 'findAll')).toEqual(['cms.article-image.read']);
    expect(permissionsOf(ArticleImageController, 'delete')).toEqual(['cms.article-image.delete']);
    expect(permissionsOf(ArticleImageController, 'reorder')).toEqual(['cms.article-image.update']);
  });

  it('AuthorController', () => {
    expect(permissionsOf(AuthorController, 'create')).toEqual(['cms.author.create']);
    expect(permissionsOf(AuthorController, 'update')).toEqual(['cms.author.update']);
    expect(permissionsOf(AuthorController, 'findOne')).toEqual(['cms.author.read']);
    expect(permissionsOf(AuthorController, 'findAll')).toEqual(['cms.author.read']);
    expect(permissionsOf(AuthorController, 'delete')).toEqual(['cms.author.delete']);
    expect(permissionsOf(AuthorController, 'uploadAvatar')).toEqual(['cms.author.update']);
  });

  it('BlogController', () => {
    expect(permissionsOf(BlogController, 'create')).toEqual(['cms.blog.create']);
    expect(permissionsOf(BlogController, 'findAll')).toEqual(['cms.blog.read']);
    expect(permissionsOf(BlogController, 'listAssets')).toEqual(['cms.blog.read']);
    expect(permissionsOf(BlogController, 'uploadAsset')).toEqual(['cms.blog-asset.create']);
    expect(permissionsOf(BlogController, 'replace')).toEqual(['cms.blog.update']);
    expect(permissionsOf(BlogController, 'update')).toEqual(['cms.blog.update']);
    expect(permissionsOf(BlogController, 'delete')).toEqual(['cms.blog.delete']);
    expect(permissionsOf(BlogController, 'regenerateKey')).toEqual(['cms.blog.manage-key']);
  });

  it('MediaAssetController', () => {
    expect(permissionsOf(MediaAssetController, 'upload')).toEqual(['cms.media-asset.create']);
    expect(permissionsOf(MediaAssetController, 'list')).toEqual(['cms.media-asset.read']);
    expect(permissionsOf(MediaAssetController, 'findOne')).toEqual(['cms.media-asset.read']);
    expect(permissionsOf(MediaAssetController, 'update')).toEqual(['cms.media-asset.update']);
    expect(permissionsOf(MediaAssetController, 'remove')).toEqual(['cms.media-asset.delete']);
  });

  it('MediaCollectionController', () => {
    expect(permissionsOf(MediaCollectionController, 'create')).toEqual(['cms.media-collection.create']);
    expect(permissionsOf(MediaCollectionController, 'list')).toEqual(['cms.media-collection.read']);
    expect(permissionsOf(MediaCollectionController, 'findOne')).toEqual(['cms.media-collection.read']);
    expect(permissionsOf(MediaCollectionController, 'getAssets')).toEqual(['cms.media-collection.read']);
    expect(permissionsOf(MediaCollectionController, 'removeAsset')).toEqual(['cms.media-collection.update']);
    expect(permissionsOf(MediaCollectionController, 'update')).toEqual(['cms.media-collection.update']);
    expect(permissionsOf(MediaCollectionController, 'remove')).toEqual(['cms.media-collection.delete']);
  });

  it('MediaRelationController', () => {
    expect(permissionsOf(MediaRelationController, 'attach')).toEqual(['cms.media-relation.create']);
    expect(permissionsOf(MediaRelationController, 'detach')).toEqual(['cms.media-relation.delete']);
    expect(permissionsOf(MediaRelationController, 'getEntityAssets')).toEqual(['cms.media-relation.read']);
    expect(permissionsOf(MediaRelationController, 'reorder')).toEqual(['cms.media-relation.update']);
  });
});
