import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import {
  IArticleRepository,
  ICreateArticle,
} from '../../domain/interfaces/article.repository.interface';

@Injectable()
export class PrismaArticleRepository implements IArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: ICreateArticle): Promise<any> {
    return this.prisma.article.create({
      data: {
        ...data,
        status: 'draft',
        display_order: 0,
      },
    });
  }

  async findById(id: number): Promise<any> {
    return this.prisma.article.findUnique({
      where: { id },
      include: {
        ArticleImage: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async findBySlugAndBlogId(slug: string, blogId: number): Promise<any> {
    return this.prisma.article.findUnique({
      where: {
        slug_blog_id: {
          slug,
          blog_id: blogId,
        },
      },
      include: {
        ArticleImage: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async existsBySlugAndBlogId(slug: string, blogId: number): Promise<boolean> {
    const count = await this.prisma.article.count({
      where: {
        slug,
        blog_id: blogId,
      },
    });
    return count > 0;
  }

  async findAllByBlogId(blogId: number): Promise<any[]> {
    return this.prisma.article.findMany({
      where: { blog_id: blogId },
      orderBy: { display_order: 'asc' },
      include: {
        _count: {
          select: { ArticleImage: true },
        },
      },
    });
  }

  async findPublishedByBlogId(blogId: number): Promise<any[]> {
    return this.prisma.article.findMany({
      where: {
        blog_id: blogId,
        status: 'published',
      },
      orderBy: { display_order: 'asc' },
      include: {
        ArticleImage: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async findPublishedBySlugAndBlogId(slug: string, blogId: number): Promise<any> {
    return this.prisma.article.findFirst({
      where: {
        slug,
        blog_id: blogId,
        status: 'published',
      },
      include: {
        ArticleImage: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async update(id: number, data: Partial<any>): Promise<any> {
    return this.prisma.article.update({
      where: { id },
      data,
      include: {
        ArticleImage: {
          orderBy: { display_order: 'asc' },
        },
      },
    });
  }

  async updateDisplayOrders(items: { id: number; display_order: number }[]): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.article.update({
          where: { id: item.id },
          data: { display_order: item.display_order },
        }),
      ),
    );
  }

  async delete(id: number): Promise<void> {
    await this.prisma.article.delete({
      where: { id },
    });
  }
}
