import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IArticleImageRepository,
  ICreateArticleImage,
} from '../../domain/interfaces/article-image.repository.interface';

@Injectable()
export class PrismaArticleImageRepository implements IArticleImageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateArticleImage): Promise<any> {
    return this.prisma.articleImage.create({
      data,
    });
  }

  async findById(id: number): Promise<any> {
    return this.prisma.articleImage.findUnique({
      where: { id },
    });
  }

  async findAllByArticleId(articleId: number): Promise<any[]> {
    return this.prisma.articleImage.findMany({
      where: { article_id: articleId },
      orderBy: { display_order: 'asc' },
    });
  }

  async countByArticleId(articleId: number): Promise<number> {
    return this.prisma.articleImage.count({
      where: { article_id: articleId },
    });
  }

  async updateDisplayOrders(items: { id: number; display_order: number }[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.articleImage.update({
          where: { id: item.id },
          data: { display_order: item.display_order },
        }),
      ),
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.articleImage.delete({
      where: { id },
    });
  }

  async deleteAllByArticleId(articleId: number): Promise<void> {
    await this.prisma.articleImage.deleteMany({
      where: { article_id: articleId },
    });
  }
}
