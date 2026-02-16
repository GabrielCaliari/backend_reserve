export class ArticleImage {
  id: number;
  url: string;
  storage_key: string;
  alt_text: string | null;
  display_order: number;
  file_size: number;
  original_format: string;
  article_id: number;
  created_at: Date;
  updated_at: Date;

  constructor(data: Partial<ArticleImage>) {
    Object.assign(this, data);
  }
}
