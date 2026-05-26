/**
 * Application DTOs Index
 * 
 * Exports all Data Transfer Objects for the CMS Generic Storage module.
 */
export { UploadMediaDTO } from './upload-media.dto';
export { CreateCollectionDTO } from './create-collection.dto';
export { UpdateCollectionDTO } from './update-collection.dto';
export { UpdateAssetDTO } from './update-asset.dto';
export { AttachMediaDTO } from './attach-media.dto';
export { DetachMediaDTO } from './detach-media.dto';
export { ReorderMediaDTO } from './reorder-media.dto';
export { FindAssetsParamsDTO } from './find-assets-params.dto';
export { FindCollectionsParamsDTO } from './find-collections-params.dto';

// Article DTOs
export { CreateArticleDTO } from './create-article.dto';
export { UpdateArticleDTO } from './update-article.dto';
export { PublishArticleDTO } from './publish-article.dto';
export { UpdatePublishedAtDTO } from './update-published-at.dto';
export { ArticleResponseDTO } from './article-response.dto';

// Author DTOs
export { CreateAuthorDTO } from './create-author.dto';
export { UpdateAuthorDTO } from './update-author.dto';
export {
	AssignAuthorAvatarDTO,
	AuthorAvatarResponseDTO,
	AuthorPaginationResponseDTO,
	AuthorResponseDTO,
	PaginatedAuthorsResponseDTO,
	SuccessMessageResponseDTO,
} from './author-response.dto';

// Blog DTOs
export { CreateBlogDTO } from './create-blog.dto';
export { UpdateBlogDTO } from './update-blog.dto';
export { BlogResponseDTO } from './blog-response.dto';
