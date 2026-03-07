export interface ICreateArticleImage {
  url: string;
  storage_key: string;
  alt_text?: string;
  display_order: number;
  file_size: number;
  original_format: string;
  article_id: string;
}

export interface IArticleImageRepository {
  create(data: ICreateArticleImage): Promise<any>;
  findById(id: string): Promise<any>;
  findAllByArticleId(articleId: string): Promise<any[]>;
  countByArticleId(articleId: string): Promise<number>;
  updateDisplayOrders(
    items: { id: string; display_order: number }[],
  ): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllByArticleId(articleId: string): Promise<void>;
}

export const ARTICLE_IMAGE_REPOSITORY = Symbol('ARTICLE_IMAGE_REPOSITORY');
