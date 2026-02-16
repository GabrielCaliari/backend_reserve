export interface ICreateArticleImage {
  url: string;
  storage_key: string;
  alt_text?: string;
  display_order: number;
  file_size: number;
  original_format: string;
  article_id: number;
}

export interface IArticleImageRepository {
  create(data: ICreateArticleImage): Promise<any>;
  findById(id: number): Promise<any>;
  findAllByArticleId(articleId: number): Promise<any[]>;
  countByArticleId(articleId: number): Promise<number>;
  updateDisplayOrders(
    items: { id: number; display_order: number }[],
  ): Promise<void>;
  delete(id: number): Promise<void>;
  deleteAllByArticleId(articleId: number): Promise<void>;
}

export const ARTICLE_IMAGE_REPOSITORY = Symbol('ARTICLE_IMAGE_REPOSITORY');
