import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { REQUIRES_MODULE_KEY } from '../../../../shared/auth/decorators/requires-module.decorator';
import { ModuleAccessGuard } from '../../../../shared/auth/guards/module-access.guard';
import { ArticleController } from './article.controller';
import { ArticleImageController } from './article-image.controller';
import { AuthorController } from './author.controller';
import { BlogController } from './blog.controller';
import { MediaAssetController } from './media-asset.controller';
import { MediaCollectionController } from './media-collection.controller';
import { MediaRelationController } from './media-relation.controller';

const GATED_CONTROLLERS = [
  ArticleController,
  ArticleImageController,
  AuthorController,
  BlogController,
  MediaAssetController,
  MediaCollectionController,
  MediaRelationController,
];

describe('reserve-cms: ModuleAccessGuard wiring', () => {
  it.each(GATED_CONTROLLERS)('%p carries @RequiresModule(cms) at class level', (Controller) => {
    expect(Reflect.getMetadata(REQUIRES_MODULE_KEY, Controller)).toBe('cms');
  });

  it.each(GATED_CONTROLLERS)('%p runs ModuleAccessGuard in its class-level guard chain', (Controller) => {
    const guards: unknown[] = Reflect.getMetadata(GUARDS_METADATA, Controller) ?? [];
    expect(guards).toContain(ModuleAccessGuard);
  });
});
