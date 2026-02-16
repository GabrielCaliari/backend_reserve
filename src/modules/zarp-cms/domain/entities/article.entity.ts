export class Article {
  id: number;
  title: string;
  content: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  display_order: number;
  published_at: Date | null;
  blog_id: number;
  created_at: Date;
  updated_at: Date;

  constructor(data: Partial<Article>) {
    Object.assign(this, data);
  }
}
