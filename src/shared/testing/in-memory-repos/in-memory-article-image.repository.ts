import {
  IArticleImageRepository,
  ICreateArticleImage,
} from '../../../modules/zarp-cms/domain/interfaces/article-image.repository.interface';

export class InMemoryArticleImageRepository implements IArticleImageRepository {
  private images: any[] = [];
  private idCounter = 1;

  async create(data: ICreateArticleImage): Promise<any> {
    const image = {
      id: this.idCounter++,
      ...data,
      created_at: new Date(),
      updated_at: new Date(),
    };
    this.images.push(image);
    return image;
  }

  async findById(id: number): Promise<any> {
    return this.images.find((img) => img.id === id) || null;
  }

  async findAllByArticleId(articleId: number): Promise<any[]> {
    return this.images
      .filter((img) => img.article_id === articleId)
      .sort((a, b) => a.display_order - b.display_order);
  }

  async countByArticleId(articleId: number): Promise<number> {
    return this.images.filter((img) => img.article_id === articleId).length;
  }

  async updateDisplayOrders(items: { id: number; display_order: number }[]): Promise<void> {
    items.forEach((item) => {
      const image = this.images.find((img) => img.id === item.id);
      if (image) {
        image.display_order = item.display_order;
        image.updated_at = new Date();
      }
    });
  }

  async delete(id: number): Promise<void> {
    const index = this.images.findIndex((img) => img.id === id);
    if (index !== -1) {
      this.images.splice(index, 1);
    }
  }

  async deleteAllByArticleId(articleId: number): Promise<void> {
    this.images = this.images.filter((img) => img.article_id !== articleId);
  }

  // Helper methods for testing
  clear(): void {
    this.images = [];
    this.idCounter = 1;
  }

  getAll(): any[] {
    return [...this.images];
  }
}
