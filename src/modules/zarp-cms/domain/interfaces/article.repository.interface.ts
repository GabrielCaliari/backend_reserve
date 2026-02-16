export interface ICreateArticle {
  title: string;
  content: string;
  slug: string;
  blog_id: number;
}

export interface IArticleRepository {
  create(data: ICreateArticle): Promise<any>;
  findById(id: number): Promise<any>;
  findBySlugAndBlogId(slug: string, blogId: number): Promise<any>;
  existsBySlugAndBlogId(slug: string, blogId: number): Promise<boolean>;
  findAllByBlogId(blogId: number): Promise<any[]>;
  findPublishedByBlogId(blogId: number): Promise<any[]>;
  findPublishedBySlugAndBlogId(slug: string, blogId: number): Promise<any>;
  update(id: number, data: Partial<any>): Promise<any>;
  updateDisplayOrders(
    items: { id: number; display_order: number }[],
  ): Promise<void>;
  delete(id: number): Promise<void>;
}

export const ARTICLE_REPOSITORY = Symbol('ARTICLE_REPOSITORY');
