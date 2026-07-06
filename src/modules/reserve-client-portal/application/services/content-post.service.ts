import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/database/prisma.service';
import { CreateContentPostDto, UpdateContentPostDto } from '../dtos/content-post.dto';
import { EContentPostStatus } from '../../domain/enums/content-post-status.enum';
import { ActivityLogService } from './activity-log.service';
import { EActivityLogType } from '../../domain/enums/activity-log-type.enum';
import { EActivityLogCategory } from '../../domain/enums/activity-log-category.enum';

/**
 * §3.5 content calendar. Admin CRUD is tenant-scoped (ContentPost is keyed
 * by tenant_id, not client_id, per the Global Constraints split); the client
 * read is month-scoped and resolves client_id → tenant_id internally.
 */
@Injectable()
export class ContentPostService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  async create(tenantId: string, dto: CreateContentPostDto, createdBy: string) {
    return this.prisma.contentPost.create({
      data: {
        tenant_id: tenantId,
        platform: dto.platform,
        scheduled_for: dto.scheduled_for ? new Date(dto.scheduled_for) : null,
        published_at: dto.published_at ? new Date(dto.published_at) : null,
        status: dto.status ?? EContentPostStatus.DRAFT,
        caption_preview: dto.caption_preview ?? null,
        thumbnail_url: dto.thumbnail_url ?? null,
        external_id: dto.external_id ?? null,
        permalink: dto.permalink ?? null,
        created_by: createdBy,
      },
    });
  }

  async list(tenantId: string) {
    return this.prisma.contentPost.findMany({
      where: { tenant_id: tenantId },
      orderBy: [{ scheduled_for: 'desc' }, { created_at: 'desc' }],
    });
  }

  async findById(tenantId: string, id: string) {
    const post = await this.prisma.contentPost.findFirst({ where: { id, tenant_id: tenantId } });
    if (!post) throw new NotFoundException('Content post not found');
    return post;
  }

  async update(tenantId: string, id: string, dto: UpdateContentPostDto) {
    await this.findById(tenantId, id);

    return this.prisma.contentPost.update({
      where: { id },
      data: {
        ...(dto.platform !== undefined && { platform: dto.platform }),
        ...(dto.scheduled_for !== undefined && { scheduled_for: new Date(dto.scheduled_for) }),
        ...(dto.published_at !== undefined && { published_at: new Date(dto.published_at) }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.caption_preview !== undefined && { caption_preview: dto.caption_preview }),
        ...(dto.thumbnail_url !== undefined && { thumbnail_url: dto.thumbnail_url }),
        ...(dto.external_id !== undefined && { external_id: dto.external_id }),
        ...(dto.permalink !== undefined && { permalink: dto.permalink }),
      },
    });
  }

  async delete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.prisma.contentPost.delete({ where: { id } });
    return { id };
  }

  /**
   * Publish transition. Kept as its own method (rather than folded into the
   * generic update()) so Fase 4 Task 7 has a single, unambiguous call site to
   * hook the activity-log auto-event into.
   */
  async publish(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    const post = await this.prisma.contentPost.update({
      where: { id },
      data: { status: EContentPostStatus.PUBLISHED, published_at: new Date() },
    });

    await this.activityLogService.record(tenantId, {
      type: EActivityLogType.AUTO,
      category: EActivityLogCategory.POST,
      title: `Novo post publicado (${post.platform})`,
    });

    return post;
  }

  /**
   * Month-scoped calendar view for the client portal. A post shows up if
   * either scheduled_for or published_at falls in the month — a post
   * scheduled last month but published this month must still appear on the
   * current month's calendar.
   */
  async getCalendar(clientId: string, month: string) {
    const client = await this.prisma.hotelClient.findUnique({
      where: { id: clientId },
      select: { tenant_id: true },
    });

    if (!client?.tenant_id) {
      throw new BadRequestException('Client has no linked tenant_id');
    }

    const { monthStart, monthEnd } = this.parseMonth(month);

    return this.prisma.contentPost.findMany({
      where: {
        tenant_id: client.tenant_id,
        OR: [
          { scheduled_for: { gte: monthStart, lte: monthEnd } },
          { published_at: { gte: monthStart, lte: monthEnd } },
        ],
      },
      orderBy: [{ scheduled_for: 'asc' }, { published_at: 'asc' }],
    });
  }

  private parseMonth(month?: string): { monthStart: Date; monthEnd: Date } {
    const reference = month ? new Date(`${month}-01T00:00:00.000Z`) : new Date();
    if (Number.isNaN(reference.getTime())) {
      throw new BadRequestException('Invalid month — expected YYYY-MM');
    }

    const monthStart = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), 1));
    const monthEnd = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );
    return { monthStart, monthEnd };
  }
}
